'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { MeetingCard } from '@/components/meeting-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Filter, Loader2 } from 'lucide-react'

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

  useEffect(() => {
    const user = localStorage.getItem('user')
    const userId = user ? JSON.parse(user).id : null

    fetch(`/api/meetings${userId ? `?userId=${userId}` : ''}`)
      .then(res => res.json())
      .then(data => {
        setMeetings(data.meetings || [])
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  const filteredMeetings = meetings.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="ml-20 h-full overflow-auto">
        {/* Header */}
        <header className="border-b border-border/50 p-6">
          <h1 className="text-3xl font-bold text-foreground mb-4">All Meetings</h1>

          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search meetings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary border-border/50 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button variant="outline" className="gap-2 border-border/50 text-foreground hover:bg-secondary bg-transparent">
              <Filter className="w-5 h-5" />
              Filter
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
              <p className="text-muted-foreground">Loading meetings...</p>
            </div>
          ) : filteredMeetings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeetings.map((meeting) => (
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
