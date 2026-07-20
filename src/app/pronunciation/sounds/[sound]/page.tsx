import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AppCta from '../../AppCta'
import SoundTrainer from './SoundTrainer'
import { getSoundGuide, getSoundTrainer, publishedSoundGuides } from '@/lib/pronunciation/words'

const BASE = 'https://eigo.io'

const Divider = () => <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: 'clamp(26px,4vw,38px) 0' }} />

export function generateStaticParams() {
  return publishedSoundGuides().map((g) => ({ sound: g.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ sound: string }> }): Promise<Metadata> {
  const { sound } = await params
  const g = getSoundGuide(sound)
  if (!g) return {}
  const path = `/pronunciation/sounds/${g.slug}`
  return {
    title: { absolute: g.metaTitle },
    description: g.metaDesc,
    keywords: g.keywords,
    alternates: { canonical: path },
    openGraph: { title: g.metaTitle, description: g.metaDesc, url: `${BASE}${path}`, siteName: 'Eigo.io', locale: 'ja_JP', type: 'article', images: ['/OG.png'] },
    twitter: { card: 'summary_large_image', title: g.metaTitle, description: g.metaDesc, images: ['/OG.png'] },
  }
}

export default async function SoundGuidePage({ params }: { params: Promise<{ sound: string }> }) {
  const { sound } = await params
  const g = getSoundGuide(sound)
  const trainer = getSoundTrainer(sound)
  if (!g || !trainer) notFound()

  const path = `/pronunciation/sounds/${g.slug}`
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: '発音ガイド', item: `${BASE}/pronunciation` },
      { '@type': 'ListItem', position: 3, name: g.titleJa, item: `${BASE}${path}` },
    ] },
    { '@context': 'https://schema.org', '@type': 'LearningResource', name: g.metaTitle, description: g.metaDesc, inLanguage: 'ja', learningResourceType: '発音ガイド', teaches: g.titleJa, url: `${BASE}${path}` },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: g.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ]

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(20px,4vw,44px) 20px 90px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="パンくずリスト" style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22 }}>
        <Link href="/" style={{ color: 'inherit' }}>ホーム</Link>
        <span style={{ margin: '0 7px' }}>›</span>
        <Link href="/pronunciation" style={{ color: 'inherit' }}>発音ガイド</Link>
        <span style={{ margin: '0 7px' }}>›</span>
        <span style={{ color: 'var(--text-secondary)' }}>{g.titleJa}</span>
      </nav>

      <h1 style={{ margin: 0, fontSize: 'clamp(30px,5.5vw,48px)', fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.08 }}>{g.titleJa}</h1>
      <div style={{ height: 3, background: 'var(--accent)', borderRadius: 2, margin: '18px 0 22px', maxWidth: 80 }} />
      <p className="jp" style={{ margin: '0 0 26px', fontSize: 16, lineHeight: 1.95, color: 'var(--text-secondary)', maxWidth: 720 }}>{g.introJa}</p>

      <SoundTrainer data={trainer} />

      <Divider />
      <section>
        <h2 className="jp" style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 500 }}>この音を含む単語</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {g.words.map((w) => (
            <Link key={w.slug} href={`/pronunciation/${w.slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 15px', borderRadius: 999, border: '1px solid var(--border)', color: 'var(--text)', textDecoration: 'none', fontSize: 15 }}>
              <span style={{ fontWeight: 600 }}>{w.word}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{w.ipa}</span>
            </Link>
          ))}
        </div>
      </section>

      <Divider />
      <AppCta />
    </main>
  )
}
