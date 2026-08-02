/**
 * /c/{id} — the challenge share landing page (the eigo.io universal-link target).
 *
 * Once the AASA file is live and the app is rebuilt, iOS opens the app directly
 * and this page is never seen. It exists for everyone else: people without the
 * app, desktop, or before AASA propagates — offering "Open in app" (the eigo://
 * scheme) and an App Store fallback. Also carries rich OG tags so the shared
 * link previews nicely in Messages / socials (the growth surface).
 */
import type { Metadata } from 'next'
import { cache } from 'react'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const APP_STORE_URL = 'https://apps.apple.com/gb/app/eigo-io/id6761731252'

type ChallengeInfo = {
  creator_name: string | null
  creator_score: number
  set_title: string | null
  set_cefr: string | null
  set_emoji: string | null
}

const getChallenge = cache(async (id: string): Promise<ChallengeInfo | null> => {
  try {
    const sb = getSupabaseAdmin()
    const { data } = await sb
      .from('challenges')
      .select('creator_name, creator_score, challenge_sets(title_en, cefr_level, emoji)')
      .eq('id', id)
      .maybeSingle()
    if (!data) return null
    const s: any = (data as any).challenge_sets ?? {}
    return {
      creator_name: (data as any).creator_name ?? null,
      creator_score: (data as any).creator_score ?? 0,
      set_title: s.title_en ?? null,
      set_cefr: s.cefr_level ?? null,
      set_emoji: s.emoji ?? null,
    }
  } catch {
    return null
  }
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const c = await getChallenge(id)
  const who = c?.creator_name || 'A friend'
  const title = c ? `${who} challenged you on eigo` : 'eigo Challenge'
  const desc = c
    ? `Can you beat ${c.creator_score}${c.set_title ? ` on “${c.set_title}”` : ''}? Tap to play in the eigo app.`
    : 'Open the eigo app to play this challenge.'
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, images: ['/OG.png'], type: 'website' },
    twitter: { card: 'summary_large_image', title, description: desc, images: ['/OG.png'] },
  }
}

export default async function ChallengeLandingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = await getChallenge(id)
  const scheme = `eigo://challenge/${id}`
  const who = c?.creator_name || 'A friend'

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--font-outfit, Outfit), system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          textAlign: 'center',
          background: 'var(--surface, rgba(255,255,255,0.04))',
          border: '1px solid var(--border, rgba(255,255,255,0.08))',
          borderRadius: 24,
          padding: '36px 26px',
        }}
      >
        <div style={{ fontSize: 64, lineHeight: 1 }}>{c?.set_emoji || '🏆'}</div>

        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '18px 0 6px', letterSpacing: '-0.02em' }}>
          {c ? `${who} challenged you!` : 'You’ve been challenged!'}
        </h1>

        {c ? (
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 4px' }}>
            {c.set_cefr ? `${c.set_cefr} · ` : ''}
            {c.set_title || 'Word Rush'}
          </p>
        ) : null}

        {c ? (
          <div
            style={{
              display: 'inline-block',
              margin: '16px 0 24px',
              padding: '10px 20px',
              borderRadius: 999,
              background: 'var(--accent-bg, rgba(0,194,184,0.12))',
              color: 'var(--accent)',
              fontWeight: 800,
              fontSize: 18,
            }}
          >
            ⚡ Beat {c.creator_score}
          </div>
        ) : (
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '10px 0 24px' }}>
            Open the eigo app to play.
          </p>
        )}

        <a
          href={scheme}
          style={{
            display: 'block',
            padding: '15px',
            borderRadius: 14,
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            textDecoration: 'none',
            marginBottom: 10,
          }}
        >
          Open in eigo
        </a>

        <a
          href={APP_STORE_URL}
          style={{
            display: 'block',
            padding: '15px',
            borderRadius: 14,
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: 15,
            textDecoration: 'none',
            border: '1px solid var(--border, rgba(255,255,255,0.12))',
          }}
        >
          Don’t have the app? Get eigo
        </a>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 20 }}>
          A timed vocabulary challenge · English for Japanese learners
        </p>
      </div>
    </main>
  )
}
