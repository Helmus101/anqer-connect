import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

export const handler: Handler = async (event) => {
    // CORS headers for local testing or strict environments if needed
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' }
    }

    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' }

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
        const deepseekApiKey = process.env.VITE_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY

        if (!supabaseUrl || !supabaseKey) {
            console.error("Missing Supabase credentials")
            throw new Error("Server configuration error: Missing Database Credentials")
        }
        if (!deepseekApiKey) {
            console.error("Missing DeepSeek API Key")
            throw new Error("Server configuration error: Missing AI Credentials")
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: {
                    Authorization: event.headers.authorization || ''
                }
            }
        })

        const body = JSON.parse(event.body || '{}')
        const { contactId, step = 'full', searchResults } = body // step: 'full' | 'search' | 'analyze'
        if (!contactId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing contactId' }) }

        // 1. Fetch Contact
        const { data: contact, error: fetchError } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', contactId)
            .single()

        if (fetchError || !contact) throw new Error('Contact not found')

        // --- RULE 1: ANCHORS (Soft Gate) ---
        // Allowed anchors: Email, Phone, Company, Known Social URL
        // If no anchor exists -> enrichment is disabled.
        const hasSocial = (contact.social_links && contact.social_links.length > 0) || contact.linkedin || contact.twitter || contact.instagram
        const hasWork = contact.job || contact.company
        const hasEmail = contact.email
        const hasPhone = contact.phone
        const hasLocation = contact.location

        // We need at least one anchor OR a very specific location+name combination to even try.
        // User update: "it should run if it has at least either job company, social url or city."
        if (!hasSocial && !hasWork && !hasEmail && !hasPhone && !hasLocation) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: false, reason: "No anchors found (Location, Email, Phone, Job, or Socials required)" })
            }
        }

        const googleApiKey = process.env.VITE_GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_SEARCH_API_KEY
        const googleCx = process.env.VITE_GOOGLE_SEARCH_CX || process.env.GOOGLE_SEARCH_CX

        let items: any[] = []
        let searchResultsText = "No search results found."

        // --- STEP: SEARCH ---
        if (step === 'search' || step === 'full') {
            // --- RULE 3 & 4: QUERY CONSTRUCTION (Real Search) ---
            let queryParts = [contact.name]
            if (contact.email) queryParts.push(contact.email)
            if (contact.job) queryParts.push(contact.job)
            if (contact.company) queryParts.push(contact.company)
            if (contact.location) queryParts.push(contact.location)
            if (contact.linkedin) queryParts.push("site:linkedin.com")

            const searchQuery = queryParts.join(" ")

            if (googleApiKey && googleCx) {
                try {
                    const searchRes = await fetch(`https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCx}&q=${encodeURIComponent(searchQuery)}`)
                    const searchData: any = await searchRes.json()

                    if (searchData.items && searchData.items.length > 0) {
                        items = searchData.items
                        searchResultsText = items.map((r: any) => `[Source: ${r.link}]\nTitle: ${r.title}\nSnippet: ${r.snippet}`).join("\n\n")
                    } else if (searchData.error) {
                        console.error("Google Search API Error", searchData.error)
                    }
                } catch (searchErr) {
                    console.error("Google Search Request Error", searchErr)
                }
            } else {
                console.warn("Missing Google Search Credentials")
            }

            if (step === 'search') {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, results: items })
                }
            }
        }

        // --- STEP: ANALYZE ---
        if (step === 'analyze' && searchResults) {
            items = searchResults
            searchResultsText = items.map((r: any) => `[Source: ${r.link}]\nTitle: ${r.title}\nSnippet: ${r.snippet}`).join("\n\n")
        }

        const prompt = `
            You are a strict Identity Enrichment Engine. 
            RULES:
            1. You have REAL GOOGLE search results for a person. Analyze them to extract a profile.
            2. CONFIDENCE RULES: 
               - HIGH: Strong match across multiple sources or Name + Unique Anchor (Company, Email, Specific Social).
               - MEDIUM: Name + Location or Job match.
               - LOW: Name ONLY, with no other confirming details in the text. OR Conflicting info.
            3. "Low confidence" should ONLY be returned if the input has no specific anchors AND the search results are generic/ambiguous.
            4. If Medium/High: Return extracted data.

            Input Data:
            Name: ${contact.name}
            Anchors: ${JSON.stringify({ email: contact.email, job: contact.job, company: contact.company, location: contact.location })}
            
            REAL Google Search Results:
            ${searchResultsText}

            Task:
            1. infer specific interests (e.g. "Sailing", "Fintech", "Jazz"). 
            2. infer a professional bio (max 3 sentences).
            3. infer strict confidence level.
            4. Extract social links if found in results.

            Return JSON:
            {
                "confidence": "high" | "medium" | "low",
                "bio": "...",
                "interests": [ { "name": "...", "source": "ai", "frequency": "medium" } ],
                "socials": [ { "platform": "twitter", "url": "..." } ]
            }
        `

        const aiResponse = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deepseekApiKey}` },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'system', content: prompt }],
                response_format: { type: 'json_object' }
            })
        })

        const aiData = await aiResponse.json()

        if (!aiResponse.ok) {
            console.error("DeepSeek API Error:", aiData)
            throw new Error(`AI API failed: ${aiData.error?.message || 'Unknown error'}`)
        }

        let result;
        try {
            result = JSON.parse(aiData.choices[0].message.content)
        } catch (parseErr) {
            console.error("JSON Parse Error:", aiData.choices[0].message.content)
            throw new Error("Failed to parse AI response")
        }

        // --- RULE 7 & 10: THRESHOLDS ---
        if (result.confidence === 'low') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: false, reason: "Low confidence match - no changes made." })
            }
        }

        // 3. Update Contact
        // If Medium/High, we attach.
        // We append new AI interests to existing ones, deduplicating.

        const currentInterests = contact.interests || []
        const newInterests = result.interests || []
        const combinedInterests = [...currentInterests]

        newInterests.forEach((ni: any) => {
            if (!combinedInterests.find(ci => ci.name === ni.name)) {
                combinedInterests.push(ni)
            }
        })

        const updates: any = {
            interests: combinedInterests,
            last_analyzed_at: new Date().toISOString()
        }

        // Only overwrite bio if it's empty or if we are high confidence and it was previously shorter
        if (!contact.bio || (result.confidence === 'high' && result.bio.length > contact.bio.length)) {
            updates.ai_summary = `[High Confidence Match]\n${result.bio}` // Store in ai_summary to separate from user-written bio
            if (!contact.bio) updates.bio = result.bio // Also populate bio if empty
        }

        // Merge socials
        if (result.socials) {
            updates.social_links = [...(contact.social_links || []), ...result.socials]
        }

        await supabase.from('contacts').update(updates).eq('id', contactId)

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, enriched: result })
        }

    } catch (err: any) {
        console.error("Enrichment Function Error:", err)
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message, stack: err.stack })
        }
    }
}
