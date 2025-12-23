import { Handler } from '@netlify/functions'
import * as cheerio from 'cheerio'

const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' }
    }

    try {
        const { contactId, name, location, job, email, interactions } = JSON.parse(event.body || '{}')

        console.log(`[Deep Analyze] Starting for: ${name}`)

        // Initialize results with detailed logs
        const logs: string[] = []
        const addLog = (message: string) => {
            console.log(`[Deep Analyze] ${message}`)
            logs.push(message)
        }

        const results: {
            webData: any
            interactionData: any
            interests: Array<{ name: string; source: string; frequency: string; confidence?: number }>
            events: any[]
            relationshipSummary: string | null
            logs: string[]
        } = {
            webData: null,
            interactionData: null,
            interests: [],
            events: [],
            relationshipSummary: null,
            logs: []
        }

        addLog(`🔍 Starting Deep Analysis for ${name}...`)

        // PHASE 1: WEB ENRICHMENT
        const googleApiKey = process.env.VITE_GOOGLE_SEARCH_API_KEY
        const googleCx = process.env.VITE_GOOGLE_SEARCH_CX

        if (googleApiKey && googleCx && name) {
            addLog('📊 Phase 1: Web Enrichment')
            addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

            // Build search queries (NO QUOTES)
            const queries: string[] = []

            if (job) {
                queries.push(`${name} ${job}`)
            }
            if (location) {
                queries.push(`${name} ${location}`)
            }
            if (!queries.length) {
                queries.push(name)
            }

            addLog(`🔎 Google Search Queries:`)
            queries.forEach((q, i) => addLog(`   ${i + 1}. "${q}"`))

            // Search Google for each query
            for (const query of queries.slice(0, 2)) { // Max 2 queries to avoid timeout
                try {
                    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCx}&q=${encodeURIComponent(query)}&num=10`
                    const searchResponse = await fetch(searchUrl)
                    const searchData = await searchResponse.json()

                    if (searchData.items && searchData.items.length > 0) {
                        addLog(`✓ Found ${searchData.items.length} results for "${query}"`)
                        addLog('')

                        // Extract URLs (process up to 20 total)
                        const urls = searchData.items
                            .slice(0, 20)
                            .map((item: any) => ({
                                url: item.link,
                                title: item.title,
                                snippet: item.snippet
                            }))

                        // For now, just store the snippets as basic web data
                        results.webData = {
                            query,
                            results: urls
                        }

                        // FETCH ACTUAL WEB PAGES
                        addLog('🌐 Visiting relevant websites...')
                        urls.slice(0, 5).forEach((url: any, i: number) => {
                            addLog(`   ${i + 1}. ${url.url}`)
                        })
                        addLog('')
                        const fetchedContent: string[] = []

                        // Fetch up to 5 URLs (to avoid timeout)
                        for (const urlItem of urls.slice(0, 5)) {
                            try {
                                const pageResponse = await Promise.race([
                                    fetch(urlItem.url, {
                                        headers: {
                                            'User-Agent': 'Mozilla/5.0 (compatible; ContactEnrichBot/1.0)'
                                        }
                                    }),
                                    new Promise<Response>((_, reject) =>
                                        setTimeout(() => reject(new Error('timeout')), 3000)
                                    )
                                ])

                                if (pageResponse.ok) {
                                    const html = await pageResponse.text()
                                    const $ = cheerio.load(html)

                                    // Extract meaningful text content
                                    $('script, style, nav, footer, header').remove()

                                    // Get bio/description
                                    let bio = $('meta[property="og:description"]').attr('content') ||
                                        $('meta[name="description"]').attr('content') ||
                                        ''

                                    // Get main content
                                    const mainText = $('main, article, .content, .bio, .about, p').text().trim()

                                    if (bio || mainText) {
                                        const content = `${bio}\n${mainText}`.substring(0, 2000)
                                        fetchedContent.push(content)
                                        addLog(`   ✓ Extracted content from ${urlItem.url.substring(0, 60)}...`)
                                    }
                                }
                            } catch (fetchErr) {
                                addLog(`   ✗ Could not access ${urlItem.url.substring(0, 60)}`)
                                // Continue with next URL
                            }
                        }

                        addLog('')
                        addLog(`📄 Successfully extracted content from ${fetchedContent.length} page(s)`)
                        addLog('🤖 Analyzing content with AI...')

                        // Use AI to extract interests from REAL PAGE CONTENT (or fall back to snippets)
                        const deepseekKey = process.env.VITE_DEEPSEEK_API_KEY
                        if (deepseekKey) {
                            try {
                                // Use fetched content if available, otherwise use snippets
                                const contentToAnalyze = fetchedContent.length > 0
                                    ? fetchedContent.join('\n\n').substring(0, 5000)
                                    : urls.map((item: any) => `${item.title}\n${item.snippet}`).join('\n\n').substring(0, 4000)

                                const webPrompt = `Analyze this ${fetchedContent.length > 0 ? 'web page content' : 'search results'} about ${name} and extract their interests, hobbies, and professional focus areas.

${fetchedContent.length > 0 ? 'Web Content:' : 'Search Results:'}
${contentToAnalyze}

Return JSON with interests. Only include real, specific interests (not job titles or generic terms):
{
  "interests": [{"name": "Interest Name", "confidence": 0.8, "category": "Personal|Professional"}]
}`

                                const webAiResponse = await Promise.race([
                                    fetch('https://api.deepseek.com/chat/completions', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${deepseekKey}`
                                        },
                                        body: JSON.stringify({
                                            model: 'deepseek-chat',
                                            messages: [
                                                { role: 'system', content: 'You are an interest extraction engine. Extract real interests from web content. Return JSON only.' },
                                                { role: 'user', content: webPrompt }
                                            ],
                                            response_format: { type: 'json_object' }
                                        })
                                    }),
                                    new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
                                ])

                                if (webAiResponse.ok) {
                                    const webAiData = await webAiResponse.json()
                                    if (webAiData.choices && webAiData.choices[0]) {
                                        const webAnalysis = JSON.parse(webAiData.choices[0].message.content)

                                        if (webAnalysis.interests && Array.isArray(webAnalysis.interests)) {
                                            addLog(`✓ AI found ${webAnalysis.interests.filter((i: any) => i.confidence >= 0.6).length} interests from web content`)
                                            webAnalysis.interests.forEach((interest: any) => {
                                                if (interest.confidence >= 0.6) {
                                                    results.interests.push({
                                                        name: interest.name,
                                                        source: 'inferred',
                                                        frequency: 'medium',
                                                        confidence: interest.confidence
                                                    })
                                                }
                                            })
                                        }
                                    }
                                }
                            } catch (webAiErr) {
                                console.error('[Deep Analyze] Web AI error:', webAiErr)
                            }
                        }

                        break // Use first successful query
                    }
                } catch (searchErr) {
                    console.error(`[Deep Analyze] Search error for "${query}":`, searchErr)
                }
            }
        }

        // PHASE 2: INTERACTION ANALYSIS
        if (interactions && interactions.length > 0) {
            addLog('')
            addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            addLog(`💬 Phase 2: Interaction History Analysis`)
            addLog(`📝 Analyzing ${interactions.length} interaction(s)...`)

            const deepseekKey = process.env.VITE_DEEPSEEK_API_KEY

            if (deepseekKey) {
                try {
                    // Combine all interaction notes
                    const allNotes = interactions
                        .map((i: any) => `[${i.date}] ${i.notes}`)
                        .join('\n')

                    const prompt = `Analyze these interaction notes and provide:
1. A brief relationship summary (2-3 sentences about the type and nature of relationship)
2. List of sustained interests (things mentioned multiple times or with depth, NOT one-off tasks)

Interaction History:
${allNotes.substring(0, 3000)}

Return JSON: {
  "relationshipSummary": "...",
  "interests": [{"name": "Interest", "confidence": 0.8}]
}`

                    const aiResponse = await Promise.race([
                        fetch('https://api.deepseek.com/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${deepseekKey}`
                            },
                            body: JSON.stringify({
                                model: 'deepseek-chat',
                                messages: [
                                    { role: 'system', content: 'You are a relationship analyzer. Return JSON only.' },
                                    { role: 'user', content: prompt }
                                ],
                                response_format: { type: 'json_object' }
                            })
                        }),
                        new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
                    ])

                    if (aiResponse.ok) {
                        const aiData = await aiResponse.json()
                        if (aiData.choices && aiData.choices[0]) {
                            const analysis = JSON.parse(aiData.choices[0].message.content)

                            results.relationshipSummary = analysis.relationshipSummary
                            if (analysis.relationshipSummary) {
                                addLog('✓ Generated relationship summary')
                            }

                            // Add sustained interests
                            if (analysis.interests && Array.isArray(analysis.interests)) {
                                const sustainedInterests = analysis.interests.filter((i: any) => i.confidence >= 0.7)
                                if (sustainedInterests.length > 0) {
                                    addLog(`✓ Found ${sustainedInterests.length} sustained interest(s) from interactions`)
                                }
                                analysis.interests.forEach((interest: any) => {
                                    if (interest.confidence >= 0.7) {
                                        results.interests.push({
                                            name: interest.name,
                                            source: 'trusted',
                                            frequency: 'high'
                                        })
                                    }
                                })
                            }
                        }
                    }
                } catch (aiErr) {
                    console.error('[Deep Analyze] AI analysis error:', aiErr)
                }
            }
        }

        addLog('')
        addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        addLog(`✅ Analysis Complete!`)
        addLog(`📊 Total interests found: ${results.interests.length}`)

        results.logs = logs

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                results,
                interests: results.interests,
                relationshipSummary: results.relationshipSummary
            })
        }

    } catch (error: any) {
        console.error('[Deep Analyze] Error:', error)
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        }
    }
}

export { handler }
