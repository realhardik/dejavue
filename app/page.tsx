'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Video, Zap, MessageSquare, BarChart3, ArrowRight } from 'lucide-react'

export default function Page() {
  const router = useRouter()

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      router.push('/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 group-hover:bg-primary/30 transition-colors">
              <span className="text-lg font-bold text-primary">D</span>
            </div>
            <span className="text-xl font-bold">Dejavue</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-foreground hover:bg-secondary">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-6 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-balance">
            Never Miss a <span className="text-primary">Meeting Moment</span> Again
          </h1>
          <p className="text-xl text-muted-foreground mb-8 text-balance">
            Dejavue automatically detects, records, and transcribes your Zoom and Google Meet meetings. Ask our AI assistant anything about the conversation—during or after the meeting ends.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                Start Free <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="border-border/50 text-foreground hover:bg-secondary bg-transparent">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Powerful Features</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-lg border border-border/50 bg-card hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/40 flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Auto-Detection & Recording</h3>
              <p className="text-muted-foreground">
                Automatically detect when you're in a Zoom or Google Meet meeting and record it securely. No manual setup required.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-lg border border-border/50 bg-card hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/40 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-Time Transcription</h3>
              <p className="text-muted-foreground">
                Get live transcripts of your meetings as they happen. Powered by advanced AI, with 99% accuracy.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-lg border border-border/50 bg-card hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/40 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Meeting Assistant</h3>
              <p className="text-muted-foreground">
                Ask the AI chatbot anything about your meeting. Get summaries, quotes, action items, and insights instantly.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-lg border border-border/50 bg-card hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/40 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Auto-Generated Minutes & Summaries</h3>
              <p className="text-muted-foreground">
                Get professional meeting minutes and summaries automatically generated when the meeting ends.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t border-border/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Meetings?</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of professionals who use Dejavue to get the most out of their meetings.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              Get Started for Free <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6 text-center text-sm text-muted-foreground">
        <p>&copy; 2024 Dejavue. All rights reserved.</p>
      </footer>
    </div>
  )
}
