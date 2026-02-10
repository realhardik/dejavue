'use client'

import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mic, MicOff, Volume2 } from 'lucide-react'

interface TranscriptionEntry {
  id: string
  speaker: string
  text: string
  timestamp: string
  isLive?: boolean
}

export function LiveTranscription() {
  const [transcripts, setTranscripts] = useState<TranscriptionEntry[]>([
    {
      id: '1',
      speaker: 'Sarah Johnson',
      text: 'Let me start by reviewing the product roadmap for Q1. We have three major initiatives planned.',
      timestamp: '00:00',
    },
    {
      id: '2',
      speaker: 'Mark Chen',
      text: 'Great, I looked at the initial priorities and I think we should focus on the dashboard redesign first.',
      timestamp: '00:15',
    },
    {
      id: '3',
      speaker: 'Sarah Johnson',
      text: 'Good point. The dashboard redesign aligns with our user feedback from last quarter.',
      timestamp: '00:28',
    },
    {
      id: '4',
      speaker: 'Alex Rivera',
      text: "I agree. We've been getting complaints about the current layout. When can we start?",
      timestamp: '00:35',
      isLive: true,
    },
  ])

  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    // Auto-scroll to latest transcript
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcripts])

  const speakers = ['Sarah Johnson', 'Mark Chen', 'Alex Rivera', 'Jordan Lee']
  const speakerColors: Record<string, string> = {
    'Sarah Johnson': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Mark Chen': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'Alex Rivera': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    'Jordan Lee': 'bg-green-500/20 text-green-400 border-green-500/30',
  }

  return (
    <Card className="p-6 border-border/50 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-semibold text-foreground">Live Transcription</span>
          </div>
          <Badge className="bg-red-500/20 text-red-400 border-0">RECORDING</Badge>
        </div>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          {isMuted ? (
            <MicOff className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Volume2 className="w-5 h-5 text-primary" />
          )}
        </button>
      </div>

      {/* Transcription Content */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {transcripts.map((entry) => (
          <div
            key={entry.id}
            className={`p-3 rounded-lg border transition-all ${
              entry.isLive ? 'border-primary/50 bg-primary/5' : 'border-border/30 bg-transparent'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`${speakerColors[entry.speaker]} border text-xs`}>
                    {entry.speaker}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
                  {entry.isLive && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs text-primary font-medium">Live</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-foreground leading-relaxed">{entry.text}</p>
              </div>
              <Mic className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
            </div>
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>

      {/* Stats Footer */}
      <div className="border-t border-border/30 pt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{transcripts.length} messages captured</span>
        <span className="flex items-center gap-2">
          <div className="flex gap-1">
            {speakers.map((speaker, idx) => (
              <div
                key={speaker}
                className={`w-2 h-2 rounded-full ${
                  idx % 2 === 0 ? 'bg-primary' : 'bg-secondary'
                }`}
              />
            ))}
          </div>
          {speakers.length} speakers
        </span>
      </div>
    </Card>
  )
}
