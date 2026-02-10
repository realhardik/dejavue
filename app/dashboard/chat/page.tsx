'use client'

import { Sidebar } from '@/components/sidebar'
import { ChatInterface } from '@/components/chat-interface'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Lightbulb } from 'lucide-react'

export default function ChatPage() {
  const quickQuestions = [
    'What were the main action items?',
    'Who said what about the budget?',
    'What decisions were made?',
    'Summarize the key discussion points',
  ]

  return (
    <div className="h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      <div className="ml-20 h-full flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-border/50 p-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Meeting Assistant</h1>
          <p className="text-muted-foreground">Ask questions about your meetings in real-time or after they end</p>
        </header>

        {/* Main Chat Area */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* Chat Interface */}
          <div className="flex-1 flex flex-col bg-card rounded-lg border border-border/50 overflow-hidden">
            <ChatInterface meetingTitle="Product Planning Sprint" meetingId="meeting-1" />
          </div>

          {/* Sidebar Info */}
          <div className="w-64 space-y-4 overflow-y-auto">
            {/* Quick Questions */}
            <Card className="p-4 border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Quick Questions</h3>
              </div>
              <div className="space-y-2">
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    className="w-full text-left p-2 rounded-lg bg-secondary/50 hover:bg-secondary border border-border/30 hover:border-primary/50 text-sm text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </Card>

            {/* Meeting Info */}
            <Card className="p-4 border-border/50">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Meeting Info
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Title</p>
                  <p className="text-foreground font-medium">Product Planning Sprint</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="text-foreground font-medium">1h 45m</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Participants</p>
                  <p className="text-foreground font-medium">8 people</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className="mt-1 bg-green-500/10 text-green-400 border-0">Completed</Badge>
                </div>
              </div>
            </Card>

            {/* Tips */}
            <Card className="p-4 border-border/50 bg-primary/5">
              <h3 className="font-semibold text-foreground mb-2">Tips</h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Ask about specific topics or timeframes</li>
                <li>• Get summaries of sections</li>
                <li>• Find quotes from participants</li>
                <li>• Identify decisions and action items</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
