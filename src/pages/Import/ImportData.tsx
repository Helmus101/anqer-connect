import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, FileText, CheckCircle, Loader2 } from 'lucide-react'
import { getContacts } from '../../services/contactService'
import type { Contact } from '../../types'

export default function ImportData() {
    const navigate = useNavigate()
    const [step, setStep] = useState<'input' | 'processing' | 'success'>('input')
    const [text, setText] = useState('')
    const [status, setStatus] = useState('')
    const [contacts, setContacts] = useState<Contact[]>([])
    const [selectedContactId, setSelectedContactId] = useState('')
    const [interactionType, setInteractionType] = useState('email')

    // Load contacts on mount
    useState(() => {
        getContacts().then(data => {
            setContacts(data)
            if (data.length > 0) setSelectedContactId(data[0].id)
        })
    })

    const handleImport = async () => {
        if (!text.trim() || !selectedContactId) return

        setStep('processing')
        setStatus('Sending to AI Analysis Engine...')

        try {
            // 1. Get all contacts to match names provided in text
            // In a real app, we might let the AI extract names and then fuzzy match.
            // For this MVP, we will try to detect names or just ask the user to select one if doing a single paste.
            // Actually, let's assume this is a bulk paste or a specific interaction.
            // Let's rely on the user to pick a contact for the paste, OR try to detect it.
            // To keep it robust: Let's ask "Who is this with?" if it's a single interaction import.
            // But the user wants "Email Import".
            // Let's build a "Parser" that tries to find a contact.

            setStatus('Analyzing text structure...')

            // WE will assume this is for ONE contact for now to ensure accuracy, or we can try to auto-detect.
            // Let's add a "Contact Picker" to be safe.
            const { analyzeInteraction } = await import('../../services/contactService')

            // We use the existing analyze function. 
            // The backend doesn't currently support parsing custom dates from text "reliably" unless the prompt is tweaked.
            // But let's assume the user wants it logged.

            // Refinement: We need to tell the backend to look for a date in the text.
            // The current backend uses "new Date()" if date is missing, OR uses the passed date.
            // We'll pass the text and let the AI extract date? 
            // Actually, the current analyze-interaction doesn't return a date, it just saves it. 
            // For this MVP feature, let's just log it as "Imported on [Today]" or let the backend prompt 
            // be slightly updated to "Extract date if present, else use today". 
            // I'll stick to 'today' for reliability unless I change the backend prompt.

            // Let's just call analyze.
            await analyzeInteraction({
                contactId: selectedContactId,
                type: interactionType as any,
                notes: text,
                platform: 'Import',
                date: new Date().toISOString()
            })

            setStatus('Success!')
            setTimeout(() => setStep('success'), 1000)

        } catch (error) {
            console.error(error)
            setStep('input')
            alert("Import failed")
        }
    }

    return (
        <div className="p-8 max-w-2xl mx-auto min-h-screen bg-white">
            <button
                onClick={() => navigate('/dashboard')}
                className="mb-8 text-gray-500 hover:text-black transition-colors flex items-center gap-2 font-medium"
            >
                <ArrowLeft size={16} /> Back to Dashboard
            </button>

            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-black tracking-tight mb-2">Import Context</h1>
                <p className="text-gray-500">Paste email threads or notes to instantly build memory.</p>
            </div>

            {step === 'input' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Who is this for?</label>
                            <select
                                className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black"
                                value={selectedContactId}
                                onChange={e => setSelectedContactId(e.target.value)}
                            >
                                {contacts.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
                            <select
                                className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black"
                                value={interactionType}
                                onChange={e => setInteractionType(e.target.value)}
                            >
                                <option value="email">Email</option>
                                <option value="meeting">Meeting</option>
                                <option value="message">Message</option>
                                <option value="call">Call</option>
                                <option value="notes">Notes</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3 text-blue-800 text-sm">
                        <FileText size={20} className="shrink-0" />
                        <p>
                            <strong>Tip:</strong> Paste the full email body. The AI will extract the key topics, sentiment, and any promises you made.
                        </p>
                    </div>

                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none text-base font-mono text-sm"
                        placeholder="Subject: Project Update..."
                    />

                    <div className="flex justify-end">
                        <button
                            onClick={handleImport}
                            disabled={!text || !selectedContactId}
                            className="bg-black text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Upload size={18} /> Analyze & Import
                        </button>
                    </div>
                </div>
            )}

            {step === 'processing' && (
                <div className="text-center py-20 animate-in fade-in">
                    <Loader2 size={48} className="animate-spin mx-auto mb-6 text-black" />
                    <h3 className="text-xl font-bold mb-2">Reading & analyzing...</h3>
                    <p className="text-gray-500">{status}</p>
                </div>
            )}

            {step === 'success' && (
                <div className="text-center py-20 animate-in fade-in zoom-in-95">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">Import Complete!</h3>
                    <p className="text-gray-500 mb-8">
                        The memory has been added to the timeline and analyzed for insights.
                    </p>
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={() => { setText(''); setStep('input') }}
                            className="px-6 py-2 border border-gray-200 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                        >
                            Import Another
                        </button>
                        <button
                            onClick={() => navigate(`/contacts/${selectedContactId}`)}
                            className="px-6 py-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-colors"
                        >
                            View Profile
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
