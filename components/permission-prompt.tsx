'use client'

import { Shield, X } from 'lucide-react'

interface PermissionPromptProps {
    onGrant: () => void
    onDeny: () => void
}

export function PermissionPrompt({ onGrant, onDeny }: PermissionPromptProps) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-card border border-border/50 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                {/* Icon */}
                <div className="flex justify-center mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-foreground text-center mb-2">
                    Enable Meeting Detection
                </h2>

                {/* Description */}
                <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
                    Dejavue needs permission to detect active Zoom and Google Meet meetings on your device.
                    This allows the app to automatically open an AI assistant when you join a meeting.
                </p>

                {/* What we access */}
                <div className="bg-secondary/50 rounded-lg p-4 mb-6 border border-border/30">
                    <p className="text-xs font-medium text-foreground mb-2">What we access:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Running applications (to detect Zoom)</li>
                        <li>• Browser tab titles (to detect Google Meet)</li>
                        <li>• 🎙️ Microphone (for meeting recording & transcription)</li>
                    </ul>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onDeny}
                        className="flex-1 px-4 py-2.5 rounded-lg border border-border/50 text-foreground text-sm font-medium hover:bg-secondary transition-colors"
                    >
                        Not Now
                    </button>
                    <button
                        onClick={onGrant}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        Allow Detection
                    </button>
                </div>

                <p className="text-xs text-muted-foreground/60 text-center mt-4">
                    You can change this anytime in Settings. We'll ask again in 7 days.
                </p>
            </div>
        </div>
    )
}

export function PermissionDeniedPopup({ onClose, onRetry }: { onClose: () => void; onRetry: () => void }) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-card border border-border/50 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                </button>
                <div className="flex justify-center mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center">
                        <Shield className="w-8 h-8 text-destructive" />
                    </div>
                </div>
                <h2 className="text-xl font-bold text-foreground text-center mb-2">
                    Permissions Required
                </h2>
                <p className="text-sm text-muted-foreground text-center mb-6">
                    You need to provide permissions to use the meeting detection feature. Would you like to enable it now?
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-lg border border-border/50 text-foreground text-sm font-medium hover:bg-secondary transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onRetry}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        Grant Permission
                    </button>
                </div>
            </div>
        </div>
    )
}
