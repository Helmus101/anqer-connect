import { useState, useEffect, useRef } from 'react'
import { Mic, Send, User, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getContacts } from '../../services/contactService'
import type { Contact } from '../../types'
import { supabase } from '../../lib/supabase'
import NextConversations from '../../components/dashboard/NextConversations'
import RelationshipHealth from '../../components/dashboard/RelationshipHealth'
import Celebrations from '../../components/dashboard/Celebrations'

export default function Dashboard() {
    const { user } = useAuth()
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [contacts, setContacts] = useState<Contact[]>([])
    const [matchedContacts, setMatchedContacts] = useState<Contact[]>([])
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [recentLogs, setRecentLogs] = useState<any[]>([])
    const [countdown, setCountdown] = useState<number | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    // const socketRef = useRef<WebSocket | null>(null) // Removed
    // const audioContextRef = useRef<AudioContext | null>(null) // Removed
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])

    useEffect(() => {
        // Load contacts for matching
        getContacts().then(setContacts)
        fetchRecentLogs()

        return () => {
            // Cleanup
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop()
            }
            // Old cleanup (removed as per instruction)
            // if (socketRef.current) socketRef.current.close()
            // if (audioContextRef.current) audioContextRef.current.close()
            // if (processorRef.current) processorRef.current.disconnect()
            // if (sourceRef.current) sourceRef.current.disconnect()
        }
    }, [])

    const fetchRecentLogs = async () => {
        const { data } = await supabase
            .from('interactions')
            .select('*, contacts(name)')
            .eq('type', 'voice_log')
            .order('date', { ascending: false })
            .limit(5)
        if (data) setRecentLogs(data)
    }

    const parseContacts = (text: string): Contact[] => { // Modified to return Contact[]
        // Look for @Name pattern (global match), allow optional space for STT "at Name"
        const matches = text.match(/@\s?([a-zA-Z]+)/g)
        const foundContacts: Contact[] = []
        if (matches) {
            matches.forEach(m => {
                // Remove @ and potential space
                const nameQuery = m.replace(/@\s?/, '').toLowerCase()
                if (nameQuery.length < 2) return // Skip single letters

                const found = contacts.find(c => c.name.toLowerCase().includes(nameQuery))
                if (found && !foundContacts.find(fc => fc.id === found.id)) {
                    foundContacts.push(found)
                }
            })
        }
        // Also try to match names directly without "@" for more natural speech
        contacts.forEach(c => {
            const nameLower = c.name.toLowerCase()
            const firstNameLower = nameLower.split(' ')[0]
            const textLower = text.toLowerCase()

            // Check 1: Full Name Match (Strongest)
            if (textLower.includes(nameLower) && !foundContacts.find(fc => fc.id === c.id)) {
                const regex = new RegExp(`\\b${nameLower}\\b`, 'i')
                if (regex.test(textLower)) {
                    foundContacts.push(c)
                    return // Found via full name, skip first name check for this contact
                }
            }

            // Check 2: First Name Match (if length > 2 to avoid noise like "Ed" in "Edited")
            if (firstNameLower.length > 2 && textLower.includes(firstNameLower) && !foundContacts.find(fc => fc.id === c.id)) {
                const regex = new RegExp(`\\b${firstNameLower}\\b`, 'i')
                if (regex.test(textLower)) {
                    foundContacts.push(c)
                }
            }
        })
        setMatchedContacts(foundContacts)
        return foundContacts // Return the found contacts
    }

    // --- ELEVENLABS STT IMPLEMENTATION ---
    const startRecordingSequence = () => {
        setCountdown(5)
        let count = 5
        const timer = setInterval(() => {
            count--
            if (count > 0) {
                setCountdown(count)
            } else {
                clearInterval(timer)
                setCountdown(null)
                startRecording()
            }
        }, 1000)
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.start()
            setIsListening(true)
            setTranscript("")
            setStatus('idle')

        } catch (err) {
            console.error("Mic error", err)
            alert("Microphone access denied.")
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isListening) {
            mediaRecorderRef.current.stop()
            setIsListening(false)
            setIsProcessing(true)

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                await processAudio(audioBlob)

                // Stop all tracks
                mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop())
            }
        }
    }

    const processAudio = async (audioBlob: Blob) => {
        try {
            // Convert Blob to Base64
            const reader = new FileReader()
            reader.readAsDataURL(audioBlob)
            reader.onloadend = async () => {
                const base64Audio = (reader.result as string).split(',')[1]

                const response = await fetch('/.netlify/functions/transcribe', {
                    method: 'POST',
                    body: JSON.stringify({ audio: base64Audio })
                })

                if (!response.ok) throw new Error("Transcription failed")

                const data = await response.json()
                const text = data.text

                if (text) {
                    setTranscript(text)
                    // Auto-parse and Log
                    const matches = parseContacts(text) // Returns matches now
                    await handleLogInteraction(text, matches) // Pass text and matches
                } else {
                    setStatus('error')
                }
                setIsProcessing(false)
            }
        } catch (err) {
            console.error(err)
            setIsProcessing(false)
            setStatus('error')
            alert("Transcription failed. Please try again.")
        }
    }

    // Removed old Deepgram specific functions
    // const startRecording = async () => { /* ... */ }
    // const stopRecording = () => { /* ... */ }
    // const toggleListening = () => { /* ... */ }

    const handleLogInteraction = async (textToLog: string, contactsToLog: Contact[]) => { // Modified to accept text and contacts
        if (contactsToLog.length === 0 || !textToLog) return

        try {
            const date = new Date().toISOString()

            // Loop through ALL matched contacts
            for (const contact of contactsToLog) { // Use contactsToLog
                // 1. Log Interaction
                await supabase.from('interactions').insert({
                    contact_id: contact.id,
                    type: 'voice_log',
                    platform: 'Anqer Voice',
                    date: date,
                    notes: textToLog // Use textToLog
                })

                // 2. Update Last Contacted
                await supabase.from('contacts').update({
                    last_contacted: date,
                    last_contact_type: 'voice_log'
                }).eq('id', contact.id)
            }

            // 3. Trigger Auto-Analysis
            contactsToLog.forEach(c => { // Use contactsToLog
                fetch('/.netlify/functions/analyze_interaction', {
                    method: 'POST',
                    body: JSON.stringify({ contactId: c.id })
                }).catch(err => console.error("Auto-analysis trigger failed", err))
            })

            setStatus('success')
            setTranscript('')
            setMatchedContacts([])
            fetchRecentLogs() // Refresh logs
            // Close session if not plain text
            // if (isListening) stopRecording() // No longer needed, stopRecording handles it

            setTimeout(() => setStatus('idle'), 3000)
        } catch (error) {
            console.error(error)
            setStatus('error')
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen bg-white">
            <header className="mb-12">
                <h1 className="text-4xl font-extrabold text-black tracking-tighter mb-2">
                    Good morning, {user?.email?.split('@')[0]}
                </h1>
                <p className="text-gray-500">Ready to log your network updates?</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Column: Voice Input & Recent Logs */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Voice Logger Card */}
                    <div className="p-8 border border-gray-200 rounded-2xl shadow-sm bg-white hover:border-black/20 transition-all relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Mic size={20} />
                                    Voice Log (Powered by OpenAI)
                                </h2>
                                <p className="text-xs text-gray-400 mt-1">
                                    Say <span className="font-bold text-black">"at Name"</span> or just the name (e.g. "Alice Smith").
                                </p>
                            </div>
                            <button
                                onClick={isListening ? stopRecording : startRecordingSequence}
                                disabled={isProcessing}
                                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl z-10 ${isListening
                                    ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse'
                                    : isProcessing
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-black hover:bg-gray-800 hover:scale-105'
                                    }`}
                            >
                                {isProcessing ? (
                                    <Loader2 className="animate-spin text-white" size={32} />
                                ) : isListening ? (
                                    <div className="w-8 h-8 bg-white rounded-md" /> // Stop Icon
                                ) : (
                                    <Mic className="text-white" size={32} />
                                )}
                            </button>
                        </div>

                        <div className="mb-6 relative">
                            <textarea
                                value={transcript}
                                onChange={(e) => {
                                    setTranscript(e.target.value)
                                    parseContacts(e.target.value)
                                }}
                                placeholder={isListening ? "Listening..." : countdown !== null ? `Recording in ${countdown}...` : "Tap mic to start. 5s countdown. Auto-saves on stop."}
                                disabled={isListening || isProcessing}
                                className="w-full text-lg p-4 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-black focus:outline-none transition-all min-h-[120px] resize-none"
                            />
                            {isListening && (
                                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                    <span className="text-xs font-bold text-red-500 uppercase">Recording</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between h-12">
                            <div className="flex items-center gap-2 flex-wrap">
                                {matchedContacts.length > 0 ? (
                                    matchedContacts.map(c => (
                                        <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-bold animate-in fade-in slide-in-from-left-2 transition-all">
                                            <User size={14} />
                                            {c.name}
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-xs text-gray-400 italic">No contacts detected yet...</span>
                                )}
                            </div>

                            <button
                                onClick={() => handleLogInteraction(transcript, matchedContacts)}
                                disabled={matchedContacts.length === 0 || !transcript}
                                className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-900 transition-all"
                            >
                                <Send size={16} />
                                Log It
                            </button>
                        </div>

                        {status === 'success' && (
                            <div className="mt-4 p-3 bg-green-50 text-green-700 text-sm font-medium rounded-lg text-center animate-in fade-in">
                                Interaction logged successfully!
                            </div>
                        )}
                    </div>

                    {/* Recent Activity Feed */}
                    <div>
                        <h3 className="text-lg font-bold mb-4 opacity-50">Recent Voice Logs</h3>
                        <div className="space-y-4">
                            {recentLogs.map(log => (
                                <div key={log.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex items-start gap-4 hover:bg-white hover:border-black/5 transition-all">
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <Mic size={16} className="text-black" />
                                    </div>
                                    <div>
                                        <div className="flex gap-2 mb-1">
                                            {log.contacts && (Array.isArray(log.contacts) ? log.contacts : [log.contacts]).map((c: any) => (
                                                <span key={c.id || Math.random()} className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                                    {c.name}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">"{log.notes}"</p>
                                        <p className="text-xs text-gray-400 mt-2">{new Date(log.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            ))}
                            {recentLogs.length === 0 && <p className="text-sm text-gray-400 italic">No recent voice logs.</p>}
                        </div>
                    </div>
                </div>

                {/* Right Column: Intelligence Widgets */}
                <div className="space-y-8">
                    {/* Add Data Card */}
                    <div className="bg-gradient-to-br from-black to-gray-800 text-white rounded-2xl p-6 shadow-md">
                        <h2 className="text-xl font-bold mb-2">Add Data</h2>
                        <p className="text-gray-300 text-sm mb-4">Import email threads or notes to build relationship context.</p>
                        <a href="/import" className="block w-full bg-white text-black text-center font-bold py-2 rounded-lg hover:bg-gray-100 transition-colors">
                            Import Context
                        </a>
                    </div>

                    <NextConversations />
                    <Celebrations contacts={contacts} />
                    <RelationshipHealth contacts={contacts} />
                </div>
            </div>
        </div>
    )
}


