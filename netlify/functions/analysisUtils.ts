
// Helper for Google Search (Shared)
export async function performGoogleSearch(query: string, apiKey: string, cx: string, returnRaw: boolean = false) {
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`
        const response = await fetch(url)
        const data = await response.json()

        if (!data.items) return returnRaw ? [] : ""

        if (returnRaw) {
            return data.items
        }

        return data.items.map((item: any) =>
            `[Source: ${item.title}](${item.link}):\n${item.snippet}`
        ).join('\n\n')
    } catch (e) {
        console.error("Google Search Error", e)
        return returnRaw ? [] : ""
    }
}

// Core Interaction Analysis Logic
export async function analyzeInteractions(
    interactions: any[],
    socialLinks: any,
    contactName: string,
    DEEPSEEK_API_KEY: string,
    GOOGLE_API_KEY: string,
    GOOGLE_CX: string
) {
    // 1. Prepare Interaction Inputs
    // 1. Prepare Interaction Inputs (Limit to last 30 to prevent context overflow/timeout)
    const recentInteractions = interactions ? interactions.slice(-30) : []
    const historyText = recentInteractions.length > 0 ? recentInteractions.map((i: any) => {
        const speaker = i.type === 'inbound' ? (contactName || "Contact") : "Me"
        return `[${i.date}] ${speaker}: ${i.content || i.notes}`
    }).join('\n') : "No interaction history."

    // 2. Targeted Social Search (if links exist)
    let socialContext = ""
    if (socialLinks) {
        // Flatten socialLinks if it's an array (from DB) or object (from payload)
        // DB format: [{platform: 'x', url: '...'}]
        // Payload format might carry object. Let's handle both.

        let linkedinUrl = ""
        let twitterUrl = ""
        let instagramUrl = ""
        let facebookUrl = ""
        let snapchatUrl = ""

        if (Array.isArray(socialLinks)) {
            socialLinks.forEach(l => {
                if (l.platform === 'linkedin') linkedinUrl = l.url
                if (l.platform === 'twitter') twitterUrl = l.url
                if (l.platform === 'instagram') instagramUrl = l.url
                if (l.platform === 'facebook') facebookUrl = l.url
                if (l.platform === 'snapchat') snapchatUrl = l.url
            })
        } else {
            linkedinUrl = socialLinks.linkedin
            twitterUrl = socialLinks.twitter
            instagramUrl = socialLinks.instagram
            facebookUrl = socialLinks.facebook
            snapchatUrl = socialLinks.snapchat
        }

        const searchQueue: string[] = []
        const cleanUrl = (u: string) => u ? u.split('?')[0].replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '') : ""

        if (linkedinUrl) searchQueue.push(`site:${cleanUrl(linkedinUrl)}`)
        if (twitterUrl) searchQueue.push(`site:${cleanUrl(twitterUrl)}`)
        if (instagramUrl) searchQueue.push(`site:${cleanUrl(instagramUrl)}`)
        if (facebookUrl) searchQueue.push(`site:${cleanUrl(facebookUrl)}`)
        if (snapchatUrl) searchQueue.push(`site:${cleanUrl(snapchatUrl)}`)

        if (searchQueue.length > 0) {
            try {
                // Race against a 4s timeout to prevent 502s
                const searchPromise = Promise.all(
                    searchQueue.map(q => performGoogleSearch(q, GOOGLE_API_KEY || "", GOOGLE_CX || "", true))
                )
                const timeoutPromise = new Promise(resolve => setTimeout(() => resolve([]), 4500))

                const results: any = await Promise.race([searchPromise, timeoutPromise])

                const snippets = results.flat().map((r: any) => `[Social Snippet] ${r.title}: ${r.snippet}`).join('\n')
                socialContext = `\nTARGETED SOCIAL CONTEXT:\n${snippets}`
            } catch (e) {
                console.error("Social search failed", e)
            }
        }
    }

    const context = `
    INTERACTION HISTORY:
    ${historyText}

    ${socialContext}

    --- ANALYSIS SPECIFICATION ---

    STEP 1: DETECT PHRASES
    Look for:
    - Verb-based: "I play", "I enjoy", "I'm into", "I've been doing".
    - Noun-based: "I've been working on [X]", "Planning [Y]".
    
    STEP 2: FILTER
    - Valid Phrases: "I enjoy climbing" (Keep). "I don't like tennis" (Ignore).
    - Context: Ensure it is an active interest.

    STEP 3: SCORING (Confidence 0.0 - 1.0)
    Base Score Calculation:
    - Direct mention in text: +0.4
    - Mentioned in >1 message: +0.3
    - Repeated over time (different days): +0.2
    - Explicit phrasing ("I play tennis"): +0.1
    -> Cap at 1.0. 
    -> DISCARD if Score < 0.5.

    STEP 4: CATEGORIZE
    - Personal: Sports, Hobbies, Travel, Cooking, Culture.
    - Professional: Career goals, Skills, Industry topics, Technical expertise.

    STEP 5: TEMPORAL TRACKING
    - Extract "last_mentioned_at" date.
    
    STEP 6: FULL PROFILE EXTRACTION
    - Scan Social Snippets for:
      - Job Title (e.g. "Software Engineer at Google") -> "detected_job_title", "detected_company"
      - Location (e.g. "San Francisco Bay Area") -> "detected_location"
      - Bio/Headline (e.g. "Building the future of X") -> "detected_bio"
      - Education (e.g. "Stanford University", "BSc Computer Science") -> "detected_education" (Array)
      - Fields/Topics (e.g. "AI", "Marketing", "SaaS") -> "detected_fields" (Array)
      - Skills (e.g. "React", "Public Speaking") -> "detected_skills" (Array)
      - Achievements/Awards (e.g. "Forbes 30u30", "Winner of X") -> "detected_achievements" (Array)
      - Projects/Ventures (e.g. "Founder of X", "Built Y") -> "detected_projects" (Array)
      - Languages (e.g. "English", "Spanish") -> "detected_languages" (Array)

    OUTPUT FORMAT:
    JSON only.
    `

    const systemPrompt = `
    You are a Data Logic Engine.
    Output JSON:
    {
        "summary": "Conversational summary ('Often talks about...')",
        "interests": [
            {
                "name": "Interest Name",
                "category": "Personal|Professional",
                "confidence": 0.5,
                "last_mentioned_at": "YYYY-MM-DD"
            }
        ],
        "relationship_summary": "COMPREHENSIVE ANALYSIS: Based on the ENTIRE interaction history provided, summarize the relationship dynamic. Analyze frequency, tone, and depth. (e.g. 'Close friend who we speak to weekly about hobbies' or 'New professional contact'). Explain reasoning.",
        "detected_job_title": "Title or null",
        "detected_company": "Company or null",
        "detected_location": "City/Region or null",
        "detected_bio": "Short bio or null",
        "detected_education": ["School 1", "Degree"],
        "detected_fields": ["Field 1", "Industry"],
        "detected_skills": ["Skill 1", "Skill 2"],
        "detected_achievements": ["Award 1", "Recognition"],
        "detected_projects": ["Project A", "Startup B"],
        "detected_languages": ["Language 1", "Language 2"]
    }
    `

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

        return JSON.parse(data.choices[0].message.content)

    } catch (error: any) {
        console.error('Analysis Error:', error)
        throw error
    }
}
