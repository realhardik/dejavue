'use client'

import { Sidebar } from '@/components/sidebar'
import { LiveTranscription } from '@/components/live-transcription'
import { MeetingDetector } from '@/components/meeting-detector'
import { ChatInterface } from '@/components/chat-interface'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Phone, Settings, Share2, MoreVertical } from 'lucide-react'

export default function LiveMeetingPage() {
  return (
    <div className="h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      <div className="ml-20 h-full flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <h1 className="text-2xl font-bold text-foreground">Product Planning Sprint</h1>
                </div>
                <Badge className="bg-red-500/20 text-red-400 border-0">LIVE</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Started 5 minutes ago • 8 participants</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2 border-border/50 text-foreground hover:bg-secondary bg-transparent">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button variant="outline" className="gap-2 border-border/50 text-foreground hover:bg-secondary bg-transparent">
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="destructive"
                className="gap-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0"
              >
                <Phone className="w-4 h-4" />
                End
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden p-4">
          <div className="grid grid-cols-3 gap-4 h-full">
            {/* Left: Live Transcription */}
            <div className="col-span-2 flex flex-col">
              <LiveTranscription />
            </div>

            {/* Right: Chat & Detector */}
            <div className="flex flex-col gap-4 overflow-hidden">
              {/* Meeting Detector */}
              <div className="flex-shrink-0">
                <MeetingDetector />
              </div>

              {/* Chat */}
              <div className="flex-1 flex flex-col bg-card rounded-lg border border-border/50 overflow-hidden">
                <ChatInterface meetingTitle="Product Planning Sprint" meetingId="meeting-live" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
