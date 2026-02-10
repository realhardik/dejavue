import { generateText, Output } from 'ai'
import { z } from 'zod'

export async function POST(req: Request) {
  const { meetingTranscript, meetingTitle } = await req.json()

  const result = await generateText({
    model: 'openai/gpt-4o-mini',
    system: `You are an expert meeting analyst. Generate comprehensive meeting minutes and summaries.
    Focus on:
    - Key decisions made
    - Action items with owners
    - Main topics discussed
    - Next steps
    Keep summaries concise but complete.`,
    prompt: `Please analyze this meeting transcript and provide:
1. Executive Summary (2-3 sentences)
2. Key Decisions (bullet points)
3. Action Items (with owners if mentioned)
4. Next Meeting Date (if discussed)
5. Participants Summary

Meeting Title: ${meetingTitle}

Transcript:
${meetingTranscript}`,
    output: Output.object({
      schema: z.object({
        executiveSummary: z.string().describe('Brief summary of the meeting'),
        keyDecisions: z
          .array(z.string())
          .describe('Key decisions made during the meeting'),
        actionItems: z
          .array(
            z.object({
              task: z.string(),
              owner: z.string().nullable(),
              dueDate: z.string().nullable(),
            })
          )
          .describe('Action items from the meeting'),
        nextMeetingDate: z.string().nullable().describe('Next meeting date if discussed'),
        topicsDiscussed: z
          .array(z.string())
          .describe('Main topics covered in the meeting'),
        participants: z
          .array(z.string())
          .describe('Names of participants'),
      }),
    }),
  })

  return Response.json(result.object)
}
