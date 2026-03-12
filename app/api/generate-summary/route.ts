import { generateText } from 'ai'
import { google } from '@ai-sdk/google'

export async function POST(req: Request) {
  try {
    const { meetingTranscript, meetingTitle, platform } = await req.json()

    if (!meetingTranscript) {
      return Response.json({ error: 'No transcript provided' }, { status: 400 })
    }

    const result = await generateText({
      model: google('gemini-2.5-flash'),
      system: `You are an expert meeting analyst. Generate comprehensive, well-formatted meeting minutes.
Focus on accuracy and actionable outcomes. Format your response as clean, readable text.`,
      prompt: `Analyze this meeting transcript and respond with the following structure EXACTLY:

TITLE: <a short descriptive meeting title, max 7 words, no quotes, no trailing punctuation>

SUMMARY:
1. EXECUTIVE SUMMARY
   A brief 2-3 sentence overview of the meeting.

2. KEY DECISIONS
   List all decisions made during the meeting.

3. ACTION ITEMS
   List each action item with the responsible person (if mentioned).

4. TOPICS DISCUSSED
   Main topics covered during the meeting.

5. NEXT STEPS
   Any follow-up items or next meeting plans discussed.

---
Meeting Title: ${meetingTitle || 'Untitled Meeting'}
Date: ${new Date().toLocaleDateString()}

Transcript:
${meetingTranscript}`,
    })

    const raw = result.text || ''

    // Parse TITLE: line
    const titleMatch = raw.match(/^TITLE:\s*(.+)$/m)
    const suggestedTitle = titleMatch
      ? titleMatch[1].trim().replace(/^["']|["']$/g, '').slice(0, 60)
      : null

    // Everything after SUMMARY: is the summary body
    const summaryMatch = raw.match(/SUMMARY:\s*([\s\S]+)/)
    const summary = summaryMatch ? summaryMatch[1].trim() : raw.trim()

    return Response.json({ summary, suggestedTitle })
  } catch (error) {
    console.error('[Summary API] Error:', error)
    return Response.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
