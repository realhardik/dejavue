'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { Bot, CheckCircle2, Wifi, Mic, MicOff, Send, Loader2, FileText, Save } from 'lucide-react'

// ─── Types ───────────────────────────────────
interface TranscriptChunk {
    index: number
    text: string
    timestamp: string
}

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

// ─── Main Component ──────────────────────────
function AIChatContent() {
    const searchParams = useSearchParams()
    const platform = searchParams.get('platform') || 'unknown'
    const title = searchParams.get('title') || 'Meeting'
    const meetingId = searchParams.get('meetingId') || `meeting-${Date.now()}`

    // State
    const [meetingEnded, setMeetingEnded] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [transcript, setTranscript] = useState<TranscriptChunk[]>([])
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [chatInput, setChatInput] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [summary, setSummary] = useState<string | null>(null)
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
    const [summaryFilePath, setSummaryFilePath] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'transcript' | 'chat'>('transcript')

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const chunkIndexRef = useRef(0)
    const transcriptIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const transcriptEndRef = useRef<HTMLDivElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const meetingEndedRef = useRef(false)
    const isTranscribingRef = useRef(false)

    const platformInfo: Record<string, { icon: string; color: string; label: string }> = {
        zoom: { icon: '🎥', color: 'text-blue-400', label: 'Zoom' },
        'google-meet': { icon: '📹', color: 'text-green-400', label: 'Google Meet' },
        unknown: { icon: '📞', color: 'text-muted-foreground', label: 'Meeting' },
    }
    const info = platformInfo[platform] || platformInfo.unknown

    // ─── Local Whisper Transcription (via Electron IPC) ──
    const transcribeChunk = useCallback(async (audioBlob: Blob) => {
        console.log(`[DEBUG] transcribeChunk called, blob size: ${audioBlob.size} bytes`)

        if (audioBlob.size < 1000) {
            console.log('[DEBUG] Skipping tiny chunk (< 1000 bytes)')
            return
        }

        // Prevent duplicate concurrent calls
        if (isTranscribingRef.current) {
            console.log('[DEBUG] Already transcribing, skipping this chunk')
            return
        }
        isTranscribingRef.current = true
        setIsTranscribing(true)
        try {
            const buffer = await audioBlob.arrayBuffer()
            console.log(`[DEBUG] ArrayBuffer created, size: ${buffer.byteLength}`)

            const hasElectron = typeof window !== 'undefined' && !!window.electronAPI
            console.log(`[DEBUG] electronAPI available: ${hasElectron}`)
            console.log(`[DEBUG] transcribeAudio fn exists: ${!!(window.electronAPI?.transcribeAudio)}`)

            if (hasElectron && window.electronAPI?.transcribeAudio) {
                const currentIndex = chunkIndexRef.current++
                console.log(`[DEBUG] Calling IPC transcribeAudio for meeting: ${meetingId}, chunk: ${currentIndex}`)
                const result = await window.electronAPI.transcribeAudio(
                    meetingId,
                    currentIndex,
                    buffer
                )
                console.log(`[DEBUG] IPC result:`, JSON.stringify(result).substring(0, 300))

                if (result.success && result.text && result.text.trim().length > 0) {
                    const chunk: TranscriptChunk = {
                        index: currentIndex,
                        text: result.text.trim(),
                        timestamp: new Date().toLocaleTimeString(),
                    }
                    console.log(`[DEBUG] Adding transcript chunk #${chunk.index}: "${chunk.text.substring(0, 80)}..."`)
                    setTranscript(prev => [...prev, chunk])
                } else if (!result.success) {
                    console.error('[Transcribe] Whisper error:', result.error)
                } else {
                    console.log('[DEBUG] Whisper returned empty text')
                }
            } else {
                console.error('[DEBUG] electronAPI.transcribeAudio NOT available!')
            }
        } catch (err) {
            console.error('[Transcribe] Error:', err)
        } finally {
            isTranscribingRef.current = false
            setIsTranscribing(false)
        }
    }, [meetingId])

    // ─── Recording ───────────────────────────
    const startRecording = useCallback(async () => {
        try {
            // Try to get system audio via desktopCapturer (captures what others say)
            let systemStream: MediaStream | null = null
            if (typeof window !== 'undefined' && window.electronAPI?.getDesktopSources) {
                try {
                    const sources = await window.electronAPI.getDesktopSources()
                    if (sources && sources.length > 0) {
                        systemStream = await navigator.mediaDevices.getUserMedia({
                            audio: {
                                mandatory: {
                                    chromeMediaSource: 'desktop',
                                },
                            } as MediaTrackConstraints,
                            video: false,
                        })
                    }
                } catch (e) {
                    console.log('[Recording] System audio not available, using mic only')
                }
            }

            // Get microphone audio
            const micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                },
            })

            // Combine streams if system audio is available
            let combinedStream: MediaStream
            if (systemStream) {
                const audioContext = new AudioContext()
                const destination = audioContext.createMediaStreamDestination()
                const micSource = audioContext.createMediaStreamSource(micStream)
                micSource.connect(destination)
                const systemSource = audioContext.createMediaStreamSource(systemStream)
                systemSource.connect(destination)
                combinedStream = destination.stream
            } else {
                combinedStream = micStream
            }

            streamRef.current = combinedStream

            const mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: 'audio/webm;codecs=opus',
            })
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                console.log(`[DEBUG] ondataavailable fired, data size: ${event.data.size}`)
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.onerror = (event) => {
                console.error('[Recording] MediaRecorder error:', event)
            }

            // Start recording with timeslice so ondataavailable fires periodically
            mediaRecorder.start(1000) // collect data every 1 second
            setIsRecording(true)
            console.log(`[Recording] Started, state: ${mediaRecorder.state}, mimeType: ${mediaRecorder.mimeType}`)

            // Every 15 seconds (reduced from 30 for faster debugging): stop, transcribe, restart
            transcriptIntervalRef.current = setInterval(() => {
                console.log(`[DEBUG] Interval tick, recorder state: ${mediaRecorderRef.current?.state}, chunks buffered: ${audioChunksRef.current.length}`)
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    console.log('[DEBUG] Stopping recorder for transcription...')
                    mediaRecorderRef.current.stop()
                }
            }, 15000)

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                console.log(`[DEBUG] Recorder stopped. Total chunks: ${audioChunksRef.current.length}, blob size: ${audioBlob.size} bytes`)
                audioChunksRef.current = []
                transcribeChunk(audioBlob)

                // Restart recording if meeting is still active
                if (!meetingEndedRef.current && streamRef.current) {
                    try {
                        console.log('[DEBUG] Restarting recorder...')
                        const newRecorder = new MediaRecorder(streamRef.current, {
                            mimeType: 'audio/webm;codecs=opus',
                        })
                        mediaRecorderRef.current = newRecorder
                        newRecorder.ondataavailable = (event) => {
                            if (event.data.size > 0) {
                                audioChunksRef.current.push(event.data)
                            }
                        }
                        newRecorder.onerror = (event) => {
                            console.error('[Recording] New recorder error:', event)
                        }
                        newRecorder.onstop = mediaRecorder.onstop
                        newRecorder.start(1000)
                        console.log(`[DEBUG] New recorder started, state: ${newRecorder.state}`)
                    } catch (e) {
                        console.error('[Recording] Failed to restart:', e)
                    }
                } else {
                    console.log(`[DEBUG] Not restarting: meetingEnded=${meetingEndedRef.current}, hasStream=${!!streamRef.current}`)
                }
            }
        } catch (err) {
            console.error('[Recording] Error starting:', err)
        }
    }, [transcribeChunk])

    const stopRecording = useCallback(() => {
        meetingEndedRef.current = true
        if (transcriptIntervalRef.current) {
            clearInterval(transcriptIntervalRef.current)
            transcriptIntervalRef.current = null
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        setIsRecording(false)
        console.log('[Recording] Stopped')
    }, [])

    // ─── Summary Generation (Gemini) ─────────
    const generateSummary = useCallback(async () => {
        const fullTranscript = transcript.map(c => `[${c.timestamp}] ${c.text}`).join('\n')
        if (!fullTranscript.trim()) return

        setIsGeneratingSummary(true)
        try {
            const response = await fetch('/api/generate-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meetingTranscript: fullTranscript,
                    meetingTitle: title,
                }),
            })

            if (response.ok) {
                const data = await response.json()
                setSummary(data.summary)

                // Save as .txt via Electron IPC
                if (typeof window !== 'undefined' && window.electronAPI?.saveSummary) {
                    const result = await window.electronAPI.saveSummary(meetingId, data.summary, title)
                    if (result.success) {
                        setSummaryFilePath(result.filePath || null)
                        console.log(`[Summary] Saved to: ${result.filePath}`)
                    }
                }
            }
        } catch (err) {
            console.error('[Summary] Error:', err)
        } finally {
            setIsGeneratingSummary(false)
        }
    }, [transcript, title, meetingId])

    // ─── Chat (Q&A with Gemini + transcript) ──
    const sendMessage = useCallback(async () => {
        if (!chatInput.trim() || isSending) return

        const userMsg = chatInput.trim()
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setChatInput('')
        setIsSending(true)

        try {
            const fullTranscript = transcript.map(c => `[${c.timestamp}] ${c.text}`).join('\n')

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'user',
                            content: `[MEETING CONTEXT]\nPlatform: ${info.label}\nTitle: ${title}\n\nLive Transcript:\n${fullTranscript}\n\n[USER QUESTION]\n${userMsg}`,
                        },
                    ],
                }),
            })

            if (response.ok && response.body) {
                const reader = response.body.getReader()
                const decoder = new TextDecoder()
                let assistantContent = ''
                setChatMessages(prev => [...prev, { role: 'assistant', content: '' }])

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    assistantContent += decoder.decode(value, { stream: true })
                    setChatMessages(prev => {
                        const updated = [...prev]
                        updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                        return updated
                    })
                }
            }
        } catch (err) {
            console.error('[Chat] Error:', err)
            setChatMessages(prev => [
                ...prev,
                { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
            ])
        } finally {
            setIsSending(false)
        }
    }, [chatInput, isSending, transcript, title, info.label])

    // ─── Effects ─────────────────────────────
    useEffect(() => {
        const timer = setTimeout(() => startRecording(), 1500)
        return () => clearTimeout(timer)
    }, [startRecording])

    useEffect(() => {
        if (typeof window !== 'undefined' && window.electronAPI?.onMeetingEnded) {
            const cleanup = window.electronAPI.onMeetingEnded(() => {
                setMeetingEnded(true)
                stopRecording()
            })
            return cleanup
        }
    }, [stopRecording])

    useEffect(() => {
        if (meetingEnded && transcript.length > 0 && !summary) {
            generateSummary()
        }
    }, [meetingEnded, transcript, summary, generateSummary])

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [transcript])

    const handleClose = () => window.close()

    // ─── Meeting Over UI ─────────────────────
    if (meetingEnded) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <header className="border-b border-border/50 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-blue-500">Meeting is Over</h1>
                            <p className="text-xs text-muted-foreground">{info.icon} {info.label} — {title}</p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isGeneratingSummary ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                            <p className="text-sm text-muted-foreground">Generating meeting summary with AI...</p>
                        </div>
                    ) : summary ? (
                        <>
                            {summaryFilePath && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                                    <Save className="w-4 h-4 text-green-500" />
                                    <p className="text-xs text-green-400">Summary saved to disk</p>
                                </div>
                            )}
                            <div className="px-4 py-3 rounded-lg bg-secondary/50 border border-border/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText className="w-4 h-4 text-primary" />
                                    <h3 className="text-sm font-semibold text-foreground">Meeting Summary</h3>
                                </div>
                                <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                    {summary}
                                </div>
                            </div>
                        </>
                    ) : transcript.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <p className="text-sm text-muted-foreground">No transcript was captured.</p>
                        </div>
                    ) : null}
                </div>

                <div className="border-t border-border/50 p-4">
                    <button
                        onClick={handleClose}
                        className="w-full px-4 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        )
    }

    // ─── Active Meeting UI ───────────────────
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="border-b border-border/50 p-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-primary" />
                        <span className="text-sm font-bold text-foreground">Dejavue AI</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {isRecording ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/30">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-xs text-red-400 font-medium">REC</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary">
                                <MicOff className="w-3 h-3 text-muted-foreground" />
                            </div>
                        )}
                        {isTranscribing && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10">
                                <Loader2 className="w-3 h-3 text-primary animate-spin" />
                                <span className="text-xs text-primary">Transcribing...</span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="px-3 py-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/5 border border-green-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">
                        {info.icon} <span className={info.color}>{info.label}</span> — {title}
                    </span>
                    <Wifi className="w-3 h-3 text-green-500 ml-auto" />
                </div>
            </div>

            <div className="px-3 py-1 flex gap-1">
                <button
                    onClick={() => setActiveTab('transcript')}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'transcript'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-secondary'
                        }`}
                >
                    📝 Transcript {transcript.length > 0 && `(${transcript.length})`}
                </button>
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'chat'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-secondary'
                        }`}
                >
                    💬 Ask AI
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
                {activeTab === 'transcript' ? (
                    <div className="space-y-2">
                        {transcript.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Mic className="w-8 h-8 text-primary/30 mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    {isRecording
                                        ? 'Listening... transcript appears every 30s (local Whisper).'
                                        : 'Starting microphone...'}
                                </p>
                            </div>
                        ) : (
                            transcript.map((chunk) => (
                                <div key={chunk.index} className="px-3 py-2 rounded-lg bg-secondary/50 border border-border/30">
                                    <p className="text-xs text-muted-foreground/60 mb-1">{chunk.timestamp}</p>
                                    <p className="text-sm text-foreground leading-relaxed">{chunk.text}</p>
                                </div>
                            ))
                        )}
                        <div ref={transcriptEndRef} />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {chatMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Bot className="w-8 h-8 text-primary/30 mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    Ask questions about the meeting.
                                </p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                    Powered by Gemini — has access to the live transcript.
                                </p>
                            </div>
                        ) : (
                            chatMessages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`px-3 py-2 rounded-lg text-sm ${msg.role === 'user'
                                        ? 'bg-primary/10 border border-primary/20 text-foreground ml-8'
                                        : 'bg-secondary/50 border border-border/30 text-foreground mr-8'
                                        }`}
                                >
                                    <p className="text-xs text-muted-foreground/60 mb-1">
                                        {msg.role === 'user' ? 'You' : '✨ Gemini'}
                                    </p>
                                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <div className="border-t border-border/50 p-3">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        placeholder={activeTab === 'chat' ? 'Ask about the meeting...' : 'Switch to Ask AI tab to chat'}
                        disabled={activeTab !== 'chat'}
                        className="flex-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!chatInput.trim() || isSending || activeTab !== 'chat'}
                        className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
