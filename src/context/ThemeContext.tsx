'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type Theme = 'dark' | 'light'

type ThemeContextType = {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  // Load theme: check Supabase profile first, then localStorage fallback
  useEffect(() => {
    const loadTheme = async () => {
      // Try localStorage first for immediate display
      const saved = localStorage.getItem('eigo-theme') as Theme | null
      if (saved) {
        setTheme(saved)
        document.documentElement.setAttribute('data-theme', saved)
      }

      // Then check Supabase profile for synced preference
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('theme')
            .eq('id', user.id)
            .single()

          if (profile?.theme && profile.theme !== saved) {
            setTheme(profile.theme as Theme)
            document.documentElement.setAttribute('data-theme', profile.theme)
            localStorage.setItem('eigo-theme', profile.theme)
          }
        }
      } catch {
        // Silently fail — localStorage value is fine
      }

      setMounted(true)
    }

    loadTheme()
  }, [])

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('eigo-theme', next)

    // Sync to Supabase in background
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').update({ theme: next }).eq('id', user.id).then(() => {})
      }
    })
  }, [theme])

  // Prevent flash of wrong theme
  if (!mounted) return null

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
