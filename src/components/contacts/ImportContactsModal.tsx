import React, { useState } from 'react'
import { Upload, X, Check, Loader2 } from 'lucide-react'
import { createContact } from '../../services/contactService'

interface ImportContactsModalProps {
    isOpen: boolean
    onClose: () => void
    onImportComplete: () => void
}

export default function ImportContactsModal({ isOpen, onClose, onImportComplete }: ImportContactsModalProps) {
    const [isImporting, setIsImporting] = useState(false)
    const [error, setError] = useState('')
    const [successCount, setSuccessCount] = useState(0)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        setError('')
        setSuccessCount(0)

        const reader = new FileReader()
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string
                // Simple CSV parser: assumes Header row, comma separated
                const lines = text.split('\n').filter(l => l.trim())
                if (lines.length < 2) throw new Error("CSV must have header and at least one row")

                const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
                const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('first name'))
                // If Name not found, try 'Given Name' (Google Contacts)
                const finalNameIdx = nameIdx !== -1 ? nameIdx : headers.findIndex(h => h.includes('given name'))

                const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('e-mail'))
                const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile'))
                const jobIdx = headers.findIndex(h => h.includes('job') || h.includes('title') || h.includes('organization'))

                if (finalNameIdx === -1) throw new Error("Could not find a 'Name' column")

                let count = 0
                // Start from row 1
                for (let i = 1; i < lines.length; i++) {
                    // Handle quoted values crudely (for MVP) or just split
                    // Start simple: split by comma
                    const cols = lines[i].split(',')
                    const name = cols[finalNameIdx]?.trim()
                    if (!name) continue

                    const email = emailIdx !== -1 ? cols[emailIdx]?.trim() : ''
                    const phone = phoneIdx !== -1 ? cols[phoneIdx]?.trim() : ''
                    const job = jobIdx !== -1 ? cols[jobIdx]?.trim() : ''

                    // Basic creation
                    try {
                        await createContact({
                            name,
                            email,
                            phone,
                            job,
                            howMet: 'Imported',
                            relationshipStrength: 'medium'
                        })
                        count++
                    } catch (err) {
                        console.error("Failed to import row", i, err)
                    }
                }
                setSuccessCount(count)
                setTimeout(() => {
                    onImportComplete()
                    onClose()
                }, 1500)

            } catch (err: any) {
                setError(err.message)
            } finally {
                setIsImporting(false)
            }
        }
        reader.readAsText(file)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-black mb-2 flex items-center gap-2">
                    <Upload size={20} className="text-blue-600" />
                    Import Contacts
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                    Upload a CSV file (Google Contacts, Outlook, etc). We'll try to map Name, Email, Phone, and Job.
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
                        {error}
                    </div>
                )}

                {successCount > 0 && !isImporting && (
                    <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm mb-4 flex items-center gap-2">
                        <Check size={16} /> Successfully imported {successCount} contacts!
                    </div>
                )}

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer relative bg-gray-50 hover:bg-white">
                    <input
                        type="file"
                        accept=".csv"
                        disabled={isImporting}
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    {isImporting ? (
                        <div className="flex flex-col items-center gap-2 text-blue-600">
                            <Loader2 size={32} className="animate-spin" />
                            <span className="font-bold">Importing...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-500">
                            <Upload size={32} />
                            <span className="font-medium">Click to select CSV</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
