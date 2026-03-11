'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { Bot, Mic, Send, Loader2, FileText, X, GripHorizontal, RefreshCw, Globe } from 'lucide-react'

/* ─── draggable hook ────────────────────────────────────── */
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

/* ─── subtitle hook (Transformers.js Worker) ────── */
function useSubtitles(lang: 'en' | 'hi') {
    const [subtitleText, setSubtitleText] = useState('')
    const [status, setStatus] = useState<'starting' | 'listening' | 'error' | 'loading'>('loading')
    const [progress, setProgress] = useState(0)
    const workerRef = useRef<Worker | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const activeRef = useRef(false)

    // Setup worker
    useEffect(() => {
        workerRef.current = new Worker('/worker.js', { type: 'module' })
        workerRef.current.onmessage = (e) => {
            const { status: s, text, progress: p } = e.data
            if (s === 'progress' && p?.progress) setProgress(Math.round(p.progress))
            if (s === 'ready') setStatus('starting')
            if (s === 'complete' && text?.trim()) {
                setSubtitleText(prev => {
                    const prevWords = prev.trim().split(/\s+/).filter(Boolean)
                    // If we already have 10+ words showing, reset to just the new chunk
                    if (prevWords.length >= 10) return text.trim()
                    // Otherwise append
                    return (prev + ' ' + text.trim()).trim()
                })
            }
        }
        workerRef.current.postMessage({ type: 'load' })
        return () => { workerRef.current?.terminate() }
    }, [])

    const startRecording = useCallback(async () => {
        if (!workerRef.current || status === 'loading') return
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
            streamRef.current = stream
            activeRef.current = true
            setStatus('listening')

            const startChunk = () => {
                if (!activeRef.current || !streamRef.current) return
                const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
                mediaRecorderRef.current = mr
                const chunks: Blob[] = []
                mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
                mr.onstop = async () => {
                    const blob = new Blob(chunks, { type: 'audio/webm' })
                    if (blob.size > 1000 && workerRef.current) {
                        try {
                            const audioCtx = new AudioContext({ sampleRate: 16000 })
                            const arrayBuffer = await blob.arrayBuffer()
                            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
                            const audioData = audioBuffer.getChannelData(0)
                            workerRef.current.postMessage({ type: 'transcribe', audio: audioData, lang })
                        } catch (e) { console.error('Audio decode err', e) }
                    }
                    if (activeRef.current) startChunk() // Loop
                }
                // Record 6 second chunks for subtitles — more context = better accuracy
                mr.start()
                setTimeout(() => { if (mr.state === 'recording') mr.stop() }, 3000)
            }
            startChunk()

        } catch (e) {
            setStatus('error')
        }
    }, [status, lang])

    const stopRecording = useCallback(() => {
        activeRef.current = false
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
        setStatus('starting')
    }, [])

    useEffect(() => {
        if (status === 'starting') {
            setSubtitleText('')
            stopRecording()
            setTimeout(startRecording, 500)
        }
    }, [status, startRecording, stopRecording])

    // When language changes, force-stop and restart with new lang
    useEffect(() => {
        if (status === 'loading') return // don't interrupt model download
        activeRef.current = false
        if (mediaRecorderRef.current?.state === 'recording') {
            try { mediaRecorderRef.current.stop() } catch { }
        }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
        setSubtitleText('')
        setStatus('starting') // triggers the recording restart effect above
    }, [lang]) // eslint-disable-line

    // Cleanup on unmount
    useEffect(() => () => stopRecording(), [stopRecording])

    return { subtitleText, interimText: '', status, progress }
}

/* ─── types ─────────────────────────────────────────────── */
interface TranscriptChunk { index: number; text: string; timestamp: string }
interface MeetingEvent { person: string; task: string; deadline: string | null; type: string; isCurrentUser: boolean }
interface ChatMessage { role: 'user' | 'assistant'; content: string; events?: MeetingEvent[] }

/* ─── Google Calendar URL builder ───────────────────────── */
function calendarUrl(ev: MeetingEvent, meetingTitle: string): string {
    const t = encodeURIComponent(ev.task)
    const details = encodeURIComponent(`From meeting: ${meetingTitle}${ev.deadline ? `\nDeadline: ${ev.deadline}` : ''}`)
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${t}&details=${details}`
}

/* ─── Markdown renderer ──────────────────────────────────── */
function renderMd(text: string) {
    const lines = text.split('\n')
    const out: React.ReactNode[] = []
    lines.forEach((line, i) => {
        const isBullet = /^\s*[\*\-]\s+/.test(line)
        if (isBullet) {
            const c = line.replace(/^\s*[\*\-]\s+/, '')
            out.push(<li key={i} className="ml-3 text-[11px] leading-relaxed list-disc">{renderInlineMd(c)}</li>)
        } else if (line.trim() === '') {
            out.push(<div key={i} className="h-1" />)
        } else {
            out.push(<p key={i} className="text-[11px] leading-relaxed">{renderInlineMd(line)}</p>)
        }
    })
    return <div className="space-y-0.5">{out}</div>
}
function renderInlineMd(text: string): React.ReactNode[] {
    return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="font-semibold text-white/90">{p.slice(2, -2)}</strong>
        if (p.startsWith('*') && p.endsWith('*')) return <em key={i} className="text-white/70">{p.slice(1, -1)}</em>
        return p
    })
}

/* ─── main ──────────────────────────────────────────────── */
function OverlayContent() {
    const searchParams = useSearchParams()
    const platform = searchParams.get('platform') || 'unknown'
    const title = searchParams.get('title') || 'Meeting'
    const meetingId = searchParams.get('meetingId') || `meeting-${Date.now()}`

    const [userName, setUserName] = useState('')
    const [isRecording, setIsRecording] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [transcript, setTranscript] = useState<TranscriptChunk[]>([])
    const [meetingEnded, setMeetingEnded] = useState(false)
    const [countdown, setCountdown] = useState(3)
    const [tab, setTab] = useState<'summary' | 'chat'>('summary')
    const [liveSummary, setLiveSummary] = useState('')
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
    const lastSummarizedCount = useRef(0)
    const lastEventCheckCount = useRef(0)
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [chatInput, setChatInput] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [subtitleLang, setSubtitleLang] = useState<'en' | 'hi'>('en')

    const { pos, onMouseDown } = useDraggable({ x: typeof window !== 'undefined' ? window.innerWidth - 380 : 800, y: 80 })
    const { pos: subPos, onMouseDown: subOnMouseDown } = useDraggable({ x: typeof window !== 'undefined' ? window.innerWidth / 2 - 200 : 400, y: typeof window !== 'undefined' ? window.innerHeight - 120 : 800 })
    const { subtitleText, interimText, status: subtitleStatus, progress } = useSubtitles(subtitleLang)

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

    useEffect(() => {
        try { const s = localStorage.getItem('user'); if (s) { const u = JSON.parse(s); setUserName(u.name || u.email || '') } } catch { }
    }, [])

    useEffect(() => { window.electronAPI?.setIgnoreMouseEvents?.(true) }, [])
    const onEnter = () => window.electronAPI?.setIgnoreMouseEvents?.(false)
    const onLeave = () => window.electronAPI?.setIgnoreMouseEvents?.(true)

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

    // Countdown when meeting ends — stays in the same panel
    useEffect(() => {
        if (!meetingEnded) return
        const iv = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) { clearInterval(iv); try { window.close() } catch { } return 0 }
                return c - 1
            })
        }, 1000)
        return () => clearInterval(iv)
    }, [meetingEnded])

    /* Transcription */
    const transcribeChunk = useCallback(async (blob: Blob) => {
        if (blob.size < 1000 || isTranscribingRef.current) return
        isTranscribingRef.current = true; setIsTranscribing(true)
        try {
            const buffer = await blob.arrayBuffer()
            if (window.electronAPI?.transcribeAudio) {
                const idx = chunkIndexRef.current++
                const result = await window.electronAPI.transcribeAudio(meetingId, idx, buffer)
                if (result.success && result.text?.trim()) setTranscript(prev => [...prev, { index: idx, text: result.text.trim(), timestamp: new Date().toLocaleTimeString() }])
            }
        } catch { } finally { isTranscribingRef.current = false; setIsTranscribing(false) }
    }, [meetingId])

    /* Recording */
    const startRecording = useCallback(async () => {
        try {
            const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } })
            streamRef.current = mic
            setIsRecording(true)

            const recordChunk = () => {
                if (meetingEndedRef.current || !streamRef.current) return
                const chunks: Blob[] = []
                // Use mr.start() WITHOUT a timeslice — the browser writes a single
                // self-contained WebM container that ffmpeg/Whisper can decode cleanly.
                // Start(1000) fragmented slices produce invalid multi-cluster WebMs.
                const mr = new MediaRecorder(streamRef.current, { mimeType: 'audio/webm;codecs=opus' })
                mediaRecorderRef.current = mr
                mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
                mr.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/webm' })
                    transcribeChunk(blob)
                    // Schedule next chunk immediately (transcription runs async in background)
                    if (!meetingEndedRef.current && streamRef.current) recordChunk()
                }
                mr.start() // no timeslice → one clean blob
                transcriptIntervalRef.current = setTimeout(() => {
                    if (mr.state === 'recording') mr.stop()
                }, 15000)
            }

            recordChunk()
        } catch (e) { console.error('[Overlay] Recording:', e) }
    }, [transcribeChunk])

    const stopRecording = useCallback(() => {
        meetingEndedRef.current = true
        if (transcriptIntervalRef.current) { clearTimeout(transcriptIntervalRef.current); transcriptIntervalRef.current = null }
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
        setIsRecording(false)
    }, [])

    /* DB */
    const saveMeetingToDB = useCallback(async () => {
        try {
            const user = localStorage.getItem('user'); const userId = user ? JSON.parse(user).id : null
            const res = await fetch('/api/meetings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, meetingId, title, platform }) })
            if (res.ok) { const d = await res.json(); dbMeetingIdRef.current = d.meeting._id; window.electronAPI?.registerMeetingDbId?.(d.meeting._id) }
        } catch { }
    }, [meetingId, title, platform])

    const updateMeetingInDB = useCallback(async (t: TranscriptChunk[], s: string | null) => {
        if (!dbMeetingIdRef.current) return
        const endedAt = new Date()
        await fetch(`/api/meetings/${dbMeetingIdRef.current}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed', endedAt: endedAt.toISOString(), durationMs: endedAt.getTime() - meetingStartTimeRef.current.getTime(), transcript: t, summary: s }) }).catch(() => { })
    }, [])

    /* Summary */
    const generateLiveSummary = useCallback(async (chunks: TranscriptChunk[], force = false) => {
        if (chunks.length === 0) return
        if (!force && chunks.length - lastSummarizedCount.current < 3) return
        lastSummarizedCount.current = chunks.length; setIsGeneratingSummary(true)
        try {
            const res = await fetch('/api/generate-summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meetingTranscript: chunks.map(c => `[${c.timestamp}] ${c.text}`).join('\n'), meetingTitle: title, platform }) })
            if (res.ok) { const d = await res.json(); setLiveSummary(d.summary || '') }
        } catch { } finally { setIsGeneratingSummary(false) }
    }, [title, platform])

    // Post-meeting finalization: update title + save tasks
    const finalizeMeeting = useCallback(async (chunks: TranscriptChunk[]) => {
        if (chunks.length === 0 || !dbMeetingIdRef.current) return
        setIsGeneratingSummary(true)
        try {
            const transcript = chunks.map(c => `[${c.timestamp}] ${c.text}`).join('\n')
            const res = await fetch('/api/generate-summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meetingTranscript: transcript, meetingTitle: title, platform }) })
            if (!res.ok) return
            const { summary: finalSummary, suggestedTitle } = await res.json()
            setLiveSummary(finalSummary || '')

            // 1. Patch title if Gemini gave us one
            const newTitle = suggestedTitle || title || platform
            if (newTitle && dbMeetingIdRef.current) {
                await fetch(`/api/meetings/${dbMeetingIdRef.current}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle }) }).catch(() => { })
            }

            // 2. Save meeting as completed with final summary
            const endedAt = new Date()
            await fetch(`/api/meetings/${dbMeetingIdRef.current}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed', endedAt: endedAt.toISOString(), durationMs: endedAt.getTime() - meetingStartTimeRef.current.getTime(), transcript: chunks, summary: finalSummary }) }).catch(() => { })

            // 3. Extract events → save to tasks collection
            if (finalSummary && dbMeetingIdRef.current) {
                const user = localStorage.getItem('user'); const userId = user ? JSON.parse(user)._id || JSON.parse(user).id : null
                const extractRes = await fetch('/api/extract-events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary: finalSummary, userName }) }).catch(() => null)
                if (extractRes?.ok) {
                    const { events } = await extractRes.json()
                    if (Array.isArray(events) && events.length > 0 && userId) {
                        await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, meetingId: dbMeetingIdRef.current, meetingTitle: newTitle, tasks: events }) }).catch(() => { })
                    }
                }
            }
        } catch { } finally { setIsGeneratingSummary(false) }
    }, [title, platform, userName])

    useEffect(() => { if (transcript.length > 0) generateLiveSummary(transcript) }, [transcript, generateLiveSummary])
    useEffect(() => { if (meetingEnded && transcript.length > 0) finalizeMeeting(transcript) }, [meetingEnded]) // eslint-disable-line

    /* Chat */
    const sendMessage = useCallback(async () => {
        if (!chatInput.trim() || isSending) return
        const userMsg = chatInput.trim()
        const updated = [...chatMessages, { role: 'user' as const, content: userMsg }]
        setChatMessages(updated); setChatInput(''); setIsSending(true)
        try {
            const identityLine = userName ? `The user's name is "${userName}". When they say "I", "me", or "my", they refer to ${userName}.\n\n` : ''
            const meetingContext = identityLine + (liveSummary ? `Running summary:\n${liveSummary}` : transcript.length > 0 ? `Transcript:\n${transcript.map(c => `[${c.timestamp}] ${c.text}`).join('\n')}` : 'No transcript yet.')
            const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: updated.map(m => ({ role: m.role, content: m.content })), meetingContext }) })
            if (res.ok && res.body) {
                const reader = res.body.getReader(); const dec = new TextDecoder(); let content = ''
                setChatMessages(prev => [...prev, { role: 'assistant', content: '' }])
                while (true) { const { done, value } = await reader.read(); if (done) break; content += dec.decode(value, { stream: true }); setChatMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content }; return u }) }
            } else { setChatMessages(prev => [...prev, { role: 'assistant', content: 'Could not reach AI — check quota or connection.' }]) }
        } catch { setChatMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong.' }]) }
        finally { setIsSending(false) }
    }, [chatInput, isSending, chatMessages, liveSummary, transcript, userName])

    /* Event detection — runs after each new transcript chunk */
    const detectEvents = useCallback(async (chunks: TranscriptChunk[]) => {
        // Only check every 2 new chunks to save API calls
        if (chunks.length - lastEventCheckCount.current < 1) return
        const newChunks = chunks.slice(lastEventCheckCount.current)
        lastEventCheckCount.current = chunks.length
        const text = newChunks.map(c => c.text).join(' ')
        // Quick keyword check before calling AI
        const keywords = /\b(deadline|due|by|assign|task|calendar|schedule|remind|meeting|event|submit|deliver|complete|finish|send)\b/i
        if (!keywords.test(text)) return
        try {
            const res = await fetch('/api/extract-events', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, userName, meetingTitle: title }),
            })
            if (!res.ok) return
            const { events } = await res.json()
            if (!events?.length) return
            // Auto-post a card in chat tab
            const card: ChatMessage = {
                role: 'assistant',
                content: `📅 I noticed ${events.length > 1 ? 'some tasks/deadlines' : 'a task/deadline'} mentioned:`,
                events,
            }
            setChatMessages(prev => [...prev, card])
            setTab('chat')
        } catch { }
    }, [userName, title])

    useEffect(() => { if (transcript.length > 0) detectEvents(transcript) }, [transcript, detectEvents])

    useEffect(() => { if (window.electronAPI?.onMeetingEnded) return window.electronAPI.onMeetingEnded(() => { setMeetingEnded(true); stopRecording() }) }, [stopRecording])

    // Auto-start Whisper mic + save meeting to DB when overlay opens
    useEffect(() => {
        saveMeetingToDB()
        startRecording()
    }, []) // eslint-disable-line

    return (
        <div className="w-screen h-screen overflow-hidden" style={{ background: 'transparent' }}>

            {/* ── Subtitle strip — draggable, always visible ── */}
            <div
                style={{ position: 'fixed', left: subPos.x, top: subPos.y, zIndex: 9998 }}
                className="max-w-xl w-full"
                onMouseEnter={onEnter} onMouseLeave={onLeave}
            >
                <div
                    onMouseDown={subOnMouseDown}
                    className={`rounded-xl backdrop-blur-md px-4 py-2.5 text-center border transition-all cursor-grab active:cursor-grabbing ${subtitleStatus === 'error' ? 'bg-red-900/60 border-red-500/30' : subtitleText || interimText ? 'bg-black/75 border-white/10' : 'bg-black/40 border-white/5'}`}>
                    {subtitleStatus === 'error' ? (
                        <span className="text-red-300 text-xs">⚠ Mic not accessible or worker error</span>
                    ) : subtitleStatus === 'loading' ? (
                        <div className="flex flex-col items-center gap-1.5">
                            <span className="text-white/40 text-xs">Downloading offline models ({progress}%)…</span>
                            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    ) : subtitleText || interimText ? (
                        <>
                            <span className="text-white text-sm leading-relaxed">{subtitleText}</span>
                            {interimText && <span className="text-white/50 text-sm italic"> {interimText}</span>}
                        </>
                    ) : (
                        <span className="text-white/25 text-xs flex items-center justify-center gap-1.5">
                            {subtitleStatus === 'listening'
                                ? <><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />Listening…</>
                                : <><Loader2 className="w-3 h-3 animate-spin inline" /> Starting mic…</>}
                        </span>
                    )}
                </div>
                <div className="flex justify-center mt-1.5">
                    <button
                        onClick={() => setSubtitleLang(l => l === 'en' ? 'hi' : 'en')}
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/50 border border-white/10 text-[10px] text-white/40 hover:text-white/70 transition-colors backdrop-blur-sm"
                    >
                        <Globe className="w-2.5 h-2.5" />
                        {subtitleLang === 'en' ? '🇺🇸 English' : '🇮🇳 Hindi'} · tap to switch
                    </button>
                </div>
            </div>

            {/* ── Main Panel ── */}
            <div
                style={{ position: 'fixed', left: pos.x, top: pos.y, width: 360, zIndex: 9999 }}
                className="rounded-2xl border border-white/15 backdrop-blur-2xl bg-black/60 shadow-2xl overflow-hidden flex flex-col"
                onMouseEnter={onEnter} onMouseLeave={onLeave}
            >
                {/* Title bar */}
                <div onMouseDown={onMouseDown} className="flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing select-none border-b border-white/10">
                    <GripHorizontal className="w-3.5 h-3.5 text-white/30" />
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} />
                        <span className="text-xs font-semibold text-white/70 truncate">{info.icon} {title}</span>
                        {isTranscribing && <Loader2 className="w-3 h-3 text-purple-400 animate-spin shrink-0" />}
                    </div>
                    <span className="text-[10px] text-white/30 shrink-0">{info.label}</span>
                    <button onClick={() => window.close()} className="p-0.5 rounded text-white/30 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
                </div>

                {/* Meeting ended state — replaces tabs in same panel */}
                {meetingEnded ? (
                    <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-3">
                        <div className="text-2xl">✅</div>
                        <p className="text-white/80 text-sm font-medium">Meeting ended</p>
                        <p className="text-white/40 text-xs leading-relaxed">
                            Summary will be in <span className="text-primary/80">Past Meetings</span>
                        </p>
                        <p className="text-white/20 text-[10px] mt-1">Closing in {countdown}s…</p>
                    </div>
                ) : (
                    <>
                        {/* Tabs */}
                        <div className="flex border-b border-white/10">
                            {(['summary', 'chat'] as const).map(t => (
                                <button key={t} onClick={() => setTab(t)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${tab === t ? 'text-white border-b-2 border-primary bg-white/5' : 'text-white/40 hover:text-white/70'}`}>
                                    {t === 'summary' ? <><FileText className="w-3 h-3" />Summary{isGeneratingSummary && <Loader2 className="w-2.5 h-2.5 animate-spin" />}</> : <><Bot className="w-3 h-3" />Ask AI</>}
                                </button>
                            ))}
                        </div>

                        {/* Summary tab */}
                        {tab === 'summary' && (
                            <div className="flex flex-col" style={{ maxHeight: 440 }}>
                                <div className="flex-1 overflow-y-auto p-3">
                                    {liveSummary ? (
                                        <div className="text-xs text-white/75 leading-relaxed whitespace-pre-wrap">{liveSummary}</div>
                                    ) : isGeneratingSummary ? (
                                        <div className="flex flex-col items-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin mb-2" /><p className="text-xs text-white/30">Generating summary…</p></div>
                                    ) : (
                                        <div className="flex flex-col items-center py-10 text-center">
                                            <Mic className={`w-6 h-6 mb-2 ${isRecording ? 'text-red-400 animate-pulse' : 'text-white/20'}`} />
                                            <p className="text-xs text-white/30">{isRecording ? 'Recording… summary after 3 transcript chunks' : 'Starting mic…'}</p>
                                        </div>
                                    )}
                                </div>
                                {liveSummary && (
                                    <div className="px-3 pb-2 flex justify-end">
                                        <button onClick={() => generateLiveSummary(transcript, true)} className="flex items-center gap-1 text-[10px] text-white/30 hover:text-primary transition-colors">
                                            <RefreshCw className="w-2.5 h-2.5" /> refresh
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Chat tab */}
                        {tab === 'chat' && (
                            <div className="flex flex-col" style={{ height: 440 }}>
                                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                    {chatMessages.length === 0 ? (
                                        <div className="flex flex-col items-center py-10 text-center">
                                            <Bot className="w-6 h-6 text-white/20 mb-2" />
                                            <p className="text-xs text-white/30">Ask anything about the meeting</p>
                                            <p className="text-[10px] text-white/20 mt-1">I'll also alert you to any tasks or deadlines mentioned</p>
                                        </div>
                                    ) : chatMessages.map((msg, i) => (
                                        <div key={i} className={`rounded-lg text-xs ${msg.role === 'user' ? 'bg-primary/20 border border-primary/30 ml-8 px-2.5 py-1.5' : 'bg-white/5 border border-white/10 mr-2 px-2.5 py-1.5'}`}>
                                            <p className="text-[10px] text-white/30 mb-0.5">{msg.role === 'user' ? 'You' : '✨ Gemini'}</p>
                                            {msg.role === 'assistant' && msg.content === '' && isSending && i === chatMessages.length - 1 ? (
                                                <div className="flex items-center gap-1 py-0.5">{[0, 1, 2].map(j => <span key={j} className="w-1 h-1 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${j * 150}ms` }} />)}</div>
                                            ) : msg.role === 'assistant' ? renderMd(msg.content) : <p className="text-white/75 leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                                            {msg.events && msg.events.length > 0 && (
                                                <div className="mt-2 space-y-1.5">
                                                    {msg.events.map((ev, ei) => (
                                                        <div key={ei} className={`rounded-lg px-2.5 py-2 border ${ev.isCurrentUser ? 'bg-primary/15 border-primary/30' : 'bg-white/5 border-white/10'}`}>
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <p className="text-white/80 text-[11px] font-medium leading-tight">{ev.task}</p>
                                                                    <p className="text-white/40 text-[10px] mt-0.5">{ev.person}{ev.deadline ? ` · ${ev.deadline}` : ''}</p>
                                                                </div>
                                                                {ev.isCurrentUser && (
                                                                    <a href={calendarUrl(ev, title)} target="_blank" rel="noreferrer"
                                                                        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md bg-primary/80 hover:bg-primary text-white text-[10px] font-medium transition-colors whitespace-nowrap">
                                                                        📅 Add
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                                <div className="p-3 border-t border-white/10 flex gap-1.5">
                                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                        placeholder="Ask about the meeting…"
                                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50" />
                                    <button onClick={sendMessage} disabled={!chatInput.trim() || isSending} className="px-2.5 py-1.5 rounded-lg bg-primary/80 hover:bg-primary text-white transition-colors disabled:opacity-40">
                                        {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default function OverlayPage() {
    return <Suspense fallback={<div style={{ background: 'transparent' }} />}><OverlayContent /></Suspense>
}
