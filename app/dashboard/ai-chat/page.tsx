'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Bot, CheckCircle2, Wifi } from 'lucide-react'

function AIChatContent() {
    const searchParams = useSearchParams()
    const platform = searchParams.get('platform') || 'unknown'
    const title = searchParams.get('title') || 'Meeting'
    const [meetingEnded, setMeetingEnded] = useState(false)

    const platformInfo: Record<string, { icon: string; color: string; label: string }> = {
        zoom: { icon: '🎥', color: 'text-blue-400', label: 'Zoom' },
        'google-meet': { icon: '📹', color: 'text-green-400', label: 'Google Meet' },
        unknown: { icon: '📞', color: 'text-muted-foreground', label: 'Meeting' },
    }

    const info = platformInfo[platform] || platformInfo.unknown

    // Listen for meeting:ended event from Electron
    useEffect(() => {
        if (typeof window !== 'undefined' && window.electronAPI?.onMeetingEnded) {
            const cleanup = window.electronAPI.onMeetingEnded(() => {
                setMeetingEnded(true)
            })
            return cleanup
        }
    }, [])

    const handleClose = () => {
        window.close()
    }

    // Meeting Over state
    if (meetingEnded) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
                <div className="text-center max-w-sm">
                    <div className="w-20 h-20 rounded-full bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-blue-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-blue-500 mb-3">
                        Meeting is Over
                    </h1>
                    <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                        You can view this meeting anytime in the &quot;View Meetings&quot; section.
                    </p>
                    <button
                        onClick={handleClose}
                        className="px-8 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        )
    }

    // Active meeting state
    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="border-b border-border/50 p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">AI Chatbot</h1>
                        <p className="text-xs text-muted-foreground">Dejavue Meeting Assistant</p>
                    </div>
                </div>
            </header>

            {/* Meeting Detected Banner */}
            <div className="p-4">
                <Card className="p-4 border-green-500/30 bg-green-500/5">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">Meeting Detected</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <span>{info.icon}</span>
                                <span className={info.color}>{info.label}</span>
                                <span>— {title}</span>
                            </p>
                        </div>
                        <Wifi className="w-4 h-4 text-green-500" />
                    </div>
                </Card>
            </div>

            {/* Empty Chat Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-primary/60" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">AI Chatbot</h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                    Meeting assistant will be available here. AI-powered features coming soon.
                </p>
            </div>

            {/* Input Area (disabled placeholder) */}
            <div className="border-t border-border/50 p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Chat features coming soon..."
                        disabled
                        className="flex-1 px-4 py-2.5 rounded-lg bg-secondary/50 border border-border/30 text-sm text-muted-foreground placeholder:text-muted-foreground/50 cursor-not-allowed"
                    />
                    <button
                        disabled
                        className="px-4 py-2.5 rounded-lg bg-primary/20 text-primary/50 text-sm font-medium cursor-not-allowed"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function AIChatPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        }>
            <AIChatContent />
        </Suspense>
    )
}
