'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getPostLoginPath } from '@/lib/admin-redirect'
import { Suspense } from 'react'

function LineAuthComplete() {
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type') as 'magiclink' | 'email'

    if (!tokenHash) {
      setError('Missing token')
      return
    }

    supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type || 'magiclink',
    }).then(async ({ data, error }) => {
      if (error) {
        console.error('OTP verification failed:', error)
        setError(error.message)
      } else {
        window.location.href = getPostLoginPath(data?.user?.email)
      }
    })
  }, [searchParams])

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: 'var(--danger)' }}>{error}</p>
          <a href="/" className="text-sm underline" style={{ color: 'var(--text-muted)' }}>
            Back to home
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div style={{ color: 'var(--text-muted)' }}>Signing in...</div>
    </main>
  )
}

export default function LineAuthCompletePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Signing in...</div>
      </main>
    }>
      <LineAuthComplete />
    </Suspense>
  )
}
