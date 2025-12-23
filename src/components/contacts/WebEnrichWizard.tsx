import { useState, useEffect } from 'react'
import { Sparkles, X, CheckCircle, XCircle } from 'lucide-react'
import type { Contact } from '../../types'
import { enrichContact } from '../../services/contactService'

interface WebEnrichWizardProps {
    contact: Contact
    onClose: () => void
    onComplete: (result: any) => void
}

export default function WebEnrichWizard({ contact, onClose, onComplete }: WebEnrichWizardProps) {
    const [logs, setLogs] = useState<string[]>([])
    const [isAnalyzing, setIsAnalyzing] = useState(true)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<any>(null)

    // Automated Flow - Following exact 16-step workflow
    useEffect(() => {
        let mounted = true

        const runEnrichment = async () => {
            addLog("🚀 Initializing Web Enrichment Workflow...", 0)
            addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", 0)

            try {
                // STEP 1: Contact Import / Anchor Extraction
                addLog("STEP 1: Extracting Anchors...", 5)
                const anchors: string[] = []
                
                if (contact.email) {
                    const domain = contact.email.split('@')[1]
                    const isGeneric = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'].includes(domain?.toLowerCase())
                    if (domain && !isGeneric) {
                        anchors.push(`Email Domain: ${domain}`)
                        addLog(`  ✓ Email domain anchor: ${domain}`)
                    }
                }
                
                // Extract company from job field (format: "Title at Company" or "Title @ Company")
                if (contact.job) {
                    let company: string | null = null
                    if (contact.job.includes(' at ')) {
                        company = contact.job.split(' at ')[1].trim()
                    } else if (contact.job.includes('@')) {
                        company = contact.job.split('@')[1].trim()
                    }
                    if (company) {
                        anchors.push(`Company: ${company}`)
                        addLog(`  ✓ Company anchor: ${company}`)
                    }
                }
                
                if (contact.location || contact.address) {
                    const location = contact.location || contact.address
                    anchors.push(`Location: ${location}`)
                    addLog(`  ✓ Location anchor: ${location}`)
                }
                
                const socialFields = ['linkedin', 'twitter', 'instagram', 'facebook', 'github']
                for (const field of socialFields) {
                    if (contact[field as keyof Contact]) {
                        anchors.push(`Social URL: ${contact[field as keyof Contact]}`)
                        addLog(`  ✓ Social anchor: ${field}`)
                    }
                }
                
                if (anchors.length === 0) {
                    addLog("  ✗ No valid anchors found. Enrichment requires at least one anchor.", 0)
                    setError("Contact must have company, location, work email domain, or social URL")
                    setIsAnalyzing(false)
                    return
                }
                
                addLog(`  → Total anchors: ${anchors.length}`, 10)
                addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", 10)

                // STEP 2-3: Eligibility Gate & Query Construction
                addLog("STEP 2: Eligibility Check...", 15)
                if (!contact.name || contact.name === 'New Contact') {
                    addLog("  ✗ Name is required", 0)
                    setError("Contact name is required")
                    setIsAnalyzing(false)
                    return
                }
                addLog("  ✓ Contact eligible for enrichment", 20)
                addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", 20)

                // STEP 3: Query Construction
                addLog("STEP 3: Constructing Deterministic Queries...", 25)
                addLog(`  → Name: "${contact.name}" (quoted)`, 25)
                addLog("  → Building queries with anchors...", 25)
                addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", 30)

                // STEP 4-5: Google Search & URL Pre-filter
                addLog("STEP 4: Executing Google Search...", 35)
                addLog("  → Querying Google Custom Search API...", 40)
                
                // Call the enrichment endpoint
                const enrichmentResult = await enrichContact(contact.id)
                
                if (!mounted) return

                if (!enrichmentResult.success) {
                    addLog(`  ✗ ${enrichmentResult.reason || 'Enrichment failed'}`, 0)
                    setError(enrichmentResult.reason || 'Enrichment failed')
                    setIsAnalyzing(false)
                    return
                }

                // Display queries executed
                if (enrichmentResult.queries) {
                    addLog(`  → Executed ${enrichmentResult.queries.length} queries:`, 45)
                    enrichmentResult.queries.forEach((q: string, i: number) => {
                        addLog(`    ${i + 1}. "${q}"`, 45)
                    })
                }
                addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", 50)

                // STEP 5: URL Pre-filter
                addLog("STEP 5: Pre-filtering URLs...", 55)
                addLog("  → Filtering blocked domains...", 55)
                addLog("  → Checking profile patterns...", 60)
                addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", 60)

                // STEP 6: URL Fetch & Parsing
                addLog("STEP 6: Fetching & Parsing URLs (Source of Truth)...", 65)
                addLog(`  → Following top ${enrichmentResult.candidates_found || 0} candidate URLs...`, 70)
                addLog("  → Extracting: Name, Role, Company, Location, Bio...", 75)
                addLog("  → Parsing with Cheerio...", 80)
                addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", 80)

                // STEP 7-8: Consolidation & Scoring
                addLog("STEP 7: Consolidating Candidates...", 85)
                addLog("STEP 8: Cross-Signal Scoring...", 85)
                addLog("  → Matching against anchors...", 85)
                addLog("  → Calculating confidence scores...", 90)
                addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", 90)

                // STEP 9-10: Confidence Classification & Hypothesis
                addLog("STEP 9: Classifying Confidence...", 95)
                
                if (enrichmentResult.top_candidate) {
                    const candidate = enrichmentResult.top_candidate
                    const score = candidate.confidence_score
                    
                    let confidenceLabel = 'LOW'
                    if (score >= 7) confidenceLabel = 'HIGH'
                    else if (score >= 4) confidenceLabel = 'MEDIUM'
                    
                    addLog(`  → Top candidate score: ${score} (${confidenceLabel})`, 95)
                    addLog(`  → Name: ${candidate.name || 'N/A'}`, 95)
                    addLog(`  → Company: ${candidate.company || 'N/A'}`, 95)
                    addLog(`  → Role: ${candidate.role || 'N/A'}`, 95)
                    addLog(`  → Source: ${candidate.source_url}`, 95)
                    
                    if (enrichmentResult.hypothesis) {
                        addLog(`  ✓ ProfileHypothesis created (${enrichmentResult.hypothesis.confidence_level})`, 95)
                    }
                } else {
                    addLog("  → No high-confidence candidates found", 95)
                }
                
                addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", 100)
                addLog("✅ Enrichment Complete", 100)
                
                setResult(enrichmentResult)
                setIsAnalyzing(false)
                
                // Auto-complete after a brief delay
                setTimeout(() => {
                    if (mounted) {
                        onComplete(enrichmentResult)
                    }
                }, 1500)

            } catch (err: any) {
                console.error(err)
                if (mounted) {
                    addLog(`  ✗ Error: ${err.message || "Unknown error occurred."}`, 0)
                    setError(err.message || "Process failed.")
                    setIsAnalyzing(false)
                }
            }
        }

        runEnrichment()

        return () => { mounted = false }
    }, [contact.id, contact.name, contact.email, contact.job, contact.location, contact.address, onComplete])

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
                        WEB ENRICHMENT WORKFLOW
                    </h3>
                    {!isAnalyzing && (
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>

                <div className="p-6 h-[500px] flex flex-col">
                    {/* Log Output */}
                    <div id="log-container" className="flex-1 overflow-y-auto space-y-1 text-xs md:text-sm mb-4">
                        {error && (
                            <div className="text-red-500 font-bold border-l-2 border-red-500 pl-2 mb-2 flex items-center gap-2">
                                <XCircle size={16} />
                                [ERROR]: {error}
                            </div>
                        )}
                        {logs.map((log, i) => {
                            const isStep = log.startsWith('STEP')
                            const isSuccess = log.includes('✓')
                            const isError = log.includes('✗')
                            const isSeparator = log.includes('━')
                            
                            return (
                                <div 
                                    key={i} 
                                    className={`opacity-90 border-l-2 pl-2 ${
                                        isStep ? 'border-green-500 font-bold' :
                                        isSuccess ? 'border-green-600' :
                                        isError ? 'border-red-600 text-red-400' :
                                        isSeparator ? 'border-gray-700 text-gray-600' :
                                        'border-green-800'
                                    }`}
                                >
                                    <span className="text-gray-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                    {log}
                                </div>
                            )
                        })}
                        {isAnalyzing && (
                            <div className="animate-pulse opacity-50 pl-2 border-l-2 border-green-800">_</div>
                        )}
                    </div>

                    {/* Result Summary */}
                    {result && result.top_candidate && !isAnalyzing && (
                        <div className="mb-4 p-3 bg-gray-900 rounded border border-gray-800">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle size={16} className="text-green-400" />
                                <span className="font-bold text-sm">Top Candidate Found</span>
                            </div>
                            <div className="text-xs space-y-1 text-gray-400">
                                <div><span className="text-gray-500">Name:</span> {result.top_candidate.name || 'N/A'}</div>
                                <div><span className="text-gray-500">Company:</span> {result.top_candidate.company || 'N/A'}</div>
                                <div><span className="text-gray-500">Role:</span> {result.top_candidate.role || 'N/A'}</div>
                                <div><span className="text-gray-500">Confidence:</span> {result.top_candidate.confidence_score} / 10</div>
                            </div>
                        </div>
                    )}

                    {/* Progress Bar */}
                    <div className="pt-4 border-t border-gray-800">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>STATUS: {isAnalyzing ? 'RUNNING' : error ? 'FAILED' : 'COMPLETE'}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ease-out ${
                                    error ? 'bg-red-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
