import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, Globe, Pencil, X, Check, Newspaper, Search, Linkedin, Twitter, Instagram, Facebook } from 'lucide-react'
import { getContactById } from '../../services/contactService'
import type { Contact, Interaction } from '../../types'
import InteractionTimeline from '../../components/contacts/InteractionTimeline'
import LogInteractionModal from '../../components/contacts/LogInteractionModal'
import AddressAutocomplete from '../../components/ui/AddressAutocomplete'
import AnalysisOverlay from '../../components/contacts/AnalysisOverlay'
import ConversationStarters from '../../components/contacts/ConversationStarters'
import { useToast } from '../../context/ToastContext'

// Lazy load wizard
// Lazy load wizard removed

export default function ContactProfile() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { addToast } = useToast()
    const [contact, setContact] = useState<Contact | null>(null)
    const [loading, setLoading] = useState(true)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isLogModalOpen, setIsLogModalOpen] = useState(false)

    // Editing State
    const [isEditing, setIsEditing] = useState(false)
    const [enriching, setEnriching] = useState(false)
    const [editForm, setEditForm] = useState({
        name: '',
        job: '',
        location: '',
        bio: '',
        linkedin: '',
        twitter: '',
        instagram: '',
        facebook: '',
        snapchat: '',
        coordinates: undefined as { lat: number, lng: number } | undefined
    })

    useEffect(() => {
        const loadContact = async () => {
            if (!id) return
            const data = await getContactById(id)
            setContact(data || null)
            setLoading(false)
        }
        loadContact()
    }, [id])

    useEffect(() => {
        if (contact) {
            setEditForm({
                name: contact.name,
                job: contact.job || '',
                location: contact.location || '',
                bio: contact.bio || '',
                linkedin: contact.socialLinks?.find(s => s.platform === 'linkedin')?.url || contact.linkedin || '',
                twitter: contact.socialLinks?.find(s => s.platform === 'twitter')?.url || contact.twitter || '',
                instagram: contact.socialLinks?.find(s => s.platform === 'instagram')?.url || contact.instagram || '',
                facebook: contact.socialLinks?.find(s => s.platform === 'facebook')?.url || contact.facebook || '',
                snapchat: contact.socialLinks?.find(s => s.platform === 'snapchat')?.url || contact.snapchat || '',
                coordinates: contact.coordinates
            })
        }
    }, [contact])

    // Helper to turn [Source](url) into clickable links
    const renderWithSources = (text: string) => {
        if (!text) return null
        const parts = text.split(/(\[.*?\]\(.*?\))/g)
        return parts.map((part, index) => {
            const match = part.match(/^\[(.*?)\]\((.*?)\)$/)
            if (match) {
                return (
                    <a key={index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                        {match[1]}
                    </a>
                )
            }
            return part
        })
    }

    const [enrichmentStatus, setEnrichmentStatus] = useState<'idle' | 'searching' | 'analyzing' | 'complete' | 'error'>('idle')
    const [statusMessage, setStatusMessage] = useState('')

    const handleEnrichContact = async () => {
        if (!contact) return
        setEnrichmentStatus('searching')
        setStatusMessage('Searching Google...')
        setEnriching(true)

        try {
            // Step 1: Search
            const { supabase } = await import('../../lib/supabase')
            const { data: { session } } = await supabase.auth.getSession()

            const headers: any = { 'Content-Type': 'application/json' }
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`
            }

            const searchRes = await fetch('/.netlify/functions/enrich-contact', {
                method: 'POST',
                headers,
                body: JSON.stringify({ contactId: contact.id, step: 'search' })
            })
            const searchData = await searchRes.json()

            if (!searchData.success || !searchData.results) {
                throw new Error("Search failed or no results found.")
            }

            setEnrichmentStatus('analyzing')
            setStatusMessage(`Found ${searchData.results.length} results. Analyzing...`)

            // Step 2: Analyze
            const analyzeRes = await fetch('/.netlify/functions/enrich-contact', {
                method: 'POST',
                headers,
                body: JSON.stringify({ contactId: contact.id, step: 'analyze', searchResults: searchData.results })
            })
            const analyzeData = await analyzeRes.json()

            if (analyzeData.success) {
                const updated = await getContactById(contact.id)
                setContact(updated || null)
                setEnrichmentStatus('complete')
                setStatusMessage(`Success! Added ${analyzeData.enriched.interests?.length || 0} interests.`)
                addToast(`Enrichment complete! Added ${analyzeData.enriched.interests?.length || 0} details.`, 'success')
                setTimeout(() => { setEnrichmentStatus('idle'); setEnriching(false) }, 3000)
            } else {
                setEnrichmentStatus('error')
                setStatusMessage(`Skipped: ${analyzeData.reason}`)
                addToast(`Enrichment skipped: ${analyzeData.reason}`, 'info')
                setTimeout(() => { setEnrichmentStatus('idle'); setEnriching(false) }, 3000)
            }

        } catch (err: any) {
            console.error(err)
            setEnrichmentStatus('error')
            setStatusMessage("Error: " + err.message)
            addToast("Enrichment failed: " + err.message, 'error')
            setTimeout(() => { setEnrichmentStatus('idle'); setEnriching(false) }, 3000)
        }
    }

    const handleSaveProfile = async () => {
        if (!contact) return
        try {
            const { updateContact } = await import('../../services/contactService')

            // Build social links array
            const socialLinks: any[] = []
            if (editForm.linkedin) socialLinks.push({ platform: 'linkedin', url: editForm.linkedin })
            if (editForm.twitter) socialLinks.push({ platform: 'twitter', url: editForm.twitter })
            if (editForm.instagram) socialLinks.push({ platform: 'instagram', url: editForm.instagram })
            if (editForm.facebook) socialLinks.push({ platform: 'facebook', url: editForm.facebook })
            if (editForm.snapchat) socialLinks.push({ platform: 'snapchat', url: editForm.snapchat })

            const updates = {
                name: editForm.name,
                job: editForm.job,
                location: editForm.location,
                bio: editForm.bio,
                linkedin: editForm.linkedin,
                twitter: editForm.twitter,
                instagram: editForm.instagram,
                facebook: editForm.facebook,
                snapchat: editForm.snapchat,
                socialLinks: socialLinks,
                coordinates: editForm.coordinates
            }

            await updateContact(contact.id, updates)

            // Update local state deeply
            setContact({
                ...contact,
                ...updates,
                linkedin: editForm.linkedin,
                twitter: editForm.twitter,
                instagram: editForm.instagram,
                facebook: editForm.facebook,
                snapchat: editForm.snapchat
            })
            setIsEditing(false)
            addToast("Profile updated successfully", 'success')
        } catch (error) {
            console.error("Failed to update profile", error)
            addToast("Failed to update profile", 'error')
        }
    }

    const handleRemoveInterest = async (interestName: string) => {
        if (!contact || !contact.interests) return
        const newInterests = contact.interests.filter(i => i.name !== interestName)
        // Optimistic update
        const previousContact = { ...contact }
        setContact({ ...contact, interests: newInterests })
        try {
            const { updateContact } = await import('../../services/contactService')
            await updateContact(contact.id, { interests: newInterests })
        } catch (error) {
            console.error("Failed to remove interest", error)
            setContact(previousContact)
            addToast("Failed to remove interest", 'error')
        }
    }

    const handleAnalysisComplete = async (_summaryResult: string) => {
        // Refresh contact entirely to get new interests/job
        if (!contact) return
        const updated = await getContactById(contact.id)
        if (updated) setContact(updated)
    }



    const handleLogInteraction = async (newInteraction: Partial<Interaction>, analyze: boolean) => {
        if (!contact) return
        try {
            const contactService = await import('../../services/contactService')

            let savedInteraction;

            if (analyze) {
                // Use the new AI analysis service
                // Ensure contactId is set
                newInteraction.contactId = contact.id
                savedInteraction = await contactService.analyzeInteraction(newInteraction)
            } else {
                // Standard save
                savedInteraction = await contactService.createInteraction({
                    contactId: contact.id,
                    type: newInteraction.type,
                    date: newInteraction.date,
                    notes: newInteraction.notes,
                    platform: newInteraction.type === 'in_person' ? 'In Person' :
                        newInteraction.type === 'call' ? 'Phone' :
                            newInteraction.type === 'whatsapp' ? 'WhatsApp' :
                                newInteraction.type === 'instagram' ? 'Instagram' : 'Message',
                })
            }

            // Refresh contact to get latest data (including any AI updates to profile)
            const updatedProfile = await contactService.getContactById(contact.id)
            if (updatedProfile) {
                setContact(updatedProfile)
            } else {
                // Fallback if full refresh fails
                const updatedContact = {
                    ...contact,
                    lastContacted: savedInteraction.date,
                    lastContactType: savedInteraction.type,
                    interactions: [savedInteraction, ...(contact.interactions || [])]
                }
                setContact(updatedContact)
            }
        } catch (error) {
            console.error("Failed to log interaction", error)
            alert("Failed to save interaction")
        }
    }


    if (loading) return (
        <div className="p-8 max-w-4xl mx-auto min-h-screen bg-white">
            <div className="animate-pulse space-y-8">
                <div className="flex gap-6 items-center border-b border-gray-100 pb-8">
                    <div className="w-24 h-24 bg-gray-100 rounded-full"></div>
                    <div className="space-y-3 flex-1">
                        <div className="h-8 bg-gray-100 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                        <div className="flex gap-2">
                            <div className="w-16 h-6 bg-gray-100 rounded"></div>
                            <div className="w-16 h-6 bg-gray-100 rounded"></div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 space-y-4">
                        <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                        <div className="h-32 bg-gray-100 rounded w-full"></div>
                    </div>
                    <div className="space-y-4">
                        <div className="h-32 bg-gray-100 rounded w-full"></div>
                    </div>
                </div>
            </div>
        </div>
    )
    if (!contact) return <div className="p-8 text-red-500">Contact not found</div>

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in duration-500 bg-white min-h-screen">
            <button
                onClick={() => navigate('/contacts')}
                className="mb-8 text-gray-400 hover:text-black transition-all flex items-center gap-2 font-medium text-sm hover:-translate-x-1 duration-200 group"
            >
                <ArrowLeft size={18} className="transition-transform group-hover:scale-110" /> Back to Contacts
            </button>

            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 items-start mb-8 border-b border-gray-100 pb-8">
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-600 shrink-0 border border-gray-200">
                    {contact.avatar ? <img src={contact.avatar} alt={contact.name} className="w-full h-full rounded-full object-cover" /> : contact.name[0]}
                </div>

                <div className="flex-1 w-full">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            {isEditing ? (
                                <div className="space-y-3 w-full max-w-lg mb-4">
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                        className="text-3xl font-extrabold text-black border-b border-gray-300 w-full outline-none py-1"
                                        placeholder="Name"
                                    />
                                    <input
                                        type="text"
                                        value={editForm.job}
                                        onChange={e => setEditForm({ ...editForm, job: e.target.value })}
                                        className="text-lg text-gray-600 border-b border-gray-300 w-full outline-none py-1"
                                        placeholder="Job Title"
                                    />
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-500 uppercase">Address</label>
                                        <AddressAutocomplete
                                            value={editForm.location || ''}
                                            onChange={(val) => setEditForm({ ...editForm, location: val })}
                                            onSelect={(item) => {
                                                setEditForm({
                                                    ...editForm,
                                                    location: item.display_name,
                                                    coordinates: { lat: item.lat, lng: item.lon }
                                                })
                                            }}
                                        />
                                    </div>
                                    <textarea
                                        value={editForm.bio}
                                        onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                                        className="text-sm text-gray-600 border border-gray-200 w-full rounded p-2 outline-none h-24 resize-none"
                                        placeholder="Bio / Summary"
                                    />

                                    <div className="grid grid-cols-1 gap-2 pt-2">
                                        <div className="relative">
                                            <Linkedin className="absolute left-2 top-2.5 text-blue-600 pointer-events-none" size={14} />
                                            <input
                                                type="text"
                                                value={editForm.linkedin}
                                                onChange={e => setEditForm({ ...editForm, linkedin: e.target.value })}
                                                className="text-xs border p-2 pl-8 rounded w-full border-gray-200 focus:border-black focus:outline-none transition-colors"
                                                placeholder="LinkedIn URL"
                                            />
                                        </div>



                                        <div className="relative">
                                            <Twitter className="absolute left-2 top-2.5 text-sky-500 pointer-events-none" size={14} />
                                            <input
                                                type="text"
                                                value={editForm.twitter}
                                                onChange={e => setEditForm({ ...editForm, twitter: e.target.value })}
                                                className="text-xs border p-2 pl-8 rounded w-full border-gray-200 focus:border-black focus:outline-none transition-colors"
                                                placeholder="Twitter URL"
                                            />
                                        </div>
                                        <div className="relative">
                                            <Instagram className="absolute left-2 top-2.5 text-pink-600 pointer-events-none" size={14} />
                                            <input
                                                type="text"
                                                value={editForm.instagram}
                                                onChange={e => setEditForm({ ...editForm, instagram: e.target.value })}
                                                className="text-xs border p-2 pl-8 rounded w-full border-gray-200 focus:border-black focus:outline-none transition-colors"
                                                placeholder="Instagram URL"
                                            />
                                        </div>
                                        <div className="relative">
                                            <Facebook className="absolute left-2 top-2.5 text-blue-800 pointer-events-none" size={14} />
                                            <input
                                                type="text"
                                                value={editForm.facebook}
                                                onChange={e => setEditForm({ ...editForm, facebook: e.target.value })}
                                                className="text-xs border p-2 pl-8 rounded w-full border-gray-200 focus:border-black focus:outline-none transition-colors"
                                                placeholder="Facebook URL"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-4">
                                        <button onClick={handleSaveProfile} className="bg-black text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"><Check size={14} /> Save</button>
                                        <button onClick={() => setIsEditing(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm font-bold flex items-center gap-2"><X size={14} /> Cancel</button>
                                    </div>
                                </div >
                            ) : (
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h1 className="text-3xl font-extrabold text-black tracking-tight mb-2">{contact.name}</h1>
                                            <div className="flex gap-2 mb-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                                    ${contact.relationshipStrength === 'close' ? 'bg-purple-100 text-purple-700' :
                                                        contact.relationshipStrength === 'medium' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-600'}`}>
                                                    {contact.relationshipStrength || 'Connect'}
                                                </span>
                                                {contact.healthScore !== undefined && (
                                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-100">
                                                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${contact.healthScore > 80 ? 'bg-green-500' :
                                                                    contact.healthScore > 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                                    }`}
                                                                style={{ width: `${contact.healthScore}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-bold text-green-700">{contact.healthScore}% Health</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-lg text-gray-600 font-medium mb-1">{contact.job || 'No Job Title'}</p>

                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={handleEnrichContact}
                                                disabled={enriching}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all shadow-sm ${enriching
                                                    ? (enrichmentStatus === 'analyzing' ? 'bg-purple-50 text-purple-700 border-purple-200 cursor-not-allowed' : 'bg-blue-50 text-blue-700 border-blue-200 cursor-not-allowed')
                                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-black hover:shadow-md'
                                                    }`}
                                            >
                                                {enriching ? <Sparkles size={16} className="animate-spin text-purple-500" /> : <Search size={16} />}
                                                {enriching ? statusMessage : 'Find Online Info'}
                                            </button>
                                            <a
                                                href={`https://www.google.com/search?q=${encodeURIComponent(contact.name + " news")}&tbm=nws`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-black transition-all shadow-sm hover:shadow-md"
                                            >
                                                <Newspaper size={16} />
                                                Check News
                                            </a>
                                        </div>
                                    </div>

                                    <div className="text-sm text-gray-400 mb-4 space-y-1">
                                        {contact.location && <p>📍 {contact.location}</p>}
                                        {contact.address && !contact.location && <p>📍 {contact.address}</p>}
                                        {contact.birthday && <p>🎂 {contact.birthday}</p>}
                                    </div>

                                    {contact.bio && (
                                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4 max-w-xl">
                                            {renderWithSources(contact.bio)}
                                        </div>
                                    )}

                                    {/* Socials Display */}
                                    <div className="flex gap-2 flex-wrap mb-4">
                                        {contact.socialLinks?.map((link, i) => (
                                            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                                                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md transition-colors font-medium border border-gray-200 flex items-center gap-1">
                                                {link.platform.includes('linkedin') ? '👔' :
                                                    link.platform.includes('twitter') ? '🐦' :
                                                        link.platform.includes('instagram') ? '📸' :
                                                            link.platform.includes('facebook') ? '📘' :
                                                                link.platform.includes('snapchat') ? '👻' : '🌐'}
                                                {link.platform}
                                            </a>
                                        ))}
                                        {/* Legacy field support */}
                                        {!contact.socialLinks && contact.linkedin && <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">LinkedIn ↗</a>}
                                        {!contact.socialLinks && contact.twitter && <a href={contact.twitter} target="_blank" rel="noopener noreferrer" className="text-xs bg-sky-50 text-sky-700 px-2 py-1 rounded">Twitter ↗</a>}
                                    </div>
                                </div>
                            )}
                        </div >

                        {!isEditing && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button
                                    onClick={() => navigate('/smart-search')}
                                    className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
                                    title="Go to Smart Search"
                                >
                                    <Globe size={18} />
                                </button>
                            </div>
                        )}
                    </div >
                </div >
            </div >

            {/* Actions Bar */}
            < div className="flex gap-3 mb-8" >
                <button
                    onClick={() => setIsLogModalOpen(true)}
                    className="bg-black text-white px-6 py-2 rounded-md font-bold hover:bg-gray-900 transition-colors shadow-sm"
                >
                    Log Interaction
                </button>
                <button
                    onClick={() => setIsAnalyzing(true)}
                    className="bg-white border border-black text-black px-4 py-2 rounded-md font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
                >
                    <Sparkles size={16} /> Analyze
                </button>

                {/* Suggested Topics / Conversation Starters */}
                <ConversationStarters contactId={contact.id} />

            </div >

            {/* AI Summary Section */}
            {/* AI Summary & Relationship Section */}
            {
                (contact.aiSummary || contact.relationshipSummary) && (
                    <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-6 md:p-8 mb-8 shadow-sm">
                        {contact.relationshipSummary && (
                            <div className="mb-6 border-b border-gray-100 pb-6">
                                <h2 className="text-lg font-bold text-black mb-3 tracking-tight flex items-center gap-2">
                                    <Sparkles size={18} className="text-purple-600" />
                                    Relationship Summary
                                </h2>
                                <p className="text-black text-lg leading-relaxed whitespace-pre-line font-medium">
                                    {contact.relationshipSummary}
                                </p>
                                {contact.lastAnalyzed && <p className="text-xs text-gray-400 mt-2">Last analyzed: {new Date(contact.lastAnalyzed).toLocaleDateString()}</p>}
                            </div>
                        )}

                        {contact.aiSummary && (
                            <div>
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
                                    Web Intelligence
                                </h2>
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                    {renderWithSources(contact.aiSummary)}
                                </p>
                            </div>
                        )}
                    </div>
                )
            }

            {/* Interest Tags */}
            <div className="mb-10">
                <h2 className="text-lg font-bold text-black mb-4 tracking-tight">Interests</h2>
                <div className="flex flex-wrap gap-2">
                    {contact.interests?.map((interest, idx) => (
                        interest.link ? (
                            <div key={`int-${idx}`} className="flex items-center gap-1 group/tag">
                                <a
                                    href={interest.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm text-sm hover:bg-blue-100 transition-colors"
                                    title={`Source: ${interest.link}`}
                                >
                                    <span className="text-blue-800 font-medium hover:underline">{interest.name}</span>
                                    <span className="text-[10px] bg-white text-blue-600 px-1.5 rounded font-bold">SRC</span>
                                </a>
                                <button
                                    onClick={() => handleRemoveInterest(interest.name)}
                                    className="opacity-0 group-hover/tag:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5"
                                    title="Remove interest"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div key={`int-${idx}`} className="flex items-center gap-1 group/tag">
                                <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm text-sm">
                                    <span className="text-gray-800 font-medium">{interest.name}</span>
                                    {interest.source === 'instagram' && <span className="text-[10px] bg-pink-100 text-pink-600 px-1.5 rounded font-bold">IG</span>}
                                    {interest.source === 'linkedin' && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded font-bold">IN</span>}
                                    {interest.source === 'spotify' && <span className="text-[10px] bg-green-100 text-green-600 px-1.5 rounded font-bold">SP</span>}
                                </div>
                                <button
                                    onClick={() => handleRemoveInterest(interest.name)}
                                    className="opacity-0 group-hover/tag:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5"
                                    title="Remove interest"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )
                    ))}
                    {/* Render extracted tags as well */}
                    {contact.tags?.map((tag, idx) => (
                        <div key={`tag-${idx}`} className="bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm text-sm">
                            <span className="text-purple-800 font-medium">#{tag}</span>
                            <span className="text-[10px] bg-white text-purple-600 px-1.5 rounded font-bold">AI</span>
                        </div>
                    ))}
                    {!contact.interests?.length && !contact.tags?.length && <p className="text-gray-400 italic">No interests detected yet.</p>}
                </div>
            </div>

            {/* Stats & Updates Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-black mb-4 tracking-tight">Recent Updates</h2>
                    {contact.tags.includes('Hiking Buddies') ? (
                        <div className="flex gap-4 items-start">
                            <div className="bg-gray-100 p-3 rounded-md text-2xl">🏔️</div>
                            <div>
                                <p className="text-gray-900 font-bold">Went hiking in Hudson Valley</p>
                                <p className="text-sm text-gray-500 mt-1">2 days ago • Detected from Instagram</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm">No recent updates.</p>
                    )}
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col justify-center items-center">
                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Interactions</span>
                    <span className="text-5xl font-black text-black">{contact.interactions?.length || 0}</span>
                </div>
            </div>

            {/* Interaction History */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 md:p-8 shadow-sm">
                <h2 className="text-lg font-bold text-black mb-6 tracking-tight">Interaction History</h2>
                {contact.interactions ? (
                    <InteractionTimeline interactions={contact.interactions} />
                ) : (
                    <p className="text-gray-500">No interaction history loaded.</p>
                )}
            </div>

            <LogInteractionModal
                isOpen={isLogModalOpen}
                onClose={() => setIsLogModalOpen(false)}
                onSave={handleLogInteraction}
            />

            <AnalysisOverlay
                isOpen={isAnalyzing}
                onClose={() => setIsAnalyzing(false)}
                onComplete={handleAnalysisComplete}
                contactId={contact.id}
                contactName={contact.name}
                onError={(err) => alert(err)}
            />

        </div >
    )
}
