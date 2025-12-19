import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { analyzeInteractions } from './analysisUtils'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEEPSEEK_API_KEY = process.env.VITE_DEEPSEEK_API_KEY
const GOOGLE_API_KEY = process.env.VITE_GOOGLE_SEARCH_API_KEY
const GOOGLE_CX = process.env.VITE_GOOGLE_SEARCH_CX

// This function is triggered by the frontend after a voice log is successfully saved.
// It performs an immediate "Autopilot" analysis for that specific contact.
export const handler: Handler = async (event, context) => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !DEEPSEEK_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: "Missing API Keys" }) }
    }

    const { contactId } = JSON.parse(event.body || '{}')

    if (!contactId) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing contactId" }) }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    try {
        // 1. Fetch Contact & ALL Interactions
        const { data: contact, error } = await supabase
            .from('contacts')
            .select(`*, interactions (*)`)
            .eq('id', contactId)
            .single()

        if (error || !contact) {
            throw new Error('Contact not found')
        }

        // Merge explicit columns into socialLinks object for analysis
        const socialContext = {
            linkedin: contact.linkedin,
            twitter: contact.twitter,
            instagram: contact.instagram,
            facebook: contact.facebook,
            snapchat: contact.snapchat
        }

        // 2. Perform Analysis
        const result = await analyzeInteractions(
            contact.interactions || [],
            socialContext,
            contact.name,
            DEEPSEEK_API_KEY,
            GOOGLE_API_KEY || "",
            GOOGLE_CX || ""
        )

        // 3. Update Contact
        const currentInterests = (contact.interests || []) as any[]
        const newInterests = result.interests || []
        const mergedInterests = [...currentInterests]

        newInterests.forEach((ni: any) => {
            const exists = mergedInterests.find(ci => ci.name.toLowerCase() === ni.name.toLowerCase())
            if (!exists) {
                mergedInterests.push({ ...ni, source: 'ai_autopilot_trigger' })
            } else {
                exists.last_mentioned_at = ni.last_mentioned_at
                exists.confidence = ni.confidence
            }
        })

        // Also add Skills & Fields to Interests (visual tags)
        const sourcePlatform = contact.linkedin ? 'linkedin' : 'ai'

        if (result.detected_skills) {
            result.detected_skills.forEach((skill: string) => {
                if (!mergedInterests.find(i => i.name.toLowerCase() === skill.toLowerCase())) {
                    mergedInterests.push({
                        name: skill,
                        category: 'Professional',
                        confidence: 0.9,
                        frequency: 'high',
                        source: sourcePlatform,
                        last_mentioned: new Date().toISOString().split('T')[0]
                    })
                }
            })
        }

        if (result.detected_fields) {
            result.detected_fields.forEach((field: string) => {
                if (!mergedInterests.find(i => i.name.toLowerCase() === field.toLowerCase())) {
                    mergedInterests.push({
                        name: field,
                        category: 'Professional',
                        confidence: 0.9,
                        frequency: 'high',
                        source: sourcePlatform,
                        last_mentioned: new Date().toISOString().split('T')[0]
                    })
                }
            })
        }

        // Determine Job Update
        let jobUpdate = contact.job || ""
        if (result.detected_job_title) {
            jobUpdate = result.detected_job_title
            if (result.detected_company) {
                jobUpdate += ` at ${result.detected_company}`
            }
        }

        // Format Rich AI Summary
        let richSummary = result.summary
        const profileSections = []

        if (result.detected_education && result.detected_education.length > 0) {
            profileSections.push(`**Education:** ${result.detected_education.join(', ')}`)
        }
        if (result.detected_fields && result.detected_fields.length > 0) {
            profileSections.push(`**Fields:** ${result.detected_fields.join(', ')}`)
        }
        if (result.detected_skills && result.detected_skills.length > 0) {
            profileSections.push(`**Skills:** ${result.detected_skills.join(', ')}`)
        }
        if (result.detected_achievements && result.detected_achievements.length > 0) {
            profileSections.push(`**Achievements:** ${result.detected_achievements.join(' • ')}`)
        }
        if (result.detected_projects && result.detected_projects.length > 0) {
            profileSections.push(`**Projects:** ${result.detected_projects.join(' • ')}`)
        }
        if (result.detected_languages && result.detected_languages.length > 0) {
            profileSections.push(`**Languages:** ${result.detected_languages.join(', ')}`)
        }

        if (profileSections.length > 0) {
            richSummary += `\n\n**Deep Profile:**\n${profileSections.join('\n')}`
        }

        // Merge Fields & Skills into Tags
        const currentTags = (contact.tags || []) as string[]
        const newFields = (result.detected_fields || []) as string[]
        const newSkills = (result.detected_skills || []) as string[] // Sync skills too
        const mergedTags = [...new Set([...currentTags, ...newFields, ...newSkills])]

        await supabase
            .from('contacts')
            .update({
                ai_summary: richSummary,
                relationship_summary: result.relationship_summary,
                interests: mergedInterests,
                job: jobUpdate,
                tags: mergedTags,
                location: result.detected_location || contact.location || "",
                bio: result.detected_bio || contact.bio || "",
                last_analyzed: new Date().toISOString()
            })
            .eq('id', contactId)

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, summary: result.summary })
        }

    } catch (error: any) {
        console.error("Analysis failed", error)
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        }
    }
}
