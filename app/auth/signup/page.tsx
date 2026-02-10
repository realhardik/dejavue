'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Mail, Lock, User } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!agreeToTerms) {
      setError('Please agree to the Terms of Service')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create account')
        return
      }

      // Store user data and redirect
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background gradient effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/20 border border-primary/40 mb-4">
            <span className="text-xl font-bold text-primary">D</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dejavue</h1>
          <p className="text-sm text-muted-foreground">Create your account to get started</p>
        </div>

        {/* Signup Card */}
        <Card className="p-8 border-border/50 backdrop-blur-sm">
          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Full Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="pl-10 bg-secondary border-border/50 text-foreground placeholder:text-muted-foreground"
                  required
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 bg-secondary border-border/50 text-foreground placeholder:text-muted-foreground"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 bg-secondary border-border/50 text-foreground placeholder:text-muted-foreground"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">At least 8 characters</p>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10 bg-secondary border-border/50 text-foreground placeholder:text-muted-foreground"
                  required
                />
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={agreeToTerms}
                onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer font-normal">
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:text-primary/80">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary hover:text-primary/80">
                  Privacy Policy
                </Link>
              </Label>
            </div>

            {/* Signup Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/30" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-card text-muted-foreground">Already have an account?</span>
            </div>
          </div>

          {/* Sign In Link */}
          <Link href="/auth/login">
            <Button variant="outline" className="w-full border-border/50 text-foreground hover:bg-secondary bg-transparent">
              Sign in instead
            </Button>
          </Link>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By creating an account, you agree to our terms and privacy policy
        </p>
      </div>
    </div>
  )
}
