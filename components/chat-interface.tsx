'use client'

import React from "react"

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Send, Loader } from 'lucide-react'

interface ChatInterfaceProps {
  meetingId?: string
  meetingTitle?: string
}

export function ChatInterface({ meetingId, meetingTitle }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, sendMessage, status, input: chatInput = '', setInput: setChatInput } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput || !chatInput.trim()) return

    sendMessage({ text: chatInput })
    setChatInput('')
  }



  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b border-border/50 p-4">
        <h2 className="text-lg font-semibold text-foreground">
          {meetingTitle ? `Chat about: ${meetingTitle}` : 'Meeting Assistant'}
        </h2>
        <p className="text-sm text-muted-foreground">Ask questions about the meeting</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Card className="p-8 border-border/50 text-center max-w-sm">
              <p className="text-muted-foreground mb-2">No conversation yet</p>
              <p className="text-xs text-muted-foreground">
                Start by asking a question about the meeting. The AI assistant will help you analyze and understand the content.
              </p>
            </Card>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground border border-border/50'
                }`}
              >
                {message.parts?.map((part, i) => {
                  if (part.type === 'text') {
                    return (
                      <p key={i} className="text-sm">
                        {part.text}
                      </p>
                    )
                  }
                  return null
                })}
              </div>
            </div>
          ))
        )}

        {status === 'streaming' && (
          <div className="flex justify-start">
            <div className="bg-secondary text-foreground border border-border/50 px-4 py-2 rounded-lg flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">AI is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border/50 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask a question about the meeting..."
            disabled={status === 'streaming'}
            className="bg-secondary border-border/50 text-foreground placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            disabled={status === 'streaming' || !chatInput.trim()}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
