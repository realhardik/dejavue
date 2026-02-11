'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Bell, Lock, Palette, Download, User, Check } from 'lucide-react'

interface UserData {
  id: string
  name: string
  email: string
}

interface Preferences {
  detectZoom: boolean
  detectGoogleMeet: boolean
  autoTranscription: boolean
  notifyMeetingStarted: boolean
  notifyMeetingEnded: boolean
  notifyActionItems: boolean
  keepTranscripts: boolean
}

const DEFAULT_PREFS: Preferences = {
  detectZoom: true,
  detectGoogleMeet: true,
  autoTranscription: true,
  notifyMeetingStarted: true,
  notifyMeetingEnded: true,
  notifyActionItems: false,
  keepTranscripts: true,
}

function loadPreferences(): Preferences {
  try {
    const saved = localStorage.getItem('dejavue_preferences')
    if (saved) return { ...DEFAULT_PREFS, ...JSON.parse(saved) }
  } catch { }
  return { ...DEFAULT_PREFS }
}

function savePreferences(prefs: Preferences) {
  localStorage.setItem('dejavue_preferences', JSON.stringify(prefs))
}

function SettingsContent() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<string>('dark')
  const [user, setUser] = useState<UserData | null>(null)
  const [editName, setEditName] = useState('')
  const [nameSaved, setNameSaved] = useState(false)
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)

    // Load user
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsed = JSON.parse(userData)
      setUser(parsed)
      setEditName(parsed.name || '')
    }

    // Load preferences
    setPrefs(loadPreferences())
  }, [])

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)

    const html = document.documentElement
    if (newTheme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      html.classList.toggle('dark', prefersDark)
      html.classList.toggle('light', !prefersDark)
    } else {
      html.classList.toggle('dark', newTheme === 'dark')
      html.classList.toggle('light', newTheme === 'light')
    }
  }

  const handlePrefChange = useCallback((key: keyof Preferences, value: boolean) => {
    setPrefs(prev => {
      const updated = { ...prev, [key]: value }
      savePreferences(updated)
      return updated
    })
  }, [])

  const handleSaveName = () => {
    if (!user || !editName.trim()) return
    const updated = { ...user, name: editName.trim() }
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  return (
    <div className="h-screen bg-background">
      <Sidebar />
      <div className="ml-20 h-full overflow-auto">
        <header className="border-b border-border/50 p-6">
          <h1 className="text-3xl font-bold text-foreground mb-1">Settings</h1>
          <p className="text-muted-foreground">Manage your Dejavue preferences and account settings</p>
        </header>

        <main className="p-6 max-w-2xl mx-auto">
          <div className="space-y-6">
            {/* Account Settings */}
            <Card className="p-6 border-border/50">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Account
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email" className="text-foreground mb-2">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-secondary border-border/50 text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name" className="text-foreground mb-2">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-secondary border-border/50 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveName}
                  disabled={!editName.trim() || editName === user?.name}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {nameSaved ? <><Check className="w-4 h-4" /> Saved</> : 'Save Changes'}
                </Button>
              </div>
            </Card>

            {/* Meeting Detection */}
            <Card className="p-6 border-border/50">
              <h2 className="text-lg font-semibold text-foreground mb-4">Meeting Detection</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <div>
                    <p className="font-medium text-foreground">Auto-detect Zoom Meetings</p>
                    <p className="text-xs text-muted-foreground">Automatically start recording Zoom meetings</p>
                  </div>
                  <Switch checked={prefs.detectZoom} onCheckedChange={(v) => handlePrefChange('detectZoom', v)} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <div>
                    <p className="font-medium text-foreground">Auto-detect Google Meet</p>
                    <p className="text-xs text-muted-foreground">Automatically start recording Google Meet meetings</p>
                  </div>
                  <Switch checked={prefs.detectGoogleMeet} onCheckedChange={(v) => handlePrefChange('detectGoogleMeet', v)} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <div>
                    <p className="font-medium text-foreground">Auto-enable Transcription</p>
                    <p className="text-xs text-muted-foreground">Automatically enable live transcription on detected meetings</p>
                  </div>
                  <Switch checked={prefs.autoTranscription} onCheckedChange={(v) => handlePrefChange('autoTranscription', v)} />
                </div>
              </div>
            </Card>

            {/* Notifications */}
            <Card className="p-6 border-border/50">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <div>
                    <p className="font-medium text-foreground">Meeting Started</p>
                    <p className="text-xs text-muted-foreground">Notify when a new meeting is detected and recording begins</p>
                  </div>
                  <Switch checked={prefs.notifyMeetingStarted} onCheckedChange={(v) => handlePrefChange('notifyMeetingStarted', v)} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <div>
                    <p className="font-medium text-foreground">Meeting Ended</p>
                    <p className="text-xs text-muted-foreground">Notify when meeting ends and summary is ready</p>
                  </div>
                  <Switch checked={prefs.notifyMeetingEnded} onCheckedChange={(v) => handlePrefChange('notifyMeetingEnded', v)} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <div>
                    <p className="font-medium text-foreground">Action Items</p>
                    <p className="text-xs text-muted-foreground">Daily digest of pending action items from your meetings</p>
                  </div>
                  <Switch checked={prefs.notifyActionItems} onCheckedChange={(v) => handlePrefChange('notifyActionItems', v)} />
                </div>
              </div>
            </Card>

            {/* Display Settings */}
            <Card className="p-6 border-border/50">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Display
              </h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-foreground mb-2">Theme</Label>
                  {mounted && (
                    <div className="flex gap-2">
                      {(['dark', 'light', 'auto'] as const).map((t) => (
                        <Button
                          key={t}
                          onClick={() => handleThemeChange(t)}
                          variant={theme === t ? 'default' : 'outline'}
                          className={theme === t
                            ? 'bg-primary text-primary-foreground'
                            : 'border-border/50 text-foreground hover:bg-secondary bg-transparent'
                          }
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Data & Privacy */}
            <Card className="p-6 border-border/50">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Data & Privacy
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <div>
                    <p className="font-medium text-foreground">Keep Transcripts</p>
                    <p className="text-xs text-muted-foreground">Store transcripts for 30 days then delete</p>
                  </div>
                  <Switch checked={prefs.keepTranscripts} onCheckedChange={(v) => handlePrefChange('keepTranscripts', v)} />
                </div>
                <Button variant="outline" className="w-full gap-2 border-border/50 text-foreground hover:bg-secondary bg-transparent">
                  <Download className="w-4 h-4" />
                  Export My Data
                </Button>
              </div>
            </Card>

            {/* Danger Zone */}
            <Card className="p-6 border-destructive/30 bg-destructive/5">
              <h2 className="text-lg font-semibold text-destructive mb-4">Danger Zone</h2>
              <div className="space-y-2">
                <Button
                  variant="destructive"
                  className="w-full gap-2 bg-destructive/20 text-destructive hover:bg-destructive/30 border-0"
                >
                  Delete All Meetings
                </Button>
                <Button
                  variant="destructive"
                  className="w-full gap-2 bg-destructive/20 text-destructive hover:bg-destructive/30 border-0"
                >
                  Delete Account
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

export default SettingsContent
