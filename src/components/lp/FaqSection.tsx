'use client'

import { useState, type ReactNode } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import Reveal from './Reveal'

/* FAQ — full-width horizontal accordion cards. Answers stay in the DOM (rendered,
   collapsed via a grid-rows animation) so they are crawlable, and the same copy
   is emitted as FAQPage structured data for rich results. All answers are
   grounded in how the school actually works (prices from /plans). */

type Qa = {
  q: [string, string]        // [en, ja]
  a: [string, string]        // [en, ja] — plain-text answer (also used for schema)
  render?: (ja: boolean) => ReactNode // optional rich body shown instead of the text
}

// Prices per /plans: full price, and the trial-discount price (subscribe within
// 48h of the free trial, up to 45% off).
function PriceTable({ ja }: { ja: boolean }) {
  const rows = [
    { label: 'Lite', mins: ja ? '月 約120分' : '~120 min / month', mFull: '¥10,000', mTrial: '¥6,000', yFull: '¥100,000', yTrial: '¥66,000' },
    { label: 'Standard', mins: ja ? '月 約240分' : '~240 min / month', mFull: '¥20,000', mTrial: '¥12,000', yFull: '¥200,000', yTrial: '¥132,000' },
  ]
  const th: React.CSSProperties = { textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', padding: '0 0 10px', borderBottom: '1px solid var(--border)' }
  const td: React.CSSProperties = { textAlign: 'right', padding: '12px 0', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }
  const trialStyle: React.CSSProperties = { fontSize: 12.5, color: 'var(--accent)', marginTop: 3, whiteSpace: 'nowrap' }
  const withTrial = ja ? '体験割引' : 'with trial'
  const note: React.CSSProperties = { margin: '10px 0 0', fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-muted)' }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 300, borderCollapse: 'collapse', fontSize: 14.5 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }} />
              <th style={th}>{ja ? '月額' : 'Per month'}</th>
              <th style={th}>{ja ? '年額' : 'Per year'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.label}>
                <td style={{ ...td, textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{r.label}</div>
                  <div className={ja ? 'jp' : undefined} style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3, whiteSpace: 'nowrap' }}>{r.mins}</div>
                </td>
                <td style={td}>
                  <div style={{ color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap' }}>{r.mFull}</div>
                  <div style={trialStyle}>{r.mTrial} {withTrial}</div>
                </td>
                <td style={td}>
                  <div style={{ color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap' }}>{r.yFull}</div>
                  <div style={trialStyle}>{r.yTrial} {withTrial}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={ja ? 'jp' : undefined} style={{ ...note, marginTop: 16 }}>
        {ja
          ? '無料15分の体験から48時間以内にご入会いただくと、割引価格が適用されます（最大45%オフ）。'
          : 'The discount applies when you subscribe within 48 hours of your free 15-minute trial (up to 45% off).'}
      </p>
      <p className={ja ? 'jp' : undefined} style={note}>
        {ja
          ? '受講回数やレッスン時間に合わせたカスタムプランもご用意できます。'
          : 'Customized plans for a different frequency or lesson length are available on request.'}
      </p>
      <p className={ja ? 'jp' : undefined} style={note}>
        {ja
          ? 'Exam Pass（模試のみ、レッスンは含まれません）：月額 ¥2,980。'
          : 'Exam Pass (mock tests only, lessons not included): ¥2,980 per month.'}
      </p>
    </div>
  )
}

const FAQS: Qa[] = [
  {
    q: ['Who will I be learning with?', '誰が教えてくれますか？'],
    a: [
      'Every lesson is taught by a qualified native English tutor from the UK, who specialises in teaching Japanese learners.',
      'レッスンはすべて、イギリス出身のネイティブ講師が担当します。日本人の学習者に英語を教えることを専門にしています。',
    ],
  },
  {
    q: ['Is there a free trial?', '無料体験はありますか？'],
    a: [
      'Yes. Your first lesson is a free 15-minute trial, with no subscription needed.',
      'はい。初回は15分の無料体験レッスンで、登録やお支払いは必要ありません。',
    ],
  },
  {
    q: ['How much does it cost?', '料金はいくらですか？'],
    a: [
      'Monthly plans are ¥10,000 for Student Lite (about 120 minutes a month) and ¥20,000 for Student Standard (about 240 minutes a month); yearly is ¥100,000 and ¥200,000. Subscribe within 48 hours of your free trial for the discount (up to 45% off): ¥6,000 / ¥12,000 monthly, or ¥66,000 / ¥132,000 yearly. Customized plans for a different frequency or lesson length are available, and the Exam Pass for mock tests is ¥2,980 per month.',
      '月額はStudent Liteが10,000円（月およそ120分）、Student Standardが20,000円（月およそ240分）、年額はそれぞれ100,000円・200,000円です。無料体験から48時間以内のご入会で割引が適用され（最大45%オフ）、月額は6,000円・12,000円、年額は66,000円・132,000円になります。受講回数やレッスン時間に合わせたカスタムプランもあり、模試のExam Passは月額2,980円です。',
    ],
    render: (ja) => <PriceTable ja={ja} />,
  },
  {
    q: ['How do the lessons work?', 'レッスンはどのように行われますか？'],
    a: [
      'Lessons are private 1-to-1 video calls that you join from your dashboard, with no Zoom needed. Book a time from the calendar and choose anything from 15 to 75 minutes.',
      'レッスンはマンツーマンのビデオ通話で、マイページから入室できます（Zoom等は不要です）。カレンダーから予約でき、15分から75分まで選べます。',
    ],
  },
  {
    q: ['When can I take lessons?', 'レッスンはいつ受けられますか？'],
    a: [
      'Lessons run daily from 06:00 to 08:00 and 16:00 to 02:00 JST, so you can fit them around work or study. Book any open slot from the calendar.',
      'レッスンは毎日、日本時間の6:00〜8:00と16:00〜翌2:00に開講しています。仕事や勉強の合間に、カレンダーから空いている時間を予約できます。',
    ],
  },
  {
    q: ['What happens after a lesson?', 'レッスンの後はどうなりますか？'],
    a: [
      'After every lesson you receive a summary with your corrections and key phrases. Save the phrases to your vocabulary bank and review them with spaced repetition so they stick.',
      'レッスンごとに、間違いの訂正とキーフレーズをまとめたサマリーが届きます。フレーズは単語帳に保存し、間隔をあけた復習で定着させられます。',
    ],
  },
  {
    q: ['Can I prepare for IELTS, TOEIC or EIKEN?', 'IELTS・TOEIC・英検の対策はできますか？'],
    a: [
      'Yes. There are self-paced prep courses and full mock tests for IELTS, TOEIC, EIKEN and Versant, with automatic scoring and a clear breakdown of your weak points.',
      'はい。IELTS・TOEIC・英検・Versantの対策コースと本格模試があり、自動採点で弱点まではっきりわかります。',
    ],
  },
  {
    q: ['Do I need to be advanced already?', '初心者でも大丈夫ですか？'],
    a: [
      'Not at all. Beginners are welcome. We specialise in teaching English to Japanese learners, so lessons are always pitched at your level.',
      'もちろん大丈夫です。初心者の方も歓迎します。日本人の学習者への指導を専門にしているので、レッスンは一人ひとりのレベルに合わせて進めます。',
    ],
  },
]

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ flex: 'none', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function FaqSection() {
  const { locale } = useLanguage()
  const ja = locale === 'ja'
  const i = ja ? 1 : 0
  const [open, setOpen] = useState<number | null>(0)

  // FAQPage structured data, generated from the copy shown on the page.
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(item => ({
      '@type': 'Question',
      name: item.q[i],
      acceptedAnswer: { '@type': 'Answer', text: item.a[i] },
    })),
  }

  return (
    <section id="faq" style={{ background: 'var(--bg)', padding: 'clamp(96px,14vh,200px) 0 clamp(96px,13vh,190px)', overflow: 'hidden' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px' }}>
        <Reveal as="h2" className={ja ? 'jp' : undefined} style={{ margin: '0 0 clamp(36px,5vh,60px)', textAlign: 'center', fontSize: 'clamp(30px,3.6vw,52px)', fontWeight: ja ? 600 : 500, letterSpacing: ja ? '-.01em' : '-.02em', lineHeight: ja ? 1.3 : 1.12, color: 'var(--text)' }}>
          {ja ? 'よくある質問' : 'FAQs'}
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQS.map((item, idx) => {
            const isOpen = open === idx
            return (
              <Reveal key={idx} delay={Math.min(idx * 0.05, 0.2)} style={{ background: 'var(--card)', border: '1px solid var(--hairline)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--card-shadow)' }}>
                <button
                  onClick={() => setOpen(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="lp-press"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 'clamp(18px,2.4vw,24px)', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text)', textAlign: 'left' }}
                >
                  <span className={ja ? 'jp' : undefined} style={{ fontSize: 'clamp(16px,1.5vw,19px)', fontWeight: ja ? 600 : 500, lineHeight: 1.4 }}>{item.q[i]}</span>
                  <span style={{ color: 'var(--text-muted)' }}><Chevron open={isOpen} /></span>
                </button>
                {/* grid-rows 0fr→1fr animates the natural height; content stays in the DOM */}
                <div style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.32s cubic-bezier(0.4,0,0.2,1)' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '0 clamp(18px,2.4vw,24px) clamp(20px,2.6vw,26px)' }}>
                      {item.render
                        ? item.render(ja)
                        : (
                          <p className={ja ? 'jp' : undefined} style={{ margin: 0, fontSize: 'clamp(15px,1.2vw,17px)', lineHeight: ja ? 1.85 : 1.7, color: 'var(--text-secondary)' }}>
                            {item.a[i]}
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </section>
  )
}
