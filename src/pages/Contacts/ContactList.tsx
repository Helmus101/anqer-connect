import { useEffect, useState } from 'react'
import { getContacts } from '../../services/contactService'
import type { Contact } from '../../types'
import { useNavigate } from 'react-router-dom'
import ContactTable from '../../components/contacts/ContactTable'
import AddContactModal from '../../components/contacts/AddContactModal'
import ContactMap from './ContactMap'
import ImportContactsModal from '../../components/contacts/ImportContactsModal'
import { UserPlus, Upload } from 'lucide-react'

export default function ContactList() {
    const [contacts, setContacts] = useState<Contact[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [view, setView] = useState<'list' | 'map'>('list')
    const [searchQuery, setSearchQuery] = useState('')

    const navigate = useNavigate()

    const loadContacts = async () => {
        setLoading(true)
        const data = await getContacts()
        setContacts(data)
        setLoading(false)
    }

    useEffect(() => {
        loadContacts()
    }, [])

    const filteredContacts = contacts.filter(c => {
        const query = searchQuery.toLowerCase()

        // 1. Name Match
        if (c.name.toLowerCase().includes(query)) return true

        // 2. Job Match
        if (c.job && c.job.toLowerCase().includes(query)) return true

        // 3. Tags Match
        if (c.tags && c.tags.some(tag => tag.toLowerCase().includes(query))) return true

        // 4. Interests Match
        if (c.interests && c.interests.some(interest => interest.name.toLowerCase().includes(query))) return true

        return false
    })

    if (loading) return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <div className="h-8 bg-gray-100 rounded w-48"></div>
                    <div className="h-4 bg-gray-100 rounded w-32"></div>
                </div>
                <div className="flex gap-4">
                    <div className="h-10 bg-gray-100 rounded w-24"></div>
                    <div className="h-10 bg-gray-100 rounded w-32"></div>
                    <div className="h-10 bg-gray-100 rounded w-32"></div>
                </div>
            </div>
            <div className="h-10 bg-gray-100 rounded w-full max-w-md"></div>
            <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-16 bg-gray-100 rounded w-full"></div>
                ))}
            </div>
        </div>
    )

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-black tracking-tighter">Connections</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your network.</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex bg-gray-100 p-1 rounded-md">
                        <button
                            onClick={() => setView('list')}
                            className={`px-3 py-1 text-xs font-bold rounded-sm transition-all ${view === 'list' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            List
                        </button>
                        <button
                            onClick={() => setView('map')}
                            className={`px-3 py-1 text-xs font-bold rounded-sm transition-all ${view === 'map' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Map
                        </button>
                    </div>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="bg-white border border-gray-200 text-black px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors"
                    >
                        <Upload size={16} />
                        Import
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-black text-white px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors"
                    >
                        <UserPlus size={16} />
                        Add Contact
                    </button>
                </div>
            </header>

            {view === 'list' ? (
                <>
                    <div className="mb-6">
                        <input
                            type="text"
                            placeholder="Filter contacts..."
                            className="w-full max-w-md px-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-black"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <ContactTable contacts={filteredContacts} onContactClick={(id) => navigate(`/contacts/${id}`)} />
                </>
            ) : (
                <div className="animate-in fade-in zoom-in duration-300">
                    <ContactMap contacts={filteredContacts} />
                </div>
            )}

            <AddContactModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={() => {
                    setIsAddModalOpen(false)
                    loadContacts()
                }}
            />
            <ImportContactsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportComplete={loadContacts}
            />
        </div>
    )
}
