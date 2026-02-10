'use client'

import { Sidebar } from '@/components/sidebar'
import { MeetingCard } from '@/components/meeting-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Filter } from 'lucide-react'

export default function MeetingsPage() {
  const allMeetings = [
    {
      id: '1',
      title: 'Product Planning Sprint',
      date: 'Feb 8, 2024',
      duration: '1h 45m',
      participants: 8,
      status: 'completed' as const,
      summary: 'Q1 roadmap discussion and feature prioritization',
    },
    {
      id: '2',
      title: 'Engineering Standup',
      date: 'Feb 8, 2024',
      duration: '25m',
      participants: 5,
      status: 'completed' as const,
      summary: 'Sprint updates and blocker review',
    },
    {
      id: '3',
      title: 'Client Presentation',
      date: 'Feb 9, 2024',
      duration: '1h',
      participants: 12,
      status: 'scheduled' as const,
    },
    {
      id: '4',
      title: 'Design Review',
      date: 'Feb 7, 2024',
      duration: '50m',
      participants: 6,
      status: 'completed' as const,
      summary: 'New dashboard UI components reviewed and approved',
    },
    {
      id: '5',
      title: 'Board Meeting',
      date: 'Feb 6, 2024',
      duration: '2h 30m',
      participants: 10,
      status: 'completed' as const,
      summary: 'Q4 financial review and strategic planning',
    },
    {
      id: '6',
      title: 'Team Retrospective',
      date: 'Feb 5, 2024',
      duration: '1h 15m',
      participants: 8,
      status: 'completed' as const,
      summary: 'Sprint retrospective and action items for next sprint',
    },
  ]

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                id={meeting.id}
                title={meeting.title}
                date={meeting.date}
                duration={meeting.duration}
                participants={meeting.participants}
                status={meeting.status}
                summary={meeting.summary}
              />
            ))}
          </div>

          {/* Empty State */}
          <div className="text-center py-12">
            <Card className="p-12 border-border/50 text-center">
              <p className="text-muted-foreground">No more meetings to display</p>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
