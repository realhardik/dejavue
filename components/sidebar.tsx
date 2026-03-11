'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Video, Settings, LogOut, BarChart3, CheckSquare, History } from 'lucide-react'
import { useTasks } from '@/contexts/tasks-context'

function TasksBadge() {
  const { tasks } = useTasks()
  const pending = tasks.filter(t => t.isCurrentUser && !t.done).length
  if (!pending) return null
  return (
    <span className="ml-auto mr-2 flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
      {pending > 99 ? '99+' : pending}
    </span>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      const parsed = JSON.parse(user)
      setUserName(parsed.name || '')
      setUserEmail(parsed.email || '')
    }
  }, [])

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  const menuItems = [
    { href: '/dashboard', icon: Video, label: 'Dashboard', key: 'dashboard' },
    { href: '/dashboard/meetings', icon: History, label: 'Meetings', key: 'meetings' },
    { href: '/dashboard/tasks', icon: CheckSquare, label: 'Tasks', key: 'tasks', badge: true },
    { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics', key: 'analytics' },
  ]

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-screen bg-card border-r border-border/50 flex flex-col py-6 z-40",
        "transition-[width] duration-300 ease-in-out",
        isExpanded ? "w-56" : "w-20"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center h-12 px-4 mb-8">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/25 to-primary/10 border-2 border-primary/40 flex items-center justify-center hover:from-primary/35 hover:to-primary/20 hover:border-primary/60 transition-all duration-300 ease-out flex-shrink-0">
          <span className="text-lg font-bold text-primary">D</span>
        </div>
        <span className={cn(
          "ml-3 text-xl font-bold text-foreground whitespace-nowrap overflow-hidden transition-opacity duration-300 ease-in-out",
          isExpanded ? "opacity-100" : "opacity-0"
        )}>Dejavue</span>
      </Link>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-2 px-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.key === 'tasks' && pathname.startsWith('/dashboard/tasks'))
          return (
            <Link key={item.key} href={item.href} title={!isExpanded ? item.label : undefined}>
              <div
                className={cn(
                  'h-12 rounded-lg flex items-center cursor-pointer transition-all duration-200 ease-out',
                  'hover:bg-primary/10 hover:text-primary hover:shadow-lg hover:shadow-primary/5',
                  isActive && 'bg-primary/15 text-primary shadow-md shadow-primary/10'
                )}
              >
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 relative">
                  <Icon className="w-6 h-6" />
                </div>
                <span className={cn(
                  "whitespace-nowrap overflow-hidden transition-opacity duration-300 ease-in-out flex-1",
                  isExpanded ? "opacity-100" : "opacity-0"
                )}>{item.label}</span>
                {item.badge && isExpanded && <TasksBadge />}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="px-4 mb-3">
        <div className="flex items-center h-12">
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
          </div>
          <div className={cn(
            "ml-1 overflow-hidden transition-opacity duration-300 ease-in-out min-w-0",
            isExpanded ? "opacity-100" : "opacity-0"
          )}>
            <p className="text-sm font-medium text-foreground truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        </div>
      </div>

      {/* Bottom: Settings & Logout */}
      <div className="border-t border-border/30 pt-4 space-y-2 px-4">
        <Link href="/dashboard/settings" title={!isExpanded ? "Settings" : undefined}>
          <div className={cn(
            'h-12 rounded-lg flex items-center cursor-pointer transition-all duration-200 ease-out',
            'hover:bg-primary/10 hover:text-primary hover:shadow-lg hover:shadow-primary/5'
          )}>
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
              <Settings className="w-6 h-6" />
            </div>
            <span className={cn(
              "whitespace-nowrap overflow-hidden transition-opacity duration-300 ease-in-out",
              isExpanded ? "opacity-100" : "opacity-0"
            )}>Settings</span>
          </div>
        </Link>
        <button
          title={!isExpanded ? "Logout" : undefined}
          onClick={() => {
            localStorage.removeItem('user')
            window.location.href = '/auth/login'
          }}
          className={cn(
            'w-full h-12 rounded-lg flex items-center cursor-pointer transition-all duration-200 ease-out',
            'hover:bg-destructive/10 hover:text-destructive hover:shadow-lg hover:shadow-destructive/5'
          )}
        >
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
            <LogOut className="w-6 h-6" />
          </div>
          <span className={cn(
            "whitespace-nowrap overflow-hidden transition-opacity duration-300 ease-in-out",
            isExpanded ? "opacity-100" : "opacity-0"
          )}>Logout</span>
        </button>
      </div>
    </div>
  )
}
