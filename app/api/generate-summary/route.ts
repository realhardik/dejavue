import { generateText } from 'ai'
import { google } from '@ai-sdk/google'

export async function POST(req: Request) {
  try {
    const { meetingTranscript, meetingTitle, platform } = await req.json()

    if (!meetingTranscript) {
      return Response.json({ error: 'No transcript provided' }, { status: 400 })
    }

    // Run summary and title generation in parallel
    const [summaryResult, titleResult] = await Promise.all([
      generateText({
        model: google('gemini-2.5-flash'),
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
      }),
      generateText({
        model: google('gemini-2.5-flash'),
        prompt: `Based on this meeting transcript, generate a short, descriptive meeting title (maximum 7 words, no quotes, no punctuation at end).
Only respond with the title itself, nothing else.

Transcript (first 1500 chars):
${meetingTranscript.slice(0, 1500)}`,
      }),
    ])

    const suggestedTitle = titleResult.text?.trim().replace(/^["']|["']$/g, '').slice(0, 60) || null

    return Response.json({ summary: summaryResult.text, suggestedTitle })
  } catch (error) {
    console.error('[Summary API] Error:', error)
    return Response.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
