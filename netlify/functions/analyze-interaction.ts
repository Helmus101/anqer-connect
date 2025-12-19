import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const deepseekApiKey = process.env.VITE_DEEPSEEK_API_KEY

const supabase = createClient(supabaseUrl!, supabaseKey!)

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

    const { text, contactId, type, platform, date } = JSON.parse(event.body || '{}')

    if (!text || !contactId) return { statusCode: 400, body: 'Missing text or contactId' }

    try {
        // 1. AI Analysis
        const aiResponse = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deepseekApiKey}` },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system', content: `You are an expert relationship manager. Current Date: ${new Date().toISOString().split('T')[0]}. 
                        Analyze the interaction text and return a JSON object with:
                    1. "sentiment": "positive" | "neutral" | "concerned"
                    2. "topics": ["topic1", "topic2"] (limit to 5 key topics)
                    3. "commitments": [{ "who": "me" | "them", "what": "...", "status": "pending", "dueDate": "YYYY-MM-DD" | null }]
                    4. "prompts": [{ "prompt": "Ask about...", "context": "Because they mentioned..." }] (2 conversation starters)
                    5. "extracted_info": { "birthday": "YYYY-MM-DD" | null, "location": "City, Country" | null, "job": "Job Title" | null }

                    Example:
                    "Had coffee with John. He loves his new job at Apple. We agreed I'd send him the deck by Friday. He mentioned he's moving to Austin next month."
                    Output:
                    {
                        "sentiment": "positive",
                        "topics": ["Apple", "Job", "Austin"],
                        "commitments": [{ "who": "me", "what": "Send deck", "status": "pending", "dueDate": "2023-10-27" }],
                        "prompts": [{ "prompt": "Ask about the move to Austin", "context": "He mentioned moving next month" }, { "prompt": "How is the role at Apple?", "context": "New job" }],
                        "extracted_info": { "location": "Austin", "job": "Apple" }
                    }`},
                    { role: 'user', content: `Analyze this interaction with contact (ID: ${contactId}):\n\n"${text}"` }
                ],
                response_format: { type: 'json_object' }
            })
        })

        const aiData = await aiResponse.json()
        const result = JSON.parse(aiData.choices[0].message.content)

        // 2. Save Interaction with Metadata
        const { data: interaction, error: interactionError } = await supabase
            .from('interactions')
            .insert({
                contact_id: contactId,
                type: type || 'notes',
                date: date || new Date().toISOString(),
                notes: text,
                platform: platform || 'manual',
                topics: result.topics,
                sentiment: result.sentiment,
                commitments: result.commitments
            })
            .select()
            .single()

        if (interactionError) throw interactionError

        // 3. Save Generated Prompts
        if (result.prompts && result.prompts.length > 0) {
            const promptsToInsert = result.prompts.map((p: any) => ({
                contact_id: contactId,
                prompt: p.prompt,
                context: p.context,
                status: 'new'
            }))
            const { error: promptsError } = await supabase
                .from('generated_prompts')
                .insert(promptsToInsert)

            if (promptsError) console.error("Error saving prompts", promptsError)
        }

        // 4. Fetch current contact data to get health_score
        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .select('health_score, tags')
            .eq('id', contactId)
            .single()

        if (contactError) throw contactError

        // 5. Calculate New Health Score & Aggregate Interests
        // Simple logic: Start at current score (or 50), add/subtract based on sentiment.
        const currentScore = contact.health_score || 50
        let scoreChange = 0
        if (result.sentiment === 'positive') scoreChange = 10
        else if (result.sentiment === 'concerned') scoreChange = -5
        else scoreChange = 2

        let newHealthScore = Math.max(0, Math.min(100, currentScore + scoreChange))

        // Aggregate Topics into Tags
        // We treat 'topics' from the analysis as potential 'interests' or 'tags' for the contact.
        const currentTags: string[] = contact.tags || []
        const newTopics: string[] = result.topics || []

        // Merge and deduplicate
        const updatedTags = Array.from(new Set([...currentTags, ...newTopics])).slice(0, 20) // Limit to 20 tags

        // Prepare updates
        const contactUpdates: any = {
            last_contacted: interaction.date,
            last_contact_type: interaction.type,
            last_analyzed_at: new Date().toISOString(),
            health_score: newHealthScore,
            tags: updatedTags
        }

        // Apply extracted info if present
        if (result.extracted_info) {
            if (result.extracted_info.birthday) contactUpdates.birthday = result.extracted_info.birthday
            if (result.extracted_info.location) contactUpdates.location = result.extracted_info.location
            if (result.extracted_info.job) contactUpdates.job = result.extracted_info.job
        }

        // Update Contact with new analysis data + Health Score + Tags
        const { error: updateError } = await supabase
            .from('contacts')
            .update(contactUpdates)
            .eq('id', contactId)

        if (updateError) throw updateError

        return {
            statusCode: 200,
            body: JSON.stringify({
                interaction: interaction,
                analysis: result,
                newHealthScore
            })
        }

    } catch (err: any) {
        console.error(err)
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
    }
}
