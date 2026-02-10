'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Bell, Lock, Palette, Download } from 'lucide-react'

function SettingsContent() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<string>('dark')

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
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

  return (
    <SettingsPageContent theme={theme} setTheme={handleThemeChange} mounted={mounted} />
  )
}

function SettingsPageContent({ theme, setTheme, mounted }: { theme: string; setTheme: (theme: any) => void; mounted: boolean }) {
  return (
    <div className="h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="ml-20 h-full overflow-auto">
        {/* Header */}
        <header className="border-b border-border/50 p-6">
          <h1 className="text-3xl font-bold text-foreground mb-1">Settings</h1>
          <p className="text-muted-foreground">Manage your Dejavue preferences and account settings</p>
        </header>

        {/* Settings Content */}
        <main className="p-6 max-w-2xl mx-auto">
          <div className="space-y-6">
            {/* Account Settings */}
            <Card className="p-6 border-border/50">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Account Settings
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email" className="text-foreground mb-2">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value="user@example.com"
                      disabled
                      className="bg-secondary border-border/50 text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name" className="text-foreground mb-2">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      defaultValue="John Doe"
                      className="bg-secondary border-border/50 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                  Save Changes
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
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <div>
                    <p className="font-medium text-foreground">Auto-detect Google Meet</p>
                    <p className="text-xs text-muted-foreground">Automatically start recording Google Meet meetings</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <div>
                    <p className="font-medium text-foreground">Auto-enable Transcription</p>
                    <p className="text-xs text-muted-foreground">Automatically enable live transcription on detected meetings</p>
                  </div>
                  <Switch defaultChecked />
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
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <div>
                    <p className="font-medium text-foreground">Meeting Ended</p>
                    <p className="text-xs text-muted-foreground">Notify when meeting ends and summary is ready</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <div>
                    <p className="font-medium text-foreground">Action Items</p>
                    <p className="text-xs text-muted-foreground">Daily digest of pending action items from your meetings</p>
                  </div>
                  <Switch />
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
                      <Button
                        onClick={() => setTheme('dark')}
                        className={`${theme === 'dark'
                            ? 'bg-primary text-primary-foreground'
                            : 'border-border/50 text-foreground hover:bg-secondary bg-transparent'
                          }`}
                        variant={theme === 'dark' ? 'default' : 'outline'}
                      >
                        Dark
                      </Button>
                      <Button
                        onClick={() => setTheme('light')}
                        className={`${theme === 'light'
                            ? 'bg-primary text-primary-foreground'
                            : 'border-border/50 text-foreground hover:bg-secondary bg-transparent'
                          }`}
                        variant={theme === 'light' ? 'default' : 'outline'}
                      >
                        Light
                      </Button>
                      <Button
                        onClick={() => setTheme('auto')}
                        className={`${theme === 'auto'
                            ? 'bg-primary text-primary-foreground'
                            : 'border-border/50 text-foreground hover:bg-secondary bg-transparent'
                          }`}
                        variant={theme === 'auto' ? 'default' : 'outline'}
                      >
                        Auto
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Data & Privacy */}
            <Card className="p-6 border-border/50">
              <h2 className="text-lg font-semibold text-foreground mb-4">Data & Privacy</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <div>
                    <p className="font-medium text-foreground">Keep Transcripts</p>
                    <p className="text-xs text-muted-foreground">Store transcripts for 30 days then delete</p>
                  </div>
                  <Switch defaultChecked />
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
                  Delete All Recordings
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
