'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, FileText, Trash2, Pencil } from 'lucide-react'

interface MeetingCardProps {
  id: string
  title: string
  date: string
  duration: string
  participants: number
  status: 'completed' | 'ongoing' | 'scheduled'
  summary?: string
  transcription?: string
  platform?: string
  onDelete?: (id: string) => void
  onTitleUpdate?: (id: string, newTitle: string) => void
}

export function MeetingCard({
  id,
  title,
  date,
  duration,
  status,
  summary,
  platform,
  onDelete,
  onTitleUpdate,
}: MeetingCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const statusConfig = {
    completed: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Completed' },
    ongoing: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Ongoing' },
    scheduled: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Scheduled' },
  }

  const config = statusConfig[status]

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this meeting?')) return
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE' })
      if (res.ok && onDelete) onDelete(id)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const handleSaveTitle = async () => {
    const newTitle = editTitle.trim()
    if (!newTitle || newTitle === title) {
      setEditTitle(title)
      setIsEditing(false)
      return
    }
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })
      if (res.ok && onTitleUpdate) onTitleUpdate(id, newTitle)
    } catch (err) {
      console.error('Title update failed:', err)
      setEditTitle(title)
    }
    setIsEditing(false)
  }

  return (
    <Card className="p-6 border-border/50 hover:border-primary/30 transition-all group cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle()
                if (e.key === 'Escape') { setEditTitle(title); setIsEditing(false) }
              }}
              onBlur={handleSaveTitle}
              className="text-lg font-semibold text-foreground bg-secondary/50 border border-primary/40 rounded px-2 py-0.5 w-full outline-none focus:border-primary"
            />
          ) : (
            <div className="flex items-center gap-1.5 group/title">
              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {title}
              </h3>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true) }}
                className="p-0.5 rounded opacity-0 group-hover/title:opacity-100 hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-all flex-shrink-0"
                title="Edit title"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-1 flex-wrap mt-1">
            <Badge className={`${config.bg} ${config.text} border-0`}>{config.label}</Badge>
            {platform && (
              <Badge className="bg-secondary/50 text-muted-foreground border-0 text-xs">
                {platform === 'google-meet' ? '📹 Meet' : platform === 'zoom' ? '🎥 Zoom' : '📞'}
              </Badge>
            )}
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex-shrink-0"
          title="Delete meeting"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>{date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>{duration}</span>
        </div>
        <div className="flex items-center gap-2 col-span-2">
          <FileText className="w-4 h-4" />
          <span>{summary ? 'Summary ready' : 'No summary'}</span>
        </div>
      </div>

      {summary && (
        <div className="p-3 rounded-lg bg-secondary/50 border border-border/30 mb-4">
          <p className="text-sm text-muted-foreground line-clamp-2">{summary}</p>
        </div>
      )}

      <Link href={`/dashboard/meeting/${id}`}>
        <Button variant="outline" className="w-full border-border/50 text-foreground hover:bg-secondary bg-transparent">
          View Details
        </Button>
      </Link>
    </Card>
  )
}
