import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// GET /api/tasks?userId=X — all tasks for a user
// GET /api/tasks?userId=X&meetingId=Y — tasks for a specific meeting
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')
    const meetingId = searchParams.get('meetingId')

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const client = await clientPromise
    const db = client.db('dejavue')
    const query: Record<string, unknown> = { userId }
    if (meetingId) query.meetingId = meetingId

    const tasks = await db
        .collection('tasks')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray()

    return NextResponse.json({ tasks })
}

// POST /api/tasks — bulk-insert extracted tasks for a meeting (called once per meeting)
export async function POST(request: NextRequest) {
    const { userId, meetingId, meetingTitle, tasks } = await request.json()
    if (!userId || !meetingId || !Array.isArray(tasks)) {
        return NextResponse.json({ error: 'userId, meetingId, tasks[] required' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('dejavue')

    // Avoid duplicates: delete existing tasks for this meeting before inserting
    await db.collection('tasks').deleteMany({ userId, meetingId })

    if (tasks.length === 0) return NextResponse.json({ inserted: 0 })

    const docs = tasks.map((t: Record<string, unknown>) => ({
        userId,
        meetingId,
        meetingTitle: meetingTitle || 'Meeting',
        person: t.person ?? '',
        task: t.task ?? '',
        deadline: t.deadline ?? null,
        type: t.type ?? 'task',
        isCurrentUser: t.isCurrentUser ?? false,
        done: false,
        addedToCalendar: false,
        createdAt: new Date(),
    }))

    const result = await db.collection('tasks').insertMany(docs)
    return NextResponse.json({ inserted: result.insertedCount })
}
