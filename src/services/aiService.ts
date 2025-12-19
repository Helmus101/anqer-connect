import type { Interest } from '../types'

// Mock response for AI enrichment
const MOCK_INTERESTS: Interest[] = [
    { name: "Surfing", frequency: "high", source: "instagram" },
    { name: "Vegan Cooking", frequency: "medium", source: "instagram" },
    { name: "Tech Startups", frequency: "high", source: "linkedin" },
    { name: "Indie Music", frequency: "medium", source: "spotify" }
]

export const enrichContact = async (_contactId: string): Promise<{ interests: Interest[], summary: string }> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    return {
        interests: MOCK_INTERESTS,
        summary: "Alex has been posting a lot about surfing in Bali lately. Also seems to be getting into vegan cooking based on recent stories."
    }
}
