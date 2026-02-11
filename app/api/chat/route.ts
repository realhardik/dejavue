import { streamText } from 'ai'
import { google } from '@ai-sdk/google'

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 })
    }

    const result = streamText({
      model: google('gemini-2.0-flash'),
      system: `You are Dejavue's AI meeting assistant. You have access to the live meeting transcript provided in the conversation.

Your capabilities:
- Answer questions about what's being discussed in the meeting
- Identify key decisions, action items, and important points
- Clarify what was said by specific participants
- Summarize sections of the meeting on demand
- Track topics and themes as they emerge

Be concise, helpful, and context-aware. Reference specific parts of the transcript when answering.`,
      messages,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('[Chat API] Error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
