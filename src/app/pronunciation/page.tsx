import type { Metadata } from 'next'
import Link from 'next/link'
import GuideBrowser, { type BrowserGuide } from './GuideBrowser'
import { getPublishedWords, getWord, publishedSoundGuides } from '@/lib/pronunciation/words'

const BASE = 'https://eigo.io'

export const metadata: Metadata = {
  title: { absolute: '発音ガイド【イギリス英語】｜eigo.io' },
  description: '日本人が間違えやすい英語の音と単語を、イギリス英語の発音（IPA）・カタカナ・意味・例文・よくある間違いとともに解説する発音ガイド。ネイティブ音声で聞き比べられます。',
  alternates: { canonical: '/pronunciation' },
  openGraph: { title: '発音ガイド【イギリス英語】｜eigo.io', description: '日本人が間違えやすい英語の発音を、IPA・カタカナ・例文・ネイティブ音声つきで解説。', url: `${BASE}/pronunciation`, siteName: 'Eigo.io', locale: 'ja_JP', type: 'website', images: ['/OG.png'] },
  twitter: { card: 'summary_large_image', title: '発音ガイド【イギリス英語】｜eigo.io', description: '日本人が間違えやすい英語の発音を解説。', images: ['/OG.png'] },
}

export default function PronunciationIndex() {
  const all = getPublishedWords()
  const guides = publishedSoundGuides()

  // Serialisable props for the client browser. The featured pair drives the
  // hero, so it's resolved here rather than shipping the whole word records.
  const browser: BrowserGuide[] = guides.map((g) => {
    const a = getWord(g.trainer.featured[0])
    const b = getWord(g.trainer.featured[1])
    return {
      slug: g.slug,
      railJa: g.titleJa.replace(/の発音の違い$|の違い$/, ''),
      shortLabel: g.shortLabel,
      group: g.group,
      ipaA: g.trainer.sides.r.symbol,
      ipaB: g.trainer.sides.l.symbol,
      wordA: a?.word ?? g.trainer.featured[0],
      wordB: b?.word ?? g.trainer.featured[1],
      taglineJa: g.taglineJa,
      words: g.words.map((w) => ({ slug: w.slug, word: w.word, ipa: w.ipa, ja: w.ja })),
    }
  })

  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: '発音ガイド', item: `${BASE}/pronunciation` },
    ] },
    { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: all.map((w, i) => ({ '@type': 'ListItem', position: i + 1, name: w.word, url: `${BASE}/pronunciation/${w.slug}` })) },
  ]

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(20px,4vw,44px) 20px 90px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="パンくずリスト" style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        <Link href="/" style={{ color: 'inherit' }}>ホーム</Link>
        <span style={{ margin: '0 7px' }}>›</span>
        <span style={{ color: 'var(--text-secondary)' }}>発音ガイド</span>
      </nav>

      <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(30px,5.5vw,48px)', fontWeight: 700, letterSpacing: '-.03em' }}>発音ガイド</h1>
      <p style={{ margin: '0 0 8px', fontSize: 17, lineHeight: 1.9, color: 'var(--text-secondary)', maxWidth: 660 }}>
        日本人がつまずきやすい英語の音を、ネイティブ音声つきで聞き比べられます。まず音のペアを選び、そこから単語ごとの発音（IPA）・カタカナ・意味・例文へ進めます。
      </p>

      <div style={{ height: 3, background: 'var(--accent)', borderRadius: 2, margin: '22px 0 clamp(26px,3.5vw,34px)', maxWidth: 80 }} />

      <GuideBrowser guides={browser} />
    </main>
  )
}
