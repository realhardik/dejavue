'use client'

import { useState } from 'react'
import { Calendar, Loader2, CheckCircle2, X } from 'lucide-react'

interface AddToCalendarButtonProps {
    task: string
    deadline: string | null
    meetingTitle: string
    size?: 'compact' | 'full'
}

/** Best-effort: convert natural-language deadline text to a datetime-local string */
function parseDeadlineToInput(deadline: string | null): string {
    const now = new Date()
    const baseDate = new Date(now)

    if (!deadline) {
        // Default: next day, 10am
        baseDate.setDate(baseDate.getDate() + 1)
        baseDate.setHours(10, 0, 0, 0)
        return toDatetimeLocal(baseDate)
    }

    const lower = deadline.toLowerCase()

    // Day-of-week: "Friday", "Monday" etc.
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    for (let i = 0; i < days.length; i++) {
        if (lower.includes(days[i])) {
            const target = new Date(now)
            const current = now.getDay()
            let diff = i - current
            if (diff <= 0) diff += 7
            target.setDate(now.getDate() + diff)
            target.setHours(10, 0, 0, 0)
            return toDatetimeLocal(target)
        }
    }

    // Month + day: "March 20", "March 20th"
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december']
    for (let m = 0; m < monthNames.length; m++) {
        if (lower.includes(monthNames[m])) {
            const dayMatch = deadline.match(/(\d{1,2})(?:st|nd|rd|th)?/)
            const day = dayMatch ? parseInt(dayMatch[1]) : 1
            const year = now.getMonth() > m ? now.getFullYear() + 1 : now.getFullYear()
            const target = new Date(year, m, day, 10, 0, 0)
            return toDatetimeLocal(target)
        }
    }

    // "next week / next month"
    if (lower.includes('next week')) {
        baseDate.setDate(now.getDate() + 7)
        baseDate.setHours(10, 0, 0, 0)
        return toDatetimeLocal(baseDate)
    }
    if (lower.includes('next month')) {
        baseDate.setMonth(now.getMonth() + 1)
        baseDate.setHours(10, 0, 0, 0)
        return toDatetimeLocal(baseDate)
    }

    // Fallback: tomorrow 10am
    baseDate.setDate(now.getDate() + 1)
    baseDate.setHours(10, 0, 0, 0)
    return toDatetimeLocal(baseDate)
}

function toDatetimeLocal(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AddToCalendarButton({ task, deadline, meetingTitle, size = 'full' }: AddToCalendarButtonProps) {
    const [state, setState] = useState<'idle' | 'picking' | 'adding' | 'done' | 'needs_auth'>('idle')
    const [eventTitle, setEventTitle] = useState(task)
    const [datetimeInput, setDatetimeInput] = useState(() => parseDeadlineToInput(deadline))

    const openPicker = () => {
        setEventTitle(task)
        setDatetimeInput(parseDeadlineToInput(deadline))
        setState('picking')
    }

    const [apiError, setApiError] = useState<string | null>(null)

    const addToCalendar = async () => {
        setState('adding')
        setApiError(null)
        const dt = new Date(datetimeInput)
        const isoDeadline = isNaN(dt.getTime()) ? null : dt.toISOString()

        try {
            const res = await fetch('/api/calendar/add-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task: eventTitle, deadline: isoDeadline, meetingTitle }),
            })

            if (res.status === 401) {
                // Not connected → start OAuth flow
                const authRes = await fetch('/api/calendar/auth-url')
                const { url, error } = await authRes.json()
                if (error || !url) { setState('needs_auth'); return }
                if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url)
                else window.open(url, '_blank')
                setState('needs_auth')
            } else if (res.ok) {
                setState('done')
                setTimeout(() => setState('idle'), 4000)
            } else {
                const data = await res.json().catch(() => ({}))
                setApiError(data.message || 'Failed to add event. Try again.')
                setState('picking')
            }
        } catch {
            setApiError('Network error. Make sure the app is running.')
            setState('picking')
        }
    }

    if (state === 'done') {
        return (
            <span className={`inline-flex items-center gap-1.5 text-green-500 font-medium ${size === 'compact' ? 'text-[10px]' : 'text-sm'}`}>
                <CheckCircle2 className="w-4 h-4" /> Event added to your Calendar!
            </span>
        )
    }

    if (state === 'needs_auth') {
        return (
            <div className={`rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 ${size === 'compact' ? 'text-[10px]' : 'text-sm'}`}>
                <p className="text-amber-400 font-medium">Connect Google Calendar</p>
                <p className="text-amber-300/70 text-xs">
                    Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local, then restart and try again.
                </p>
                <button onClick={openPicker} className="text-xs text-amber-400 underline">← Back</button>
            </div>
        )
    }

    if (state === 'picking') {
        return (
            <div className={`rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-3 ${size === 'compact' ? 'text-[10px] w-56' : 'text-sm w-full max-w-sm'}`}>
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" /> Add to Calendar
                    </span>
                    <button onClick={() => setState('idle')} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
                {apiError && (
                    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5">{apiError}</p>
                )}
                <div className="space-y-2">
                    <div>
                        <label className="text-xs text-muted-foreground block mb-1">Event title</label>
                        <input
                            value={eventTitle}
                            onChange={e => setEventTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border/60 text-foreground text-xs focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground block mb-1">Date &amp; Time</label>
                        <input
                            type="datetime-local"
                            value={datetimeInput}
                            onChange={e => setDatetimeInput(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border/60 text-foreground text-xs focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                        />
                    </div>
                </div>
                <button
                    onClick={addToCalendar}
                    disabled={!eventTitle.trim()}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-colors disabled:opacity-40"
                >
                    <Calendar className="w-3.5 h-3.5" /> Add Event
                </button>
            </div>
        )
    }

    if (state === 'adding') {
        return (
            <span className={`inline-flex items-center gap-1.5 text-muted-foreground ${size === 'compact' ? 'text-[10px]' : 'text-sm'}`}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding to Calendar…
            </span>
        )
    }

    // idle state
    if (size === 'compact') {
        return (
            <button
                onClick={openPicker}
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md bg-primary/80 hover:bg-primary text-white text-[10px] font-medium transition-colors"
            >
                <Calendar className="w-3 h-3" /> Add
            </button>
        )
    }

    return (
        <button
            onClick={openPicker}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors shrink-0"
        >
            <Calendar className="w-3.5 h-3.5" /> Add to Calendar
        </button>
    )
}
