'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { Bot, Mic, MicOff, Send, Loader2, FileText, X, GripHorizontal, RefreshCw } from 'lucide-react'

/* ─── draggable hook ─────────────────────────────── */
function useDraggable(initialPos: { x: number; y: number }) {
    const [pos, setPos] = useState(initialPos)
    const dragging = useRef(false)
    const offset = useRef({ x: 0, y: 0 })
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        dragging.current = true
        offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
        e.preventDefault()
    }, [pos])
    useEffect(() => {
        const move = (e: MouseEvent) => { if (dragging.current) setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y }) }
        const up = () => { dragging.current = false }
        window.addEventListener('mousemove', move)
        window.addEventListener('mouseup', up)
        return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    }, [])
    return { pos, onMouseDown }
}

/* ─── types ──────────────────────────────────────── */
interface TranscriptChunk { index: number; text: string; timestamp: string }
interface ChatMessage { role: 'user' | 'assistant'; content: string }

/* ─── main content ───────────────────────────────── */
function OverlayContent() {
    const searchParams = useSearchParams()
    const platform = searchParams.get('platform') || 'unknown'
    const title = searchParams.get('title') || 'Meeting'
    const meetingId = searchParams.get('meetingId') || `meeting-${Date.now()}`

    // User identity
    const [userName, setUserName] = useState<string>('')

    // Meeting state
    const [isRecording, setIsRecording] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [transcript, setTranscript] = useState<TranscriptChunk[]>([])
    const [meetingEnded, setMeetingEnded] = useState(false)

    // Active tab
    const [tab, setTab] = useState<'summary' | 'chat'>('summary')

    // Summary tab
    const [liveSummary, setLiveSummary] = useState<string>('')
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
    const lastSummarizedCount = useRef(0)

    // Chat tab
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [chatInput, setChatInput] = useState('')
    const [isSending, setIsSending] = useState(false)

    // Draggable panel
    const { pos, onMouseDown } = useDraggable({ x: typeof window !== 'undefined' ? window.innerWidth - 380 : 800, y: 80 })

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const chunkIndexRef = useRef(0)
    const transcriptIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const meetingEndedRef = useRef(false)
    const isTranscribingRef = useRef(false)
    const dbMeetingIdRef = useRef<string | null>(null)
    const meetingStartTimeRef = useRef<Date>(new Date())
    const chatEndRef = useRef<HTMLDivElement>(null)

    const info = { zoom: { icon: '🎥', label: 'Zoom' }, 'google-meet': { icon: '📹', label: 'Google Meet' }, unknown: { icon: '📞', label: 'Meeting' } }[platform] ?? { icon: '📞', label: 'Meeting' }

    /* Load user name */
    useEffect(() => {
        try {
            const stored = localStorage.getItem('user')
            if (stored) { const u = JSON.parse(stored); setUserName(u.name || u.email || '') }
        } catch { }
    }, [])

    /* Click-through: transparent areas pass events through, panel stays interactive */
    useEffect(() => {
        if (typeof window !== 'undefined' && window.electronAPI?.setIgnoreMouseEvents) {
            window.electronAPI.setIgnoreMouseEvents(true)
        }
    }, [])

    const onPanelEnter = () => { if (window.electronAPI?.setIgnoreMouseEvents) window.electronAPI.setIgnoreMouseEvents(false) }
    const onPanelLeave = () => { if (window.electronAPI?.setIgnoreMouseEvents) window.electronAPI.setIgnoreMouseEvents(true) }

    /* Scroll chat to bottom */
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

    /* Transcription */
    const transcribeChunk = useCallback(async (audioBlob: Blob) => {
        if (audioBlob.size < 1000 || isTranscribingRef.current) return
        isTranscribingRef.current = true
        setIsTranscribing(true)
        try {
            const buffer = await audioBlob.arrayBuffer()
            if (window.electronAPI?.transcribeAudio) {
                const idx = chunkIndexRef.current++
                const result = await window.electronAPI.transcribeAudio(meetingId, idx, buffer)
                if (result.success && result.text?.trim()) {
                    setTranscript(prev => [...prev, { index: idx, text: result.text.trim(), timestamp: new Date().toLocaleTimeString() }])
                }
            }
        } catch (e) { console.error('[Overlay] Transcribe:', e) }
        finally { isTranscribingRef.current = false; setIsTranscribing(false) }
    }, [meetingId])

    /* Recording */
    const startRecording = useCallback(async () => {
        try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } })
            streamRef.current = micStream
            const mr = new MediaRecorder(micStream, { mimeType: 'audio/webm;codecs=opus' })
            mediaRecorderRef.current = mr
            audioChunksRef.current = []
            mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
            mr.start(1000)
            setIsRecording(true)
            transcriptIntervalRef.current = setInterval(() => { if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop() }, 15000)
            mr.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                audioChunksRef.current = []
                transcribeChunk(blob)
                if (!meetingEndedRef.current && streamRef.current) {
                    try {
                        const nr = new MediaRecorder(streamRef.current, { mimeType: 'audio/webm;codecs=opus' })
                        mediaRecorderRef.current = nr
                        nr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
                        nr.onstop = mr.onstop
                        nr.start(1000)
                    } catch { }
                }
            }
        } catch (e) { console.error('[Overlay] Recording:', e) }
    }, [transcribeChunk])

    const stopRecording = useCallback(() => {
        meetingEndedRef.current = true
        if (transcriptIntervalRef.current) { clearInterval(transcriptIntervalRef.current); transcriptIntervalRef.current = null }
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
        setIsRecording(false)
    }, [])

    /* DB */
    const saveMeetingToDB = useCallback(async () => {
        try {
            const user = localStorage.getItem('user')
            const userId = user ? JSON.parse(user).id : null
            const res = await fetch('/api/meetings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, meetingId, title, platform }) })
            if (res.ok) {
                const d = await res.json()
                dbMeetingIdRef.current = d.meeting._id
                // Tell the main process about this meeting so it can finalize it on quit
                window.electronAPI?.registerMeetingDbId?.(d.meeting._id)
            }
        } catch { }
    }, [meetingId, title, platform])

    const updateMeetingInDB = useCallback(async (t: TranscriptChunk[], s: string | null) => {
        if (!dbMeetingIdRef.current) return
        const endedAt = new Date()
        await fetch(`/api/meetings/${dbMeetingIdRef.current}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed', endedAt: endedAt.toISOString(), durationMs: endedAt.getTime() - meetingStartTimeRef.current.getTime(), transcript: t, summary: s }),
        }).catch(() => { })
    }, [])

    /* Generate live summary */
    const generateLiveSummary = useCallback(async (chunks: TranscriptChunk[], force = false) => {
        if (chunks.length === 0) return
        if (!force && chunks.length - lastSummarizedCount.current < 3) return // every 3 new chunks
        lastSummarizedCount.current = chunks.length
        setIsGeneratingSummary(true)
        try {
            const fullTranscript = chunks.map(c => `[${c.timestamp}] ${c.text}`).join('\n')
            const res = await fetch('/api/generate-summary', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meetingTranscript: fullTranscript, meetingTitle: title }),
            })
            if (res.ok) { const d = await res.json(); setLiveSummary(d.summary || '') }
        } catch { }
        finally { setIsGeneratingSummary(false) }
    }, [title])

    /* Auto-generate summary when transcript grows */
    useEffect(() => { if (transcript.length > 0) generateLiveSummary(transcript) }, [transcript, generateLiveSummary])

    /* Final summary on meeting end, then save to DB */
    useEffect(() => {
        if (meetingEnded && transcript.length > 0) {
            generateLiveSummary(transcript, true).then(() => {
                updateMeetingInDB(transcript, liveSummary)
            })
        }
    }, [meetingEnded]) // eslint-disable-line react-hooks/exhaustive-deps

    /* Chat */
    const sendMessage = useCallback(async () => {
        if (!chatInput.trim() || isSending) return
        const userMsg = chatInput.trim()
        const updatedMessages = [...chatMessages, { role: 'user' as const, content: userMsg }]
        setChatMessages(updatedMessages)
        setChatInput('')
        setIsSending(true)
        try {
            // Build meeting context passed as the dedicated field the API expects
            const identityLine = userName ? `The user's name is "${userName}". When they say "I", "me", or "my", they are referring to ${userName}.\n\n` : ''
            const meetingContext = identityLine + (liveSummary
                ? `Running meeting summary:\n${liveSummary}`
                : transcript.length > 0
                    ? `Live transcript:\n${transcript.map(c => `[${c.timestamp}] ${c.text}`).join('\n')}`
                    : 'No transcript captured yet.')

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
                    meetingContext,
                }),
            })
            if (res.ok && res.body) {
                const reader = res.body.getReader(); const decoder = new TextDecoder(); let content = ''
                setChatMessages(prev => [...prev, { role: 'assistant', content: '' }])
                while (true) {
                    const { done, value } = await reader.read(); if (done) break
                    content += decoder.decode(value, { stream: true })
                    setChatMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content }; return u })
                }
            } else {
                const errText = await res.text().catch(() => 'Unknown error')
                console.error('[Overlay Chat] API error:', res.status, errText)
                setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, could not reach the AI. Please try again.' }])
            }
        } catch (e) {
            console.error('[Overlay Chat] Error:', e)
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
        }
        finally { setIsSending(false) }
    }, [chatInput, isSending, chatMessages, liveSummary, transcript, userName])

    /* Bootstrap */
    useEffect(() => { saveMeetingToDB(); const t = setTimeout(() => startRecording(), 1500); return () => clearTimeout(t) }, [startRecording, saveMeetingToDB])
    useEffect(() => {
        if (typeof window !== 'undefined' && window.electronAPI?.onMeetingEnded) {
            return window.electronAPI.onMeetingEnded(() => { setMeetingEnded(true); stopRecording() })
        }
    }, [stopRecording])

    return (
        <div className="w-screen h-screen overflow-hidden" style={{ background: 'transparent' }}>

            {/* ── Single Draggable Panel ─────────────────── */}
            <div
                style={{ position: 'fixed', left: pos.x, top: pos.y, width: 360, zIndex: 9999 }}
                className="rounded-2xl border border-white/15 backdrop-blur-2xl bg-black/60 shadow-2xl overflow-hidden flex flex-col"
                onMouseEnter={onPanelEnter}
                onMouseLeave={onPanelLeave}
            >
                {/* Title / drag bar */}
                <div
                    onMouseDown={onMouseDown}
                    className="flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing select-none border-b border-white/10"
                >
                    <GripHorizontal className="w-3.5 h-3.5 text-white/30" />
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} />
                        <span className="text-xs font-semibold text-white/70 truncate">{info.icon} {title}</span>
                        {isTranscribing && <Loader2 className="w-3 h-3 text-purple-400 animate-spin shrink-0" />}
                    </div>
                    <span className="text-[10px] text-white/30 shrink-0">{info.label}</span>
                    <button onClick={() => window.close()} className="p-0.5 rounded text-white/30 hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setTab('summary')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${tab === 'summary' ? 'text-white border-b-2 border-primary bg-white/5' : 'text-white/40 hover:text-white/70'}`}
                    >
                        <FileText className="w-3 h-3" />
                        Summary
                        {isGeneratingSummary && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                    </button>
                    <button
                        onClick={() => setTab('chat')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${tab === 'chat' ? 'text-white border-b-2 border-primary bg-white/5' : 'text-white/40 hover:text-white/70'}`}
                    >
                        <Bot className="w-3 h-3" />
                        Ask AI
                    </button>
                </div>

                {/* ── Summary Tab ── */}
                {tab === 'summary' && (
                    <div className="flex flex-col min-h-0" style={{ maxHeight: 440 }}>
                        <div className="flex-1 overflow-y-auto p-3">
                            {liveSummary ? (
                                <div className="text-xs text-white/75 leading-relaxed whitespace-pre-wrap">{liveSummary}</div>
                            ) : isGeneratingSummary ? (
                                <div className="flex flex-col items-center py-10">
                                    <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
                                    <p className="text-xs text-white/30">Generating summary…</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-10 text-center">
                                    <Mic className={`w-6 h-6 mb-2 ${isRecording ? 'text-red-400 animate-pulse' : 'text-white/20'}`} />
                                    <p className="text-xs text-white/30">{isRecording ? 'Recording… summary updates every 3 transcript chunks' : 'Starting mic…'}</p>
                                </div>
                            )}
                        </div>
                        {liveSummary && (
                            <div className="px-3 pb-2 flex justify-end">
                                <button
                                    onClick={() => generateLiveSummary(transcript, true)}
                                    className="flex items-center gap-1 text-[10px] text-white/30 hover:text-primary transition-colors"
                                >
                                    <RefreshCw className="w-2.5 h-2.5" /> refresh
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Chat Tab ── */}
                {tab === 'chat' && (
                    <div className="flex flex-col" style={{ height: 440 }}>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {chatMessages.length === 0 ? (
                                <div className="flex flex-col items-center py-10 text-center">
                                    <Bot className="w-6 h-6 text-white/20 mb-2" />
                                    <p className="text-xs text-white/30">Ask anything about the meeting</p>
                                    {userName && <p className="text-[10px] text-white/20 mt-1">e.g. "What task was I given?"</p>}
                                </div>
                            ) : (
                                chatMessages.map((msg, i) => (
                                    <div key={i} className={`px-2.5 py-1.5 rounded-lg text-xs ${msg.role === 'user' ? 'bg-primary/20 border border-primary/30 ml-8' : 'bg-white/5 border border-white/10 mr-6'}`}>
                                        <p className="text-[10px] text-white/30 mb-0.5">{msg.role === 'user' ? 'You' : '✨ Gemini'}</p>
                                        {msg.role === 'assistant' && msg.content === '' && isSending && i === chatMessages.length - 1 ? (
                                            <div className="flex items-center gap-1 py-0.5">
                                                {[0, 1, 2].map(j => <span key={j} className="w-1 h-1 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${j * 150}ms` }} />)}
                                            </div>
                                        ) : (
                                            <p className="text-white/75 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                        )}
                                    </div>
                                ))
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-white/10 flex gap-1.5">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                placeholder={userName ? `Ask about ${title}…` : 'Ask about the meeting…'}
                                className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!chatInput.trim() || isSending}
                                className="px-2.5 py-1.5 rounded-lg bg-primary/80 hover:bg-primary text-white transition-colors disabled:opacity-40"
                            >
                                {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function OverlayPage() {
    return (
        <Suspense fallback={<div style={{ background: 'transparent' }} />}>
            <OverlayContent />
        </Suspense>
    )
}
