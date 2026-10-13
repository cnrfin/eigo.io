'use client'

import { useEffect, useRef, useState } from 'react'
import SquircleCard from '@/components/ui/SquircleCard'
import { pillTabStyle } from '@/lib/pill-tabs'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { DEFAULT_TUTOR_SETTINGS, TUTOR_VOICES, type TutorSettings } from '@/lib/ai-tutor/settings'
import { ORB_COLORS, orbColor, orbSwatch } from '@/lib/ai-tutor/orb-colors'
import AiAvatar from '@/components/ai/AiAvatar'
import { newMood, type AvatarMood } from '@/lib/ai-tutor/avatar-mood'

/** the settings preview avatar smiles for a moment */
const smile = (m: { current: AvatarMood }) => {
  m.current.face = 'happy'
  m.current.until = performance.now() + 1500
}

/**
 * 「AIチューターの設定」: the student's AI tutor settings (dashboard → Settings).
 * Shown only to AI tutor pilot users. Each row: title + what the current choice does (left),
 * options (right). Grouped in lesson order. Changes save straight away and apply from the
 * next AI lesson. Voice ▶ previews come from /api/ai-tutor/voice-preview/<voice>.
 */

type L = { ja: string; en: string }
type Opt = { v: string; label: L; hint: L }
type ChoiceKey = 'speed' | 'pace' | 'tone' | 'formality' | 'japanese' | 'corrections' | 'pronunciation'
type BoolKey = 'blush' | 'warmUp' | 'reviewLast' | 'recap' | 'useHistory'

const CHOICES: Record<ChoiceKey, { title: L; opts: Opt[] }> = {
  speed: {
    title: { ja: '話すスピード', en: 'Speaking speed' },
    opts: [
      { v: 'slow', label: { ja: 'ゆっくり', en: 'Slow' }, hint: { ja: '短い文で、区切りながらゆっくり話します。', en: 'Short sentences, with pauses between ideas.' } },
      { v: 'normal', label: { ja: 'はっきり', en: 'Clear' }, hint: { ja: 'ネイティブより少しゆっくり、はっきり話します。', en: 'A little slower than a native speaker, always clear.' } },
      { v: 'natural', label: { ja: 'ネイティブの速さ', en: 'Native speed' }, hint: { ja: 'ネイティブと話すときと同じ、自然な速さで話します。', en: 'The natural speed of a native speaker.' } },
    ],
  },
  pace: {
    title: { ja: 'レッスンのテンポ', en: 'Lesson pace' },
    opts: [
      { v: 'relaxed', label: { ja: 'じっくり', en: 'Take it slow' }, hint: { ja: 'スライドの内容はすべて扱い、ひとつずつ多めに練習します。', en: 'Covers everything on each slide, with extra practice on each part.' } },
      { v: 'standard', label: { ja: 'バランスよく', en: 'Balanced' }, hint: { ja: 'スライドの内容をすべて、ふつうの練習量で進めます。', en: 'Covers everything on each slide with a normal amount of practice.' } },
      { v: 'brisk', label: { ja: 'テンポよく', en: 'Keep it moving' }, hint: { ja: 'スライドの内容はすべて扱い、できたらすぐ次に進みます。', en: 'Covers everything on each slide, moving on as soon as you’ve got it.' } },
    ],
  },
  tone: {
    title: { ja: '雰囲気', en: 'Personality' },
    opts: [
      { v: 'warm', label: { ja: 'やさしい', en: 'Warm' }, hint: { ja: 'やさしく、たくさん励まします。', en: 'Kind and encouraging.' } },
      { v: 'calm', label: { ja: '落ち着いている', en: 'Calm' }, hint: { ja: '落ち着いていて、急かしません。', en: 'Patient and calm, never rushes you.' } },
      { v: 'upbeat', label: { ja: '明るい', en: 'Upbeat' }, hint: { ja: '明るく、ときどきユーモアも交えます。', en: 'Cheerful, with a bit of humour.' } },
      { v: 'professional', label: { ja: 'ビジネスライク', en: 'Professional' }, hint: { ja: '親しみやすく、でも仕事の場のようにきちんと。', en: 'Friendly but professional, like a work meeting.' } },
    ],
  },
  formality: {
    title: { ja: '言葉づかい', en: 'Formality' },
    opts: [
      { v: 'casual', label: { ja: 'カジュアル', en: 'Casual' }, hint: { ja: '友だちと話すような、ふだんの英語です。', en: 'Everyday English, like talking with a friend.' } },
      { v: 'polite', label: { ja: 'ていねい', en: 'Polite' }, hint: { ja: '仕事やお客さまとの会話のような、ていねいな英語です。', en: 'Polite English, like at work or with customers.' } },
    ],
  },
  japanese: {
    title: { ja: '日本語のサポート', en: 'Japanese support' },
    opts: [
      { v: 'english_only', label: { ja: '英語だけ', en: 'English only' }, hint: { ja: '日本語は使わず、わからないときはやさしい英語で言い換えます。', en: 'No Japanese; if you’re stuck, it says it again in simpler English.' } },
      { v: 'when_stuck', label: { ja: '困ったときだけ', en: 'Only when I’m stuck' }, hint: { ja: '困ったときだけ、日本語で短く説明します。', en: 'A short explanation in Japanese, only when you’re stuck.' } },
      { v: 'grammar', label: { ja: '文法の説明は日本語', en: 'Grammar in Japanese' }, hint: { ja: '会話は英語で、文法の説明だけ日本語でします。', en: 'Conversation in English, grammar explained in Japanese.' } },
    ],
  },
  corrections: {
    title: { ja: '間違いの直し方', en: 'Correcting mistakes' },
    opts: [
      { v: 'relaxed', label: { ja: '大事な間違いだけ', en: 'Only big mistakes' }, hint: { ja: '意味が変わってしまう間違いだけ直します。', en: 'Only mistakes that change the meaning.' } },
      { v: 'end_of_activity', label: { ja: 'アクティビティの後', en: 'After each activity' }, hint: { ja: '話している途中では止めず、アクティビティの後にまとめて直します。', en: 'Doesn’t interrupt you; goes over mistakes after each activity.' } },
      { v: 'immediate', label: { ja: 'その場で', en: 'Right away' }, hint: { ja: 'その場で正しい言い方を伝えて、もう一度言ってもらいます。', en: 'Corrects straight away and has you say it again.' } },
    ],
  },
  pronunciation: {
    title: { ja: '発音のチェック', en: 'Pronunciation checks' },
    opts: [
      { v: 'relaxed', label: { ja: '伝わればOK', en: 'Only if unclear' }, hint: { ja: '聞き取れないときだけ直します。', en: 'Only when a word is hard to understand.' } },
      { v: 'normal', label: { ja: '大事な単語', en: 'Key words' }, hint: { ja: '大事な単語をお手本で一度言って、くり返してもらいます。', en: 'Says key words once for you to repeat.' } },
      { v: 'strict', label: { ja: 'しっかり', en: 'Every sound' }, hint: { ja: '音ひとつひとつをていねいにチェックして、練習します。', en: 'Checks sounds carefully and practises them with you.' } },
    ],
  },
}

const BOOLS: Record<BoolKey, { title: L; on: L; off: L }> = {
  blush: {
    title: { ja: 'ほっぺ', en: 'Rosy cheeks' },
    on: { ja: 'AIチューターの顔のほっぺを、ほんのりピンクにします。', en: 'The AI tutor’s face has soft pink cheeks.' },
    off: { ja: 'ほっぺの色はつけません。', en: 'No cheek colour.' },
  },
  warmUp: {
    title: { ja: 'はじめに雑談', en: 'Warm-up chat' },
    on: { ja: 'レッスンの前に、AIチューターと1〜2分ほど軽く雑談します。', en: 'The AI tutor starts with a minute or two of light chat.' },
    off: { ja: 'あいさつの後、すぐにレッスンを始めます。', en: 'The lesson starts straight after a short hello.' },
  },
  reviewLast: {
    title: { ja: '前回の復習', en: 'Review last lesson' },
    on: { ja: 'レッスンのはじめに、前回のレッスンの内容をAIチューターと一緒に復習します。', en: 'The AI tutor reviews your last lesson with you at the beginning.' },
    off: { ja: '前回の復習はしません。', en: 'No review of your last lesson.' },
  },
  recap: {
    title: { ja: '最後のまとめ', en: 'Recap' },
    on: { ja: 'レッスンの最後に、習った単語・フレーズをAIチューターと一緒に振り返ります。', en: 'The AI tutor recaps vocabulary taught in the lesson with you at the end.' },
    off: { ja: '最後のまとめはしません。', en: 'No recap at the end.' },
  },
  useHistory: {
    title: { ja: 'レッスン履歴を使う', en: 'Use my lesson history' },
    on: { ja: '過去のレッスンの話題やよくある間違いを、AIチューターが参考にします。', en: 'The AI tutor uses topics from past lessons and your common mistakes.' },
    off: { ja: '過去のレッスンの内容は使いません。', en: 'The AI tutor doesn’t look at your past lessons.' },
  },
}

/** Lesson focus: changes how the AI tutor runs the lesson (not extra exercises). */
const FOCUS: { v: TutorSettings['focus'][number]; label: L; hint: L }[] = [
  {
    v: 'speaking',
    label: { ja: '話す', en: 'Speaking' },
    hint: { ja: '質問を多めにして、あなたがたくさん話せるようにします。', en: 'More questions and follow-ups, so you do most of the talking.' },
  },
  {
    v: 'listening',
    label: { ja: '聞く', en: 'Listening' },
    hint: { ja: 'AIチューターが説明や例を多めに話し、聞き取れたか確認します。', en: 'The AI tutor talks you through explanations and examples, then checks you understood.' },
  },
  {
    v: 'reading',
    label: { ja: '音読', en: 'Reading aloud' },
    hint: { ja: '会話文だけでなく、説明・意味・まとめなどスライドの文も読んでもらいます。', en: 'You read more slide text aloud: explanations, meanings and recaps, not just dialogues.' },
  },
  {
    v: 'vocabulary',
    label: { ja: '単語・フレーズ', en: 'Vocabulary' },
    hint: { ja: '大事な単語の意味を確認し、自分の文で使ってもらいます。', en: 'Checks the meaning of key words and has you use them in your own sentences.' },
  },
]

const pillCls = 'px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95'

export default function AiTutorSettingsCard({ locale }: { locale: string }) {
  const { theme } = useTheme()
  const { session } = useAuth()
  const token = session?.access_token
  const [enabled, setEnabled] = useState(false)
  const [s, setS] = useState<TutorSettings>(DEFAULT_TUTOR_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  // the header preview: smiles when its colour or cheeks change, "talks" while a voice preview plays
  const previewMood = useRef(newMood())
  const previewLevel = useRef(0)
  useEffect(() => {
    if (!playing) {
      previewLevel.current = 0
      return
    }
    const t0 = performance.now()
    const id = setInterval(() => {
      const t = (performance.now() - t0) / 1000
      previewLevel.current = Math.max(0, 0.55 + 0.4 * Math.sin(t * 9.1) * Math.sin(t * 2.3 + 1))
    }, 40)
    return () => {
      clearInterval(id)
      previewLevel.current = 0
    }
  }, [playing])
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null)
  const [failed, setFailed] = useState<Record<string, boolean>>({})
  const urls = useRef<Record<string, string>>({})
  const wanted = useRef<string | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ja = locale === 'ja'
  const t = (l: L) => (ja ? l.ja : l.en)
  const th = theme === 'dark' ? 'dark' : 'light'

  useEffect(() => {
    if (!token) return
    let alive = true
    fetch('/api/ai-tutor/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d?.enabled) return
        setEnabled(true)
        if (d.settings) setS(d.settings)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [token])

  useEffect(() => () => audio.current?.pause(), [])

  const play = async (id: string) => {
    audio.current?.pause()
    if (playing === id || loadingVoice === id) {
      wanted.current = null
      setPlaying(null)
      setLoadingVoice(null)
      return
    }
    setPlaying(null)
    wanted.current = id
    let url = urls.current[id]
    if (!url) {
      // the first play of a voice can take a few seconds while the clip is made
      setLoadingVoice(id)
      const r = await fetch(`/api/ai-tutor/voice-preview/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
      const d = r?.ok ? await r.json().catch(() => null) : null
      if (wanted.current === id) setLoadingVoice(null)
      if (!d?.url) {
        setFailed((f) => ({ ...f, [id]: true }))
        return
      }
      url = urls.current[id] = d.url as string
    }
    if (wanted.current !== id) return
    const a = new Audio(url)
    audio.current = a
    a.addEventListener('ended', () => setPlaying((p) => (p === id ? null : p)))
    a.play().then(() => setPlaying(id)).catch(() => setPlaying(null))
  }

  const save = (next: TutorSettings) => {
    setS(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const r = await fetch('/api/ai-tutor/settings', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: next }),
      }).catch(() => null)
      if (r?.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      }
    }, 500)
  }
  const set = <K extends keyof TutorSettings>(k: K, v: TutorSettings[K]) => {
    if (k === 'orbColor' || (k === 'blush' && v)) smile(previewMood)
    save({ ...s, [k]: v })
  }

  if (!enabled) return null

  /* ---------- building blocks ---------- */
  // title + what the current choice does on the left, the options on the right
  const row = (key: string, title: string, now: string | null, control: React.ReactNode) => (
    <div key={key} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderTop: '1px solid var(--hairline)' }}>
      <div className="min-w-0 sm:max-w-[45%]">
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{title}</p>
        {now && <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{now}</p>}
      </div>
      <div className="flex flex-wrap gap-1.5 sm:justify-end">{control}</div>
    </div>
  )
  const choice = (k: ChoiceKey) => {
    const c = CHOICES[k]
    const cur = c.opts.find((o) => o.v === s[k]) ?? c.opts[0]
    return row(
      k,
      t(c.title),
      t(cur.hint),
      c.opts.map((o) => (
        <button key={o.v} onClick={() => set(k, o.v as TutorSettings[typeof k])} className={pillCls} data-fill style={pillTabStyle(s[k] === o.v, th)}>
          {t(o.label)}
        </button>
      )),
    )
  }
  const toggle = (k: BoolKey) => {
    const b = BOOLS[k]
    return row(
      k,
      t(b.title),
      t(s[k] ? b.on : b.off),
      ([true, false] as const).map((v) => (
        <button key={String(v)} onClick={() => set(k, v)} className={pillCls} data-fill style={pillTabStyle(s[k] === v, th)}>
          {v ? (ja ? 'オン' : 'On') : ja ? 'オフ' : 'Off'}
        </button>
      )),
    )
  }
  const text = (k: 'tutorName' | 'callMe', title: L, ph: string) =>
    row(
      k,
      t(title),
      null,
      <input
        value={s[k]}
        maxLength={30}
        placeholder={ph}
        onChange={(e) => set(k, e.target.value)}
        className="text-sm px-3 py-1.5 rounded-lg w-44"
        style={{ background: 'var(--inset)', color: 'var(--text)', border: '1px solid var(--edge)' }}
      />,
    )
  const group = (title: L, children: React.ReactNode) => (
    <div className="mt-6">
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{t(title)}</h3>
      {children}
    </div>
  )

  const voice = TUTOR_VOICES.find((v) => v.id === s.voice) ?? TUTOR_VOICES[0]
  const playIcon = th === 'dark' ? '#fff' : '#1c1c1e'
  const focusNow = FOCUS.filter((o) => s.focus.includes(o.v)).map((o) => t(o.hint)).join(' ')

  return (
    <SquircleCard radius={20} className="p-5 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3 mb-1">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{ja ? 'AIチューターの設定' : 'AI tutor settings'}</h2>
            <span className="text-xs" style={{ color: 'var(--accent)', opacity: saved ? 1 : 0, transition: 'opacity .2s' }}>{ja ? '保存しました' : 'Saved'}</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
            {ja ? '変更は次のAIレッスンから反映されます。' : 'Changes apply from your next AI lesson.'}
          </p>
        </div>
        {/* live preview of the AI tutor's avatar: smiles when its colour or cheeks change, talks during voice previews */}
        <div className="w-14 sm:w-16 shrink-0 -my-1">
          <AiAvatar color={s.orbColor} blush={s.blush} mood={previewMood} level={previewLevel} title={s.tutorName || (ja ? 'AIチューター' : 'AI tutor')} />
        </div>
      </div>

      {group({ ja: 'AIチューター', en: 'Your AI tutor' }, (
        <>
          {row(
            'voice',
            ja ? '声' : 'Voice',
            [voice.label, ja ? voice.noteJa : voice.note].filter(Boolean).join(' · '),
            TUTOR_VOICES.map((v) => {
              const on = s.voice === v.id
              return (
                <span key={v.id} className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1 transition-all duration-[120ms] ease-out" style={pillTabStyle(on, th)}>
                  {!failed[v.id] ? (
                    <button
                      onClick={() => play(v.id)}
                      aria-label={`${ja ? '試聴' : 'Preview'}: ${v.label}`}
                      className="w-6 h-6 rounded-full grid place-items-center transition-transform active:scale-90"
                      style={{ background: 'rgba(255,255,255,0.35)', color: playIcon }}
                    >
                      {loadingVoice === v.id ? (
                        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden className="animate-spin"><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 9" /></svg>
                      ) : playing === v.id ? (
                        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden><rect x="1" y="1" width="3" height="8" rx="1" fill="currentColor" /><rect x="6" y="1" width="3" height="8" rx="1" fill="currentColor" /></svg>
                      ) : (
                        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden><path d="M2.5 1.2v7.6L8.8 5z" fill="currentColor" /></svg>
                      )}
                    </button>
                  ) : (
                    <span className="w-1" />
                  )}
                  <button onClick={() => set('voice', v.id)} aria-pressed={on} className="text-xs font-medium active:scale-95 transition-transform">
                    {v.label}
                  </button>
                </span>
              )
            }),
          )}
          {row(
            'orbColor',
            ja ? '色' : 'Colour',
            t(orbColor(s.orbColor)),
            ORB_COLORS.map((c) => {
              const on = s.orbColor === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => set('orbColor', c.id)}
                  aria-label={t(c)}
                  aria-pressed={on}
                  title={t(c)}
                  className="w-9 h-9 rounded-full grid place-items-center transition-transform duration-[120ms] ease-out hover:scale-[1.06] active:scale-95"
                  style={{ boxShadow: on ? '0 0 0 2px var(--accent)' : '0 0 0 1px var(--edge)' }}
                >
                  <span className="w-7 h-7 rounded-full" style={{ background: orbSwatch(c) }} />
                </button>
              )
            }),
          )}
          {toggle('blush')}
          {text('tutorName', { ja: 'AIチューターの名前', en: 'AI tutor’s name' }, ja ? '例：Emma' : 'e.g. Emma')}
          {text('callMe', { ja: 'あなたの呼び方', en: 'What the AI tutor calls you' }, ja ? '例：Aiko' : 'e.g. Aiko')}
        </>
      ))}

      {group({ ja: '話し方', en: 'How the AI tutor talks' }, (
        <>
          {choice('speed')}
          {choice('pace')}
          {choice('tone')}
          {choice('formality')}
          {choice('japanese')}
        </>
      ))}

      {group({ ja: '間違いと重点', en: 'Mistakes and focus' }, (
        <>
          {choice('corrections')}
          {choice('pronunciation')}
          {row(
            'focus',
            ja ? 'レッスンの重点' : 'Lesson focus',
            focusNow,
            FOCUS.map((o) => {
              const on = s.focus.includes(o.v)
              return (
                <button
                  key={o.v}
                  onClick={() => set('focus', on ? (s.focus.length > 1 ? s.focus.filter((x) => x !== o.v) : s.focus) : [...s.focus, o.v])}
                  aria-pressed={on}
                  className={pillCls}
                  data-fill
                  style={pillTabStyle(on, th)}
                >
                  {t(o.label)}
                </button>
              )
            }),
          )}
        </>
      ))}

      {group({ ja: 'レッスンの流れ', en: 'Lesson structure' }, (
        <>
          {toggle('warmUp')}
          {toggle('reviewLast')}
          {toggle('recap')}
        </>
      ))}

      {group({ ja: 'あなたについて', en: 'About you' }, (
        <>
          <div className="py-4" style={{ borderTop: '1px solid var(--hairline)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{ja ? '自己紹介' : 'About me'}</p>
            <textarea
              value={s.aboutMe}
              maxLength={600}
              rows={3}
              placeholder={ja ? '仕事、趣味、目標など。AIチューターが会話の話題を選ぶときに使います。' : 'Your job, hobbies and goals. The AI tutor uses this to choose conversation topics.'}
              onChange={(e) => set('aboutMe', e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg mt-3"
              style={{ background: 'var(--inset)', color: 'var(--text)', border: '1px solid var(--edge)', resize: 'vertical' }}
            />
          </div>
          {toggle('useHistory')}
        </>
      ))}
    </SquircleCard>
  )
}
