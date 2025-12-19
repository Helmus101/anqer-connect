
import { schedule } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { analyzeInteractions, performGoogleSearch } from './analysisUtils'

// Environment Variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEEPSEEK_API_KEY = process.env.VITE_DEEPSEEK_API_KEY
const GOOGLE_API_KEY = process.env.VITE_GOOGLE_SEARCH_API_KEY
const GOOGLE_CX = process.env.VITE_GOOGLE_SEARCH_CX

const scheduledHandler = async (event: any) => {
    console.log("Starting Scheduled Autopilot Analysis...")

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !DEEPSEEK_API_KEY) {
        console.error("Missing internal API keys for Autopilot. Aborting.")
        return { statusCode: 500 }
    }

    // Initialize Supabase with Service Key (Bypass RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. Fetch Candidates (Last Analyzed > 30 days ago OR Never)
    // Limit to 5 per run to stay within function timeouts (10s limit usually)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: contacts, error } = await supabase
        .from('contacts')
        .select(`
            *,
            interactions (*)
        `)
        .or(`last_analyzed.is.null,last_analyzed.lt.${thirtyDaysAgo.toISOString()}`)
        .limit(5)

    if (error) {
        console.error("Failed to fetch contacts", error)
        return { statusCode: 500 }
    }

    if (!contacts || contacts.length === 0) {
        console.log("No contacts need analysis.")
        return { statusCode: 200 }
    }

    console.log(`Analyzing ${contacts.length} contacts...`)

    // 2. Process Each Contact
    for (const contact of contacts) {
        try {
            console.log(`Analyzing ${contact.name}...`)

            const result = await analyzeInteractions(
                contact.interactions || [],
                contact.social_links,
                contact.name,
                DEEPSEEK_API_KEY,
                GOOGLE_API_KEY || "",
                GOOGLE_CX || ""
            )

            // 3. Update Contact
            // Merge interests logic could be complex (deduplication), but for "Autopilot" we might just append or replace confident ones.
            // For now, let's Append new ones if high confidence, or strictly rely on the helper's output?
            // The helper returns a fresh list based on current history.
            // It might be safer to MERGE with existing specific interests?
            // Let's trust the AI's fresh view of the *recent* history + *all* history context passed?
            // Wait, we passed ALL history. So the result is comprehensive.
            // We can overwrite interests, or better: merge them carefully.
            // Let's overwrite `ai_summary` and `relationship_summary`, but merge `interests`.

            const newInterests = result.interests || []
            // Simple merge by name
            const currentInterests = (contact.interests || []) as any[]
            const mergedInterests = [...currentInterests]

            newInterests.forEach((ni: any) => {
                const exists = mergedInterests.find(ci => ci.name.toLowerCase() === ni.name.toLowerCase())
                if (!exists) {
                    mergedInterests.push({ ...ni, source: 'ai_autopilot' })
                } else {
                    // Update metadata?
                    exists.last_mentioned_at = ni.last_mentioned_at
                    exists.confidence = ni.confidence
                }
            })

            await supabase
                .from('contacts')
                .update({
                    ai_summary: result.summary,
                    relationship_summary: result.relationship_summary,
                    interests: mergedInterests,
                    last_analyzed: new Date().toISOString()
                })
                .eq('id', contact.id)

            console.log(`Updated ${contact.name}`)

        } catch (e) {
            console.error(`Failed to analyze ${contact.name}`, e)
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: "Autopilot complete" })
    }
}

// Netlify Schedule: Run daily at midnight? User asked for "monthly".
// @monthly = "0 0 1 * *"
export const handler = schedule("@monthly", scheduledHandler)
