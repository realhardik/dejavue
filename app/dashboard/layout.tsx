'use client'

import { useEffect, useState } from 'react'
import { TasksProvider } from '@/contexts/tasks-context'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        try {
            const u = JSON.parse(localStorage.getItem('user') || '{}')
            setUserId(u._id || u.id || null)
        } catch { }
    }, [])

    return (
        <TasksProvider userId={userId}>
            {children}
        </TasksProvider>
    )
}
