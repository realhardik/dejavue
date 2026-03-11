import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import os from 'os'

const TOKEN_PATH = path.join(os.homedir(), '.dejavue-gcal-token.json')
const REDIRECT_URI = 'http://localhost:3000/api/calendar/callback'

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code')
    const error = request.nextUrl.searchParams.get('error')

    if (error) {
        return new NextResponse(html('Authorization denied', `<p>You denied access. Close this tab and try again.</p>`, false))
    }

    if (!code) {
        return new NextResponse(html('No code received', `<p>Something went wrong. Close this tab and try again.</p>`, false))
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
        return new NextResponse(html('Not configured', `<p>Google credentials not configured in .env.local.</p>`, false))
    }

    const auth = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)
    const { tokens } = await auth.getToken(code)
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens))

    return new NextResponse(html(
        '✅ Calendar Connected!',
        `<p>DejaVue is now connected to your Google Calendar.</p>
         <p style="margin-top:12px;color:#888">You can close this tab and go back to the app. Click <strong>Add to Calendar</strong> again to add your event.</p>`,
        true
    ), { headers: { 'Content-Type': 'text/html' } })
}

function html(title: string, body: string, success: boolean) {
    const color = success ? '#6366f1' : '#ef4444'
    return `<!DOCTYPE html><html><head><title>${title}</title>
    <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0a0a0a;color:#fff}
    .card{background:#1a1a1a;border:1px solid #333;border-radius:16px;padding:40px;text-align:center;max-width:400px}
    h1{color:${color};margin:0 0 16px}p{color:#aaa;line-height:1.6}</style></head>
    <body><div class="card"><h1>${title}</h1>${body}</div></body></html>`
}
