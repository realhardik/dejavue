'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Send, Loader2, Bot, Trash2 } from 'lucide-react'

import { AddToCalendarButton } from '@/components/add-to-calendar-button'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  calendarEvent?: { task: string; deadline: string | null }
}

// Detect if the AI response is telling the user about their own task/deadline
function extractDeadlineFromResponse(text: string, meetingTitle: string): { task: string; deadline: string | null } | null {
  const lower = text.toLowerCase()
  if (!/\b(your|you)\b/.test(lower)) return null
  if (!/\b(deadline|due|by|task|assigned|need to)\b/.test(lower)) return null
  const dateMatch = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?\b|\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b|\bnext\s+\w+\b|\bthis\s+(week|month|Friday|Saturday|Sunday)\b/i)
  const sentences = text.split(/[.!?]+/).filter(s => /\b(your|you)\b/i.test(s))
  const taskSentence = sentences[sentences.length - 1]?.trim() || text.slice(0, 120)
  const task = taskSentence
    .replace(/^(yes,?\s*|so\s*|and\s*|your deadline for\s*)/i, '')
    .replace(/\s*is\s+(due|on|by)?.*(\.|$)/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 100) || `Task from ${meetingTitle}`
  return { task, deadline: dateMatch?.[0] ?? null }
}

// Lightweight markdown renderer — handles **bold**, *italic*, bullet lists
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const result: React.ReactNode[] = []
  let inList = false

  lines.forEach((line, i) => {
    const isBullet = /^\s*[\*\-]\s+/.test(line)
    if (isBullet) {
      const content = line.replace(/^\s*[\*\-]\s+/, '')
      if (!inList) { inList = true; result.push(<ul key={`ul-${i}`} className="list-disc ml-4 space-y-0.5" />) }
      result.push(<li key={i} className="text-sm leading-relaxed">{renderInline(content)}</li>)
    } else {
      inList = false
      if (line.trim() === '') {
        result.push(<div key={i} className="h-1.5" />)
      } else {
        result.push(<p key={i} className="text-sm leading-relaxed">{renderInline(line)}</p>)
      }
    }
  })
  return <div className="space-y-0.5">{result}</div>
}

function renderInline(text: string): React.ReactNode[] {
  // Split on **bold** and *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>
    return part
  })
}

interface ChatInterfaceProps {
  meetingId?: string
  meetingTitle?: string
  meetingContext?: string
  /** Pre-loaded chat history from parent — avoids DB fetch on every tab switch */
  initialHistory?: ChatMessage[]
  onHistoryChange?: (msgs: ChatMessage[]) => void
}

export function ChatInterface({ meetingId, meetingTitle, meetingContext, initialHistory, onHistoryChange }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(initialHistory ?? [])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep parent in sync when history was changed from outside (e.g., another session)
  useEffect(() => {
    if (initialHistory) setMessages(initialHistory)
  }, []) // eslint-disable-line — only run once on mount, parent owns the truth

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  /* Debounced save to DB — only writes, no reads */
  const saveHistory = useCallback((msgs: ChatMessage[]) => {
    if (!meetingId) return
    onHistoryChange?.(msgs)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      fetch(`/api/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory: msgs }),
      }).catch(() => { })
    }, 1500)
  }, [meetingId, onHistoryChange])

  /* Clear chat */
  const clearChat = useCallback(async () => {
    if (!meetingId || isClearing) return
    setIsClearing(true)
    setMessages([])
    onHistoryChange?.([])
    try {
      await fetch(`/api/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory: [] }),
      })
    } catch { } finally { setIsClearing(false) }
  }, [meetingId, isClearing, onHistoryChange])

  /* Send message */
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return

    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsStreaming(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          meetingContext: meetingContext || undefined,
        }),
      })

      if (!response.ok) throw new Error('Chat request failed')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let assistantContent = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantContent += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
          return updated
        })
      }

      // After streaming, check if AI mentioned user's deadline → show Add to Calendar button
      const calendarEvent = extractDeadlineFromResponse(assistantContent, meetingTitle || 'Meeting')
      const finalMsg: ChatMessage = { role: 'assistant', content: assistantContent, ...(calendarEvent ? { calendarEvent } : {}) }
      const finalMessages = [...updatedMessages, finalMsg]
      setMessages(prev => { const u = [...prev]; u[u.length - 1] = finalMsg; return u })
      saveHistory(finalMessages)
    } catch {
      const errMessages = [...updatedMessages, { role: 'assistant' as const, content: 'Sorry, something went wrong.' }]
      setMessages(errMessages)
      saveHistory(errMessages)
    } finally {
      setIsStreaming(false)
    }
  }, [input, isStreaming, messages, meetingContext, saveHistory])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border/50 p-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            {meetingTitle ? `Chat about: ${meetingTitle}` : 'Meeting Assistant'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {meetingContext ? 'AI has your M.o.M loaded. Ask anything about this meeting.' : 'Ask questions about the meeting'}
          </p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost" size="sm" onClick={clearChat} disabled={isClearing}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 gap-1.5"
          >
            {isClearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Clear chat
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Card className="p-8 border-border/50 text-center max-w-sm">
              <Bot className="w-10 h-10 text-primary/50 mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">No conversation yet</p>
              <p className="text-xs text-muted-foreground">
                {meetingContext
                  ? 'The AI has your meeting minutes loaded. Ask questions like "What were the key decisions?" or "List action items".'
                  : 'Start by asking a question about the meeting.'}
              </p>
            </Card>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-md px-4 py-2 rounded-lg ${message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground border border-border/50'}`}>
                {message.role === 'assistant' ? renderMarkdown(message.content) : <p className="text-sm whitespace-pre-wrap">{message.content}</p>}
                {message.calendarEvent && (
                  <div className="mt-2 pt-2 border-t border-border/30">
                    <AddToCalendarButton
                      task={message.calendarEvent.task}
                      deadline={message.calendarEvent.deadline}
                      meetingTitle={meetingTitle || 'Meeting'}
                      size="full"
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start">
            <div className="bg-secondary text-foreground border border-border/50 px-4 py-2 rounded-lg flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">AI is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/50 p-4">
        <form onSubmit={e => { e.preventDefault(); sendMessage() }} className="flex gap-2">
          <Input
            value={input} onChange={e => setInput(e.target.value)}
            placeholder="Ask a question about the meeting..."
            disabled={isStreaming}
            className="bg-secondary border-border/50 text-foreground placeholder:text-muted-foreground"
          />
          <Button type="submit" disabled={isStreaming || !input.trim()} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
