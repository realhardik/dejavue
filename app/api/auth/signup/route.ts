import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
    try {
        const { name, email, password } = await request.json()

        // Validate input
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'Name, email and password are required' },
                { status: 400 }
            )
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            )
        }

        const client = await clientPromise
        const db = client.db('dejavue')
        const users = db.collection('users')

        // Check if user already exists
        const existingUser = await users.findOne({ email: email.toLowerCase() })
        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 409 }
            )
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12)

        // Create user
        const result = await users.insertOne({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            createdAt: new Date(),
        })

        return NextResponse.json({
            success: true,
            user: {
                id: result.insertedId.toString(),
                name,
                email: email.toLowerCase(),
            }
        }, { status: 201 })

    } catch (error) {
        console.error('Signup error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
