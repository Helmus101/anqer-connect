import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Loader2, Sparkles, Globe, Briefcase, MessageSquare } from 'lucide-react'

// Steps Definition
const STEPS = [
    { id: 'interactions', label: 'Reading interaction history', icon: MessageSquare },
    { id: 'socials', label: 'Scanning social profiles', icon: Globe },
    { id: 'job', label: 'Extracting job & company details', icon: Briefcase },
    { id: 'enrich', label: 'Synthesizing insights', icon: Sparkles },
]

interface AnalysisOverlayProps {
    isOpen: boolean
    onClose: () => void
    onComplete: (data: any) => void
    contactId: string
    contactName: string
    onError: (error: string) => void
}

export default function AnalysisOverlay({ isOpen, onClose, onComplete, contactId, contactName, onError }: AnalysisOverlayProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) {
            // Reset state when closed
            setCurrentStep(0)
            setCompletedSteps(new Set())
            setError(null)
            return
        }

        let isMounted = true

        const runAnalysis = async () => {
            try {
                // Start the UI animation sequence
                // We simulate progress for better UX ("Magic" feeling)
                // while the actual request races in the background.

                const stepInterval = setInterval(() => {
                    if (isMounted) {
                        setCurrentStep(prev => {
                            if (prev < STEPS.length - 1) { // Stop at last step until actual done
                                setCompletedSteps(old => new Set(old).add(prev))
                                return prev + 1
                            }
                            return prev
                        })
                    }
                }, 1500) // 1.5s per step visual

                // The ACTUAL Request
                const { generateContactSummary } = await import('../../services/summaryService')
                const result = await generateContactSummary(contactId, 'analysis')

                clearInterval(stepInterval)

                if (isMounted) {
                    // Fast forward to done
                    setCompletedSteps(new Set([0, 1, 2, 3]))
                    setCurrentStep(3)

                    // Small delay to show "All Done" state
                    setTimeout(() => {
                        onComplete(result)
                        onClose()
                    }, 800)
                }

            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || "Analysis Failed")
                    onError(err.message || "Analysis Failed")
                }
            }
        }

        runAnalysis()

        return () => { isMounted = false }

    }, [isOpen, contactId])

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <div className="w-full max-w-md">
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
                            <Sparkles className="text-white" size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-black tracking-tight">
                            Analyzing {contactName}
                        </h2>
                        <p className="text-gray-500 font-medium mt-1">
                            Gathering intelligence from available sources...
                        </p>
                    </div>

                    <div className="space-y-4">
                        {STEPS.map((step, index) => {
                            const isCompleted = completedSteps.has(index)
                            const isCurrent = currentStep === index


                            const Icon = step.icon

                            return (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`
                                        flex items-center gap-4 p-4 rounded-xl border transition-all duration-300
                                        ${isCurrent ? 'bg-white border-black shadow-md scale-105' :
                                            isCompleted ? 'bg-gray-50 border-gray-100 opacity-60' :
                                                'bg-white border-transparent opacity-40'}
                                    `}
                                >
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors
                                        ${isCompleted ? 'bg-green-100 text-green-600' :
                                            isCurrent ? 'bg-black text-white' :
                                                'bg-gray-100 text-gray-400'}
                                    `}>
                                        {isCompleted ? <Check size={20} className="stroke-[3]" /> :
                                            isCurrent ? <Loader2 size={20} className="animate-spin" /> :
                                                <Icon size={20} />}
                                    </div>
                                    <div>
                                        <p className={`font-bold transition-colors ${isCurrent ? 'text-black' : 'text-gray-500'}`}>
                                            {step.label}
                                        </p>
                                        {isCurrent && (
                                            <p className="text-xs text-blue-600 font-medium animate-pulse">
                                                Processing...
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-8 p-4 bg-red-50 text-red-600 rounded-xl text-center font-bold border border-red-100 flex items-center justify-center gap-2"
                        >
                            <X size={20} />
                            {error}
                            <button onClick={onClose} className="ml-4 underline text-sm">Close</button>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
