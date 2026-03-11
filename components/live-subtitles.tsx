'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Subtitles, MicOff, Mic, ChevronDown, Globe, Star } from 'lucide-react'

const LANGUAGES = [
    { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
    { code: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
    { code: 'hi-IN', label: 'Hindi', flag: '🇮🇳' },
    { code: 'mr-IN', label: 'Marathi', flag: '🇮🇳' },
    { code: 'gu-IN', label: 'Gujarati', flag: '🇮🇳' },
    { code: 'ta-IN', label: 'Tamil', flag: '🇮🇳' },
    { code: 'te-IN', label: 'Telugu', flag: '🇮🇳' },
    { code: 'bn-IN', label: 'Bengali', flag: '🇮🇳' },
    { code: 'fr-FR', label: 'French', flag: '🇫🇷' },
    { code: 'de-DE', label: 'German', flag: '🇩🇪' },
    { code: 'es-ES', label: 'Spanish', flag: '🇪🇸' },
    { code: 'zh-CN', label: 'Chinese (Simplified)', flag: '🇨🇳' },
    { code: 'ja-JP', label: 'Japanese', flag: '🇯🇵' },
    { code: 'ar-SA', label: 'Arabic', flag: '🇸🇦' },
]

const LS_LANG_KEY = 'dejavue_subtitle_lang'

interface LiveSubtitlesProps {
    mode?: 'bar' | 'card'
}

export function LiveSubtitles({ mode = 'bar' }: LiveSubtitlesProps) {
    // Load saved default from localStorage (fallback to en-US)
    const [lang, setLang] = useState<string>('en-US')
    const [defaultLang, setDefaultLang] = useState<string>('en-US')
    const [isListening, setIsListening] = useState(false)
    const [interim, setInterim] = useState('')
    const [final, setFinal] = useState('')
    const [showLangMenu, setShowLangMenu] = useState(false)
    const [supported, setSupported] = useState(true)
    const [savedToast, setSavedToast] = useState(false)

    const recognitionRef = useRef<any>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // Load saved default on mount
    useEffect(() => {
        const saved = localStorage.getItem(LS_LANG_KEY)
        if (saved) {
            setLang(saved)
            setDefaultLang(saved)
        }
    }, [])

    // Close menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowLangMenu(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const saveAsDefault = useCallback((code: string) => {
        localStorage.setItem(LS_LANG_KEY, code)
        setDefaultLang(code)
        setSavedToast(true)
        setTimeout(() => setSavedToast(false), 2000)
    }, [])

    const startRecognition = useCallback((langCode: string) => {
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

        if (!SpeechRecognition) { setSupported(false); return }

        const rec = new SpeechRecognition()
        rec.continuous = true
        rec.interimResults = true
        rec.lang = langCode
        rec.maxAlternatives = 1

        rec.onresult = (event: any) => {
            let interimText = ''
            let finalText = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript
                if (event.results[i].isFinal) finalText += t + ' '
                else interimText += t
            }
            if (finalText) {
                setFinal(prev => {
                    const u = (prev + ' ' + finalText).trim()
                    return u.length > 300 ? u.slice(-300) : u
                })
            }
            setInterim(interimText)
        }

        rec.onerror = (e: any) => {
            if (e.error === 'not-allowed') { setSupported(false); setIsListening(false) }
        }

        // Auto-restart on end
        rec.onend = () => {
            if (recognitionRef.current === rec) {
                try { rec.start() } catch (_) { }
            }
        }

        recognitionRef.current = rec
        rec.start()
        setIsListening(true)
    }, [])

    const stopRecognition = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.onend = null
            recognitionRef.current.stop()
            recognitionRef.current = null
        }
        setIsListening(false)
        setInterim('')
    }, [])

    const toggleListening = () => {
        isListening ? stopRecognition() : startRecognition(lang)
    }

    // Restart with new language if already listening
    const changeLang = (code: string) => {
        setLang(code)
        setShowLangMenu(false)
        if (isListening) {
            stopRecognition()
            setTimeout(() => startRecognition(code), 100)
        }
    }

    // Auto-start for bar mode on the live meeting page
    useEffect(() => {
        if (mode === 'bar') {
            // Small delay to let the component fully mount and browser permissions settle
            const t = setTimeout(() => startRecognition(lang), 800)
            return () => clearTimeout(t)
        }
    }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => () => stopRecognition(), [stopRecognition])

    if (!supported) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
                <Subtitles className="w-4 h-4 shrink-0" />
                Live subtitles not supported. Please use Chrome or Edge.
            </div>
        )
    }

    const currentLang = LANGUAGES.find(l => l.code === lang)
    const isDefault = lang === defaultLang

    /* ── Language dropdown (shared) ──────────────────────────── */
    const LangMenu = () => (
        <div className="relative" ref={menuRef}>
            <Button
                size="sm"
                variant="outline"
                onClick={() => setShowLangMenu(v => !v)}
                className="gap-1 border-border/50 bg-transparent text-foreground hover:bg-secondary text-xs h-7"
            >
                <Globe className="w-3 h-3" />
                <span>{currentLang?.flag} {currentLang?.label ?? lang}</span>
                {isDefault && (
                    <Star className="w-2.5 h-2.5 fill-primary text-primary" />
                )}
                <ChevronDown className="w-3 h-3" />
            </Button>

            {showLangMenu && (
                <div className="absolute right-0 bottom-full mb-1 z-50 w-56 rounded-lg border border-border/50 bg-card shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                            Meeting Language
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                            <Star className="w-2.5 h-2.5 inline fill-primary text-primary" /> = default
                        </span>
                    </div>

                    <div className="overflow-auto max-h-56">
                        {LANGUAGES.map(l => (
                            <div
                                key={l.code}
                                className={`flex items-center justify-between px-3 py-2 hover:bg-secondary cursor-pointer group transition-colors ${lang === l.code ? 'bg-primary/10' : ''
                                    }`}
                                onClick={() => changeLang(l.code)}
                            >
                                <span className={`text-xs ${lang === l.code ? 'text-primary font-medium' : 'text-foreground'}`}>
                                    {l.flag} {l.label}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    {defaultLang === l.code && (
                                        <Star className="w-3 h-3 fill-primary text-primary" />
                                    )}
                                    {/* Set as default button — shows on hover or if current */}
                                    {defaultLang !== l.code && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); saveAsDefault(l.code); changeLang(l.code) }}
                                            className="text-[9px] text-muted-foreground/0 group-hover:text-muted-foreground/70 hover:!text-primary transition-colors whitespace-nowrap"
                                        >
                                            set default
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer — save current as default */}
                    {!isDefault && (
                        <div className="px-3 py-2 border-t border-border/40">
                            <button
                                onClick={() => { saveAsDefault(lang); setShowLangMenu(false) }}
                                className="w-full text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
                            >
                                <Star className="w-3 h-3" />
                                Save "{currentLang?.label}" as my default
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )

    /* ── Saved toast ─────────────────────────────────────────── */
    const Toast = () => savedToast ? (
        <span className="text-[10px] text-primary animate-pulse ml-1">
            ✓ Saved as default
        </span>
    ) : null

    /* ── BAR MODE ────────────────────────────────────────────── */
    if (mode === 'bar') {
        return (
            <div className="relative w-full">
                <div className="flex items-center gap-2 mb-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={toggleListening}
                        className={`gap-1.5 border-border/50 text-xs h-7 ${isListening
                            ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                            : 'bg-transparent text-foreground hover:bg-secondary'
                            }`}
                    >
                        {isListening ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                        {isListening ? 'Live' : 'Start Subtitles'}
                    </Button>

                    {isListening && (
                        <div className="flex items-center gap-1">
                            {[0, 1, 2].map(i => (
                                <span
                                    key={i}
                                    className="w-1 h-3 bg-primary rounded-full animate-pulse"
                                    style={{ animationDelay: `${i * 150}ms` }}
                                />
                            ))}
                        </div>
                    )}

                    <div className="ml-auto flex items-center gap-1">
                        <Toast />
                        <LangMenu />
                    </div>
                </div>

                <div className={`min-h-[48px] rounded-lg px-4 py-3 text-sm leading-relaxed transition-all ${isListening
                    ? 'bg-black/40 border border-primary/20'
                    : 'bg-secondary/20 border border-border/30'
                    }`}>
                    {isListening ? (
                        <span>
                            <span className="text-foreground/90">{final}</span>
                            {interim && <span className="text-muted-foreground italic"> {interim}</span>}
                            {!final && !interim && (
                                <span className="text-muted-foreground/50 text-xs">Listening… start speaking</span>
                            )}
                        </span>
                    ) : (
                        <span className="text-muted-foreground/50 text-xs">
                            Click "Start Subtitles" to enable real-time captions
                        </span>
                    )}
                </div>

                {final && (
                    <button
                        onClick={() => setFinal('')}
                        className="absolute top-0 right-0 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                        clear
                    </button>
                )}
            </div>
        )
    }

    /* ── CARD MODE ───────────────────────────────────────────── */
    return (
        <div className="p-4 rounded-lg border border-border/50 bg-card">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Subtitles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Live Subtitles</span>
                    {isListening && (
                        <Badge className="bg-primary/10 text-primary border-0 text-xs">LIVE</Badge>
                    )}
                    <Toast />
                </div>
                <div className="flex items-center gap-2">
                    <LangMenu />
                    <Button
                        size="sm"
                        onClick={toggleListening}
                        className={`gap-1 h-7 text-xs ${isListening
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                            }`}
                    >
                        {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                        {isListening ? 'Stop' : 'Start'}
                    </Button>
                </div>
            </div>

            <div className={`rounded-lg px-4 py-3 min-h-[80px] text-sm leading-relaxed ${isListening ? 'bg-black/30 border border-primary/20' : 'bg-secondary/20'
                }`}>
                {isListening ? (
                    <>
                        <span className="text-foreground/90">{final}</span>
                        {interim && <span className="text-muted-foreground italic"> {interim}</span>}
                        {!final && !interim && (
                            <span className="text-muted-foreground/50 text-xs">Listening… speak now</span>
                        )}
                    </>
                ) : (
                    <span className="text-muted-foreground/50 text-xs">
                        Press Start to begin real-time captioning
                    </span>
                )}
            </div>
        </div>
    )
}
