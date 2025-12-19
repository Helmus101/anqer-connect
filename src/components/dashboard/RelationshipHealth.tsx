import { useNavigate } from 'react-router-dom'
import { HeartCrack } from 'lucide-react'
import type { Contact } from '../../types'

interface RelationshipHealthProps {
    contacts: Contact[]
}

export default function RelationshipHealth({ contacts }: RelationshipHealthProps) {
    const navigate = useNavigate()

    // Identify drifting contacts: Close/Medium strength but haven't spoken in >30 days
    const driftingContacts = contacts.filter(c => {
        if (!c.lastContacted) return false
        if (c.relationshipStrength === 'weak' || c.relationshipStrength === 'drifting') return false // Already known weak

        const daysSince = (new Date().getTime() - new Date(c.lastContacted).getTime()) / (1000 * 3600 * 24)
        return daysSince > 30
    }).slice(0, 5)

    if (driftingContacts.length === 0) return null

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-black/20 transition-all">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-gray-900">
                <HeartCrack size={20} className="text-red-500" />
                Needs Attention
            </h2>
            <div className="space-y-3">
                {driftingContacts.map(c => (
                    <div key={c.id}
                        onClick={() => navigate(`/contacts/${c.id}`)}
                        className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 hover:bg-red-50 border border-red-100 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white border border-red-100 flex items-center justify-center font-bold text-red-400">
                                {c.avatar ? <img src={c.avatar} className="w-full h-full rounded-full" /> : c.name[0]}
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-gray-900 group-hover:underline">{c.name}</h3>
                                <div className="flex flex-col gap-0.5">
                                    <p className="text-xs text-red-500 font-medium">
                                        Last spoke {new Date(c.lastContacted).toLocaleDateString()}
                                    </p>
                                    {c.healthScore !== undefined && (
                                        <p className="text-[10px] text-gray-400 font-bold">
                                            Health: {c.healthScore}%
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-xs bg-white text-red-500 px-2 py-1 rounded-full font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            Reach Out
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
