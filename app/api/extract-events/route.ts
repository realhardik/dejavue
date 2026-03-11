import { NextRequest, NextResponse } from 'next/server'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        const { text, userName, meetingTitle } = await request.json()
        if (!text) return NextResponse.json({ events: [] })

        const prompt = `You are analyzing a meeting transcript chunk to extract tasks, deadlines, and calendar events.

Meeting: "${meetingTitle || 'Meeting'}"
${userName ? `The current user's name is: "${userName}"` : ''}

Transcript chunk:
"${text}"

Extract ALL tasks, deadlines, events or meetings mentioned. For each one return a JSON object with:
- person: who it's assigned to or who should attend (string, use "Unknown" if not clear)  
- task: what they need to do or what the event is (string)
- deadline: when it's due or when it happens — be specific if mentioned (e.g. "March 17", "this Friday", "next Monday 3pm") or null if not mentioned
- type: "task" | "deadline" | "event" | "meeting"
- isCurrentUser: true if ${userName ? `"${userName}"` : 'the current user'} is the person (be smart about nicknames and shortened names)

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
