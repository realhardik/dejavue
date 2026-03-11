import { NextRequest, NextResponse } from 'next/server'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        const { text, summary, userName, meetingTitle } = await request.json()
        const content = text || summary
        if (!content) return NextResponse.json({ events: [] })

        const isCurrentUserRule = userName
            ? `ONLY true if "${userName}" is explicitly and unambiguously the assigned person. Default to false if the name is unclear, generic (e.g. "someone", "you", "team"), or when in doubt.`
            : 'always false — no user name provided'

        const prompt = `You are analyzing a meeting transcript chunk to extract tasks, deadlines, and calendar events.

Meeting: "${meetingTitle || 'Meeting'}"
${userName ? `The current user's name is: "${userName}"` : ''}

Transcript chunk:
"${content}"

Extract ALL tasks, deadlines, events or meetings mentioned. For each one return a JSON object with:
- person: who it's assigned to or who should attend (string, use "Unknown" if not clear)
- task: what they need to do or what the event is (string)
- deadline: when it's due or when it happens — be specific if mentioned (e.g. "March 17", "this Friday", "next Monday 3pm") or null if not mentioned
- type: "task" | "deadline" | "event" | "meeting"
- isCurrentUser: ${isCurrentUserRule}

Return ONLY a valid JSON array. If nothing relevant, return [].
Example: [{"person":"Mark","task":"Handle user authentication","deadline":"Thursday","type":"task","isCurrentUser":false}]`

        const { text: raw } = await generateText({
            model: google('gemini-2.5-flash'),
            prompt,
        })

        // Extract JSON array from response
        const match = raw.match(/\[[\s\S]*\]/)
        if (!match) return NextResponse.json({ events: [] })

        const events = JSON.parse(match[0])
        return NextResponse.json({ events })
    } catch (e) {
        console.error('[extract-events]', e)
        return NextResponse.json({ events: [] })
    }
}
