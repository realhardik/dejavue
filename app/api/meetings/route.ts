import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

// GET - list meetings for a user
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        const client = await clientPromise
        const db = client.db('dejavue')

        const query: Record<string, unknown> = {}
        if (userId) query.userId = userId

        const meetings = await db
            .collection('meetings')
            .find(query)
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray()

        return NextResponse.json({ meetings })
    } catch (error) {
        console.error('Error fetching meetings:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST - create a new meeting
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userId, meetingId, title, platform } = body

        if (!title || !platform) {
            return NextResponse.json(
                { error: 'Title and platform are required' },
                { status: 400 }
            )
        }

        const client = await clientPromise
        const db = client.db('dejavue')

        const meeting = {
            userId: userId || null,
            meetingId: meetingId || null,
            title,
            platform,
            status: 'active',
            createdAt: new Date(),
            endedAt: null,
            durationMs: null,
            transcript: [],
            summary: null,
            summaryFilePath: null,
        }

        const result = await db.collection('meetings').insertOne(meeting)

        return NextResponse.json({
            success: true,
            meeting: { ...meeting, _id: result.insertedId },
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating meeting:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
