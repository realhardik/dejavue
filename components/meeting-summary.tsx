'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  Download,
  Share2,
  Copy,
} from 'lucide-react'

interface MeetingSummaryProps {
  title: string
  date: string
  participants: string[]
  executiveSummary: string
  keyDecisions: string[]
  topicsDiscussed: string[]
  actionItems: Array<{
    task: string
    owner: string | null
    dueDate: string | null
  }>
  nextMeetingDate: string | null
}

export function MeetingSummary({
  title,
  date,
  participants,
  executiveSummary,
  keyDecisions,
  topicsDiscussed,
  actionItems,
  nextMeetingDate,
}: MeetingSummaryProps) {
  const handleCopy = async () => {
    const text = `Meeting: ${title}
Date: ${date}
Participants: ${participants.join(', ')}

EXECUTIVE SUMMARY
${executiveSummary}

KEY DECISIONS
${keyDecisions.map((d) => `• ${d}`).join('\n')}

ACTION ITEMS
${actionItems.map((a) => `• ${a.task}${a.owner ? ` (Owner: ${a.owner})` : ''}${a.dueDate ? ` - Due: ${a.dueDate}` : ''}`).join('\n')}

TOPICS DISCUSSED
${topicsDiscussed.map((t) => `• ${t}`).join('\n')}

${nextMeetingDate ? `NEXT MEETING: ${nextMeetingDate}` : ''}`

    await navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground">{date}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 border-border/50 text-foreground hover:bg-secondary bg-transparent">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="outline" className="gap-2 border-border/50 text-foreground hover:bg-secondary bg-transparent">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-border/50 text-foreground hover:bg-secondary bg-transparent"
            onClick={handleCopy}
          >
            <Copy className="w-4 h-4" />
            Copy
          </Button>
        </div>
      </div>

      {/* Participants */}
      <Card className="p-6 border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Participants</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {participants.map((participant) => (
            <Badge key={participant} className="bg-secondary text-foreground border-border/50">
              {participant}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Executive Summary */}
      <Card className="p-6 border-border/50">
        <h2 className="text-lg font-semibold text-foreground mb-3">Executive Summary</h2>
        <p className="text-muted-foreground leading-relaxed">{executiveSummary}</p>
      </Card>

      {/* Key Decisions */}
      <Card className="p-6 border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-foreground">Key Decisions</h2>
        </div>
        <ul className="space-y-2">
          {keyDecisions.map((decision, index) => (
            <li key={index} className="flex gap-3 text-muted-foreground">
              <span className="text-green-400 font-bold">•</span>
              <span>{decision}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Action Items */}
      <Card className="p-6 border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-foreground">Action Items</h2>
        </div>
        <div className="space-y-3">
          {actionItems.map((item, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-secondary/50 border border-border/30 flex items-start justify-between gap-3"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">{item.task}</p>
                <div className="flex gap-2 flex-wrap">
                  {item.owner && (
                    <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">Owner: {item.owner}</Badge>
                  )}
                  {item.dueDate && (
                    <Badge className="bg-orange-500/20 text-orange-400 border-0 text-xs">Due: {item.dueDate}</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Topics Discussed */}
      <Card className="p-6 border-border/50">
        <h2 className="text-lg font-semibold text-foreground mb-4">Topics Discussed</h2>
        <div className="grid grid-cols-2 gap-2">
          {topicsDiscussed.map((topic, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-muted-foreground text-sm">{topic}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Next Meeting */}
      {nextMeetingDate && (
        <Card className="p-6 border-border/50 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">Next Meeting</h3>
              <p className="text-sm text-muted-foreground">{nextMeetingDate}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
