'use client'

import { useLanguage } from '@/context/LanguageContext'
import Reveal from './Reveal'
import { useIsMobile } from './useIsMobile'

/* Vocab feature — background fades from neutral into a light accent tint. Copy
   blurs in on scroll, then two stacked marquees (top drifts left, bottom drifts
   right) show vocab cards from the user's decks: English word, JA reading, and a
   category badge. Nothing else, to keep the cards clean. */

type Word = { en: string; ja: string; cat: string }
const WORDS: Word[] = [
  { en: 'Nice to meet you', ja: 'はじめまして', cat: 'greeting' },
  { en: 'Grateful', ja: 'ありがたい', cat: 'feeling' },
  { en: 'Deadline', ja: '締め切り', cat: 'business' },
  { en: 'Delicious', ja: 'おいしい', cat: 'adjective' },
  { en: 'Recommend', ja: 'おすすめする', cat: 'verb' },
  { en: 'Exhausted', ja: 'くたくた', cat: 'feeling' },
  { en: 'Take care', ja: '気をつけてね', cat: 'phrase' },
  { en: 'Convenient', ja: '便利な', cat: 'adjective' },
  { en: 'Reschedule', ja: '予定を変更する', cat: 'business' },
  { en: 'Curious', ja: '気になる', cat: 'feeling' },
  { en: 'Available', ja: '空いている', cat: 'adjective' },
  { en: 'By the way', ja: 'ところで', cat: 'phrase' },
  { en: 'Sightseeing', ja: '観光', cat: 'travel' },
  { en: 'Apologize', ja: '謝る', cat: 'verb' },
  { en: 'Colleague', ja: '同僚', cat: 'business' },
  { en: 'Look forward to', ja: '楽しみにする', cat: 'phrase' },
  { en: 'Confident', ja: '自信がある', cat: 'feeling' },
  { en: 'Borrow', ja: '借りる', cat: 'verb' },
  { en: 'Souvenir', ja: 'お土産', cat: 'travel' },
  { en: 'Fluent', ja: '流暢な', cat: 'adjective' },
]

const CAT: Record<string, { bg: string; fg: string; ja: string; en: string }> = {
  greeting: { bg: 'var(--v3-cat-greeting-bg)', fg: 'var(--v3-cat-greeting-fg)', ja: 'あいさつ', en: 'Greeting' },
  phrase: { bg: 'var(--v3-cat-phrase-bg)', fg: 'var(--v3-cat-phrase-fg)', ja: 'フレーズ', en: 'Phrase' },
  feeling: { bg: 'var(--v3-cat-feeling-bg)', fg: 'var(--v3-cat-feeling-fg)', ja: '気持ち', en: 'Feeling' },
  business: { bg: 'var(--v3-cat-business-bg)', fg: 'var(--v3-cat-business-fg)', ja: 'ビジネス', en: 'Business' },
  adjective: { bg: 'var(--v3-cat-adjective-bg)', fg: 'var(--v3-cat-adjective-fg)', ja: '形容詞', en: 'Adjective' },
  verb: { bg: 'var(--v3-cat-verb-bg)', fg: 'var(--v3-cat-verb-fg)', ja: '動詞', en: 'Verb' },
  travel: { bg: 'var(--v3-cat-travel-bg)', fg: 'var(--v3-cat-travel-fg)', ja: '旅行', en: 'Travel' },
}

function Card({ w, ja, mobile }: { w: Word; ja: boolean; mobile: boolean }) {
  const c = CAT[w.cat]
  return (
    <div style={{ flex: 'none', width: mobile ? 200 : 224, height: mobile ? 128 : 140, marginRight: mobile ? 12 : 16, background: 'var(--card)', borderRadius: mobile ? 15 : 16, padding: mobile ? '16px 18px' : '18px 20px', boxSizing: 'border-box', boxShadow: '0 3px 12px rgba(0,0,0,.045)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: mobile ? 18 : 20, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--text)', lineHeight: 1.15 }}>{w.en}</div>
      <div className="jp" style={{ fontSize: mobile ? 13 : 14, color: 'var(--text-secondary)', marginTop: mobile ? 3 : 4 }}>{w.ja}</div>
      <div style={{ marginTop: 'auto' }}>
        <span className={ja ? 'jp' : undefined} style={{ display: 'inline-block', fontSize: mobile ? 11 : 11, fontWeight: 600, padding: mobile ? '4px 10px' : '4px 11px', borderRadius: 999, background: c.bg, color: c.fg }}>{ja ? c.ja : c.en}</span>
      </div>
    </div>
  )
}

function Marquee({ items, dir, ja, mobile }: { items: Word[]; dir: 'l' | 'r'; ja: boolean; mobile: boolean }) {
  const doubled = [...items, ...items]
  return (
    <div className="v3-marquee-wrap" style={{ overflow: 'hidden', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)', maskImage: 'linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)' }}>
      <div className={`v3-marquee v3-marquee-${dir}`} style={{ padding: mobile ? '10px 0' : '18px 0' }}>
        {doubled.map((w, i) => <Card key={`${w.en}-${i}`} w={w} ja={ja} mobile={mobile} />)}
      </div>
    </div>
  )
}

export default function VocabSection() {
  const { locale } = useLanguage()
  const ja = locale === 'ja'
  const mobile = useIsMobile()

  // Desktop: 2 rows of 10. Mobile: 4 shorter rows of 5 (smaller cards) so the
  // marquees fill more of the tall viewport. Directions alternate l/r.
  const rows: { items: Word[]; dir: 'l' | 'r' }[] = mobile
    ? [
        { items: WORDS.slice(0, 5), dir: 'l' },
        { items: WORDS.slice(5, 10), dir: 'r' },
        { items: WORDS.slice(10, 15), dir: 'l' },
        { items: WORDS.slice(15, 20), dir: 'r' },
      ]
    : [
        { items: WORDS.slice(0, 10), dir: 'l' },
        { items: WORDS.slice(10), dir: 'r' },
      ]

  return (
    <section style={{ background: 'var(--v3-wash)', padding: 'clamp(96px,14vh,220px) 0 clamp(96px,13vh,210px)', overflow: 'hidden' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
        <Reveal as="h2" className={ja ? 'jp' : undefined} style={{ margin: 0, fontSize: 'clamp(30px,3.6vw,52px)', fontWeight: ja ? 600 : 500, letterSpacing: ja ? '-.01em' : '-.02em', lineHeight: ja ? 1.3 : 1.12, color: 'var(--text)' }}>
          {ja ? 'レッスンの単語は、自動で単語帳に入ります' : 'Words from your lessons are saved automatically'}
        </Reveal>
        <Reveal as="p" delay={0.12} className={ja ? 'jp' : undefined} style={{ margin: 'clamp(16px,2vh,22px) auto 0', maxWidth: 620, fontSize: 'clamp(15px,1.3vw,19px)', lineHeight: ja ? 1.85 : 1.7, color: 'var(--text-secondary)' }}>
          {ja
            ? '出てきた単語やフレーズが、そのまま単語カードになります。自分が話すときに必要だった言葉なので、覚えたことを次の会話ですぐに使えます。'
            : 'The words and phrases that come up turn straight into flashcards. They are the words you needed when you were actually speaking, so what you learn goes back into the next conversation.'}
        </Reveal>
      </div>

      <div style={{ maxWidth: 1240, marginTop: 'clamp(36px,5vh,80px)', marginInline: 'auto', padding: mobile ? '0 16px' : '0 32px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {rows.map((r, i) => <Marquee key={i} items={r.items} dir={r.dir} ja={ja} mobile={mobile} />)}
      </div>
    </section>
  )
}
