import { supabase } from '../lib/supabase'

export const saveEnrichmentData = async (contactId: string, data: any) => {
    let summary = ""
    let relationshipSummary = ""
    let newInterests: any[] = []
    let currentRole = null
    let currentLocation = null
    let currentBio = null
    let detectedEducation: string[] = []
    let detectedFields: string[] = []
    let detectedSkills: string[] = []
    let detectedAchievements: string[] = []
    let detectedProjects: string[] = []
    let detectedLanguages: string[] = []
    let socialProfiles: any[] = []

    if (data.warn) {
        console.warn("Enrichment Warning:", data.warn)
        // If it's a warning, we might still want to save what we have, or abort.
        // For Insufficient Data, likely abort.
        if (data.warn.includes("Insufficient")) {
            return `[Warning: ${data.warn}]`
        }
    }

    if (typeof data === 'string') {
        summary = data
    } else {
        summary = data.summary || "No summary generated."
        relationshipSummary = data.relationship_summary || ""
        newInterests = data.interests || []
        newInterests = data.interests || []
        currentRole = data.detected_job_title ? (data.detected_company ? `${data.detected_job_title} at ${data.detected_company}` : data.detected_job_title) : (data.current_role)
        currentLocation = data.detected_location || data.current_location
        currentBio = data.detected_bio || data.bio
        detectedEducation = data.detected_education || []
        detectedFields = data.detected_fields || []
        detectedSkills = data.detected_skills || []
        detectedAchievements = data.detected_achievements || []
        detectedProjects = data.detected_projects || []
        detectedLanguages = data.detected_languages || []
        socialProfiles = data.social_profiles || []
    }

    // Fetch Current Contact to Merge Interests
    const { data: currentContact } = await supabase
        .from('contacts')
        .select('interests, tags, social_links, ai_summary, linkedin')
        .eq('id', contactId)
        .single()

    // Merge & Dedup Interests
    const existingInterests = currentContact?.interests || []
    const existingNames = new Set(existingInterests.map((i: any) => i.name.toLowerCase()))

    // newInterests coming from backend is [{ name: 'Hiking', source_url: '...' }]
    const interestObjectsToAdd = newInterests
        .filter((i: any) => !existingNames.has(i.name.toLowerCase()))
        .map((i: any) => ({
            name: i.name,
            category: i.category || 'Personal',
            confidence: i.confidence || 0.5,
            last_mentioned: i.last_mentioned || new Date().toISOString().split('T')[0],
            context: i.context_snippet || "",
            frequency: 'medium',
            source: 'conversation',
            link: i.source_url || null
        }))

    // Add Skills/Fields as Interests
    const sourcePlatform = currentContact?.linkedin || currentContact?.social_links?.find((s: any) => s.platform === 'linkedin') ? 'linkedin' : 'ai'

    const skillsAsInterests = [...detectedSkills, ...detectedFields]
        .filter(name => !existingNames.has(name.toLowerCase()))
        .map(name => ({
            name: name,
            category: 'Professional',
            confidence: 0.9,
            frequency: 'high',
            source: sourcePlatform,
            last_mentioned: new Date().toISOString().split('T')[0],
            context: "Deep Profile Extraction",
            link: null
        }))

    const updatedInterests = [...existingInterests, ...interestObjectsToAdd, ...skillsAsInterests]



    // Sync to Tags as well (deduplicated)
    const currentTags = currentContact?.tags || []
    const newTags = [
        ...currentTags,
        ...newInterests
            .map((i: any) => i.name)
            .filter((name: string) => !currentTags.includes(name)),
        ...detectedFields
            .filter((name: string) => !currentTags.includes(name)),
        ...detectedSkills
            .filter((name: string) => !currentTags.includes(name))
    ]

    // Merge Social Links
    const existingSocials = currentContact?.social_links || []
    const existingUrls = new Set(existingSocials.map((s: any) => s.url))

    const newSocials = socialProfiles.filter((s: any) => !existingUrls.has(s.url))
    const updatedSocials = [...existingSocials, ...newSocials]

    // Prepare updates
    let finalSummary = summary
    if (relationshipSummary) {
        finalSummary = `${summary}\n\n**Relationship Dynamic:**\n${relationshipSummary}`
    }

    const profileSections = []
    if (detectedEducation.length > 0) profileSections.push(`**Education:** ${detectedEducation.join(', ')}`)
    if (detectedFields.length > 0) profileSections.push(`**Fields:** ${detectedFields.join(', ')}`)
    if (detectedSkills.length > 0) profileSections.push(`**Skills:** ${detectedSkills.join(', ')}`)
    if (detectedAchievements.length > 0) profileSections.push(`**Achievements:** ${detectedAchievements.join(' • ')}`)
    if (detectedProjects.length > 0) profileSections.push(`**Projects:** ${detectedProjects.join(' • ')}`)
    if (detectedLanguages.length > 0) profileSections.push(`**Languages:** ${detectedLanguages.join(', ')}`)

    if (profileSections.length > 0) {
        finalSummary += `\n\n**Deep Profile:**\n${profileSections.join('\n')}`
    }

    const updates: any = {
        ai_summary: finalSummary,
        interests: updatedInterests,
        tags: newTags,
        social_links: updatedSocials
    }

    if (currentRole) updates.job = currentRole
    if (currentLocation) updates.location = currentLocation
    if (currentBio) updates.bio = currentBio

    // Save to Database
    await supabase
        .from('contacts')
        .update(updates)
        .eq('id', contactId)

    return finalSummary
}

export const generateContactSummary = async (contactId: string, mode: 'analysis' | 'web' = 'analysis') => {
    try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error("Not authenticated")

        // 1. Fetch Interactions (for analysis mode)
        const { data: interactions } = await supabase
            .from('interactions')
            .select('*')
            .eq('contact_id', contactId)
            .order('date', { ascending: false })
            .limit(500)

        // 2. Fetch Contact Details (for web mode)
        const { data: contact } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', contactId)
            .single()

        // 3. Call Netlify Function Proxy
        const response = await fetch('/.netlify/functions/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                interactions: interactions || [],
                contactName: contact?.name,
                contactJob: contact?.job,
                contactLocation: contact?.location,
                search_network: true, // Legacy flag, harmless
                socialLinks: {
                    linkedin: contact?.linkedin,
                    twitter: contact?.twitter,
                    instagram: contact?.instagram,
                    facebook: contact?.facebook,
                    snapchat: contact?.snapchat,
                    ...(Array.isArray(contact?.social_links) ? {} : contact?.social_links) // fallback
                },
                enrich_mode: mode
            })
        })

        if (!response.ok) {
            const err = await response.text()
            throw new Error(`Summary Service Error: ${err}`)
        }

        const data = await response.json()

        // 4. Save using helper
        return await saveEnrichmentData(contactId, data)

    } catch (error) {
        console.error("AI Summary Generation Failed", error)
        throw error
    }
}
