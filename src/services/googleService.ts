import { supabase } from '../lib/supabase'

export const googleService = {
    syncData: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.provider_token

        if (!token) {
            console.error("No provider token found. Please sign in with Google.")
            throw new Error("No Google token found. Re-login required.")
        }

        console.log("Starting Google Sync...")

        // 1. Fetch Contacts (Enriched)
        const contacts = await fetchGoogleContacts(token)
        console.log(`Fetched ${contacts.length} contacts from Google.`)

        // 2. Save Contacts to Supabase (Blocking - Get profiles first)
        for (const contact of contacts) {
            await upsertContact(contact)
        }

        // 3. Background Sync: Deep Scan History (Non-blocking)
        // We let these run in the "background" so the user doesn't wait
        console.log("Starting background interaction sync...")
        Promise.all([
            syncEmails(token),
            syncCalendar(token)
        ]).then(() => {
            console.log("Background sync complete.")
        }).catch(err => {
            console.error("Background sync failed", err)
        })

        return true
    }
}

// Helper to find contact strictly by email (no creation)
async function findContactByEmail(user_id: string, email: string) {
    const { data: existing } = await supabase
        .from('contacts')
        .select('id, last_contacted')
        .eq('email', email)
        .eq('user_id', user_id)
        .maybeSingle()

    return existing
}

async function fetchGoogleContacts(token: string) {
    // Requesting ALL relevant fields: addresses, organizations, biographies, birthdays, urls, relations
    // Increased page size to 1000, paging not strictly needed for MVP of <1000 contacts but good practice
    const response = await fetch('https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos,addresses,organizations,biographies,birthdays,urls,relations&pageSize=1000', {
        headers: { Authorization: `Bearer ${token}` }
    })

    if (response.status === 401) {
        throw new Error("Unauthorized")
    }

    const data = await response.json()
    return data.connections || []
}

async function upsertContact(googleContact: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const name = googleContact.names?.[0]?.displayName || 'Unknown'
    const email = googleContact.emailAddresses?.[0]?.value
    const phone = googleContact.phoneNumbers?.[0]?.value
    const avatar = googleContact.photos?.[0]?.url

    // Detailed Profile Mapping
    const location = googleContact.addresses?.[0]?.formattedValue

    // Work
    const organization = googleContact.organizations?.[0]
    const job = organization ? `${organization.title || ''} at ${organization.name || ''}`.trim() : undefined

    // Bio (Just the actual bio now, rich data goes to columns)
    const bio = googleContact.biographies?.[0]?.value

    // Birthday
    let birthday = undefined
    const bdayObj = googleContact.birthdays?.[0]?.date
    if (bdayObj) {
        birthday = `${bdayObj.month}/${bdayObj.day}` + (bdayObj.year ? `/${bdayObj.year}` : '')
    }

    // Social Links
    let socialLinks = []
    if (googleContact.urls) {
        socialLinks = googleContact.urls.map((u: any) => ({
            platform: u.type || 'website',
            url: u.value
        }))
    }

    // Relations (Append to Bio for now as we don't have a column, or just leave it)
    let fullBio = bio
    if (googleContact.relations) {
        const relationsStr = googleContact.relations.map((r: any) => `${r.type}: ${r.person}`).join(', ')
        if (relationsStr) fullBio = (fullBio ? fullBio + '\n\n' : '') + `Relations: ${relationsStr}`
    }

    // Simple upsert by email if exists, otherwise create
    if (!email) return

    // Check if exists
    const { data: existing } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', email)
        .eq('user_id', user.id)
        .maybeSingle()

    const contactPayload = {
        user_id: user.id,
        name,
        email,
        phone,
        avatar,
        location: location || existing?.location,
        job: job || existing?.job,
        bio: fullBio || existing?.bio,
        birthday: birthday || existing?.birthday,
        social_links: socialLinks.length > 0 ? socialLinks : (existing?.social_links || []),
        address: location || existing?.address, // Map address to new column too
        last_contacted: existing?.last_contacted || null, // Override DB default 'now()' for new contacts
        updated_at: new Date().toISOString()
    }

    if (existing) {
        // Recalculate strength if interactions exist
        const strength = await recalculateStrength(existing.id)

        await supabase.from('contacts').update({
            ...contactPayload,
            relationship_strength: strength || existing.relationship_strength
        }).eq('id', existing.id)
    } else {
        await supabase.from('contacts').insert(contactPayload)
    }
}

// Heuristic for Relationship Strength
async function recalculateStrength(contactId: string): Promise<string> {
    // 1. Get recent interaction stats
    const { data: interactions } = await supabase
        .from('interactions')
        .select('date')
        .eq('contact_id', contactId)
        .order('date', { ascending: false })

    if (!interactions || interactions.length === 0) return 'drifting'

    const lastDate = new Date(interactions[0].date)
    const now = new Date()
    const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24)
    const count = interactions.length

    // Logic:
    // Close: Contacted in last 14 days OR (> 5 interactions AND contacted in last 30 days)
    if (diffDays <= 14) return 'close'
    if (diffDays <= 30 && count >= 5) return 'close'

    // Medium: Contacted in last 90 days
    if (diffDays <= 90) return 'medium'

    // Weak: Contacted in last 180 days
    if (diffDays <= 180) return 'weak'

    return 'drifting'
}

// Helper to update strength after interaction sync
async function updateContactStrength(contactId: string) {
    const strength = await recalculateStrength(contactId)
    await supabase.from('contacts').update({ relationship_strength: strength }).eq('id', contactId)
}

async function syncEmails(token: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let pageToken = null
    let hasMore = true
    let pageCount = 0
    const MAX_PAGES = 50 // Deep Sync: Cover up to 5,000 recent emails
    const PAGE_SIZE = 100 // Max allowed by Gmail API

    while (hasMore && pageCount < MAX_PAGES) {
        const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${PAGE_SIZE}${pageToken ? `&pageToken=${pageToken}` : ''}`
        const response: any = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        })

        if (response.status === 401) throw new Error("Unauthorized")

        const data = await response.json()

        if (!data.messages) {
            hasMore = false
            break
        }

        console.log(`Syncing Email Page ${pageCount + 1}...`)

        for (const msg of data.messages) {
            try {
                const detailsRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const details = await detailsRes.json()

                // Extract headers
                // Extract headers
                const headers = details.payload.headers
                const subject = headers.find((h: any) => h.name === 'Subject')?.value
                const from = headers.find((h: any) => h.name === 'From')?.value
                const to = headers.find((h: any) => h.name === 'To')?.value
                const date = new Date(parseInt(details.internalDate)).toISOString()

                // Determine 'Other Party' email(s)
                // If From is me, look at To. If From is them, look at From.
                const fromMatch = from?.match(/<(.+)>/)
                const fromEmail = fromMatch ? fromMatch[1] : from

                let targetEmails: string[] = []

                if (fromEmail === user.email) {
                    // Outgoing Email: Check recipients
                    if (to) {
                        const matches = to.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g)
                        if (matches) targetEmails = matches
                    }
                } else {
                    // Incoming Email: Check sender
                    if (fromEmail) targetEmails = [fromEmail]
                }

                // Deduplicate
                targetEmails = [...new Set(targetEmails)]

                for (const email of targetEmails) {
                    if (!email) continue
                    if (email === user.email) continue // Don't log self-interaction

                    const contact = await findContactByEmail(user.id, email)

                    if (contact) {
                        // Check if interaction exists
                        const { data: existing } = await supabase
                            .from('interactions')
                            .select('id')
                            .eq('contact_id', contact.id)
                            .eq('date', date)
                            .maybeSingle()

                        if (!existing) {
                            await supabase.from('interactions').insert({
                                contact_id: contact.id,
                                type: 'email',
                                platform: 'Gmail',
                                date: date,
                                notes: `Subject: ${subject} - ${details.snippet?.substring(0, 100)}...`
                            })

                            // Update last_contacted
                            if (new Date(date) > new Date(contact.last_contacted || 0)) {
                                await supabase
                                    .from('contacts')
                                    .update({
                                        last_contacted: date,
                                        last_contact_type: 'email'
                                    })
                                    .eq('id', contact.id)

                                // Recalc strength
                                await updateContactStrength(contact.id)
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn("Failed to sync email", msg.id, e)
            }
        }

        pageToken = data.nextPageToken
        if (!pageToken) hasMore = false
        pageCount++
    }
}

async function syncCalendar(token: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Go back 10 years for "All History"
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 10)

    let pageToken = null
    let hasMore = true
    let pageCount = 0
    const MAX_PAGES = 20 // Deep Calendar Sync
    const PAGE_SIZE = 100

    while (hasMore && pageCount < MAX_PAGES) {
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${oneYearAgo.toISOString()}&maxResults=${PAGE_SIZE}&singleEvents=true&orderBy=startTime${pageToken ? `&pageToken=${pageToken}` : ''}`
        const response: any = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        })

        if (response.status === 401) throw new Error("Unauthorized")

        const data = await response.json()

        if (!data.items) {
            hasMore = false
            break
        }

        console.log(`Syncing Calendar Page ${pageCount + 1}...`)

        for (const event of data.items) {
            const attendees = event.attendees || []
            for (const attendee of attendees) {
                if (!attendee.email) continue

                // Don't sync yourself
                if (attendee.email === user.email) continue

                // ONLY sync if contact already exists
                const contact = await findContactByEmail(user.id, attendee.email)

                if (contact) {
                    const date = event.start.dateTime || event.start.date
                    const { data: existing } = await supabase
                        .from('interactions')
                        .select('id')
                        .eq('contact_id', contact.id)
                        .eq('date', date)
                        .maybeSingle()

                    if (!existing) {
                        // Include description in notes if available
                        let notes = `Event: ${event.summary}`
                        if (event.description) {
                            notes += `\n\nDetails: ${event.description.substring(0, 300)}...`
                        }

                        await supabase.from('interactions').insert({
                            contact_id: contact.id,
                            type: 'meeting',
                            platform: 'Google Calendar',
                            date: date,
                            notes: notes
                        })

                        // Update last_contacted if this event is newer
                        if (new Date(date) > new Date(contact.last_contacted || 0)) {
                            await supabase
                                .from('contacts')
                                .update({
                                    last_contacted: date,
                                    last_contact_type: 'meeting'
                                })
                                .eq('id', contact.id)

                            // Recalc strength
                            await updateContactStrength(contact.id)
                        }
                    }
                }
            }
        }

        pageToken = data.nextPageToken
        if (!pageToken) hasMore = false
        pageCount++
    }
}
