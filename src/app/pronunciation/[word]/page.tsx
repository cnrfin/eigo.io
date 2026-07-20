import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AudioPlayer from '../AudioPlayer'
import AppCta from '../AppCta'
import { getPublishedWords, getWord, getPair, familyWords, soundGuideForWord } from '@/lib/pronunciation/words'
import type { Sense } from '@/lib/pronunciation/enrichment'

const BASE = 'https://eigo.io'

export function generateStaticParams() {
  return getPublishedWords().map((w) => ({ word: w.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ word: string }> }): Promise<Metadata> {
  const { word: slug } = await params
  const w = getWord(slug)
  if (!w) return {}
  const title = `${w.word}の発音・読み方【イギリス英語】｜eigo.io`
  const description = `「${w.word}」のイギリス英語での発音（${w.ipa}）とカタカナ「${w.katakana}」、意味「${w.ja}」、例文、よくある間違いをネイティブ音声つきで解説。${w.pair ? `${w.pair} との聞き分けも。` : ''}`
  const path = `/pronunciation/${w.slug}`
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: `${BASE}${path}`, siteName: 'Eigo.io', locale: 'ja_JP', type: 'article', images: ['/OG.png'] },
    twitter: { card: 'summary_large_image', title, description, images: ['/OG.png'] },
  }
}

const Divider = () => <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: 'clamp(26px,4vw,38px) 0' }} />
const sectionTitle: React.CSSProperties = { margin: '0 0 12px', fontSize: 20, fontWeight: 500, letterSpacing: '-.01em', color: 'var(--text)' }

export default async function WordPage({ params }: { params: Promise<{ word: string }> }) {
  const { word: slug } = await params
  const w = getWord(slug)
  if (!w) notFound()

  const pair = getPair(w)
  const family = familyWords(w)
  const guide = soundGuideForWord(w)
  const path = `/pronunciation/${w.slug}`
  const senses: Sense[] = w.senses.length ? w.senses : [{ ja: w.ja }]

  // The minimal-pair difference, folded into the 発音のコツ section.
  const pairDiff = pair ? `${w.word} は ${w.ipa}、${pair.word} は ${pair.ipa}。この2語は ${w.name} の最小対（ミニマルペア）で、子音の作り方が違います。上の音声で聞き比べてみましょう。` : null

  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: '発音ガイド', item: `${BASE}/pronunciation` },
      { '@type': 'ListItem', position: 3, name: w.word, item: `${BASE}${path}` },
    ] },
    { '@context': 'https://schema.org', '@type': 'AudioObject', name: `${w.word} — British pronunciation (UK female)`, contentUrl: `${BASE}${w.audioFemale}`, encodingFormat: 'audio/mpeg', inLanguage: 'en-GB' },
    // Only declared when a real male recording exists — otherwise the markup
    // would advertise a male take that is actually the female one.
    ...(w.audioMale
      ? [{ '@context': 'https://schema.org', '@type': 'AudioObject', name: `${w.word} — British pronunciation (UK male)`, contentUrl: `${BASE}${w.audioMale}`, encodingFormat: 'audio/mpeg', inLanguage: 'en-GB' }]
      : []),
  ]

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(20px,4vw,44px) 20px 90px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="パンくずリスト" style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22 }}>
        <Link href="/" style={{ color: 'inherit' }}>ホーム</Link>
        <span style={{ margin: '0 7px' }}>›</span>
        <Link href="/pronunciation" style={{ color: 'inherit' }}>発音ガイド</Link>
        <span style={{ margin: '0 7px' }}>›</span>
        <span style={{ color: 'var(--text-secondary)' }}>{w.word}</span>
      </nav>

      <h1 style={{ margin: 0, fontSize: 'clamp(40px,8vw,68px)', fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1 }}>{w.word}</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, margin: '18px 0 4px' }}>
        <span style={{ fontSize: 'clamp(20px,3vw,26px)', fontWeight: 600, color: 'var(--accent)' }}>{w.ipa}</span>
        <AudioPlayer male={w.audioMale} female={w.audioFemale} usMale={w.audioMaleUs} usFemale={w.audioFemaleUs} word={w.word} size="sm" />
      </div>

      {/* accent rule (Cambridge-style) */}
      <div style={{ height: 3, background: 'var(--accent)', borderRadius: 2, margin: '18px 0 24px' }} />

      {/* meanings — all senses, each with synonyms/antonyms */}
      <section>
        <h2 style={sectionTitle}>意味</h2>
        {senses.map((s, i) => (
          <div key={i} style={{ paddingTop: i ? 14 : 0, marginTop: i ? 14 : 0, borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <p style={{ margin: 0, fontSize: i === 0 ? 'clamp(19px,2.3vw,23px)' : 17, fontWeight: 600, lineHeight: 1.5 }}>
              {senses.length > 1 && <span style={{ color: 'var(--text-muted)', fontWeight: 700, marginRight: 10 }}>{i + 1}</span>}
              {s.ja}
            </p>
            {(s.syn?.length || s.ant?.length) ? (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {s.syn?.length ? <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}><span style={{ color: 'var(--accent)', fontWeight: 600, marginRight: 8 }}>類義語</span>{s.syn.join('、')}</div> : null}
                {s.ant?.length ? <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)', fontWeight: 600, marginRight: 8 }}>対義語</span>{s.ant.join('、')}</div> : null}
              </div>
            ) : null}
          </div>
        ))}
      </section>

      <Divider />

      <section>
        <h2 style={sectionTitle}>発音のコツ</h2>
        <p style={{ margin: 0, lineHeight: 1.95, fontSize: 16 }}>{w.tipJa}</p>
        {pairDiff && <p style={{ margin: '14px 0 0', lineHeight: 1.95, fontSize: 16 }}>{pairDiff}</p>}
        {guide && <p style={{ margin: '14px 0 0', fontSize: 15 }}><Link href={`/pronunciation/sounds/${guide.slug}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>{guide.titleJa}をくわしく見る →</Link></p>}
      </section>

      {pair && (
        <>
          <Divider />
          <section>
            <h2 style={sectionTitle}>まぎらわしいペア：{w.word} と {pair.word}</h2>
            <p style={{ margin: '0 0 18px', color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 15 }}>
              この2語は {w.name} の最小対（ミニマルペア）です。音声を交互に再生して、子音の違いを聞き分けましょう。
            </p>
            {[w, pair].map((x, i) => (
              <div key={x.slug} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, padding: '16px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <div style={{ minWidth: 150 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontSize: 22, fontWeight: 700 }}>{x.word}</span>
                    <span style={{ fontSize: 15, color: 'var(--accent)', fontWeight: 600 }}>{x.ipa}</span>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{x.ja}</div>
                </div>
                <AudioPlayer male={x.audioMale} female={x.audioFemale} word={x.word} size="sm" />
                {x.slug !== w.slug && (
                  <Link href={`/pronunciation/${x.slug}`} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 15px', borderRadius: 999, border: '1px solid var(--border)', color: 'var(--text)', textDecoration: 'none', fontSize: 15 }}>
                    <span style={{ fontWeight: 600 }}>{x.word}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{x.ipa}</span>
                  </Link>
                )}
              </div>
            ))}
          </section>
        </>
      )}

      <Divider />

      <section>
        <h2 style={sectionTitle}>例文</h2>
        <p style={{ margin: 0, fontSize: 19, fontWeight: 500, fontStyle: 'italic' }}>{w.exampleEn}</p>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>{w.exampleJa}</p>
      </section>

      {w.collocations.length > 0 ? (
        <>
          <Divider />
          <section style={{ marginBottom: 'clamp(26px,4vw,38px)' }}>
            <h2 style={sectionTitle}>よく使う組み合わせ（コロケーション）</h2>
            <p style={{ margin: '0 0 14px', color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 15 }}>
              「{w.word}」は次のような形でよく使われます。単語だけでなく、かたまりで覚えると自然に使えます。
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: '1px solid var(--border)' }}>
              {w.collocations.map((c) => (
                <li key={c.en} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 12, padding: '12px 2px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 17, fontWeight: 600 }}>{c.en}</span>
                  <span style={{ fontSize: 15, color: 'var(--text-secondary)' }}>{c.ja}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <Divider />
      )}

      <AppCta />

      {family.length > 0 && (
        <>
          <Divider />
          <section>
            <h2 style={sectionTitle}>{w.name} の音を含む単語</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {family.map((r) => (
                <Link key={r.slug} href={`/pronunciation/${r.slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 15px', borderRadius: 999, border: '1px solid var(--border)', color: 'var(--text)', textDecoration: 'none', fontSize: 15 }}>
                  <span style={{ fontWeight: 600 }}>{r.word}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{r.ipa}</span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
