import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import JsonLd from '@/components/JsonLd'

// Self-hosted via next/font: no render-blocking Google Fonts request, and it
// adds font-display: swap + a preload automatically. Exposed as --font-outfit
// so globals.css (and the .jp fallback chain) can reference it.
const outfit = Outfit({ subsets: ['latin'], display: 'swap', variable: '--font-outfit' })

export const metadata: Metadata = {
  metadataBase: new URL('https://eigo.io'),
  title: {
    default: 'Eigo.io｜オンライン英会話スクール',
    template: '%s | Eigo.io',
  },
  description:
    'Private online English lessons with a native UK tutor. 1-on-1 conversation practice for Japanese learners. Book, learn, and grow at eigo.io. ネイティブ講師とマンツーマンのオンライン英会話レッスン。',
  keywords: [
    'オンライン英会話',
    '英会話レッスン',
    'マンツーマン英会話',
    'ネイティブ講師',
    'online English lessons',
    'English tutor',
    'private English lessons',
    'Japanese learners',
    'eigo.io',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Eigo.io｜オンライン英会話スクール',
    description:
      'Private 1-on-1 online English lessons with a native UK tutor. ネイティブ講師とマンツーマンのオンライン英会話。',
    url: 'https://eigo.io',
    siteName: 'Eigo.io',
    locale: 'ja_JP',
    alternateLocale: 'en_GB',
    type: 'website',
    images: [
      {
        url: '/OG.png',
        width: 1200,
        height: 630,
        alt: 'Eigo.io オンライン英会話',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Eigo.io｜オンライン英会話スクール',
    description:
      'Private 1-on-1 online English lessons with a native UK tutor. ネイティブ講師とマンツーマン英会話。',
    images: ['/OG.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
    other: [
      { rel: 'icon', url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { rel: 'icon', url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={outfit.variable} suppressHydrationWarning>
      <head>
        {/* The scroll-driven landing (/ and /en) is served from cache on a
            back/forward navigation WITHOUT re-executing its client JS, so it comes
            back a static, half-rendered snapshot (no Lenis, no morph, no reveals).
            This runs during head parse — before React, so it doesn't rely on the
            very effects that aren't firing — and forces one clean reload so the
            page re-initialises exactly like a first visit. The reload turns the
            nav type into "reload", so it can't loop. Scoped to the landing paths
            only ('' is '/' after the trailing-slash strip). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var e=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0],t=e?e.type:(performance.navigation&&performance.navigation.type===2?'back_forward':'');if(t==='back_forward'){var p=location.pathname.replace(/\\/+$/,'');if(p===''||p==='/en'){location.reload()}}}catch(e){}})()",
          }}
        />
        {/* Correct the document language for the English tree. The markup ships
            lang="ja" because the root layout is shared and static — reading the
            pathname on the server would need headers(), which opts every route
            (including the ~240 statically generated pronunciation pages) into
            dynamic rendering. This runs during head parse, before first paint, so
            screen readers and the browser see the right language immediately.
            Google determines language from content and hreflang rather than this
            attribute, and both are already correct per page. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var p=location.pathname.replace(/\\/+$/,'');document.documentElement.lang=(p==='/en'||p.indexOf('/en/')===0)?'en':'ja'}catch(e){}})()",
          }}
        />
        {/* Apply the saved theme before first paint so the server-rendered HTML
            shows without a theme flash (the ThemeProvider then syncs React state). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('eigo-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark')}catch(e){document.documentElement.setAttribute('data-theme','dark')}})()",
          }}
        />
      </head>
      <body className="antialiased" style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-outfit), sans-serif' }}>
        <JsonLd />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
