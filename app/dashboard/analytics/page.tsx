'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Users, Clock, Zap, Loader2 } from 'lucide-react'

interface AnalyticsData {
  totalMeetings: number
  totalHours: number
  avgDurationMin: number
  meetingsPerDay: number
  todayCount: number
  todayDuration: string
  thisWeekCount: number
  weeklyChart: { name: string; meetings: number; duration: number }[]
  platformChart: { name: string; value: number; fill: string }[]
  recentActivity: { title: string; date: string; time: string; duration: string; platform: string }[]
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const user = localStorage.getItem('user')
    const userId = user ? JSON.parse(user).id : null

    fetch(`/api/analytics${userId ? `?userId=${userId}` : ''}`)
      .then(res => res.json())
      .then(result => {
        setData(result)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="h-screen bg-background">
        <Sidebar />
        <div className="ml-20 h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    )
  }

  const chartData = data?.weeklyChart || []
  const platformData = data?.platformChart || []

  return (
    <div className="h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="ml-20 h-full overflow-auto">
        {/* Header */}
        <header className="border-b border-border/50 p-6">
          <h1 className="text-3xl font-bold text-foreground mb-1">Analytics</h1>
          <p className="text-muted-foreground">Meeting insights and statistics</p>
        </header>

        {/* Content */}
        <main className="p-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-6 border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Meetings</p>
                  <p className="text-3xl font-bold text-foreground">{data?.totalMeetings || 0}</p>
                  <Badge className="mt-2 bg-green-500/20 text-green-400 border-0 text-xs">
                    {data?.thisWeekCount || 0} this week
                  </Badge>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Hours</p>
                  <p className="text-3xl font-bold text-foreground">{data?.totalHours || 0}</p>
                  <Badge className="mt-2 bg-blue-500/20 text-blue-400 border-0 text-xs">
                    {data?.todayDuration || '0m'} today
                  </Badge>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Avg Duration</p>
                  <p className="text-3xl font-bold text-foreground">{data?.avgDurationMin || 0}m</p>
                  <Badge className="mt-2 bg-purple-500/20 text-purple-400 border-0 text-xs">
                    per meeting
                  </Badge>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Meetings/Day</p>
                  <p className="text-3xl font-bold text-foreground">{data?.meetingsPerDay || 0}</p>
                  <Badge className="mt-2 bg-orange-500/20 text-orange-400 border-0 text-xs">
                    daily average
                  </Badge>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6">
            {/* Meetings Over Time */}
            <Card className="p-6 border-border/50">
              <h3 className="text-lg font-semibold text-foreground mb-4">Meetings This Week</h3>
              {chartData.some(d => d.meetings > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(26, 31, 58, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="meetings" fill="#8b5cf6" name="Meetings" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No meetings this week yet
                </div>
              )}
            </Card>

            {/* Meeting Duration Trend */}
            <Card className="p-6 border-border/50">
              <h3 className="text-lg font-semibold text-foreground mb-4">Duration Trend (minutes)</h3>
              {chartData.some(d => d.duration > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(26, 31, 58, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="duration" stroke="#06b6d4" name="Minutes" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No duration data yet
                </div>
              )}
            </Card>
          </div>

          {/* Additional Charts */}
          <div className="grid grid-cols-2 gap-6">
            {/* Platform Breakdown */}
            <Card className="p-6 border-border/50">
              <h3 className="text-lg font-semibold text-foreground mb-4">Meeting Platforms</h3>
              {platformData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(26, 31, 58, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No platform data yet
                </div>
              )}
            </Card>

            {/* Recent Meetings */}
            <Card className="p-6 border-border/50">
              <h3 className="text-lg font-semibold text-foreground mb-4">Recent Meetings</h3>
              {data?.recentActivity && data.recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {data.recentActivity.map((meeting, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/20">
                      <div>
                        <p className="text-sm font-medium text-foreground">{meeting.title}</p>
                        <p className="text-xs text-muted-foreground">{meeting.date} · {meeting.time}</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-primary/10 text-primary border-0 text-xs">{meeting.duration}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {meeting.platform === 'google-meet' ? '📹 Meet' : meeting.platform === 'zoom' ? '🎥 Zoom' : '📞'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No meetings yet
                </div>
              )}
            </Card>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 border-border/50 text-center">
              <p className="text-sm text-muted-foreground mb-1">Avg Meeting Duration</p>
              <p className="text-2xl font-bold text-foreground">{data?.avgDurationMin || 0} min</p>
            </Card>
            <Card className="p-4 border-border/50 text-center">
              <p className="text-sm text-muted-foreground mb-1">Meetings Per Day</p>
              <p className="text-2xl font-bold text-foreground">{data?.meetingsPerDay || 0}</p>
            </Card>
            <Card className="p-4 border-border/50 text-center">
              <p className="text-sm text-muted-foreground mb-1">Today&apos;s Meetings</p>
              <p className="text-2xl font-bold text-foreground">{data?.todayCount || 0}</p>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
