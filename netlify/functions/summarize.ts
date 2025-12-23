import { Handler } from '@netlify/functions'
import { analyzeInteractions, performGoogleSearch } from './analysisUtils'

// --- DEFENSIBLE PIPELINE CONSTANTS ---
const CONFIDENCE_THRESHOLD = 0.7
const RATE_LIMIT_DELAY = 1000 // 1s delay (handled by client mostly, but good to know)

// MVP QUERY PLAN
// Tier 1: Identity Confirmation
// "[Name]" "[Company]" 
// Tier 2: Social Surface Scan
// "[Name]" "[Company]" site:medium.com OR site:twitter.com OR site:github.com OR site:substack.com

const handler: Handler = async (event) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' }
    }

    const { step, interactions, contactName, contactJob, contactLocation, enrich_mode, confirmed_urls } = JSON.parse(event.body || '{}')

    // API Keys
    const DEEPSEEK_API_KEY = process.env.VITE_DEEPSEEK_API_KEY
    const GOOGLE_API_KEY = process.env.VITE_GOOGLE_SEARCH_API_KEY
    const GOOGLE_CX = process.env.VITE_GOOGLE_SEARCH_CX

    if (!DEEPSEEK_API_KEY) {
        return { statusCode: 500, body: 'Missing DeepSeek API Key' }
    }

    // --- STEP 0: IDENTITY ENVELOPE (The Gatekeeper) ---
    // Rule: Must have Name + Company. City is optional but helpful.
    const hasName = !!contactName && contactName.length > 2

    // Extract "Company" from Job string. 
    // Logic: Split by 'at', take last part. Or use whole string if short.
    // MVP Requirement: We NEED a Company to run the "Name + Company" query.
    let company = ""
    if (contactJob) {
        const parts = contactJob.split(/\bat\b/i)
        if (parts.length > 1) {
            company = parts[parts.length - 1].trim()
        } else {
            // If no "at", assume the input might BE the company if user entered it that way? 
            // Or if it's "CEO", we fail.
            // Let's heuristics: if it looks like a role ("Manager", "Engineer"), we can't use it as company.
            // If it looks like "Stripe", we use it. 
            // For safety, let's try to search the whole Job string if it's not too long.
            company = contactJob
        }
    }

    const hasCompany = company.length > 1
    const anchor = company
    const locationAnchor = contactLocation ? contactLocation.split(',')[0].trim() : ""

    if (step === 'find_profiles' && !hasCompany) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                warn: "Insufficient Data: Enrichment requires a Company name to be defensible. Please add a Company.",
                profiles: [],
                grouped_results: []
            })
        }
    }

    let context = ""
    let systemPrompt = ""

    if (step === 'find_profiles') {
        if (!hasCompany) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    warn: "Insufficient Data: Enrichment requires a Company name to be defensible. Please add a Company.",
                    profiles: [],
                    grouped_results: []
                })
            }
        }

        // --- PHASE 2: IDENTITY CONFIRMATION PHASE ---
        const safeName = `"${contactName}"`
        const safeCompany = `"${company}"`
        const safeRole = contactJob ? `"${contactJob}"` : ""
        const safeCity = locationAnchor ? `"${locationAnchor}"` : ""

        // Step 2.1: Generate Identity Queries (Exact 3 if data allows)
        const identityQueries = []

        // Q1: Name + Company
        identityQueries.push(`${safeName} ${safeCompany}`)

        // Q2: Name + Company + Role (if available)
        if (contactJob) {
            identityQueries.push(`${safeName} ${safeCompany} ${safeRole}`)
        }

        // Q3: Name + Company + City (if available)
        if (locationAnchor) {
            identityQueries.push(`${safeName} ${safeCompany} ${safeCity}`)
        }

        // --- PHASE 3: SOURCE DISCOVERY PHASE ---
        // Step 3.2: Surface-specific queries (Max 1 per surface)
        // Hardcoded allowed domains: medium, substack, twitter, github
        const surfaceQueries: string[] = []
        const platforms = ['site:medium.com', 'site:substack.com', 'site:twitter.com', 'site:github.com']

        platforms.forEach(site => {
            surfaceQueries.push(`${safeName} ${safeCompany} ${site}`)
        })

        // Combine (Max 5 total as per spec suggestion, but we can do parallel)
        const allQueries = [...identityQueries, ...surfaceQueries]

        const results = await Promise.all(
            allQueries.map(q => performGoogleSearch(q, GOOGLE_API_KEY || "", GOOGLE_CX || "", true))
        )

        // Process Results
        const allItems: any[] = []
        const seenUrls = new Set()

        results.forEach((batch, idx) => {
            const queryUsed = allQueries[idx]
            batch.forEach((item: any) => {
                if (!seenUrls.has(item.link)) {
                    seenUrls.add(item.link)

                    let platform = 'Web'
                    if (item.link.includes('linkedin.com')) platform = "LinkedIn"
                    else if (item.link.includes('twitter.com') || item.link.includes('x.com')) platform = "X/Twitter"
                    else if (item.link.includes('github.com')) platform = "GitHub"
                    else if (item.link.includes('medium.com')) platform = "Medium"
                    else if (item.link.includes('substack.com')) platform = "Substack"

                    allItems.push({
                        platform,
                        url: item.link,
                        title: item.title,
                        snippet: item.snippet,
                        query_source: queryUsed
                    })
                }
            })
        })

        return {
            statusCode: 200,
            body: JSON.stringify({
                grouped_results: [{ query: "Systematic Spec Scan", results: allItems }],
                profiles: allItems.slice(0, 15)
            })
        }

    } else if (step === 'analyze' || enrich_mode === 'web') {
        // --- PHASE 4: CONTENT EXTRACTION & SCORING ---

        // Input: "confirmed_urls" from Step 1
        let sources = []
        if (confirmed_urls && confirmed_urls.length > 0) {
            sources = confirmed_urls.map((u: any) => {
                return `[${u.title || 'Web Result'}](${u.url}):\n"${u.snippet || ''}"`
            })
        }

        if (sources.length === 0) {
            return { statusCode: 200, body: JSON.stringify({ summary: "No valid sources selected.", interests: [] }) }
        }

        context = `
        TARGET IDENTITY:
        Name: ${contactName}
        Company: ${company}
        Role: ${contactJob}
        City: ${locationAnchor}

        POTENTIAL SOURCES:
        ${sources.join('\n\n')}

        --- ENGINEERING SPECIFICATION ---

        TASK 1: SCORE IDENTITY MATCHES
        For each source, calculate "Identity Score":
        - Company name present: +0.4
        - Role present: +0.2
        - City present: +0.2
        (Cap at 1.0)
        -> DISCARD any source with Score < 0.7.

        TASK 2: EXTRACT INTERESTS
        Run NLP extraction on valid sources:
        - Extract sustained interests (Sports, Hobbies, Professional Topics).
        - Normalize names: "playing tennis" -> "Tennis".
        - Remove: Locations, Names, Companies.
        
        TASK 3: SCORE INTEREST CONFIDENCE
        For each interest:
        - Appears in >=2 sources: +0.4
        - Appears >=3 times total: +0.3
        - Explicit phrasing ("I play...", "I write about..."): +0.3
        -> DISCARD interests with Confidence < 0.7. (STRICT Threshold)

        TASK 3.5: NEGATIVE FILTER (CRITICAL)
        - EXCLUDE: "Work", "Meeting", "Call", "Lunch", "Dinner", "Coffee".
        - EXCLUDE: One-off events.
        - EXCLUDE: Locations (unless explicitly "Travel to X").
        - REQUIREMENT: Must be a hobby, passion, or professional expertise.

        TASK 4: DETECT EVENTS (Optional)
        Scan for terms: "joined", "announced", "spoke at", "published".
        Extract: { description, date, source_url }

        TASK 5: GENERATE SUMMARY
        Strict Rules:
        - Summarize in 2 sentences.
        - Use ONLY facts from valid sources.
        - Use cautious language.
        `

        systemPrompt = `
        You are a strict Data Enrichment Engine. 
        Output JSON only.
        Structure:
        {
            "match_score": 0.0,
            "match_reasoning": "Explain score calculation",
            "summary": "2-sentence strict summary of verified facts.",
            "interests": [
                { "name": "Interest Name (Normalized)", "category": "Professional|Personal", "confidence": 0.0-1.0, "source_url": "url" }
            ],
            "events": [
                { "description": "Event description", "date": "Date or null", "source_url": "url" }
            ],
            "social_profiles": [{ "platform": "Platform", "url": "URL" }]
        }
        `
    } else {
        // --- PHASE: INTERNAL INTERACTION ANALYSIS + TARGETED SOCIAL SEARCH ---
        // enrich_mode === 'analysis'

        const { interactions, socialLinks, contactName } = JSON.parse(event.body || '{}')

        try {
            const result = await analyzeInteractions(
                interactions,
                socialLinks,
                contactName,
                DEEPSEEK_API_KEY,
                GOOGLE_API_KEY || "",
                GOOGLE_CX || ""
            )

            return {
                statusCode: 200,
                body: JSON.stringify(result)
            }

        } catch (error: any) {
            console.error('Error:', error)
            return { statusCode: 500, body: JSON.stringify({ error: `Analysis failed: ${error.message}` }) }
        }
    }

    // Fallthrough for Web Enrichment (step === 'analyze') which sets systemPrompt/context but doesn't return
    if (!systemPrompt) {
        // Should have returned by now if not analyzing
        return { statusCode: 500, body: "Invalid State" }
    }

    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: context }
                ],
                stream: false,
                response_format: { type: 'json_object' }
            })
        })

        const data = await response.json()
        if (!data.choices || !data.choices[0]) throw new Error(`DeepSeek Error: ${JSON.stringify(data)}`)

        return {
            statusCode: 200,
            body: data.choices[0].message.content
        }

    } catch (error: any) {
        console.error('Error:', error)
        return { statusCode: 500, body: JSON.stringify({ error: `Analysis failed: ${error.message}` }) }
    }
}

export { handler }
