import { Handler } from '@netlify/functions'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export const handler: Handler = async (event, context) => {
    if (!OPENAI_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: "Missing API Key" }) }
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' }
    }

    try {
        // Need to handle multipart/form-data for file upload OR base64 json.
        // Easiest is to accept base64 JSON from client to avoid complex multipart parsing in raw Netlify function without middleware.
        // Client sends: { audio: "base64..." }

        const body = JSON.parse(event.body || '{}')
        if (!body.audio) {
            return { statusCode: 400, body: JSON.stringify({ error: "No audio data" }) }
        }

        // Convert base64 to Blob/File concept for OpenAI?
        // OpenAI API expects 'file' in multipart/form-data.
        // We have to construct a multipart request manually or use a helper.

        // Let's decode base64 to buffer.
        const audioBuffer = Buffer.from(body.audio, 'base64')

        // Construct multipart form data
        const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
        const part1 = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.webm"\r\nContent-Type: audio/webm\r\n\r\n`
        const part2 = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n--${boundary}--\r\n`

        const fullBody = Buffer.concat([
            Buffer.from(part1),
            audioBuffer,
            Buffer.from(part2)
        ])

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: fullBody
        })

        if (!response.ok) {
            const errText = await response.text()
            throw new Error(`OpenAI Error: ${errText}`)
        }

        const data = await response.json()
        return {
            statusCode: 200,
            body: JSON.stringify({ text: data.text })
        }

    } catch (error: any) {
        console.error("Transcription failed", error)
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        }
    }
}
