import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

const extractCity = (address: string) => {
    if (!address) return ''
    const parts = address.split(',')
    return parts.length >= 2 ? parts[1].trim() : parts[0].trim()
}
const fetchPageContent = async (url: string): Promise<string | null> => {
    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 4000) // 4s timeout

        // Basic filtering for file types we don't want to fetch
        if (url.match(/\.(pdf|doc|docx|xls|xlsx|zip|rar|jpg|png|gif)$/i)) return null

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; IdentityExplorer/1.0; +http://www.google.com/bot.html)'
            },
            signal: controller.signal
        })
        clearTimeout(timeout)

        if (!res.ok) return null

        // Content type check
        const contentType = res.headers.get('content-type')
        if (!contentType || !contentType.includes('text/html')) return null

        const html = await res.text()
        const $ = cheerio.load(html)

        // Cleaning
        $('script, style, nav, footer, header, allow, .cookie, #cookie').remove()

        // Extract text
        const text = $('body').text().replace(/\s+/g, ' ').trim()
        return text.substring(0, 2000) // Limit context
    } catch (e) {
        return null
    }
}

export const handler: Handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' }

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
        const deepseekApiKey = process.env.VITE_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY
        const googleApiKey = process.env.VITE_GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_SEARCH_API_KEY
        const googleCx = process.env.VITE_GOOGLE_SEARCH_CX || process.env.GOOGLE_SEARCH_CX

        if (!supabaseUrl || !supabaseKey || !deepseekApiKey || !googleApiKey || !googleCx) {
            throw new Error("Missing Server Configuration")
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: event.headers.authorization || '' } }
        })

        const body = JSON.parse(event.body || '{}')
        const { contactId, step = 'full', searchResults } = body
        if (!contactId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing contactId' }) }

        // 1. Fetch Contact
        const { data: contact, error: fetchError } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', contactId)
            .single()

        if (fetchError || !contact) throw new Error('Contact not found')

        // 2. Strict Prerequisites Check
        // Required: Full Name + 1 Anchor
        const hasAnchor = (contact.social_links?.length > 0) || contact.linkedin || contact.twitter || contact.instagram ||
            contact.job || contact.company || contact.location || extractCity(contact.location || contact.address) || contact.email || contact.phone

        if (!contact.name || !hasAnchor) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: false,
                    reason: "Strict Mode: Name and at least one anchor (Company, Location, Email) required."
                })
            }
        }

        let items: any[] = []

        // 3. Search Execution (if step is 'search' or 'full')
        if (step === 'search' || step === 'full') {
            // Strict Query Construction
            // Name must be quoted. Add highest signal anchor.
            let query = `"${contact.name}"`

            // Prioritize anchors
            if (contact.email) {
                const domain = contact.email.split('@')[1]
                if (!['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain)) {
                    query += ` "${domain}"`
                } else if (contact.company) {
                    query += ` "${contact.company}"`
                } else if (contact.location) {
                    query += ` "${contact.location}"`
                } else {
                    query += ` "profile"` // fallback
                }
            } else if (contact.company) {
                query += ` "${contact.company}"`
            } else if (contact.location) {
                query += ` "${contact.location}"`
                if (contact.job) query += ` "${contact.job}"`
            } else if (contact.job) {
                query += ` "${contact.job}"`
            }

            console.log("Searching for:", query)

            try {
                const searchRes = await fetch(`https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCx}&q=${encodeURIComponent(query)}`)
                const searchData: any = await searchRes.json()
                items = searchData.items || []
            } catch (e) {
                console.error("Search Error", e)
            }

            if (step === 'search') {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        results: items,
                        queries: queries
                    })
                }
            }
        }

        // 4. Analysis & Verification (Step 'analyze')
        if (step === 'analyze' && searchResults) {
            items = searchResults
        }

        if (items.length === 0) {
            return { statusCode: 200, headers, body: JSON.stringify({ success: false, reason: "No search results found to verify." }) }
        }

        // URL Verification Pipeline
        // "Candidates" - Top 4 results
        const candidateUrls = items.slice(0, 4)

        const candidates = await Promise.all(candidateUrls.map(async (item: any) => {
            // Filter
            const url = item.link || ''
            if (url.includes('linkedin.com/directory') || url.includes('zoominfo.com') || url.includes('rocketreach.co')) {
                return null // Low signal / paywalls
            }

            // Fetch Content (Source of Truth)
            const content = await fetchPageContent(url)

            return {
                url: url,
                title: item.title,
                snippet: item.snippet, // Keep for context, but AI is told to prioritize content
                fetchedContent: content ? content : "BLOCKED/UNAVAILABLE"
            }
        }))

        const validCandidates = candidates.filter(c => c !== null)

        // 5. Cross-Signal Verification with AI
        const prompt = `
            You are the Identity Verification Engine.
            
            GOAL: Verify if one of the Candidate Profiles matches the Subject.
            SOURCE OF TRUTH: The "fetchedContent" of the candidate URLs. 
            DO NOT trust snippets if content is available. 
            If content is "BLOCKED", proceed with extreme caution using snippet only.

            SUBJECT:
            Name: ${contact.name}
            Anchors: ${JSON.stringify({
            job: contact.job,
            company: contact.company,
            city: extractCity(contact.location || contact.address),
            email: contact.email,
            socials: contact.social_links
        })}

            CANDIDATE PROFILES (From Search):
            ${validCandidates.map((c, i) => `
            --- CANDIDATE ${i + 1} ---
            URL: ${c?.url}
            Title: ${c?.title}
            Snippet: ${c?.snippet}
            FETCHED CONTENT START:
            ${c?.fetchedContent?.substring(0, 1000)}... 
            FETCHED CONTENT END
            `).join('\n')}

            VERIFICATION LOGIC:
            1. **Match**: Does the content CONFIRM the Subject's anchors (Company, Location, Job)?
            2. **Conflict**: Is this clearly a different person? (e.g. Subject is "Artist in NY", Candidate is "Doctor in LA").
            3. **New Info**: If it IS the same person, what new info (Bio, Interests, Socials) is present?

            OUTPUT (JSON Only):
            {
                "confidence": "high" | "medium" | "low",
                "reason": "Explicit reason for decision",
                "match_candidate_index": number | null,
                "bio": "Extracted professional bio (max 3 sentences)",
                "interests": [ "Specific Interest 1", "Specific Interest 2" ],
                "socials": [ { "platform": "linkedin", "url": "..." } ]
            }
            
            RULES:
            - If multiple candidates match, merge the data.
            - If NO candidate matches strictly (or data is contradictory), return LOW confidence.
            - "Interests" must be explicit in the text. Mark inferred ones as such.
        `

        const aiRes = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deepseekApiKey}` },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'system', content: prompt }],
                temperature: 0.1, // Low temp for strict logic
                response_format: { type: 'json_object' }
            })
        })

        const aiData = await aiRes.json()
        const result = JSON.parse(aiData.choices[0].message.content)

        if (result.confidence === 'low') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: false, reason: result.reason || "Low confidence match." })
            }
        }

        // 6. Enrichment
        const updates: any = {}
        if (result.bio && !contact.bio) updates.bio = result.bio
        if (result.interests && result.interests.length > 0) {
            // unique merge
            const existing = contact.interests || []
            const newInterests = result.interests.map((i: string) => ({ name: i, source: 'ai_web' })) // Simple string to object
            updates.interests = [...existing, ...newInterests]
        }

        // Handle Socials logic
        if (result.socials) {
            const currentLinks = contact.social_links || []
            result.socials.forEach((s: any) => {
                const exists = currentLinks.some((l: any) => l.platform === s.platform && l.url === s.url)
                if (!exists) currentLinks.push(s)
            })
            updates.social_links = currentLinks
        }

        updates.last_analyzed = new Date().toISOString()
        updates.ai_summary = `Identity verified via ${result.match_candidate_index ? 'Candidate ' + result.match_candidate_index : 'web search'}. Confidence: ${result.confidence}.`

        await supabase.from('contacts').update(updates).eq('id', contactId)

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, enriched: updates })
        }

    } catch (err: any) {
        console.error("Handler Error", err)
        return {
            statusCode: 200, // Return 200 so UI handles it gracefully
            headers,
            body: JSON.stringify({ success: false, reason: err.message })
        }
    }
}
