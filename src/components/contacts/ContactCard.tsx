import type { Contact } from '../../types'
import { cn } from '../../utils/cn'
import { useNavigate } from 'react-router-dom'

interface ContactCardProps {
    contact: Contact
}

export default function ContactCard({ contact }: ContactCardProps) {
    const navigate = useNavigate()

    const getLastContactColor = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays < 7) return "text-green-400"
        if (diffDays < 30) return "text-yellow-400"
        return "text-red-400"
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
    }

    return (
        <div
            onClick={() => navigate(`/contacts/${contact.id}`)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all cursor-pointer group"
        >
            <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                    {contact.avatar ? (
                        <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-xl font-bold text-gray-400">{contact.name[0]}</span>
                    )}
                </div>

                {/* content */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-white truncate pr-2">{contact.name}</h3>
                        <span className={cn("text-xs font-medium whitespace-nowrap", getLastContactColor(contact.lastContacted))}>
                            {formatDate(contact.lastContacted)}
                        </span>
                    </div>

                    <div className="text-sm text-gray-400 truncate">
                        {contact.job || contact.location || "No details"}
                    </div>

                    <div className="flex gap-2 mt-2 overflow-hidden">
                        {contact.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-300 rounded-full truncate">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
