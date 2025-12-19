import React, { useState, useEffect } from 'react'
import type { Interaction } from '../../types'

interface LogInteractionModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (interaction: Partial<Interaction>, analyze: boolean) => void
}

export default function LogInteractionModal({ isOpen, onClose, onSave }: LogInteractionModalProps) {
    const [formData, setFormData] = useState<Partial<Interaction>>({
        notes: '',
        type: 'whatsapp',
        date: new Date().toISOString().split('T')[0], // Today YYYY-MM-DD
    })

    const [isListening, setIsListening] = useState(false)
    const [recognition, setRecognition] = useState<any>(null)

    const toggleListening = () => {
        if (isListening) {
            recognition?.stop()
            setIsListening(false)
            return
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) {
            alert("Your browser does not support Voice Input. Try Chrome.")
            return
        }

        const recog = new SpeechRecognition()
        recog.continuous = true
        recog.interimResults = true
        recog.lang = 'en-US'

        recog.onstart = () => setIsListening(true)
        recog.onend = () => setIsListening(false)
        recog.onerror = (event: any) => {
            console.error("Speech error", event.error)
            setIsListening(false)
        }

        recog.onresult = (event: any) => {
            let finalTranscript = ''
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript
                }
            }
            if (finalTranscript) {
                setFormData(prev => ({ ...prev, notes: (prev.notes + ' ' + finalTranscript).trim() }))
            }
        }

        recog.start()
        setRecognition(recog)
    }

    // Reset state on open
    useEffect(() => {
        if (!isOpen) {
            setIsListening(false)
            if (recognition) recognition.stop()
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent, analyze: boolean) => {
        e.preventDefault()
        if (!formData.notes) return
        onSave({
            ...formData,
            date: new Date(formData.date!).toISOString()
        }, analyze)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" >
            <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <h2 className="text-xl font-bold text-white mb-6">Log Interaction</h2>

                <form className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-400">What did you talk about?</label>
                            <button
                                type="button"
                                onClick={toggleListening}
                                className={`text-xs flex items-center gap-1 font-bold px-2 py-1 rounded-md transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                            >
                                {isListening ? 'Stop Listening' : '🎤 Voice Input'}
                            </button>
                        </div>
                        <textarea
                            required
                            rows={3}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Discussed trip to Japan..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Platform</label>
                            <select
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 appearance-none"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                            >
                                <option value="whatsapp">WhatsApp</option>
                                <option value="call">Call</option>
                                <option value="in_person">In Person</option>
                                <option value="instagram">Instagram</option>
                                <option value="discord">Discord</option>
                                <option value="message">iMessage</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
                            <input
                                type="date"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={(e) => handleSubmit(e, false)}
                            className="px-4 py-2 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Just Save
                        </button>
                        <button
                            type="button"
                            onClick={(e) => handleSubmit(e, true)}
                            className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 transition-colors shadow-lg shadow-purple-900/20 flex items-center gap-2"
                        >
                            <span className="text-lg">✨</span> Analyze & Save
                        </button>
                    </div>
                </form>
            </div>
        </div >
    )
}

