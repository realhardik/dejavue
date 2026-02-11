import { generateText } from 'ai'
import { google } from '@ai-sdk/google'

export async function POST(req: Request) {
  try {
    const { meetingTranscript, meetingTitle } = await req.json()

    if (!meetingTranscript) {
      return Response.json({ error: 'No transcript provided' }, { status: 400 })
    }

    const result = await generateText({
      model: google('gemini-2.0-flash'),
      system: `You are an expert meeting analyst. Generate comprehensive, well-formatted meeting minutes.
Focus on accuracy and actionable outcomes. Format your response as clean, readable text.`,
      prompt: `Analyze this meeting transcript and generate a complete summary:

Meeting Title: ${meetingTitle || 'Untitled Meeting'}
Date: ${new Date().toLocaleDateString()}

Transcript:
${meetingTranscript}

Please provide:

1. EXECUTIVE SUMMARY
   A brief 2-3 sentence overview of the meeting.

2. KEY DECISIONS
   List all decisions made during the meeting.

3. ACTION ITEMS
   List each action item with the responsible person (if mentioned).

4. TOPICS DISCUSSED
   Main topics covered during the meeting.

5. NEXT STEPS
   Any follow-up items or next meeting plans discussed.`,
    })

    return Response.json({ summary: result.text })
  } catch (error) {
    console.error('[Summary API] Error:', error)
    return Response.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
