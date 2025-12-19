
import { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Make a GET request to generate a token.' }
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "ELEVENLABS_API_KEY is not set" })
        }
    }

    try {
        // Since the objective is "realtime_scribe" (Speech-To-Text), we use that type.
        // Documentation suggests POSTing to /v1/single-use-token with ?token_type=realtime_scribe
        // But some docs say :token_type in path. Let's try path based on findings.
        // URL: https://api.elevenlabs.io/v1/single-use-token/realtime_scribe

        const response = await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey
            }
        })

        if (!response.ok) {
            const errText = await response.text()
            console.error("ElevenLabs Token Error:", errText)
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Failed to generate token: ${errText}` })
            }
        }

        const data = await response.json()
        return {
            statusCode: 200,
            body: JSON.stringify({ token: data.token })
        }

    } catch (error) {
        console.error(error)
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" })
        }
    }
}
