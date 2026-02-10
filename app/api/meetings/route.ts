import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// GET - list all meetings
export async function GET() {
    try {
        const client = await clientPromise
        const db = client.db('dejavue')
        const meetings = await db
            .collection('meetings')
            .find({})
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
        const { title, platform, status } = body

        if (!title || !platform) {
            return NextResponse.json(
                { error: 'Title and platform are required' },
                { status: 400 }
            )
        }

        const client = await clientPromise
        const db = client.db('dejavue')

        const meeting = {
            title,
            platform,
            status: status || 'active',
            createdAt: new Date(),
            endedAt: null,
            duration: null,
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
