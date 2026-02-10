'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/sidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PermissionPrompt, PermissionDeniedPopup } from '@/components/permission-prompt'
import { Video, MessageSquare, BarChart3, Settings, Clock, Users, Play, Eye } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [showDetecting, setShowDetecting] = useState(false)

  // Permission state
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)
  const [showDeniedPopup, setShowDeniedPopup] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)
  const [isElectron, setIsElectron] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/auth/login')
    } else {
      const userData = JSON.parse(user)
      setUserName(userData.name || userData.email)
    }
  }, [router])

  // Check permissions on mount (after login/signup redirect)
  useEffect(() => {
    const hasElectron = typeof window !== 'undefined' && !!window.electronAPI
    setIsElectron(hasElectron)

    if (!hasElectron) return

    window.electronAPI!.checkPermissions().then((status: { granted: boolean | null; needsPrompt: boolean }) => {
      if (status.needsPrompt) {
        // Never asked or expired — show permission prompt
        setShowPermissionPrompt(true)
        setPermissionGranted(null)
      } else {
        setPermissionGranted(status.granted)
      }
    })
  }, [])

  // Handle permission grant
  const handleGrant = async () => {
    if (window.electronAPI) {
      await window.electronAPI.grantPermissions()
    }
    setPermissionGranted(true)
    setShowPermissionPrompt(false)
    setShowDeniedPopup(false)
  }

  // Handle permission deny
  const handleDeny = async () => {
    if (window.electronAPI) {
      await window.electronAPI.denyPermissions()
    }
    setPermissionGranted(false)
    setShowPermissionPrompt(false)
  }

  // Handle "New Meeting" click
  const handleNewMeeting = async () => {
    if (!isElectron) {
      // Browser mode: just show detecting overlay
      setShowDetecting(true)
      return
    }

    // Check permission state
    if (permissionGranted === false) {
      // Previously denied — ask again
      setShowDeniedPopup(true)
      return
    }

    if (permissionGranted === null) {
      // Never asked or expired
      setShowPermissionPrompt(true)
      return
    }

    // Permission granted — restart monitoring and show detecting overlay
    setShowDetecting(true)
    if (window.electronAPI) {
      await window.electronAPI.restartMonitoring()
    }
  }

  // Handle retry from denied popup
  const handleRetryPermission = async () => {
    await handleGrant()
    setShowDetecting(true)
    if (window.electronAPI) {
      await window.electronAPI.restartMonitoring()
    }
  }

  return (
    <div className="h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="ml-20 h-full overflow-auto">
        {/* Header */}
        <header className="border-b border-border/50 p-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Welcome back, {userName}!</h1>
            <p className="text-muted-foreground">What would you like to do?</p>
          </div>
        </header>

        {/* Main Content Area - Zoom Style Layout */}
        <main className="p-8">
          <div className="max-w-6xl mx-auto">
            {/* Grid Layout: 4 buttons on left, insights on right */}
            <div className="grid grid-cols-3 gap-8">
              {/* Left side - 4 main action buttons in 2x2 grid */}
              <div className="col-span-2">
                <div className="grid grid-cols-2 gap-6">
                  {/* New Meeting */}
                  <div onClick={handleNewMeeting}>
                    <Card className="p-8 border-border/50 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer h-full">
                      <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center hover:bg-red-500/20 transition-colors">
                          <Play className="w-10 h-10 text-red-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground">New Meeting</h3>
                        <p className="text-sm text-muted-foreground">Start a Zoom or Google Meet meeting and the app will auto-detect it</p>
                      </div>
                    </Card>
                  </div>

                  {/* View Meetings */}
                  <Link href="/dashboard/meetings">
                    <Card className="p-8 border-border/50 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer h-full">
                      <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center hover:bg-blue-500/20 transition-colors">
                          <Video className="w-10 h-10 text-blue-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground">View Meetings</h3>
                        <p className="text-sm text-muted-foreground">Access recorded meetings and transcripts</p>
                      </div>
                    </Card>
                  </Link>

                  {/* Chat with AI */}
                  <Link href="/dashboard/chat">
                    <Card className="p-8 border-border/50 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer h-full">
                      <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center hover:bg-purple-500/20 transition-colors">
                          <MessageSquare className="w-10 h-10 text-purple-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground">Chat with AI</h3>
                        <p className="text-sm text-muted-foreground">Ask questions about your meetings</p>
                      </div>
                    </Card>
                  </Link>

                  {/* Analytics */}
                  <Link href="/dashboard/analytics">
                    <Card className="p-8 border-border/50 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer h-full">
                      <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center hover:bg-green-500/20 transition-colors">
                          <BarChart3 className="w-10 h-10 text-green-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground">Analytics</h3>
                        <p className="text-sm text-muted-foreground">View insights and meeting statistics</p>
                      </div>
                    </Card>
                  </Link>
                </div>
              </div>

              {/* Right side - Insights */}
              <div className="col-span-1 space-y-6">
                {/* Quick Stats */}
                <Card className="p-6 border-border/50">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    Today&apos;s Insights
                  </h3>
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">Meetings Today</p>
                      <p className="text-2xl font-bold text-foreground">3</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Total Duration
                      </p>
                      <p className="text-2xl font-bold text-foreground">4h 50m</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Total Participants
                      </p>
                      <p className="text-2xl font-bold text-foreground">25</p>
                    </div>
                  </div>
                </Card>

                {/* Recent Activity */}
                <Card className="p-6 border-border/50">
                  <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="pb-3 border-b border-border/30">
                      <p className="text-xs text-muted-foreground">Product Planning Sprint</p>
                      <p className="text-sm text-foreground">Today 2:30 PM</p>
                    </div>
                    <div className="pb-3 border-b border-border/30">
                      <p className="text-xs text-muted-foreground">Engineering Standup</p>
                      <p className="text-sm text-foreground">Today 10:00 AM</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Client Presentation</p>
                      <p className="text-sm text-foreground">Tomorrow 1:00 PM</p>
                    </div>
                  </div>
                </Card>

                {/* Quick Tip */}
                <Card className="p-4 border-primary/30 bg-primary/5">
                  <p className="text-xs text-muted-foreground">
                    💡 Integrate with Zoom and Google Meet for automatic meeting detection in your account settings.
                  </p>
                </Card>

                {/* Settings Link */}
                <Link href="/dashboard/settings">
                  <Button variant="outline" className="w-full gap-2 border-border/50 text-foreground hover:bg-secondary bg-transparent">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Permission Prompt — shown on first visit or after 7-day expiry */}
      {showPermissionPrompt && (
        <PermissionPrompt onGrant={handleGrant} onDeny={handleDeny} />
      )}

      {/* Permission Denied Popup — shown when clicking New Meeting with denied permissions */}
      {showDeniedPopup && (
        <PermissionDeniedPopup
          onClose={() => setShowDeniedPopup(false)}
          onRetry={handleRetryPermission}
        />
      )}

      {/* Detecting Meeting Overlay */}
      {showDetecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-3">Detecting Online Meeting</h2>
            <p className="text-white/70 mb-8 max-w-sm">On detection, a new AI chatbot window will be opened automatically.</p>
            <button
              onClick={() => setShowDetecting(false)}
              className="px-8 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
