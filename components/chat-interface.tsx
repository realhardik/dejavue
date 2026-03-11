'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Send, Loader2, Bot, Trash2 } from 'lucide-react'

interface ChatInterfaceProps {
  meetingId?: string
  meetingTitle?: string
  meetingContext?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function ChatInterface({ meetingId, meetingTitle, meetingContext }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Scroll to latest message */
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  /* Load saved chat history on mount */
  useEffect(() => {
    if (!meetingId) { setIsLoadingHistory(false); return }
    fetch(`/api/meetings/${meetingId}`)
      .then(r => r.json())
      .then(d => {
        const history = d.meeting?.chatHistory
        if (Array.isArray(history) && history.length > 0) setMessages(history)
      })
      .catch(() => { })
      .finally(() => setIsLoadingHistory(false))
  }, [meetingId])

  /* Debounced save — fires 1.5s after the last message change */
  const saveHistory = useCallback((msgs: ChatMessage[]) => {
    if (!meetingId) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      fetch(`/api/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory: msgs }),
      }).catch(() => { })
    }, 1500)
  }, [meetingId])

  /* Clear chat */
  const clearChat = useCallback(async () => {
    if (!meetingId || isClearing) return
    setIsClearing(true)
    setMessages([])
    try {
      await fetch(`/api/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory: [] }),
      })
    } catch { } finally { setIsClearing(false) }
  }, [meetingId, isClearing])

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

      // Save after AI finishes responding
      const finalMessages = [...updatedMessages, { role: 'assistant' as const, content: assistantContent }]
      saveHistory(finalMessages)
    } catch {
      const errMessages = [...updatedMessages, { role: 'assistant' as const, content: 'Sorry, I encountered an error. Please try again.' }]
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
            variant="ghost"
            size="sm"
            onClick={clearChat}
            disabled={isClearing}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 gap-1.5"
          >
            {isClearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Clear chat
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingHistory ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : messages.length === 0 ? (
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
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question about the meeting..."
            disabled={isStreaming || isLoadingHistory}
            className="bg-secondary border-border/50 text-foreground placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            disabled={isStreaming || !input.trim() || isLoadingHistory}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
