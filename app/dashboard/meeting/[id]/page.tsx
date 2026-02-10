'use client'

import { Sidebar } from '@/components/sidebar'
import { MeetingSummary } from '@/components/meeting-summary'
import { ChatInterface } from '@/components/chat-interface'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, MessageSquare } from 'lucide-react'
import Link from 'next/link'

export default function MeetingDetailPage({ params }: { params: { id: string } }) {
  // Mock data - in production, this would be fetched based on the meeting ID
  const mockMeetingData = {
    title: 'Product Planning Sprint',
    date: 'February 8, 2024 at 2:30 PM',
    duration: '1h 45m',
    participants: ['Sarah Johnson', 'Mark Chen', 'Alex Rivera', 'Jordan Lee', 'Casey Williams'],
    status: 'completed' as const,
    executiveSummary:
      'The team met to discuss the Q1 product roadmap. The primary focus was on prioritizing three major initiatives: dashboard redesign, API performance optimization, and mobile app enhancement. The team agreed to start with the dashboard redesign as the top priority due to recent user feedback.',
    keyDecisions: [
      'Dashboard redesign approved as the top priority for Q1',
      'API performance optimization to be scheduled for Q2',
      'Mobile app enhancement approved with a focus on iOS first',
      'Weekly sync meetings scheduled for the team starting next Monday',
    ],
    actionItems: [
      {
        task: 'Create detailed dashboard redesign specification',
        owner: 'Sarah Johnson',
        dueDate: 'Feb 15, 2024',
      },
      {
        task: 'Gather UI/UX requirements from customer research',
        owner: 'Mark Chen',
        dueDate: 'Feb 15, 2024',
      },
      {
        task: 'Setup development environment for dashboard project',
        owner: 'Alex Rivera',
        dueDate: 'Feb 12, 2024',
      },
      {
        task: 'Schedule Q2 planning meeting',
        owner: 'Jordan Lee',
        dueDate: 'Feb 20, 2024',
      },
    ],
    topicsDiscussed: [
      'Q1 product roadmap',
      'User feedback analysis',
      'Dashboard redesign plans',
      'Performance optimization',
      'Mobile app strategy',
      'Team capacity planning',
      'Timeline and milestones',
    ],
    nextMeetingDate: 'February 15, 2024 at 2:00 PM',
    transcription: `Sarah Johnson: Let me start by reviewing the product roadmap for Q1. We have three major initiatives planned.

Mark Chen: Great, I looked at the initial priorities and I think we should focus on the dashboard redesign first.

Sarah Johnson: Good point. The dashboard redesign aligns with our user feedback from last quarter.

Alex Rivera: I agree. We've been getting complaints about the current layout. When can we start?

Sarah Johnson: I'm thinking we can kick off next week. Let me create a detailed spec by Friday.

Jordan Lee: What about the API performance work? Shouldn't that be a priority too?

Mark Chen: I think that's important but it's less urgent than the UI changes. We could schedule that for Q2.

Casey Williams: I'm concerned about the mobile app though. We have declining iOS adoption.

Sarah Johnson: You're right. Let's make mobile app enhancement our third priority, focusing on iOS improvements...`,
  }

  return (
    <div className="h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="ml-20 h-full overflow-auto">
        {/* Header */}
        <header className="border-b border-border/50 p-6 sticky top-0 bg-background/95 backdrop-blur-sm">
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
              <h1 className="text-3xl font-bold text-foreground">{mockMeetingData.title}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span>{mockMeetingData.date}</span>
                <span>•</span>
                <span>{mockMeetingData.duration}</span>
                <span>•</span>
                <Badge className="bg-green-500/20 text-green-400 border-0">{mockMeetingData.status}</Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3 border-b border-border/50 bg-transparent">
              <TabsTrigger
                value="summary"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <FileText className="w-4 h-4 mr-2" />
                Summary
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger
                value="transcript"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <FileText className="w-4 h-4 mr-2" />
                Transcript
              </TabsTrigger>
            </TabsList>

            {/* Summary Tab */}
            <TabsContent value="summary" className="mt-6">
              <MeetingSummary
                title={mockMeetingData.title}
                date={mockMeetingData.date}
                participants={mockMeetingData.participants}
                executiveSummary={mockMeetingData.executiveSummary}
                keyDecisions={mockMeetingData.keyDecisions}
                topicsDiscussed={mockMeetingData.topicsDiscussed}
                actionItems={mockMeetingData.actionItems}
                nextMeetingDate={mockMeetingData.nextMeetingDate}
              />
            </TabsContent>

            {/* Chat Tab */}
            <TabsContent value="chat" className="mt-6">
              <Card className="h-96 border-border/50 overflow-hidden">
                <ChatInterface
                  meetingTitle={mockMeetingData.title}
                  meetingId={params.id}
                />
              </Card>
            </TabsContent>

            {/* Transcript Tab */}
            <TabsContent value="transcript" className="mt-6">
              <Card className="p-6 border-border/50">
                <h2 className="text-lg font-semibold text-foreground mb-4">Full Transcript</h2>
                <div className="space-y-4 text-sm text-muted-foreground leading-relaxed max-h-96 overflow-y-auto">
                  {mockMeetingData.transcription.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="whitespace-pre-wrap">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
