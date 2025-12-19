import { Handler } from '@netlify/functions'
import { AssemblyAI } from 'assemblyai'

const handler: Handler = async (event) => {
    try {
        const apiKey = process.env.ASSEMBLYAI_API_KEY
        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "ASSEMBLYAI_API_KEY is not set" })
            }
        }

        const client = new AssemblyAI({ apiKey })
        const token = await client.realtime.createTemporaryToken({ expires_in: 3600 })

        return {
            statusCode: 200,
            body: JSON.stringify({ token })
        }
    } catch (error) {
        console.error(error)
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to generate token" })
        }
    }
}

export { handler }
