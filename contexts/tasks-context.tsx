'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export interface Task {
    _id: string
    userId: string
    meetingId: string
    meetingTitle: string
    person: string
    task: string
    deadline: string | null
    type: string
    isCurrentUser: boolean
    done: boolean
    addedToCalendar: boolean
    createdAt: string
}

interface TasksContextType {
    tasks: Task[]
    isLoading: boolean
    tasksByMeeting: (meetingId: string) => Task[]
    markDone: (taskId: string, done: boolean) => void
    markCalendar: (taskId: string) => void
    refetch: () => void
}

const TasksContext = createContext<TasksContextType | null>(null)

export function TasksProvider({ children, userId }: { children: ReactNode; userId: string | null }) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const fetchTasks = useCallback(async () => {
        if (!userId) return
        setIsLoading(true)
        try {
            const res = await fetch(`/api/tasks?userId=${userId}`)
            if (res.ok) {
                const data = await res.json()
                setTasks(data.tasks || [])
            }
        } finally {
            setIsLoading(false)
        }
    }, [userId])

    // Fetch once when userId is known
    useEffect(() => { fetchTasks() }, [fetchTasks])

    const tasksByMeeting = useCallback(
        (meetingId: string) => tasks.filter(t => t.meetingId === meetingId),
        [tasks]
    )

    const markDone = useCallback(async (taskId: string, done: boolean) => {
        // Optimistic update
        setTasks(prev => prev.map(t => t._id === taskId ? { ...t, done } : t))
        await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ done }),
        }).catch(() => { })
    }, [])

    const markCalendar = useCallback(async (taskId: string) => {
        setTasks(prev => prev.map(t => t._id === taskId ? { ...t, addedToCalendar: true } : t))
        await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addedToCalendar: true }),
        }).catch(() => { })
    }, [])

    return (
        <TasksContext.Provider value={{ tasks, isLoading, tasksByMeeting, markDone, markCalendar, refetch: fetchTasks }}>
            {children}
        </TasksContext.Provider>
    )
}

export function useTasks() {
    const ctx = useContext(TasksContext)
    if (!ctx) throw new Error('useTasks must be used inside TasksProvider')
    return ctx
}
