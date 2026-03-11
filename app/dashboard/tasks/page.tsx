'use client'

import { useMemo, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTasks, Task } from '@/contexts/tasks-context'
import { AddToCalendarButton } from '@/components/add-to-calendar-button'
import { CheckCircle2, Circle, Calendar, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

type Group = { label: string; tasks: Task[] }

function parseDeadlineDate(deadline: string | null): Date | null {
    if (!deadline) return null
    const d = new Date(deadline)
    if (!isNaN(d.getTime())) return d

    // Natural-language: check for month names
    const months = ['january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december']
    const lower = deadline.toLowerCase()
    for (let m = 0; m < months.length; m++) {
        if (lower.includes(months[m])) {
            const dayMatch = deadline.match(/(\d{1,2})/)
            const day = dayMatch ? parseInt(dayMatch[1]) : 1
            const now = new Date()
            const year = now.getMonth() > m ? now.getFullYear() + 1 : now.getFullYear()
            return new Date(year, m, day)
        }
    }
    // Day names
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    for (let i = 0; i < days.length; i++) {
        if (lower.includes(days[i])) {
            const now = new Date()
            const diff = ((i - now.getDay()) + 7) % 7 || 7
            const target = new Date(now)
            target.setDate(now.getDate() + diff)
            return target
        }
    }
    return null
}

function TaskRow({ task }: { task: Task }) {
    const { markDone } = useTasks()
    const [toggling, setToggling] = useState(false)

    const toggle = async () => {
        setToggling(true)
        await markDone(task._id, !task.done)
        setToggling(false)
    }

    return (
        <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 group
            ${task.done ? 'border-border/30 opacity-50' : task.isCurrentUser ? 'border-primary/25 bg-primary/5' : 'border-border/50 bg-card'}`}>
            {/* Done toggle */}
            <button onClick={toggle} disabled={toggling} className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors">
                {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> :
                    task.done ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4" />}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-snug ${task.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.task}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {task.isCurrentUser && !task.done && (
                        <Badge className="text-[10px] bg-primary/15 text-primary border-0 py-0">Yours</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] capitalize py-0">{task.type}</Badge>
                    {task.person && task.person !== 'Unknown' && (
                        <span className="text-[11px] text-muted-foreground">👤 {task.person}</span>
                    )}
                    {task.deadline && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {task.deadline}
                        </span>
                    )}
                    <Link
                        href={`/dashboard/meeting/${task.meetingId}`}
                        className="text-[11px] text-primary/60 hover:text-primary flex items-center gap-0.5 transition-colors"
                    >
                        <ExternalLink className="w-2.5 h-2.5" />
                        {task.meetingTitle}
                    </Link>
                </div>
            </div>

            {/* Add to Calendar — only for user's own tasks */}
            {task.isCurrentUser && !task.done && (
                <div className="flex-shrink-0">
                    <AddToCalendarButton
                        task={task.task}
                        deadline={task.deadline}
                        meetingTitle={task.meetingTitle}
                        size="compact"
                    />
                </div>
            )}
        </div>
    )
}

export default function TasksPage() {
    const { tasks, isLoading } = useTasks()
    const [filter, setFilter] = useState<'all' | 'mine' | 'pending'>('mine')

    const filtered = useMemo(() => {
        if (filter === 'mine') return tasks.filter(t => t.isCurrentUser)
        if (filter === 'pending') return tasks.filter(t => !t.done)
        return tasks
    }, [tasks, filter])

    const groups = useMemo<Group[]>(() => {
        const now = new Date()
        const endOfWeek = new Date(now)
        endOfWeek.setDate(now.getDate() + 7)

        const thisWeek: Task[] = []
        const upcoming: Task[] = []
        const noDate: Task[] = []
        const done: Task[] = []

        for (const t of filtered) {
            if (t.done) { done.push(t); continue }
            const d = parseDeadlineDate(t.deadline)
            if (!d) { noDate.push(t); continue }
            if (d <= endOfWeek) thisWeek.push(t)
            else upcoming.push(t)
        }

        // Sort by deadline within groups
        const byDate = (a: Task, b: Task) => {
            const da = parseDeadlineDate(a.deadline)
            const db = parseDeadlineDate(b.deadline)
            if (!da && !db) return 0
            if (!da) return 1
            if (!db) return -1
            return da.getTime() - db.getTime()
        }
        thisWeek.sort(byDate)
        upcoming.sort(byDate)

        const result: Group[] = []
        if (thisWeek.length) result.push({ label: '📅 This Week', tasks: thisWeek })
        if (upcoming.length) result.push({ label: '🗓 Upcoming', tasks: upcoming })
        if (noDate.length) result.push({ label: '📋 No Deadline', tasks: noDate })
        if (done.length) result.push({ label: '✅ Completed', tasks: done })
        return result
    }, [filtered])

    const pendingMine = tasks.filter(t => t.isCurrentUser && !t.done).length

    return (
        <div className="min-h-screen bg-background flex">
            <Sidebar />
            <main className="flex-1 ml-20 p-8 max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Tasks &amp; Deadlines</h1>
                    <p className="text-muted-foreground mt-1">
                        {pendingMine > 0 ? (
                            <span>You have <span className="text-primary font-semibold">{pendingMine}</span> pending task{pendingMine !== 1 ? 's' : ''}</span>
                        ) : 'All your tasks from past meetings'}
                    </p>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2 mb-6">
                    {([['mine', 'My Tasks'], ['pending', 'All Pending'], ['all', 'All']] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === key
                                ? 'bg-primary text-white'
                                : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading tasks…
                    </div>
                ) : groups.length === 0 ? (
                    <Card className="p-12 text-center text-muted-foreground border-dashed">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No tasks found</p>
                        <p className="text-sm mt-1">Tasks are extracted automatically after each meeting ends.</p>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {groups.map(group => (
                            <div key={group.label}>
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                    {group.label}
                                </h2>
                                <div className="space-y-2">
                                    {group.tasks.map(task => (
                                        <TaskRow key={task._id} task={task} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
