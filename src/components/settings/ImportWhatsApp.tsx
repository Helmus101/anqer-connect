import { useState, useRef } from 'react'
import { Upload, FileText, Check, AlertCircle, Loader2, MessageCircle } from 'lucide-react'
import { createContact, createInteraction, getContacts } from '../../services/contactService'
import { useNavigate } from 'react-router-dom'

export default function ImportWhatsApp() {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [file, setFile] = useState<File | null>(null)
    const [contactName, setContactName] = useState('')
    const [status, setStatus] = useState<'idle' | 'parsing' | 'importing' | 'success' | 'error'>('idle')
    const [stats, setStats] = useState({ days: 0, messages: 0 })
    const [errorMessage, setErrorMessage] = useState('')
    const navigate = useNavigate()

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            setFile(selectedFile)
            setStatus('idle')
            setErrorMessage('')

            // Try to guess contact name "WhatsApp Chat with Alice.txt"
            const nameMatch = selectedFile.name.match(/WhatsApp Chat with (.*)\.txt/)
            if (nameMatch && nameMatch[1]) {
                setContactName(nameMatch[1].replace('.txt', ''))
            } else {
                setContactName(selectedFile.name.replace('.txt', ''))
            }
        }
    }

    const parseWhatsAppChat = (text: string) => {
        const lines = text.split('\n')
        const dailyGroups: Record<string, string[]> = {}
        let totalMessages = 0

        // Regex for: [Date, Time] Sender: Message OR Date, Time - Sender: Message
        // Supports: [12/04/2024, 10:30:15] or 12/04/2024, 10:30
        const msgRegex = /^\[?(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}),?.*?\]? (.*?): (.*)/

        let currentDateKey = ''

        lines.forEach(line => {
            const match = line.match(msgRegex)
            if (match) {
                const date = match[1]
                const sender = match[2]
                const message = match[3]

                // Normalize date to YYYY-MM-DD
                // Assuming DD/MM/YYYY or MM/DD/YYYY depending on locale... 
                // Let's try basic parsing
                const dateParts = date.split(/[\/\.-]/)

                // Heuristic: If part 0 > 12, it's DD/MM/YYYY. Else assume MM/DD? 
                // Using standard Date parse for now
                let dateObj = new Date(date)
                if (isNaN(dateObj.getTime())) {
                    // Try DD/MM/YYYY fallback
                    dateObj = new Date(`${dateParts[1]}/${dateParts[0]}/${dateParts[2]}`)
                }

                if (isNaN(dateObj.getTime())) return // Skip invalid dates

                const isoDate = dateObj.toISOString().split('T')[0]
                currentDateKey = isoDate

                if (!dailyGroups[isoDate]) dailyGroups[isoDate] = []
                dailyGroups[isoDate].push(`${sender}: ${message}`)
                totalMessages++
            } else {
                // Append multi-line message to last entry of current day
                if (currentDateKey && dailyGroups[currentDateKey]?.length > 0) {
                    const lastIdx = dailyGroups[currentDateKey].length - 1
                    dailyGroups[currentDateKey][lastIdx] += `\n${line}`
                }
            }
        })

        return { dailyGroups, totalMessages }
    }

    const handleImport = async () => {
        if (!file || !contactName) return

        setStatus('parsing')

        try {
            const text = await file.text()
            const { dailyGroups, totalMessages } = parseWhatsAppChat(text)

            if (totalMessages === 0) {
                throw new Error("No messages found. Is this a valid WhatsApp export (.txt)?")
            }

            setStatus('importing')

            // 1. Ensure Contact Exists
            // We use a simplified upsert for now by name
            const allContacts = await getContacts()
            let contact = allContacts.find(c => c.name.toLowerCase() === contactName.toLowerCase())

            if (!contact) {
                contact = await createContact({
                    name: contactName,
                    tags: ['WhatsApp Import']
                }) as any
            }

            if (!contact) throw new Error("Failed to create/find contact")

            // 2. Create Interactions (One per Day)
            const dates = Object.keys(dailyGroups)
            for (const date of dates) {
                const transcript = dailyGroups[date].join('\n')

                await createInteraction({
                    contactId: contact.id,
                    type: 'whatsapp',
                    date: date,
                    notes: `Daily Transcript (${dailyGroups[date].length} messages):\n${transcript}`,
                    platform: 'WhatsApp'
                })
            }

            setStats({ days: dates.length, messages: totalMessages })
            setStatus('success')

            setTimeout(() => {
                navigate(`/contacts/${contact?.id}`)
            }, 2000)

        } catch (error: any) {
            setStatus('error')
            setErrorMessage(error.message)
        }
    }

    return (
        <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm max-w-xl mx-auto mt-6">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <span className="text-green-600"><MessageCircle /></span> Import WhatsApp Chat
            </h2>
            <p className="text-gray-500 mb-6 text-sm">
                Upload a verified <code className="bg-gray-100 px-1 py-0.5 rounded">_chat.txt</code> export.
                We group messages into daily summaries to keep your history clean.
            </p>

            <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">Contact Name</label>
                <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 text-black"
                    placeholder="e.g. Alice"
                />
            </div>

            <div className={`
                border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                ${status === 'error' ? 'border-red-300 bg-red-50' :
                    status === 'success' ? 'border-green-300 bg-green-50' :
                        'border-gray-200 hover:border-black hover:bg-gray-50'}
            `}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".txt"
                    onChange={handleFileChange}
                />

                {status === 'idle' && !file && (
                    <div className="flex flex-col items-center gap-2">
                        <Upload className="text-gray-400" size={32} />
                        <span className="font-medium text-gray-700">Click to upload .txt</span>
                    </div>
                )}

                {status === 'idle' && file && (
                    <div className="flex flex-col items-center gap-2">
                        <FileText className="text-black" size={32} />
                        <span className="font-bold text-black">{file.name}</span>
                        <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                )}

                {['parsing', 'importing'].includes(status) && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-green-600" size={32} />
                        <div>
                            <p className="font-bold text-gray-800">
                                {status === 'parsing' ? 'Analyzing Chat Log...' : 'Importing Daily Digests...'}
                            </p>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-2">
                        <Check className="text-green-600" size={32} />
                        <span className="font-bold text-green-700">Import Complete!</span>
                        <span className="text-xs text-green-600">Imported {stats.messages} msgs across {stats.days} days.</span>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="text-red-500" size={32} />
                        <span className="font-bold text-red-700">Import Failed</span>
                        <span className="text-xs text-red-600">{errorMessage}</span>
                    </div>
                )}
            </div>

            {status === 'idle' && file && contactName && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        handleImport()
                    }}
                    className="w-full mt-6 bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-900 transition-all flex items-center justify-center gap-2"
                >
                    Start Import
                </button>
            )}
        </div>
    )
}
