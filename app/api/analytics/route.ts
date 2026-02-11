import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        const client = await clientPromise
        const db = client.db('dejavue')

        const matchStage: Record<string, unknown> = {}
        if (userId) matchStage.userId = userId

        // Get all completed meetings for this user
        const meetings = await db
            .collection('meetings')
            .find({ ...matchStage, status: 'completed' })
            .sort({ createdAt: -1 })
            .toArray()

        // Total stats
        const totalMeetings = meetings.length
        const totalDurationMs = meetings.reduce((sum, m) => sum + (m.durationMs || 0), 0)
        const totalHours = Math.round((totalDurationMs / 3600000) * 10) / 10
        const avgDurationMin = totalMeetings > 0
            ? Math.round(totalDurationMs / totalMeetings / 60000)
            : 0

        // Today's meetings
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const meetingsToday = meetings.filter(m => new Date(m.createdAt) >= today)
        const todayCount = meetingsToday.length
        const todayDurationMs = meetingsToday.reduce((sum, m) => sum + (m.durationMs || 0), 0)
        const todayDurationFormatted = formatDuration(todayDurationMs)

        // This week's meetings (Mon-Sun)
        const now = new Date()
        const dayOfWeek = now.getDay()
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        const monday = new Date(now)
        monday.setDate(now.getDate() - mondayOffset)
        monday.setHours(0, 0, 0, 0)

        const thisWeekMeetings = meetings.filter(m => new Date(m.createdAt) >= monday)

        // Meetings per day of week (for bar chart)
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        const weeklyChart = dayNames.map((name, i) => {
            const dayStart = new Date(monday)
            dayStart.setDate(monday.getDate() + i)
            const dayEnd = new Date(dayStart)
            dayEnd.setDate(dayStart.getDate() + 1)

            const dayMeetings = meetings.filter(m => {
                const d = new Date(m.createdAt)
                return d >= dayStart && d < dayEnd
            })

            return {
                name,
                meetings: dayMeetings.length,
                duration: Math.round(dayMeetings.reduce((s, m) => s + (m.durationMs || 0), 0) / 60000),
            }
        })

        // Platform breakdown (for pie chart)
        const platformCounts: Record<string, number> = {}
        meetings.forEach(m => {
            const p = m.platform || 'unknown'
            platformCounts[p] = (platformCounts[p] || 0) + 1
        })
        const platformColors: Record<string, string> = {
            'google-meet': '#34a853',
            'zoom': '#2d8cff',
            'unknown': '#8b5cf6',
        }
        const platformChart = Object.entries(platformCounts).map(([name, value]) => ({
            name: name === 'google-meet' ? 'Google Meet' : name === 'zoom' ? 'Zoom' : 'Other',
            value,
            fill: platformColors[name] || '#8b5cf6',
        }))

        // Recent activity (last 5 meetings)
        const recentActivity = meetings.slice(0, 5).map(m => ({
            title: m.title,
            date: new Date(m.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
            }),
            time: new Date(m.createdAt).toLocaleTimeString('en-IN', {
                hour: 'numeric', minute: '2-digit', hour12: true,
            }),
            duration: formatDuration(m.durationMs || 0),
            platform: m.platform,
        }))

        // Meetings per day average
        const firstMeeting = meetings.length > 0 ? new Date(meetings[meetings.length - 1].createdAt) : now
        const daysSinceFirst = Math.max(1, Math.ceil((now.getTime() - firstMeeting.getTime()) / 86400000))
        const meetingsPerDay = Math.round((totalMeetings / daysSinceFirst) * 10) / 10

        return NextResponse.json({
            totalMeetings,
            totalHours,
            avgDurationMin,
            meetingsPerDay,
            todayCount,
            todayDuration: todayDurationFormatted,
            thisWeekCount: thisWeekMeetings.length,
            weeklyChart,
            platformChart,
            recentActivity,
        })
    } catch (error) {
        console.error('Error fetching analytics:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

function formatDuration(ms: number): string {
    if (!ms) return '0m'
    const totalMin = Math.round(ms / 60000)
    const hours = Math.floor(totalMin / 60)
    const minutes = totalMin % 60
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
}
