'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Video, Eye, Settings } from 'lucide-react'
import { useMeetingDetection, DetectedMeeting } from '@/hooks/use-meeting-detection'

const platformConfig = {
  zoom: {
    icon: '🎥',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    label: 'Zoom',
  },
  'google-meet': {
    icon: '📹',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    label: 'Google Meet',
  },
}

export function MeetingDetector() {
  const { meetings, isMonitoring, isElectron, startMonitoring, stopMonitoring } = useMeetingDetection()

  return (
    <Card className="p-6 border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Meeting Detector</h3>
          <p className="text-sm text-muted-foreground">
            {!isElectron
              ? 'Run in Electron for auto-detection'
              : isMonitoring
                ? 'Monitoring your meetings'
                : 'Not monitoring'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`}
          />
        </div>
      </div>

      {/* Status Toggle */}
      <div className="p-3 rounded-lg bg-secondary/50 border border-border/30 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground">Auto-Detection</span>
          </div>
          <button
            onClick={() => isMonitoring ? stopMonitoring() : startMonitoring()}
            disabled={!isElectron}
            className={`relative w-10 h-6 rounded-full transition-colors ${isMonitoring ? 'bg-primary' : 'bg-muted'
              } ${!isElectron ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isMonitoring ? 'right-1' : 'left-1'
                }`}
            />
          </button>
        </div>
      </div>

      {/* Detected Meetings */}
      <div className="space-y-3 mb-4">
        {meetings.length > 0 ? (
          meetings.map((meeting: DetectedMeeting) => {
            const platform = platformConfig[meeting.platform]
            return (
              <div key={meeting.id} className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{platform.icon}</span>
                      <Badge className={`${platform.color} border text-xs`}>{platform.label}</Badge>
                      {meeting.status === 'active' && (
                        <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">ACTIVE</Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground">{meeting.title}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  <div>⏱️ Detected {new Date(meeting.detectedAt).toLocaleTimeString()}</div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            <p className="text-sm mb-2">No active meetings detected</p>
            <p className="text-xs">
              {isElectron
                ? 'Dejavue is monitoring for Zoom and Google Meet'
                : 'Run the app in Electron for meeting detection'}
            </p>
          </div>
        )}
      </div>

      {/* Settings */}
      <Button
        variant="ghost"
        className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-secondary mt-3"
      >
        <Settings className="w-4 h-4" />
        Detection Settings
      </Button>
    </Card>
  )
}
