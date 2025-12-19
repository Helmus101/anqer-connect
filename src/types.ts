export type Contact = {
    id: string
    name: string
    avatar?: string
    lastContacted: string // ISO date
    lastContactType: 'whatsapp' | 'call' | 'message' | 'in_person' | 'instagram' | 'discord' | 'email' | 'meeting'
    relationshipStrength: 'close' | 'medium' | 'weak' | 'drifting'
    tags: string[]
    bio?: string
    job?: string
    location?: string
    interests?: Interest[]
    interactions?: Interaction[]
    phone?: string
    email?: string
    howMet?: string
    customNotes?: string
    groups?: Group[]
    socialLinks?: SocialLink[]
    address?: string
    birthday?: string
    aiSummary?: string
    relationshipSummary?: string
    lastAnalyzed?: string
    coordinates?: {
        lat: number
        lng: number
    }
    linkedin?: string
    twitter?: string
    instagram?: string
    facebook?: string
    snapchat?: string
    healthScore?: number
    lastAnalyzedAt?: string
}

export type SocialLink = {
    platform: string
    url: string
}

export type Group = {
    id: string
    name: string
}

export type Interest = {
    name: string
    frequency: 'high' | 'medium' | 'low'
    source: 'instagram' | 'discord' | 'whatsapp' | 'manual' | 'linkedin' | 'spotify' | 'ai'
    link?: string
}

export type Interaction = {
    id: string
    contactId: string
    type: Contact['lastContactType']
    date: string
    notes: string
    platform: string
    topics?: string[]
    sentiment?: string
    commitments?: Commitment[]
}

export type Commitment = {
    who: 'me' | 'them'
    what: string
    status: 'pending' | 'done'
    dueDate?: string
}

export type GeneratedPrompt = {
    id: string
    contactId: string
    prompt: string
    context: string
    status: 'new' | 'used' | 'dismissed'
    createdAt: string
}
