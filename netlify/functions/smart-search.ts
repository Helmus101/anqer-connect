import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const deepseekApiKey = process.env.VITE_DEEPSEEK_API_KEY

const supabase = createClient(supabaseUrl!, supabaseKey!)

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

    const { query, userId } = JSON.parse(event.body || '{}')
    if (!query) return { statusCode: 400, body: 'Missing query' }

    try {
        // Step 1: AI Parse - Break down query into Criteria/Questions
        const criteriaResponse = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deepseekApiKey}` },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system', content: `You are a search query parser. Return a JSON object with:
                    1. "keywords": array of strings for broad database search (e.g. names, roles, locations).
                    2. "criteria": array of objects { "label": "Short Col Header", "question": "Yes/No question to ask about the contact" }.
                    
                    Example: "Designers in London who like Jazz"
                    Output: {
                        "keywords": ["Designer", "London", "Jazz"],
                        "criteria": [
                            { "label": "Is Designer", "question": "Is this person a designer?" },
                            { "label": "In London", "question": "Are they based in London?" },
                            { "label": "Likes Jazz", "question": "Do they like Jazz?" }
                        ]
                    }`},
                    { role: 'user', content: query }
                ],
                response_format: { type: 'json_object' }
            })
        })
        const criteriaData = await criteriaResponse.json()
        const criteria = JSON.parse(criteriaData.choices[0].message.content)

        // Step 2: Broad DB Search (Keywords)
        // We act as the user (using their ID if RLS requires it, but with service role we see all. 
        // Ideally we pass the user's JWT, but for this MVP function we verify broadly or pass specific ID).
        // Since we are using ANON key here, we rely on RLS if we had a session, BUT Netlify functions don't usually forward auth headers easily without work.
        // For MVP: We will assume we search based on the provided userId if we can, OR we just use a Service Key if we want to bypass RLS (RISKY).
        // SAFEST: Pass the user's JWT in the Authorization header to Supabase.

        // Let's grab the token from the event headers if possible, or just build a broad 'OR' filter.
        // To keep it simple: We search *text* fields.

        // Generate a comprehensive OR filter for all keywords across all relevant fields
        // This checks if ANY keyword matches ANY of the fields
        const searchFields = ['name', 'bio', 'job', 'location', 'linkedin', 'twitter', 'instagram']
        const orConditions = criteria.keywords.flatMap((k: string) =>
            searchFields.map(field => `${field}.ilike.%${k}%`)
        ).join(',')

        const { data: contacts, error } = await supabase
            .from('contacts')
            .select('id, name, bio, job, location, tags, interests, user_id')
            .or(orConditions)
            .limit(100)

        // Ideally we loop through all keywords with .or(), but Supabase JS .or() string syntax is tricky for many items.
        // We will stick to the first 2 keywords to narrow candidates.

        if (error) throw error

        // Step 3: AI Truth Table Evaluation
        // We send the contacts + criteria to AI to build the table.

        const evaluationResponse = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deepseekApiKey}` },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system', content: `Evaluate these contacts against the criteria. Return JSON:
                    {
                        "results": [
                            { 
                                "contactId": "...", 
                                "matches": { "Label1": true/false, "Label2": true/false... },
                                "overall_match": true/false (if they match MOST criteria)
                            }
                        ]
                    }
                    Strictly check the provided data. logical inference allowed.`},
                    { role: 'user', content: `Criteria: ${JSON.stringify(criteria.criteria)}\n\nContacts: ${JSON.stringify(contacts)}` }
                ],
                response_format: { type: 'json_object' }
            })
        })

        const evalData = await evaluationResponse.json()
        const evaluation = JSON.parse(evalData.choices[0].message.content)

        // Step 4: Merge Data
        const results = evaluation.results
            .filter((r: any) => r.overall_match) // Only show relevant ones
            .map((r: any) => {
                const c = contacts.find((x: any) => x.id === r.contactId)
                if (!c) return null
                return {
                    ...c,
                    matches: r.matches,
                    isShared: c.user_id !== userId // Flag if it's from network
                }
            })
            .filter((x: any) => x !== null) // Remove failed lookups
            .slice(0, 20) // Max 20 results

        return {
            statusCode: 200,
            body: JSON.stringify({
                criteria: criteria.criteria,
                results
            })
        }

    } catch (err: any) {
        console.error(err)
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
    }
}
