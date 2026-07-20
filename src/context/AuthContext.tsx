'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  avatarUrl: string | null
  gcalConnected: boolean | null
  // captchaToken (optional) satisfies Supabase's global hCaptcha protection when
  // it's enabled; harmless when it isn't.
  signIn: (email: string, password: string, captchaToken?: string | null) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, firstName?: string, lastName?: string, captchaToken?: string | null) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signInWithLine: () => Promise<{ error: Error | null }>
  // Free-funnel: mint a guest session, then convert the SAME user to permanent
  // on sign-up so the work they did as a guest survives with zero data migration.
  signInAnonymously: (captchaToken?: string | null) => Promise<{ error: Error | null; session: Session | null }>
  convertAnonUser: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: Error | null }>
  linkGoogleIdentity: (redirectTo?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshAvatar: () => Promise<void>
  setGcalConnected: (connected: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [gcalConnected, setGcalConnected] = useState<boolean | null>(null)

  // Fetch avatar from profiles table
  const fetchAvatar = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single()

    if (data?.avatar_url) {
      setAvatarUrl(data.avatar_url)
    }
  }, [])

  // Fetch Google Calendar connection status from profiles table
  const fetchGcalStatus = useCallback(async (accessToken: string) => {
    try {
      const res = await fetch('/api/profile/google-calendar-status', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      setGcalConnected(!!data.connected)
    } catch {
      setGcalConnected(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchAvatar(session.user.id)
        if (session.access_token) fetchGcalStatus(session.access_token)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchAvatar(session.user.id)
        // Capture Google OAuth tokens for calendar integration
        // The API endpoint checks if user explicitly disconnected, so safe to call on any event
        if (session.provider_refresh_token && session.provider_token) {
          storeGoogleCalendarToken(session.access_token, session.provider_refresh_token)
        }
      } else {
        setAvatarUrl(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchAvatar, fetchGcalStatus])

  // Store the Google Calendar refresh token in profiles table
  const storeGoogleCalendarToken = async (accessToken: string, refreshToken: string) => {
    try {
      const res = await fetch('/api/profile/google-calendar-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      })
      if (res.ok) {
        setGcalConnected(true)
      }
    } catch {
      // Non-blocking — calendar integration is optional
    }
  }

  const signIn = async (email: string, password: string, captchaToken?: string | null) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    })
    return { error: error as Error | null }
  }

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string, captchaToken?: string | null) => {
    const fullName = `${firstName || ''} ${lastName || ''}`.trim()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || undefined,
          display_name: fullName || undefined,
        },
        ...(captchaToken ? { captchaToken } : {}),
      },
    })
    return { error: error as Error | null }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
    return { error: error as Error | null }
  }

  const signInWithLine = async () => {
    try {
      window.location.href = '/api/auth/line'
      return { error: null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  // Mint a guest (anonymous) user. Returns the session so callers can use the
  // access token immediately without waiting for onAuthStateChange to land.
  const signInAnonymously = async (captchaToken?: string | null) => {
    const { data, error } = await supabase.auth.signInAnonymously({
      options: captchaToken ? { captchaToken } : undefined,
    })
    return { error: error as Error | null, session: data?.session ?? null }
  }

  // Convert the current anonymous user to a permanent email/password account.
  // user.id is preserved, so every guest row (attempts, responses, audio) is
  // already theirs — no migration. Email gets a confirmation per Supabase.
  const convertAnonUser = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const fullName = `${firstName || ''} ${lastName || ''}`.trim()
    const { error } = await supabase.auth.updateUser({
      email,
      password,
      data: { full_name: fullName || undefined, display_name: fullName || undefined },
    })
    return { error: error as Error | null }
  }

  // Attach a Google identity to the current (anonymous) user — same user.id.
  // Redirects through OAuth; redirectTo should be the funnel's payoff page.
  const linkGoogleIdentity = async (redirectTo?: string) => {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: redirectTo || `${window.location.origin}/dashboard` },
    })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      // Hard navigation to the landing page: leaving the user on a dashboard
      // with no session shows half-empty UI, and a full reload also clears any
      // per-user state held in memory by open components.
      window.location.href = '/'
    }
  }

  const refreshAvatar = useCallback(async () => {
    if (user) await fetchAvatar(user.id)
  }, [user, fetchAvatar])

  return (
    <AuthContext.Provider value={{ user, session, loading, avatarUrl, gcalConnected, signIn, signUp, signInWithGoogle, signInWithLine, signInAnonymously, convertAnonUser, linkGoogleIdentity, signOut, refreshAvatar, setGcalConnected }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
