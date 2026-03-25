import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import JsonLd from '@/components/JsonLd'

export const metadata: Metadata = {
  metadataBase: new URL('https://eigo.io'),
  title: {
    default: 'Eigo.io｜オンライン英会話スクール',
    template: '%s | Eigo.io',
  },
  description:
    'Private online English lessons with a native UK tutor. 1-on-1 conversation practice for Japanese learners — book, learn, and grow at eigo.io. ネイティブ講師とマンツーマンのオンライン英会話レッスン。',
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
        alt: 'Eigo.io — オンライン英会話',
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
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased" style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>
        <JsonLd />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
