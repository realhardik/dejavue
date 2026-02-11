import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// GET - get single meeting
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Invalid meeting ID' }, { status: 400 })
        }

        const client = await clientPromise
        const db = client.db('dejavue')
        const meeting = await db.collection('meetings').findOne({ _id: new ObjectId(id) })

        if (!meeting) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
        }

        return NextResponse.json({ meeting })
    } catch (error) {
        console.error('Error fetching meeting:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PATCH - update meeting (transcript, summary, end meeting)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Invalid meeting ID' }, { status: 400 })
        }

        const body = await request.json()
        const updateFields: Record<string, unknown> = {}

        if (body.title !== undefined) updateFields.title = body.title
        if (body.transcript !== undefined) updateFields.transcript = body.transcript
        if (body.summary !== undefined) updateFields.summary = body.summary
        if (body.summaryFilePath !== undefined) updateFields.summaryFilePath = body.summaryFilePath
        if (body.status !== undefined) updateFields.status = body.status
        if (body.endedAt !== undefined) updateFields.endedAt = new Date(body.endedAt)
        if (body.durationMs !== undefined) updateFields.durationMs = body.durationMs

        if (Object.keys(updateFields).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
        }

        const client = await clientPromise
        const db = client.db('dejavue')
        const result = await db.collection('meetings').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateFields }
        )

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating meeting:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE - delete a meeting
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Invalid meeting ID' }, { status: 400 })
        }

        const client = await clientPromise
        const db = client.db('dejavue')
        const result = await db.collection('meetings').deleteOne({ _id: new ObjectId(id) })

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting meeting:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
