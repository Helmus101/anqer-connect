import { useEffect, useState } from 'react'
import { X, Check, Sparkles } from 'lucide-react'
import { getGeneratedPrompts } from '../../services/contactService'
import { useNavigate } from 'react-router-dom'

export default function NextConversations() {
    const [prompts, setPrompts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        getGeneratedPrompts().then(data => {
            setPrompts(data)
            setLoading(false)
        })
    }, [])

    if (loading) return <div className="animate-pulse bg-gray-100 h-40 rounded-xl"></div>
    if (prompts.length === 0) return null

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-black/20 transition-all">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Sparkles size={20} className="text-purple-600" />
                Up Next
            </h2>
            <div className="space-y-4">
                {prompts.map(prompt => (
                    <div key={prompt.id} className="group relative bg-gray-50 hover:bg-white border border-gray-100 hover:border-purple-200 rounded-xl p-4 transition-all hover:shadow-md cursor-pointer"
                        onClick={() => navigate(`/contacts/${prompt.contact_id}`)}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                                    {prompt.contactAvatar ? <img src={prompt.contactAvatar} className="w-full h-full rounded-full" /> : prompt.contactName?.[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-gray-900">{prompt.contactName}</h3>
                                    <p className="text-[10px] text-gray-500">{prompt.contactJob}</p>
                                </div>
                            </div>
                            <span className="bg-purple-50 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold">New Idea</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 mb-1">"{prompt.prompt}"</p>
                        <p className="text-xs text-gray-400 italic">{prompt.context}</p>

                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button className="p-1.5 hover:bg-green-100 text-green-600 rounded-full" title="Used it"><Check size={14} /></button>
                            <button className="p-1.5 hover:bg-red-100 text-red-600 rounded-full" title="Dismiss"><X size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
