import { useState } from 'react'
import { Search, Sparkles, Check, X, Share2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext' // Assuming this exists

export default function SmartSearch() {
    const { user } = useAuth()
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<any>(null)



    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        setLoading(true)
        setResults(null)
        try {
            const res = await fetch('/.netlify/functions/smart-search', {
                method: 'POST',
                body: JSON.stringify({ query, userId: user?.id })
            })
            const data = await res.json()
            setResults(data)
        } catch (err) {
            console.error(err)
            alert("Search failed")
        } finally {
            setLoading(false)
        }
    }

    const clearSearch = () => {
        setQuery('')
        setResults(null)
    }

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
            <div className="mb-12 text-center relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4 border border-indigo-100">
                    <Sparkles size={12} />
                    AI Powered
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-gray-900">
                    Smart Network Search
                </h1>
                <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
                    Ask complex questions across your entire network to find the right people instantly.
                </p>
            </div>

            <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto mb-16 z-20">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative flex items-center bg-white rounded-xl shadow-2xl shadow-indigo-500/10 ring-1 ring-gray-900/5">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="E.g. Investors in London who like Skiing..."
                            className="w-full pl-14 pr-36 py-5 rounded-xl bg-transparent text-xl font-medium focus:outline-none placeholder:text-gray-400"
                        />
                        <Search className="absolute left-5 text-gray-400 pointer-events-none" size={24} />

                        <div className="absolute right-2 flex items-center gap-2">
                            {query && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loading || !query.trim()}
                                className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-900/20 active:scale-95 flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Sparkles className="animate-spin" size={18} />
                                        <span className="hidden md:inline">Thinking...</span>
                                    </>
                                ) : (
                                    'Search'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {results && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-forwards">
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl overflow-hidden ring-1 ring-black/5">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100/50 bg-gray-50/50">
                                        <th className="text-left py-5 px-8 font-bold text-gray-900 text-sm uppercase tracking-wide">Contact</th>
                                        {results.criteria.map((c: any, i: number) => (
                                            <th key={i} className="text-center py-5 px-6 font-bold text-gray-900 text-sm uppercase tracking-wide w-32">
                                                {c.label}
                                            </th>
                                        ))}
                                        <th className="text-center py-5 px-6 font-bold text-gray-900 text-sm uppercase tracking-wide w-32">Network</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100/50">
                                    {results.results.map((contact: any) => (
                                        <tr key={contact.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="py-5 px-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-bold text-lg border border-indigo-100/50 shadow-sm">
                                                        {contact.name[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">{contact.name}</div>
                                                        <div className="text-sm text-gray-500 font-medium">{contact.job || 'No Job Title'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            {results.criteria.map((c: any, i: number) => (
                                                <td key={i} className="py-5 px-6 text-center">
                                                    {contact.matches[c.label] ? (
                                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30 ring-2 ring-white scale-100 transition-transform hover:scale-110">
                                                            <Check size={16} strokeWidth={4} />
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-300">
                                                            <X size={16} />
                                                        </div>
                                                    )}
                                                </td>
                                            ))}
                                            <td className="py-5 px-6 text-center">
                                                {contact.isShared ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100">
                                                        <Share2 size={12} strokeWidth={2.5} /> Network
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-gray-500 text-xs font-bold border border-gray-200 shadow-sm">
                                                        Personal
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {results.results.length === 0 && (
                            <div className="py-24 px-8 text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4 text-gray-300">
                                    <Search size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No matches found</h3>
                                <p className="text-gray-500 max-w-sm mx-auto">
                                    We couldn't find anyone matching those specific criteria. Try broadening your search terms.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
