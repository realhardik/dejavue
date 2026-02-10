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
