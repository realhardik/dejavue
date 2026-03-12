'use client'

import { useEffect, useState, useRef, use, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { ChatInterface } from '@/components/chat-interface'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, MessageSquare, Download, Clock, Calendar, Loader2, Pencil, Check, X } from 'lucide-react'
import Link from 'next/link'
import { AddToCalendarButton } from '@/components/add-to-calendar-button'


interface MeetingEvent {
  person: string
  task: string
  deadline: string | null
  type: string
  isCurrentUser: boolean
}

interface MeetingData {
  _id: string
  title: string
  platform: string
  status: string
  createdAt: string
  endedAt: string | null
  durationMs: number | null
  transcript: { index: number; text: string; timestamp: string }[]
  summary: string | null
  summaryFilePath: string | null
  events?: MeetingEvent[]
}

// gcalUrl removed — using AddToCalendarButton component now
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
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') === 'chat' ? 'chat' : 'summary'
  const [meeting, setMeeting] = useState<MeetingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [dbTasks, setDbTasks] = useState<MeetingEvent[] | null>(null)
  const [isLoadingTasks, setIsLoadingTasks] = useState(true)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const userId = typeof window !== 'undefined' ? (() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u.id || u._id || '' } catch { return '' } })() : ''
  const userName = typeof window !== 'undefined' ? (() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u.name || u.email || '' } catch { return '' } })() : ''

  // Always fetch tasks directly from DB for this meeting (context may be stale)
  useEffect(() => {
    if (!userId) return
    setIsLoadingTasks(true)
    fetch(`/api/tasks?userId=${userId}&meetingId=${id}`)
      .then(r => r.ok ? r.json() : { tasks: [] })
      .then(data => {
        const rows = (data.tasks || []) as Array<Record<string, unknown>>
        setDbTasks(rows.map(t => ({
          person: t.person as string ?? '',
          task: t.task as string ?? '',
          deadline: t.deadline as string | null ?? null,
          type: t.type as string ?? 'task',
          isCurrentUser: t.isCurrentUser as boolean ?? false,
        })))
      })
      .catch(() => setDbTasks([]))
      .finally(() => setIsLoadingTasks(false))
  }, [id, userId])

  const events: MeetingEvent[] = dbTasks ?? []

  useEffect(() => {
    fetch(`/api/meetings/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Meeting not found')
        return res.json()
      })
      .then(data => {
        setMeeting(data.meeting)
        setEditTitle(data.meeting.title)
        if (Array.isArray(data.meeting.chatHistory)) setChatHistory(data.meeting.chatHistory)
        setIsLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setIsLoading(false)
      })
  }, [id])

  useEffect(() => {
    if (isEditingTitle) titleInputRef.current?.focus()
  }, [isEditingTitle])

  const handleSaveTitle = async () => {
    const newTitle = editTitle.trim()
    if (!newTitle || !meeting || newTitle === meeting.title) {
      setEditTitle(meeting?.title || '')
      setIsEditingTitle(false)
      return
    }
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })
      if (res.ok) {
        setMeeting(prev => prev ? { ...prev, title: newTitle } : prev)
      } else {
        setEditTitle(meeting.title)
      }
    } catch {
      setEditTitle(meeting.title)
    }
    setIsEditingTitle(false)
  }

  const meetingMoM = useMemo(() => {
    if (!meeting) return ''
    const lines = [
      `Minutes of Meeting`,
      `${'='.repeat(50)}`,
      `Title: ${meeting.title}`,
      `Date: ${formatDate(meeting.createdAt)}`,
      `Time: ${formatTime(meeting.createdAt)}`,
      `Duration: ${formatDuration(meeting.durationMs)}`,
      `Platform: ${meeting.platform === 'google-meet' ? 'Google Meet' : meeting.platform === 'zoom' ? 'Zoom' : meeting.platform}`,
      ``,
      `${'─'.repeat(50)}`,
      `SUMMARY`,
      `${'─'.repeat(50)}`,
      meeting.summary || 'No summary available.',
      ``,
    ]
    if (meeting.transcript?.length > 0) {
      lines.push(`${'─'.repeat(50)}`)
      lines.push(`TRANSCRIPT`)
      lines.push(`${'─'.repeat(50)}`)
      meeting.transcript.forEach(chunk => lines.push(`[${chunk.timestamp}] ${chunk.text}`))
    }
    return lines.join('\n')
  }, [meeting])

  const handleDownloadMoM = useCallback(() => {
    if (!meeting) return
    const blob = new Blob([meetingMoM], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeTitle = (meeting.title || 'meeting').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)
    a.download = `MoM_${safeTitle}.txt`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [meeting, meetingMoM])

  if (isLoading) {
    return (
      <div className="h-screen bg-background">
        <Sidebar />
        <div className="ml-20 h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !meeting) {
    return (
      <div className="h-screen bg-background">
        <Sidebar />
        <div className="ml-20 h-full flex flex-col items-center justify-center">
          <p className="text-muted-foreground mb-4">{error || 'Meeting not found'}</p>
          <Link href="/dashboard/meetings">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Meetings
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const platformLabel = meeting.platform === 'google-meet' ? '📹 Google Meet' : meeting.platform === 'zoom' ? '🎥 Zoom' : '📞 Meeting'

  return (
    <div className="h-screen bg-background">
      <Sidebar />

      <div className="ml-20 h-full overflow-auto">
        {/* Header */}
        <header className="border-b border-border/50 p-6 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard/meetings">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <div className="flex items-start justify-between">
            <div>
              {isEditingTitle ? (
                <div className="flex items-center gap-2 mb-1">
                  <input
                    ref={titleInputRef}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle()
                      if (e.key === 'Escape') { setEditTitle(meeting.title); setIsEditingTitle(false) }
                    }}
                    className="text-3xl font-bold text-foreground bg-secondary/50 border border-primary/40 rounded px-2 py-1 outline-none focus:border-primary min-w-[300px]"
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="p-1.5 rounded-md hover:bg-green-500/10 text-green-400 transition-colors"
                    title="Save"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => { setEditTitle(meeting.title); setIsEditingTitle(false) }}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                    title="Cancel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/title mb-1">
                  <h1 className="text-3xl font-bold text-foreground">{meeting.title}</h1>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 rounded-md opacity-0 group-hover/title:opacity-100 hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-all"
                    title="Edit title"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(meeting.createdAt)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatTime(meeting.createdAt)}
                </span>
                <span>•</span>
                <span>{formatDuration(meeting.durationMs)}</span>
                <span>•</span>
                <Badge className="bg-green-500/20 text-green-400 border-0">{meeting.status}</Badge>
                <Badge className="bg-secondary/50 text-muted-foreground border-0">{platformLabel}</Badge>
              </div>
            </div>
            <Button onClick={handleDownloadMoM} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Download className="w-4 h-4" />
              Download M.o.M
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className={`grid w-full max-w-2xl border-b border-border/50 bg-transparent ${events?.length ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="summary" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">
                <FileText className="w-4 h-4 mr-2" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="chat" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat with AI
              </TabsTrigger>
              {events?.length ? (
                <TabsTrigger value="events" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  <Calendar className="w-4 h-4 mr-2" />
                  Deadlines
                  <span className="ml-1.5 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{events.length}</span>
                </TabsTrigger>
              ) : isLoadingTasks ? (
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                </div>
              ) : null}
            </TabsList>

            {/* Summary Tab */}
            <TabsContent value="summary" className="mt-6">
              <Card className="p-6 border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Meeting Summary</h2>
                </div>
                {meeting.summary ? (
                  <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {meeting.summary}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No summary available for this meeting.</p>
                )}
              </Card>

              {/* Transcript section */}
              {meeting.transcript && meeting.transcript.length > 0 && (
                <Card className="p-6 border-border/50 mt-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Transcript</h2>
                  <div className="space-y-2 text-sm text-muted-foreground max-h-96 overflow-y-auto">
                    {meeting.transcript.map((chunk, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-xs text-primary/60 min-w-[80px]">{chunk.timestamp}</span>
                        <span>{chunk.text}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Chat Tab */}
            <TabsContent value="chat" className="mt-6">
              <Card className="h-[500px] border-border/50 overflow-hidden">
                <ChatInterface
                  meetingTitle={meeting.title}
                  meetingId={id}
                  meetingContext={meetingMoM}
                  initialHistory={chatHistory}
                  onHistoryChange={setChatHistory}
                />
              </Card>
            </TabsContent>

            {/* Deadlines / Events Tab */}
            {events?.length ? (
              <TabsContent value="events" className="mt-6 space-y-3">
                {/* User's events first */}
                {events.filter(e => e.isCurrentUser).length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                      Your Tasks &amp; Deadlines
                    </h3>
                    {events.filter(e => e.isCurrentUser).map((ev, i) => (
                      <Card key={i} className="p-4 border-primary/30 bg-primary/5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm">{ev.task}</p>
                            {ev.deadline && <p className="text-xs text-muted-foreground mt-1">📅 {ev.deadline}</p>}
                            <Badge className="mt-2 text-[10px] bg-primary/15 text-primary border-0 capitalize">{ev.type}</Badge>
                          </div>
                          <AddToCalendarButton
                            task={ev.task}
                            deadline={ev.deadline}
                            meetingTitle={meeting.title}
                            size="full"
                          />
                        </div>
                      </Card>
                    ))}
                    {events.filter(e => !e.isCurrentUser).length > 0 && (
                      <div className="border-t border-border/50 pt-3 mt-4">
                        <h3 className="text-sm font-semibold text-foreground mb-3">Others</h3>
                      </div>
                    )}
                  </>
                )}
                {/* Others */}
                {events.filter(e => !e.isCurrentUser).map((ev, i) => (
                  <Card key={i} className="p-4 border-border/50">
                    <div className="flex items-start gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm">{ev.task}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Assigned to: {ev.person}</p>
                        {ev.deadline && <p className="text-xs text-muted-foreground mt-0.5">📅 {ev.deadline}</p>}
                        <Badge className="mt-2 text-[10px] bg-secondary text-muted-foreground border-0 capitalize">{ev.type}</Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>
            ) : null}
          </Tabs>
        </main>
      </div>
    </div>
  )
}
