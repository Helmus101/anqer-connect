import { Handler } from '@netlify/functions'

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY

export const handler: Handler = async (event, context) => {
    if (!DEEPGRAM_API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "DEEPGRAM_API_KEY is not set in environment" })
        }
    }

    // Direct Pass-through (Simplified for MVP/Personal Key)
    // Generating a temporary key requires 'project:write' scope which standard keys don't have.
    // We return the key directly. 
    return {
        statusCode: 200,
        body: JSON.stringify({ token: DEEPGRAM_API_KEY })
    }
}
