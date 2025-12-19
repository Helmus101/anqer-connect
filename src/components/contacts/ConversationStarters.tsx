import { useEffect, useState } from 'react'
import { Sparkles, Check, X, MessageSquareQuote } from 'lucide-react'
import { getGeneratedPrompts } from '../../services/contactService'
import { supabase } from '../../lib/supabase'

interface ConversationStartersProps {
    contactId: string
}

export default function ConversationStarters({ contactId }: ConversationStartersProps) {
    const [prompts, setPrompts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getGeneratedPrompts(contactId).then(data => {
            setPrompts(data)
            setLoading(false)
        })
    }, [contactId])

    const handleDismiss = async (id: string) => {
        // Optimistic update
        setPrompts(prompts.filter(p => p.id !== id))
        await supabase.from('generated_prompts').update({ status: 'dismissed' }).eq('id', id)
    }

    const handleUse = async (id: string, text: string) => {
        // Copy to clipboard or just mark used
        navigator.clipboard.writeText(text)
        alert("Prompt copied to clipboard!")
        setPrompts(prompts.filter(p => p.id !== id))
        await supabase.from('generated_prompts').update({ status: 'used' }).eq('id', id)
    }

    if (loading) return null
    if (prompts.length === 0) return null

    return (
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-lg font-bold text-black mb-3 tracking-tight flex items-center gap-2">
                <Sparkles size={18} className="text-purple-600" />
                Next Thing to Say
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prompts.map(prompt => (
                    <div key={prompt.id} className="bg-purple-50 border border-purple-100 rounded-xl p-5 relative hover:shadow-md transition-shadow group">
                        <div className="flex items-start gap-3">
                            <div className="bg-white p-2 rounded-full shadow-sm text-purple-600">
                                <MessageSquareQuote size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-gray-900 font-bold text-base mb-1">"{prompt.prompt}"</p>
                                <p className="text-xs text-purple-700 font-medium uppercase tracking-wide">
                                    Why? {prompt.context || "Relevant based on history"}
                                </p>
                            </div>
                        </div>
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button
                                onClick={() => handleUse(prompt.id, prompt.prompt)}
                                className="p-2 bg-white rounded-full text-green-600 hover:bg-green-50 shadow-sm border border-gray-100 transition-colors"
                                title="Copy & Mark Used"
                            >
                                <Check size={14} />
                            </button>
                            <button
                                onClick={() => handleDismiss(prompt.id)}
                                className="p-2 bg-white rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 shadow-sm border border-gray-100 transition-colors"
                                title="Dismiss"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
