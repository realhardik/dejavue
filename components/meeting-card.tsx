import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Users, FileText } from 'lucide-react'

interface MeetingCardProps {
  id: string
  title: string
  date: string
  duration: string
  participants: number
  status: 'completed' | 'ongoing' | 'scheduled'
  summary?: string
  transcription?: string
}

export function MeetingCard({
  title,
  date,
  duration,
  participants,
  status,
  summary,
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
          <Badge className={`${config.bg} ${config.text} border-0`}>{config.label}</Badge>
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
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>{participants} participants</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>Summary ready</span>
        </div>
      </div>

      {summary && (
        <div className="p-3 rounded-lg bg-secondary/50 border border-border/30 mb-4">
          <p className="text-sm text-muted-foreground line-clamp-2">{summary}</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 border-border/50 text-foreground hover:bg-secondary bg-transparent">
          View Details
        </Button>
        <Button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">Chat with AI</Button>
      </div>
    </Card>
  )
}
