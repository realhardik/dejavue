'use client'

import { Sidebar } from '@/components/sidebar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Users, Clock, Zap } from 'lucide-react'

export default function AnalyticsPage() {
  const chartData = [
    { name: 'Mon', meetings: 4, duration: 245 },
    { name: 'Tue', meetings: 3, duration: 180 },
    { name: 'Wed', meetings: 5, duration: 320 },
    { name: 'Thu', meetings: 2, duration: 120 },
    { name: 'Fri', meetings: 6, duration: 420 },
    { name: 'Sat', meetings: 1, duration: 60 },
    { name: 'Sun', meetings: 2, duration: 130 },
  ]

  const participantData = [
    { name: 'Internal Meetings', value: 45, fill: '#8b5cf6' },
    { name: 'Client Meetings', value: 30, fill: '#06b6d4' },
    { name: 'Team Syncs', value: 25, fill: '#ec4899' },
  ]

  const topicData = [
    { name: 'Product', value: 35 },
    { name: 'Engineering', value: 28 },
    { name: 'Sales', value: 22 },
    { name: 'Marketing', value: 15 },
  ]

  return (
    <div className="h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="ml-20 h-full overflow-auto">
        {/* Header */}
        <header className="border-b border-border/50 p-6">
          <h1 className="text-3xl font-bold text-foreground mb-1">Analytics</h1>
          <p className="text-muted-foreground">Meeting insights and statistics for February 2024</p>
        </header>

        {/* Content */}
        <main className="p-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-6 border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Meetings</p>
                  <p className="text-3xl font-bold text-foreground">23</p>
                  <Badge className="mt-2 bg-green-500/20 text-green-400 border-0 text-xs">+4 this week</Badge>
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
                  <p className="text-3xl font-bold text-foreground">18.5</p>
                  <Badge className="mt-2 bg-green-500/20 text-green-400 border-0 text-xs">+2 hours</Badge>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Participants</p>
                  <p className="text-3xl font-bold text-foreground">156</p>
                  <Badge className="mt-2 bg-blue-500/20 text-blue-400 border-0 text-xs">Avg 6.8 per meeting</Badge>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Action Items</p>
                  <p className="text-3xl font-bold text-foreground">47</p>
                  <Badge className="mt-2 bg-orange-500/20 text-orange-400 border-0 text-xs">12 pending</Badge>
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
            </Card>

            {/* Meeting Duration Trend */}
            <Card className="p-6 border-border/50">
              <h3 className="text-lg font-semibold text-foreground mb-4">Duration Trend</h3>
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
            </Card>
          </div>

          {/* Additional Charts */}
          <div className="grid grid-cols-2 gap-6">
            {/* Meeting Types */}
            <Card className="p-6 border-border/50">
              <h3 className="text-lg font-semibold text-foreground mb-4">Meeting Types</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={participantData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {participantData.map((entry, index) => (
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
            </Card>

            {/* Top Topics */}
            <Card className="p-6 border-border/50">
              <h3 className="text-lg font-semibold text-foreground mb-4">Top Discussion Topics</h3>
              <div className="space-y-4">
                {topicData.map((topic, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-foreground font-medium">{topic.name}</span>
                      <span className="text-sm text-muted-foreground">{topic.value}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent"
                        style={{ width: `${topic.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 border-border/50 text-center">
              <p className="text-sm text-muted-foreground mb-1">Avg Meeting Duration</p>
              <p className="text-2xl font-bold text-foreground">48 min</p>
            </Card>
            <Card className="p-4 border-border/50 text-center">
              <p className="text-sm text-muted-foreground mb-1">Meetings Per Day</p>
              <p className="text-2xl font-bold text-foreground">3.3</p>
            </Card>
            <Card className="p-4 border-border/50 text-center">
              <p className="text-sm text-muted-foreground mb-1">Transcription Accuracy</p>
              <p className="text-2xl font-bold text-foreground">99.2%</p>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
