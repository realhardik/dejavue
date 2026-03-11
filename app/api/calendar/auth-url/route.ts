import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import os from 'os'

const TOKEN_PATH = path.join(os.homedir(), '.dejavue-gcal-token.json')
const REDIRECT_URI = 'http://localhost:3000/api/calendar/callback'

function getOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) return null
    return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)
}

// GET — returns the Google OAuth URL to open in browser
export async function GET() {
    const auth = getOAuth2Client()
    if (!auth) {
        return NextResponse.json({
            error: 'credentials_missing',
            message: 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local, and add http://localhost:3000/api/calendar/callback as an authorised redirect URI in Google Cloud Console.'
        }, { status: 503 })
    }

    const url = auth.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.events'],
        prompt: 'consent',
    })
    return NextResponse.json({ url })
}
