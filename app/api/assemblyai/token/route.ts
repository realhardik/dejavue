import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Returns the AssemblyAI API key server-side so the overlay can open the WebSocket
// without the key being hardcoded on the client. Since this is an Electron app
// (not a public website), returning the key from a server route is safe.
export async function POST() {
    const key = process.env.ASSEMBLYAI_API_KEY
    if (!key) {
        return NextResponse.json({ error: 'ASSEMBLYAI_API_KEY not set' }, { status: 500 })
    }
    return NextResponse.json({ token: key })
}
