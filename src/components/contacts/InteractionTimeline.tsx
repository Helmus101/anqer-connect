import { type Interaction } from '../../types'
import { useState } from 'react'

interface InteractionTimelineProps {
    interactions: Interaction[]
}

const InteractionItem = ({ interaction }: { interaction: Interaction }) => {
    const [isExpanded, setIsExpanded] = useState(false)

    // Check if text is long or has newlines (e.g. WhatsApp transcript)
    const isLongText = interaction.notes && (interaction.notes.length > 200 || interaction.notes.includes('\n'))

    // Determine what to show
    const displayNotes = isExpanded ? interaction.notes : (
        isLongText ? interaction.notes.slice(0, 200).split('\n')[0] + '...' : interaction.notes
    )

    return (
        <div className="relative group">
            {/* Dot & Sentiment Line */}
            <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white 
            ${interaction.type === 'whatsapp' ? 'bg-green-500' :
                    interaction.type === 'call' ? 'bg-blue-500' :
                        interaction.type === 'email' ? 'bg-yellow-500' :
                            interaction.type === 'meeting' ? 'bg-purple-500' :
                                interaction.type === 'instagram' ? 'bg-pink-500' : 'bg-gray-500'}`}
            ></div>

            {/* Sentiment Indicator (subtle vertical line) */}
            {interaction.sentiment && (
                <div className={`absolute -left-[16px] top-6 bottom-0 w-0.5 rounded-full
                    ${interaction.sentiment === 'positive' ? 'bg-green-200' :
                        interaction.sentiment === 'concerned' ? 'bg-red-200' : 'bg-gray-100'}`}
                />
            )}

            <div className="flex justify-between items-start">
                <div className="w-full pr-4">
                    <p className="text-xs text-gray-400 font-mono mb-1 flex items-center gap-2">
                        {new Date(interaction.date).toLocaleDateString()}
                        {interaction.sentiment && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize
                                ${interaction.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                                    interaction.sentiment === 'concerned' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                {interaction.sentiment}
                            </span>
                        )}
                    </p>
                    <div className="text-black font-medium text-sm">
                        <span className="capitalize font-bold">{interaction.type}</span>:&nbsp;
                        <span className="whitespace-pre-line text-gray-800">{displayNotes}</span>
                        {isLongText && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="text-xs text-blue-600 font-bold hover:underline ml-2"
                            >
                                {isExpanded ? '(Show Less)' : '(Show More)'}
                            </button>
                        )}
                    </div>

                    {/* AI extracted data */}
                    {(interaction.topics?.length || interaction.commitments?.length) ? (
                        <div className="mt-3 space-y-2">
                            {/* Topics */}
                            {interaction.topics && interaction.topics.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {interaction.topics.map((topic, i) => (
                                        <span key={i} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-medium border border-indigo-100">
                                            #{topic}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Commitments */}
                            {interaction.commitments && interaction.commitments.length > 0 && (
                                <div className="space-y-1 mt-2">
                                    {interaction.commitments.map((c, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs bg-yellow-50 border border-yellow-200 p-2 rounded-md">
                                            <span className="font-bold text-yellow-800 uppercase text-[10px]">
                                                {c.who === 'me' ? 'I promised:' : 'They promised:'}
                                            </span>
                                            <span className={c.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}>
                                                {c.what}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}

                </div>
                <span className="text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    via {interaction.platform}
                </span>
            </div>
        </div>
    )
}

export default function InteractionTimeline({ interactions }: InteractionTimelineProps) {
    const [isOpen, setIsOpen] = useState(true)

    if (interactions.length === 0) return <div className="text-gray-500 italic">No history yet.</div>

    return (
        <div className="space-y-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black transition-colors"
            >
                {isOpen ? '▼' : '▶'} Interaction History ({interactions.length})
            </button>

            {isOpen && (
                <div className="border-l-2 border-gray-200 pl-4 ml-2 space-y-8 animate-in slide-in-from-top-2 duration-300">
                    {interactions.map(interaction => (
                        <InteractionItem key={interaction.id} interaction={interaction} />
                    ))}
                </div>
            )}
        </div>
    )
}
