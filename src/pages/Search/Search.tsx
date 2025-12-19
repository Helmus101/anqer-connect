import { useState, useEffect } from 'react'
import { Search as SearchIcon, Check, X, Filter, Users, Sparkles } from 'lucide-react'
import type { Contact } from '../../types'
// import { getContacts } from '../../services/contactService' // No longer used directly
import { searchNetwork } from '../../services/friendService'
import { useNavigate } from 'react-router-dom'

export default function Search() {
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [terms, setTerms] = useState<string[]>([])
    const [results, setResults] = useState<Contact[]>([])
    const [loading, setLoading] = useState(false)
    const [performedSearch, setPerformedSearch] = useState(false)

    // Debounce query to parsing terms
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!query.trim()) {
                setTerms([])
                return
            }
            // Heuristic "AI" breakdown:
            // Split by space, ignore small words, treat as "features"
            const ignoredWords = ['in', 'the', 'who', 'is', 'a', 'an', 'and', 'or', 'friends', 'people', 'contacts']
            const rawTerms = query.split(/[\s,]+/).filter(w => w.length > 1 && !ignoredWords.includes(w.toLowerCase()))

            // Deduplicate and capitalize
            const distinctTerms = Array.from(new Set(rawTerms.map(t => t.charAt(0).toUpperCase() + t.slice(1))))
            setTerms(distinctTerms)
        }, 300)
        return () => clearTimeout(timeout)
    }, [query])

    const checkMatch = (contact: Contact, term: string): boolean => {
        const t = term.toLowerCase()
        const searchableText = [
            contact.name,
            contact.job,
            contact.location,
            contact.bio,
            contact.aiSummary,
            contact.address,
            ...(contact.interests?.map(i => i.name) || []),
            ...(contact.tags || [])
        ].join(' ').toLowerCase()

        return searchableText.includes(t)
    }

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        setLoading(true)
        setPerformedSearch(true)

        try {
            // Use Enhanced Network Search RPC
            const networkResults = await searchNetwork(query)

            // Map RPC results to Contact-like objects
            // The RPC returns { contact_id, contact_name, ..., is_own_contact, owner_email }
            const mappedContacts = networkResults.map((r: any) => ({
                id: r.contact_id,
                name: r.contact_name,
                job: r.contact_job,
                location: r.contact_location,
                bio: r.contact_bio,
                aiSummary: r.contact_ai_summary,
                interests: r.contact_interests,
                socialLinks: r.contact_social_links,
                tags: r.contact_tags,
                // Extra fields for UI
                is_own_contact: r.is_own_contact,
                owner_email: r.owner_email,
                avatar: null // Avatar not in RPC yet, use initial
            }))

            // Sort by number of matches desc
            const scored = mappedContacts.map((c: any) => {
                const matches = terms.filter(t => checkMatch(c, t)).length
                return { contact: c, matches, isOwn: c.is_own_contact }
            })
                .filter((item: any) => item.matches > 0) // Only show at least 1 match
                .sort((a: any, b: any) => {
                    // Sort by matches desc, then prioritize own contacts
                    if (b.matches !== a.matches) return b.matches - a.matches
                    return (a.isOwn === b.isOwn) ? 0 : a.isOwn ? -1 : 1
                })

            setResults(scored.map((s: any) => s.contact))
        } catch (error) {
            console.error("Search failed", error)
            setResults([])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto min-h-screen">
            <h1 className="text-3xl font-extrabold text-black tracking-tight mb-8">Search Network</h1>

            {/* Smart Search Banner */}
            <div
                onClick={() => navigate('/smart-search')}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white mb-8 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all group"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2 font-bold opacity-90">
                            <Sparkles size={16} />
                            <span>AI Discovery</span>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Find people by context</h2>
                        <p className="opacity-80">"Investors in London", "Designers who like Jazz"...</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full group-hover:bg-white/30 transition-colors">
                        <SearchIcon size={24} />
                    </div>
                </div>
            </div>

            <form onSubmit={handleSearch} className="relative mb-8">
                <SearchIcon className="absolute left-4 top-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by name, job, or location..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-12 p-4 bg-gray-50 border-none rounded-xl text-lg font-medium focus:ring-2 focus:ring-black outline-none transition-shadow"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black text-white px-6 py-2 rounded-md font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                    {loading ? 'Thinking...' : 'Analyze'}
                </button>
            </form>

            {/* Terms Preview */}
            {terms.length > 0 && !loading && (
                <div className="mb-6 flex gap-2 items-center flex-wrap">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest mr-2 flex items-center gap-1">
                        <Filter size={14} /> Criteria:
                    </span>
                    {terms.map(t => (
                        <span key={t} className="bg-gray-100 border border-gray-200 px-3 py-1 rounded-full text-sm font-bold text-black">
                            {t}?
                        </span>
                    ))}
                </div>
            )}

            {/* TRUTH TABLE RESULTS */}
            <div className="space-y-4">
                {performedSearch && results.length === 0 && !loading && (
                    <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        No matches found. Try strictly one criteria?
                    </div>
                )}

                {results.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                        <table className="w-full text-left bg-white">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-4 font-bold text-sm text-gray-500 uppercase tracking-wider w-1/3">Contact</th>
                                    {terms.map(term => (
                                        <th key={term} className="p-4 font-bold text-sm text-black uppercase tracking-wider text-center border-l border-gray-100">
                                            Is {term}?
                                        </th>
                                    ))}
                                    <th className="p-4 font-bold text-sm text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {results.map(contact => (
                                    <tr
                                        key={contact.id}
                                        onClick={() => navigate(`/contacts/${contact.id}`)}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden font-bold relative">
                                                    {contact.avatar ? <img src={contact.avatar} className="w-full h-full object-cover" /> : contact.name?.[0]}

                                                    {/* Network Badge */}
                                                    {!(contact as any).is_own_contact && (
                                                        <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white rounded-full p-1 border-2 border-white" title={`In ${(contact as any).owner_email} 's Network`}>
                                                            < Users size={8} />
                                                        </div >
                                                    )}
                                                </div >
                                                <div>
                                                    <div className="font-bold text-black group-hover:underline flex items-center gap-2">
                                                        {contact.name}
                                                        {!(contact as any).is_own_contact && (
                                                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 uppercase font-bold tracking-wider">
                                                                Network
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{contact.job}</div>
                                                </div>
                                            </div >
                                        </td >
                                        {
                                            terms.map(term => {
                                                const isMatch = checkMatch(contact, term)
                                                return (
                                                    <td key={term} className="p-4 text-center border-l border-gray-50">
                                                        {isMatch ? (
                                                            <div className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full">
                                                                <Check size={18} strokeWidth={3} />
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center justify-center w-8 h-8 bg-gray-50 text-gray-300 rounded-full">
                                                                <X size={18} strokeWidth={3} />
                                                            </div>
                                                        )}
                                                    </td>
                                                )
                                            })
                                        }
                                        < td className="p-4 text-right" >
                                            {(contact as any).is_own_contact ? (
                                                <button className="text-xs font-bold bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800">
                                                    View
                                                </button>
                                            ) : (
                                                <a
                                                    href={`mailto:${(contact as any).owner_email}?subject=Intro to ${contact.name}&body=Hey, I saw ${contact.name} in your network on Connect. Could you introduce us?`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-xs font-semibold bg-black text-white px-3 py-1.5 rounded-full hover:bg-gray-800 transition-colors whitespace-nowrap"
                                                >
                                                    Ask Intro
                                                </a>
                                            )}
                                        </td >
                                    </tr >
                                ))}
                            </tbody >
                        </table >
                    </div >
                )}
            </div >
        </div >
    )
}
