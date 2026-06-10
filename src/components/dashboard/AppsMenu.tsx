'use client'

import { useState, useRef, useEffect } from 'react'
import { Squircle } from '@squircle-js/react'
import { useLanguage } from '@/context/LanguageContext'

type App = { name: string; url: string; icon: 'eigo' | 'sayafterme' }

const APPS: App[] = [
  { name: 'eigo.io', url: 'https://apps.apple.com/gb/app/eigo-io-english-school/id6761731252', icon: 'eigo' },
  { name: 'SayAfterMe', url: 'https://apps.apple.com/jp/app/sayafterme/id6765954089', icon: 'sayafterme' },
]

function AppIcon({ kind, name }: { kind: App['icon']; name: string }) {
  const src = kind === 'eigo' ? '/eigoio.png' : '/sayafterme.png'
  return (
    <Squircle asChild cornerRadius={14} cornerSmoothing={0.8}>
      <img src={src} alt={name} className="w-14 h-14 shrink-0 aspect-square object-cover" />
    </Squircle>
  )
}

function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="5" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="19" cy="5" r="2" />
      <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
      <circle cx="5" cy="19" r="2" /><circle cx="12" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
    </svg>
  )
}

export default function AppsMenu() {
  const { locale } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-muted)' }}
        aria-label={locale === 'ja' ? 'アプリ' : 'Apps'}
        aria-expanded={open}
      >
        <DotsIcon />
      </button>

      {open && (
        <div
          className="modal-card absolute right-0 top-11 z-50 w-max p-4 rounded-2xl"
          style={{ background: 'var(--card)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}
        >
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>{locale === 'ja' ? 'アプリ' : 'Apps'}</p>
          <div className="flex gap-2">
            {APPS.map((app) => (
              <a
                key={app.name}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                title={app.name}
                onClick={() => setOpen(false)}
                className="sidebar-item flex items-center justify-center p-1.5 rounded-xl"
              >
                <AppIcon kind={app.icon} name={app.name} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
