import { supabase } from '../lib/supabase'
import type { Contact, Interaction } from '../types'

export const getContacts = async (): Promise<Contact[]> => {
    const { data, error } = await supabase
        .from('contacts')
        .select(`
            *,
            interactions (*),
            events (*)
        `)
        .order('last_contacted', { ascending: false })

    if (error) {
        console.error('Error fetching contacts:', error)
        return []
    }

    return data.map((c: any) => ({
        ...c,
        lastContacted: c.last_contacted,
        lastContactType: c.last_contact_type,
        relationshipStrength: c.relationship_strength,
        howMet: c.how_met,
        relationshipSummary: c.relationship_summary,
        lastAnalyzed: c.last_analyzed,
        interactions: (c.interactions || []).map((i: any) => ({
            ...i,
            contactId: i.contact_id
        })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        events: (c.events || []).map((e: any) => ({
            ...e,
            contactId: e.contact_id
        })).sort((a: any, b: any) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime())
    })) as Contact[]
}

export const getContactById = async (id: string): Promise<Contact | undefined> => {
    const { data, error } = await supabase
        .from('contacts')
        .select(`
            *,
            interactions (*),
            events (*)
        `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching contact:', error)
        return undefined
    }

    return {
        ...data,
        lastContacted: data.last_contacted,
        lastContactType: data.last_contact_type,
        relationshipStrength: data.relationship_strength,
        howMet: data.how_met,
        relationshipSummary: data.relationship_summary,
        lastAnalyzed: data.last_analyzed,
        interactions: (data.interactions || []).map((i: any) => ({
            ...i,
            contactId: i.contact_id
        })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        events: (data.events || []).map((e: any) => ({
            ...e,
            contactId: e.contact_id
        })).sort((a: any, b: any) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime())
    } as Contact
}

export const createInteraction = async (interaction: Partial<Interaction>) => {
    const { data, error } = await supabase
        .from('interactions')
        .insert({
            contact_id: interaction.contactId,
            type: interaction.type,
            date: interaction.date,
            notes: interaction.notes,
            platform: interaction.platform
        })
        .select()
        .single()

    if (error) throw error
    return {
        ...data,
        contactId: data.contact_id
    }
}

export const analyzeInteraction = async (interaction: Partial<Interaction>) => {
    const res = await fetch('/.netlify/functions/analyze-interaction', {
        method: 'POST',
        body: JSON.stringify({
            text: interaction.notes,
            contactId: interaction.contactId,
            type: interaction.type,
            platform: interaction.platform,
            date: interaction.date
        })
    })

    if (!res.ok) {
        throw new Error('Analysis failed')
    }

    const data = await res.json()
    return {
        ...data.interaction,
        contactId: data.interaction.contact_id,
        analysis: data.analysis // Includes topics, commitments, prompts
    }
}

export const getGeneratedPrompts = async (contactId?: string) => {
    // Note: userId is usually handled by RLS, but passing it for clarity if needed.
    // Actually RLS handles it.
    let query = supabase
        .from('generated_prompts')
        .select(`
            *,
            contact:contacts(name, avatar, job)
        `)
        .eq('status', 'new')
        .order('created_at', { ascending: false })
        .limit(10)

    if (contactId) {
        query = query.eq('contact_id', contactId)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching prompts:', error)
        return []
    }

    // Flatten structure for easier UI consumption
    return data.map((p: any) => ({
        ...p,
        contactName: p.contact?.name,
        contactAvatar: p.contact?.avatar,
        contactJob: p.contact?.job
    }))
}

export const createContact = async (contact: Partial<Contact>) => {

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const dbContact = {
        user_id: user.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        how_met: contact.howMet,
        relationship_strength: contact.relationshipStrength,
        last_contacted: new Date().toISOString(),
        last_contact_type: 'in_person',
        tags: contact.tags || [],
        interests: contact.interests || [],
        linkedin: contact.linkedin,
        twitter: contact.twitter,
        instagram: contact.instagram,
        facebook: contact.facebook,
        snapchat: contact.snapchat
    }

    const { data, error } = await supabase
        .from('contacts')
        .insert(dbContact)
        .select()
        .single()

    if (error) throw error
    return data
}

export const updateContact = async (id: string, updates: Partial<Contact>) => {
    // Map frontend camelCase to DB snake_case for specific fields if needed
    // But largely we should trust the structure if we map it correctly.
    // Actually, our DB uses snake_case for some fields (last_contacted, relationship_strength)
    // We should map them properly.

    const dbUpdates: any = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.email !== undefined) dbUpdates.email = updates.email
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone
    if (updates.job !== undefined) dbUpdates.job = updates.job
    if (updates.location !== undefined) {
        dbUpdates.location = updates.location
        dbUpdates.address = updates.location
    }
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio
    if (updates.aiSummary !== undefined) dbUpdates.ai_summary = updates.aiSummary
    if (updates.interests !== undefined) dbUpdates.interests = updates.interests
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags
    if (updates.socialLinks !== undefined) dbUpdates.social_links = updates.socialLinks
    if (updates.relationshipStrength !== undefined) dbUpdates.relationship_strength = updates.relationshipStrength
    if (updates.howMet !== undefined) dbUpdates.how_met = updates.howMet
    if (updates.linkedin !== undefined) dbUpdates.linkedin = updates.linkedin
    if (updates.twitter !== undefined) dbUpdates.twitter = updates.twitter
    if (updates.instagram !== undefined) dbUpdates.instagram = updates.instagram
    if (updates.facebook !== undefined) dbUpdates.facebook = updates.facebook
    if (updates.snapchat !== undefined) dbUpdates.snapchat = updates.snapchat
    if (updates.relationshipSummary !== undefined) dbUpdates.relationship_summary = updates.relationshipSummary
    if (updates.lastAnalyzed !== undefined) dbUpdates.last_analyzed = updates.lastAnalyzed
    if (updates.coordinates !== undefined) dbUpdates.coordinates = `(${updates.coordinates.lng},${updates.coordinates.lat})`

    // Fallback: If we just pass 'updates', TS keys might not match DB keys. 
    // The explicit mapping above is safest.

    const { data, error } = await supabase
        .from('contacts')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

export const enrichContact = async (contactId: string, contact?: Partial<Contact>) => {
    const { data: { session } } = await supabase.auth.getSession()

    try {
        const res = await fetch('/.netlify/functions/enrich-contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || ''}`
            },
            body: JSON.stringify({
                contactId,
                contact: contact || undefined
            })
        })

        // Handle 504 timeout errors
        if (res.status === 504) {
            throw new Error('Enrichment timed out. The process is taking longer than expected. Please try again.')
        }

        // Try to parse JSON, but handle HTML error pages
        let data
        const text = await res.text()
        try {
            data = JSON.parse(text)
        } catch (parseErr) {
            // If response is HTML (like a 504 error page), throw a timeout error
            if (text.includes('<HTML>') || text.includes('<!DOCTYPE')) {
                throw new Error('Enrichment timed out. The process is taking longer than expected. Please try again.')
            }
            throw new Error('Invalid response from server')
        }

        if (!res.ok || !data.success) {
            // Handle both HTTP errors and business logic failures
            const errorMessage = data.error || data.reason || 'Enrichment failed'
            throw new Error(errorMessage)
        }

        return data
    } catch (err: any) {
        // Re-throw with better error message
        if (err.message) {
            throw err
        }
        throw new Error('Enrichment failed. Please try again.')
    }
}
