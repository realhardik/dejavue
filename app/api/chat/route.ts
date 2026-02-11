import { streamText } from 'ai'
import { google } from '@ai-sdk/google'

export async function POST(req: Request) {
  try {
    const { messages, meetingContext } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 })
    }

    // Build system prompt — inject meeting M.o.M if provided
    let systemPrompt = `You are Dejavue's AI meeting assistant.

Your capabilities:
- Answer questions about meetings
- Summarize key points and action items
- Help with follow-ups and meeting preparation`

    if (meetingContext) {
      systemPrompt += `

You have access to the following Minutes of Meeting (M.o.M). Use this context to answer the user's questions accurately:

--- MINUTES OF MEETING ---
${meetingContext}
--- END ---`
    }

    const result = streamText({
      model: google('gemini-2.0-flash'),
      system: systemPrompt,
      messages,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[Chat API] Error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
