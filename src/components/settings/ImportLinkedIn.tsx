import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { Upload, FileText, Check, AlertCircle, Loader2 } from 'lucide-react'
import { createContact } from '../../services/contactService'
import { useNavigate } from 'react-router-dom'

export default function ImportLinkedIn() {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [file, setFile] = useState<File | null>(null)
    const [status, setStatus] = useState<'idle' | 'parsing' | 'importing' | 'success' | 'error'>('idle')
    const [stats, setStats] = useState({ total: 0, imported: 0, skipped: 0 })
    const [errorMessage, setErrorMessage] = useState('')
    const navigate = useNavigate()

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setStatus('idle')
            setErrorMessage('')
        }
    }

    const handleImport = async () => {
        if (!file) return

        setStatus('parsing')

        try {
            const text = await file.text()

            // LinkedIn Export has 3 lines of junk headers before the real header
            // We slice them off
            const lines = text.split('\n')
            if (lines.length < 4) {
                throw new Error("File too short. Is this a valid LinkedIn Connections export?")
            }

            // Rejoin from line 4 onwards (index 3)
            const cleanCsv = lines.slice(3).join('\n')

            Papa.parse(cleanCsv, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    processContacts(results.data)
                },
                error: (error: any) => {
                    setStatus('error')
                    setErrorMessage(`Parse Error: ${error.message}`)
                }
            })

        } catch (error: any) {
            setStatus('error')
            setErrorMessage(error.message)
        }
    }

    const processContacts = async (rawContacts: any[]) => {
        setStatus('importing')
        let importedCount = 0
        let skippedCount = 0

        // Process in chunks to avoid overwhelming the UI/Backend
        // For now, sequentially implies slower but safer
        for (const row of rawContacts) {
            // Map fields
            const firstName = row['First Name'] || ''
            const lastName = row['Last Name'] || ''
            const name = `${firstName} ${lastName}`.trim()
            const email = row['Email Address'] || ''
            const company = row['Company'] || ''
            const position = row['Position'] || ''
            const job = position && company ? `${position} at ${company}` : position || company
            const linkedInUrl = row['URL'] || ''

            if (!name) {
                skippedCount++
                continue
            }

            try {
                await createContact({
                    name,
                    email: email || undefined, // undefined to avoid unique constraint if empty string? Actually our schema allows diff emails
                    job,
                    linkedin: linkedInUrl,
                    socialLinks: linkedInUrl ? [{ platform: 'LinkedIn', url: linkedInUrl }] : [],
                    tags: ['LinkedIn Import']
                })
                importedCount++
            } catch (error) {
                console.error(`Failed to import ${name}`, error)
                skippedCount++
            }

            // Update stats every 10 items
            if ((importedCount + skippedCount) % 10 === 0) {
                setStats({ total: rawContacts.length, imported: importedCount, skipped: skippedCount })
            }
        }

        setStats({ total: rawContacts.length, imported: importedCount, skipped: skippedCount })
        setStatus('success')
        setTimeout(() => {
            navigate('/contacts')
        }, 2000)
    }

    return (
        <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm max-w-xl mx-auto mt-10">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <span className="text-blue-600">in</span> Import Connections
            </h2>
            <p className="text-gray-500 mb-6 text-sm">
                Upload your <code className="bg-gray-100 px-1 py-0.5 rounded">Connections.csv</code> file export from LinkedIn.
                We automatically strip the header metadata.
            </p>

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
                    accept=".csv"
                    onChange={handleFileChange}
                />

                {status === 'idle' && !file && (
                    <div className="flex flex-col items-center gap-2">
                        <Upload className="text-gray-400" size={32} />
                        <span className="font-medium text-gray-700">Click to upload CSV</span>
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
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                        <div>
                            <p className="font-bold text-gray-800">
                                {status === 'parsing' ? 'Parshing CSV...' : `Importing... ${stats.imported} done`}
                            </p>
                            <p className="text-xs text-gray-500">Please wait</p>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-2">
                        <Check className="text-green-600" size={32} />
                        <span className="font-bold text-green-700">Import Complete!</span>
                        <span className="text-xs text-green-600">Imported {stats.imported} contacts.</span>
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

            {status === 'idle' && file && (
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
