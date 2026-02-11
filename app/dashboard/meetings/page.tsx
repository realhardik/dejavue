'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Sidebar } from '@/components/sidebar'
import { MeetingCard } from '@/components/meeting-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, ArrowDownUp, Loader2, ChevronDown } from 'lucide-react'

interface Meeting {
  _id: string
  title: string
  platform: string
  status: string
  createdAt: string
  endedAt: string | null
  durationMs: number | null
  summary: string | null
}

type SortOption = 'latest' | 'oldest' | 'longest' | 'shortest'

function formatDuration(ms: number | null): string {
  if (!ms) return '—'
  const totalMin = Math.round(ms / 60000)
  const hours = Math.floor(totalMin / 60)
  const minutes = totalMin % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('latest')
  const [showSortMenu, setShowSortMenu] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem('user')
    const userId = user ? JSON.parse(user).id : null

    fetch(`/api/meetings${userId ? `?userId=${userId}` : ''}`)
      .then(res => res.json())
      .then(async (data) => {
        const loadedMeetings: Meeting[] = data.meetings || []

        // Auto-fix stale "active" meetings older than 4 hours
        const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000
        const fixPromises = loadedMeetings
          .filter(m => m.status === 'active' && new Date(m.createdAt).getTime() < fourHoursAgo)
          .map(m =>
            fetch(`/api/meetings/${m._id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'completed', endedAt: new Date().toISOString() }),
            }).catch(() => { })
          )

        if (fixPromises.length > 0) {
          await Promise.all(fixPromises)
          loadedMeetings.forEach(m => {
            if (m.status === 'active' && new Date(m.createdAt).getTime() < fourHoursAgo) {
              m.status = 'completed'
            }
          })
        }

        setMeetings(loadedMeetings)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  const handleDelete = useCallback((id: string) => {
    setMeetings(prev => prev.filter(m => m._id !== id))
  }, [])

  const handleTitleUpdate = useCallback((id: string, newTitle: string) => {
    setMeetings(prev => prev.map(m => m._id === id ? { ...m, title: newTitle } : m))
  }, [])

  const sortedFilteredMeetings = useMemo(() => {
    let filtered = meetings.filter(m =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    switch (sortBy) {
      case 'latest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'longest':
        filtered.sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0))
        break
      case 'shortest':
        filtered.sort((a, b) => (a.durationMs || 0) - (b.durationMs || 0))
        break
    }
    return filtered
  }, [meetings, searchQuery, sortBy])

  const sortLabels: Record<SortOption, string> = {
    latest: 'Latest First',
    oldest: 'Oldest First',
    longest: 'Longest First',
    shortest: 'Shortest First',
  }

  return (
    <div className="h-screen bg-background">
      <Sidebar />

      <div className="ml-20 h-full overflow-auto">
        <header className="border-b border-border/50 p-6">
          <h1 className="text-3xl font-bold text-foreground mb-4">All Meetings</h1>

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search meetings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary border-border/50 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                className="gap-2 border-border/50 text-foreground hover:bg-secondary bg-transparent min-w-[160px] justify-between"
                onClick={() => setShowSortMenu(!showSortMenu)}
              >
                <span className="flex items-center gap-2">
                  <ArrowDownUp className="w-4 h-4" />
                  {sortLabels[sortBy]}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
              </Button>
              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border/50 rounded-lg shadow-lg py-1 min-w-[160px]">
                    {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                      <button
                        key={option}
                        onClick={() => { setSortBy(option); setShowSortMenu(false) }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 transition-colors ${sortBy === option ? 'text-primary font-medium' : 'text-foreground'
                          }`}
                      >
                        {sortLabels[option]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
              <p className="text-muted-foreground">Loading meetings...</p>
            </div>
          ) : sortedFilteredMeetings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedFilteredMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting._id}
                  id={meeting._id}
                  title={meeting.title}
                  date={formatDate(meeting.createdAt)}
                  duration={formatDuration(meeting.durationMs)}
                  participants={1}
                  status={meeting.status === 'completed' ? 'completed' : meeting.status === 'active' ? 'ongoing' : 'scheduled'}
                  summary={meeting.summary || undefined}
                  platform={meeting.platform}
                  onDelete={handleDelete}
                  onTitleUpdate={handleTitleUpdate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Card className="p-12 border-border/50 text-center">
                <p className="text-muted-foreground">
                  {searchQuery ? 'No meetings match your search' : 'No meetings yet. Start one from the dashboard!'}
                </p>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
