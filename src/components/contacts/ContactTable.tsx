import { type Contact } from '../../types'
import { useState } from 'react'
import { ArrowUpDown, MessageCircle, Phone, User, MapPin, Instagram } from 'lucide-react'
import { cn } from '../../utils/cn'

interface ContactTableProps {
    contacts: Contact[]
    onContactClick: (contactId: string) => void
}

type SortField = 'name' | 'lastContacted' | 'relationshipStrength'
type SortOrder = 'asc' | 'desc'

export default function ContactTable({ contacts, onContactClick }: ContactTableProps) {
    const [sortField, setSortField] = useState<SortField>('lastContacted')
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortOrder('asc')
        }
    }

    const sortedContacts = [...contacts].sort((a, b) => {
        let valA: string | number | undefined = '';
        let valB: string | number | undefined = '';

        if (sortField === 'name') {
            valA = a.name.toLowerCase()
            valB = b.name.toLowerCase()
        } else if (sortField === 'lastContacted') {
            valA = a.lastContacted
            valB = b.lastContacted
        } else if (sortField === 'relationshipStrength') {
            valA = a.relationshipStrength
            valB = b.relationshipStrength
        }

        if (!valA) valA = ''
        if (!valB) valB = ''

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1
        return 0
    })

    return (
        <div className="w-full overflow-hidden">
            <table className="w-full text-left text-xs text-gray-500">
                <thead className="bg-white text-gray-400 uppercase tracking-widest font-bold border-b border-gray-100">
                    <tr>
                        <th
                            className="px-4 py-3 cursor-pointer hover:text-black transition-colors"
                            onClick={() => handleSort('name')}
                        >
                            <div className="flex items-center gap-1">
                                Name <ArrowUpDown size={10} />
                            </div>
                        </th>
                        <th
                            className="px-4 py-3 cursor-pointer hover:text-black transition-colors"
                            onClick={() => handleSort('lastContacted')}
                        >
                            <div className="flex items-center gap-1">
                                Last Contact <ArrowUpDown size={10} />
                            </div>
                        </th>
                        <th
                            className="px-4 py-3 cursor-pointer hover:text-black transition-colors"
                            onClick={() => handleSort('relationshipStrength')}
                        >
                            <div className="flex items-center gap-1">
                                Strength <ArrowUpDown size={10} />
                            </div>
                        </th>
                        <th className="px-4 py-3">Context</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {sortedContacts.map((contact) => (
                        <tr
                            key={contact.id}
                            onClick={() => onContactClick(contact.id)}
                            className="hover:bg-gray-50 cursor-pointer transition-colors group"
                        >
                            <td className="px-4 py-2 font-semibold text-black">
                                {contact.name}
                            </td>
                            <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-900">
                                        {new Date(contact.lastContacted).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className="text-gray-300">
                                        {contact.lastContactType === 'whatsapp' && <MessageCircle size={10} />}
                                        {contact.lastContactType === 'call' && <Phone size={10} />}
                                        {contact.lastContactType === 'message' && <MessageCircle size={10} />}
                                        {contact.lastContactType === 'in_person' && <User size={10} />}
                                        {contact.lastContactType === 'instagram' && <Instagram size={10} />}
                                    </span>
                                </div>
                            </td>
                            <td className="px-4 py-2">
                                <span className={cn(
                                    "text-[10px] uppercase tracking-wider font-medium",
                                    contact.relationshipStrength === 'close' ? 'text-black' :
                                        contact.relationshipStrength === 'medium' ? 'text-gray-600' : 'text-gray-400'
                                )}>
                                    {contact.relationshipStrength}
                                </span>
                            </td>
                            <td className="px-4 py-2 text-[10px] text-gray-400">
                                <div className="flex items-center gap-3">
                                    {contact.location && (
                                        <div className="flex items-center gap-1 truncate max-w-[150px]">
                                            <MapPin size={10} />
                                            {contact.location}
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {contacts.length === 0 && (
                <div className="p-12 text-center">
                    <p className="text-xs text-gray-300 mt-2">No connections found.</p>
                </div>
            )}
        </div>
    )
}
