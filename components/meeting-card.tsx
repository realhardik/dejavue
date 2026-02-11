import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, FileText } from 'lucide-react'

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
}

export function MeetingCard({
  id,
  title,
  date,
  duration,
  status,
  summary,
  platform,
}: MeetingCardProps) {
  const statusConfig = {
    completed: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Completed' },
    ongoing: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Ongoing' },
    scheduled: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Scheduled' },
  }

  const config = statusConfig[status]

  return (
    <Card className="p-6 border-border/50 hover:border-primary/30 transition-all group cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge className={`${config.bg} ${config.text} border-0`}>{config.label}</Badge>
            {platform && (
              <Badge className="bg-secondary/50 text-muted-foreground border-0 text-xs">
                {platform === 'google-meet' ? '📹 Meet' : platform === 'zoom' ? '🎥 Zoom' : '📞'}
              </Badge>
            )}
          </div>
        </div>
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
