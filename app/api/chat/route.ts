import { streamText, convertToModelMessages } from 'ai'

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 })
    }

    const result = streamText({
      model: 'openai/gpt-4o-mini',
      system: `You are Dejavue's AI assistant, specialized in helping users analyze and understand their meetings. 
      You have access to meeting transcripts, summaries, and participant information.
      You should:
      - Provide clear, concise answers about meeting content
      - Help identify action items and decisions
      - Offer insights about meeting dynamics and key topics
      - Answer questions about specific moments in the meeting
      - Help with meeting follow-ups and action tracking
      Be conversational, helpful, and context-aware.`,
      messages: await convertToModelMessages(messages),
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('[v0] Chat API error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
