'use client'

import React from "react"

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'auto'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved) {
      setThemeState(saved)
      applyTheme(saved)
    } else {
      setThemeState('dark')
      applyTheme('dark')
    }
  }, [])

  const applyTheme = (theme: Theme) => {
    const html = document.documentElement

    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      html.classList.toggle('dark', prefersDark)
      html.classList.toggle('light', !prefersDark)
    } else {
      html.classList.toggle('dark', theme === 'dark')
      html.classList.toggle('light', theme === 'light')
    }
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }

  if (!mounted) return <>{children}</>

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
