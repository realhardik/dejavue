import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import os from 'os'

const TOKEN_PATH = path.join(os.homedir(), '.dejavue-gcal-token.json')
const REDIRECT_URI = 'http://localhost:3000/api/calendar/callback'

function getAuthorizedClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret || !fs.existsSync(TOKEN_PATH)) return null

    const client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)
    try {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'))
        client.setCredentials(token)
        return client
    } catch { return null }
}

// POST /api/calendar/add-event — directly adds an event to Google Calendar
export async function POST(request: NextRequest) {
    const auth = getAuthorizedClient()
    if (!auth) return NextResponse.json({ error: 'not_authorized', message: 'Google Calendar not connected' }, { status: 401 })

    const { task, deadline, meetingTitle } = await request.json()

    let startDate: Date
    try {
        const parsed = Date.parse(deadline)
        startDate = isNaN(parsed) ? new Date(Date.now() + 86400000) : new Date(parsed)
    } catch {
        startDate = new Date(Date.now() + 86400000)
    }
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)

    const calendar = google.calendar({ version: 'v3', auth })
    const event = {
        summary: task,
        description: `Task from meeting: ${meetingTitle}`,
        start: { dateTime: startDate.toISOString(), timeZone: 'Asia/Kolkata' },
        end: { dateTime: endDate.toISOString(), timeZone: 'Asia/Kolkata' },
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 24 * 60 },
                { method: 'popup', minutes: 30 },
            ],
        },
    }

    try {
        const res = await calendar.events.insert({ calendarId: 'primary', requestBody: event })
        return NextResponse.json({ success: true, eventId: res.data.id, link: res.data.htmlLink })
    } catch (err: unknown) {
        const msg = (err as { message?: string })?.message || 'Failed to add event'
        const isApiDisabled = msg.includes('has not been used') || msg.includes('is disabled')
        return NextResponse.json(
            { error: isApiDisabled ? 'api_disabled' : 'insert_failed', message: isApiDisabled ? 'Enable Google Calendar API at https://console.cloud.google.com/apis/library/calendar-json.googleapis.com' : msg },
            { status: 503 }
        )
    }
}
