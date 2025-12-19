import { useState, useEffect } from 'react'
import { Sparkles, X } from 'lucide-react'
import type { Contact } from '../../types' // Assuming types are here

interface WebEnrichWizardProps {
    contact: Contact
    onClose: () => void
    onComplete: (summaryData: any) => void
}

export default function WebEnrichWizard({ contact, onClose, onComplete }: WebEnrichWizardProps) {
    const [logs, setLogs] = useState<string[]>([])
    const [isAnalyzing, setIsAnalyzing] = useState(true)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)

    // Automated Flow
    useEffect(() => {
        let mounted = true

        const runAutomation = async () => {
            addLog("Initializing Web Enrich Agent...", 0)

            // Phase 1: Search
            addLog(`Step 1: Strict Multi-Phase Search for ["${contact.name}"]...`)
            addLog("• Querying General Index (Exact Match)...")
            addLog("• Querying Social Indices (LinkedIn, X, Insta, FB)...")
            if (contact.location) addLog(`• Querying Location Index ("${contact.name}" + ${contact.location.split(',')[0]})...`)

            try {
                // Execute Search
                const searchRes = await fetch('/.netlify/functions/summarize', {
                    method: 'POST',
                    body: JSON.stringify({
                        step: 'find_profiles',
                        contactName: contact.name,
                        contactJob: contact.job,
                        contactLocation: contact.location || contact.address,
                        socialLinks: {
                            linkedin: contact.linkedin,
                            twitter: contact.twitter,
                            instagram: contact.instagram,
                            facebook: contact.facebook
                        }
                    })
                })
                const searchData = await searchRes.json()
                const groupedResults = searchData.grouped_results || []
                const candidates = searchData.profiles || []

                if (!mounted) return

                if (searchData.warn) {
                    addLog(`STOP: ${searchData.warn}`, 100)
                    setError(searchData.warn)
                    setIsAnalyzing(false)
                    return
                }

                // DISPLAY EXACT SEARCH PROCESS
                if (groupedResults.length > 0) {
                    groupedResults.forEach((group: any) => {
                        addLog(`🔍 Executed Search: [ ${group.query} ]`)
                        if (group.results.length === 0) {
                            addLog(`   (No direct matches found)`)
                        } else {
                            // Show top 3 results per query to be legible
                            group.results.slice(0, 3).forEach((res: any) => {
                                let icon = "🌐"
                                if (res.platform === "LinkedIn") icon = "👔"
                                if (res.platform === "X/Twitter") icon = "🐦"
                                if (res.platform === "Instagram") icon = "📸"
                                addLog(`   ${icon} Found: ${res.title.substring(0, 50)}...`)
                            })
                            if (group.results.length > 3) {
                                addLog(`   ...and ${group.results.length - 3} more.`)
                            }
                        }
                    })
                    addLog("--------------------------------------------------")
                } else if (candidates.length === 0) {
                    addLog("No direct results found. Resorting to fallback analysis.", 30)
                }

                if (candidates.length > 0) {
                    addLog(`Total Unique Candidates Selected: ${candidates.length}`, 30)
                }

                // Phase 2: Deep Fetch & Analyze
                addLog("Step 2: Deep Content Fetch (Follow Mode)...")
                const deepCandidates = candidates.slice(0, 15)
                addLog(`Following top ${deepCandidates.length} URLs to extract validation credentials...`)

                // We simulate "Visiting" visuals slightly for UX while the real request happens (it will take a few secs anyway)
                // We send the request now
                const analysisPromise = fetch('/.netlify/functions/summarize', {
                    method: 'POST',
                    body: JSON.stringify({
                        step: 'analyze',
                        enrich_mode: 'web',
                        contactName: contact.name,
                        contactJob: contact.job,
                        contactLocation: contact.location || contact.address,
                        confirmed_urls: deepCandidates // Passing full objects {url, title, snippet, platform}
                    })
                })

                // While waiting for promise, show some "fake" progress updates so user isn't bored
                setTimeout(() => mounted && addLog("• Reading page contents...", 50), 1000)
                setTimeout(() => mounted && addLog("• Verifying identity match (Job/Location)...", 60), 2500)
                setTimeout(() => mounted && addLog("• Extracting sustained interests...", 70), 4000)

                const analysisRes = await analysisPromise
                const analysisData = await analysisRes.json()

                if (!mounted) return

                addLog("Analysis Complete. Synthesizing Profile...", 90)
                onComplete(analysisData)
                addLog("Done.", 100)
                setIsAnalyzing(false)

            } catch (err: any) {
                console.error(err)
                if (mounted) {
                    addLog(`Error: ${err.message || "Unknown error occurred."}`, 0)
                    setError("Process failed.")
                    setIsAnalyzing(false)
                }
            }
        }

        runAutomation()

        return () => { mounted = false }
    }, [])

    const addLog = (msg: string, prog?: number) => {
        setLogs(prev => [...prev, msg])
        if (prog !== undefined) setProgress(prog)
    }

    // Scroll to bottom of logs
    useEffect(() => {
        const el = document.getElementById('log-container')
        if (el) el.scrollTop = el.scrollHeight
    }, [logs])

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-black text-green-400 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden font-mono border border-green-900 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <Sparkles size={18} className="text-green-400" />
                        WEB ENRICH AGENT
                    </h3>
                    {!isAnalyzing && (
                        <button onClick={onClose} className="text-gray-500 hover:text-white">
                            <X size={20} />
                        </button>
                    )}
                </div>

                <div className="p-6 h-[400px] flex flex-col">
                    {/* Log Output */}
                    <div id="log-container" className="flex-1 overflow-y-auto space-y-2 text-xs md:text-sm">
                        {error && (
                            <div className="text-red-500 font-bold border-l-2 border-red-500 pl-2 mb-2">
                                [CRITICAL ERROR]: {error}
                            </div>
                        )}
                        {logs.map((log, i) => (
                            <div key={i} className="opacity-90 border-l-2 border-green-800 pl-2">
                                <span className="text-gray-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                {log}
                            </div>
                        ))}
                        {isAnalyzing && (
                            <div className="animate-pulse opacity-50 pl-2">_</div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 pt-4 border-t border-gray-800">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>STATUS: {isAnalyzing ? 'RUNNING' : 'COMPLETE'}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
