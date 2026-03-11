import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// PATCH /api/tasks/:id — update a task (done, addedToCalendar)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const updates = await request.json()

    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const client = await clientPromise
    const db = client.db('dejavue')

    // Only allow safe fields to be updated
    const allowed: Record<string, unknown> = {}
    if (typeof updates.done === 'boolean') allowed.done = updates.done
    if (typeof updates.addedToCalendar === 'boolean') allowed.addedToCalendar = updates.addedToCalendar
    if (typeof updates.deadline === 'string') allowed.deadline = updates.deadline

    if (Object.keys(allowed).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    await db.collection('tasks').updateOne({ _id: new ObjectId(id) }, { $set: allowed })
    return NextResponse.json({ success: true })
}

// DELETE /api/tasks/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const client = await clientPromise
    const db = client.db('dejavue')
    await db.collection('tasks').deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ success: true })
}
