'use client'

import { useState, useEffect, useCallback } from 'react'

export interface DetectedMeeting {
    id: string
    platform: 'zoom' | 'google-meet'
    title: string
    status: 'active' | 'detected'
    detectedAt: string
}

interface PermissionStatus {
    granted: boolean | null
    needsPrompt: boolean
}

interface ElectronAPI {
    getMeetings: () => Promise<DetectedMeeting[]>
    onMeetingsUpdate: (callback: (meetings: DetectedMeeting[]) => void) => () => void
    onMeetingEnded: (callback: () => void) => () => void
    startMonitoring: () => Promise<boolean>
    stopMonitoring: () => Promise<boolean>
    restartMonitoring: () => Promise<boolean>
    getMonitoringStatus: () => Promise<boolean>
    checkPermissions: () => Promise<PermissionStatus>
    grantPermissions: () => Promise<boolean>
    denyPermissions: () => Promise<boolean>
    resetPermissions: () => Promise<boolean>
    // Audio recording + local Whisper transcription
    transcribeAudio: (meetingId: string, chunkIndex: number, buffer: ArrayBuffer) => Promise<{ success: boolean; text: string; error?: string }>
    getRecordingsPath: () => Promise<string>
    // Save summary
    saveSummary: (meetingId: string, summaryText: string, meetingTitle: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
    // Desktop capturer
    getDesktopSources: () => Promise<{ id: string; name: string }[]>
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI
    }
}

export function useMeetingDetection() {
    const [meetings, setMeetings] = useState<DetectedMeeting[]>([])
    const [isMonitoring, setIsMonitoring] = useState(false)
    const [isElectron, setIsElectron] = useState(false)
    const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({ granted: null, needsPrompt: false })

    useEffect(() => {
        const hasElectron = typeof window !== 'undefined' && !!window.electronAPI
        setIsElectron(hasElectron)

        if (!hasElectron) return

        // Get initial state
        window.electronAPI!.getMeetings().then(setMeetings)
        window.electronAPI!.getMonitoringStatus().then(setIsMonitoring)
        window.electronAPI!.checkPermissions().then(setPermissionStatus)

        // Listen for updates
        const cleanup = window.electronAPI!.onMeetingsUpdate((newMeetings) => {
            setMeetings(newMeetings)
        })

        return cleanup
    }, [])

    const startMonitoring = useCallback(async () => {
        if (!window.electronAPI) return
        await window.electronAPI.startMonitoring()
        setIsMonitoring(true)
    }, [])

    const stopMonitoring = useCallback(async () => {
        if (!window.electronAPI) return
        await window.electronAPI.stopMonitoring()
        setIsMonitoring(false)
    }, [])

    const restartMonitoring = useCallback(async () => {
        if (!window.electronAPI) return
        await window.electronAPI.restartMonitoring()
        setIsMonitoring(true)
    }, [])

    const grantPermissions = useCallback(async () => {
        if (!window.electronAPI) return
        await window.electronAPI.grantPermissions()
        setPermissionStatus({ granted: true, needsPrompt: false })
        setIsMonitoring(true)
    }, [])

    const denyPermissions = useCallback(async () => {
        if (!window.electronAPI) return
        await window.electronAPI.denyPermissions()
        setPermissionStatus({ granted: false, needsPrompt: false })
        setIsMonitoring(false)
    }, [])

    const recheckPermissions = useCallback(async () => {
        if (!window.electronAPI) return
        const status = await window.electronAPI.checkPermissions()
        setPermissionStatus(status)
        return status
    }, [])

    return {
        meetings,
        isMonitoring,
        isElectron,
        permissionStatus,
        startMonitoring,
        stopMonitoring,
        restartMonitoring,
        grantPermissions,
        denyPermissions,
        recheckPermissions,
    }
}
