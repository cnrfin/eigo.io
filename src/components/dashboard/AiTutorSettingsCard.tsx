'use client'

import { useEffect, useRef, useState } from 'react'
import SquircleCard from '@/components/ui/SquircleCard'
import { pillTabStyle } from '@/lib/pill-tabs'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { DEFAULT_TUTOR_SETTINGS, TUTOR_VOICES, type TutorSettings } from '@/lib/ai-tutor/settings'

/**
 * 「マイAIチューター」: the student's AI tutor settings (dashboard → Settings).
 * Shown only to AI tutor pilot users. Same row + pill pattern as the other
 * settings; every change saves straight away. Settings apply from the next lesson.
 */

type Opt<T extends string> = { v: T; ja: string; en: string }

export default function AiTutorSettingsCard({ locale }: { locale: string }) {
  const { theme } = useTheme()
  const { session } = useAuth()
  const token = session?.access_token
  const [enabled, setEnabled] = useState(false)
  const [s, setS] = useState<TutorSettings>(DEFAULT_TUTOR_SETTINGS)
  const [saved, setSaved] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ja = locale === 'ja'
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
  const set = <K extends keyof TutorSettings>(k: K, v: TutorSettings[K]) => save({ ...s, [k]: v })

  if (!enabled) return null

  const row = (title: string, sub: string | null, control: React.ReactNode, first = false) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4" style={first ? undefined : { borderTop: '1px solid var(--hairline)' }}>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{title}</p>
        {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>{sub}</p>}
      </div>
      <div className="flex flex-wrap gap-1.5 shrink-0">{control}</div>
    </div>
  )
  const pills = <K extends keyof TutorSettings>(k: K, opts: Opt<string>[]) =>
    opts.map((o) => (
      <button
        key={o.v}
        onClick={() => set(k, o.v as TutorSettings[K])}
        className="px-3 py-1 text-xs font-medium rounded-full transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95"
        data-fill
        style={pillTabStyle(s[k] === o.v, th)}
      >
        {ja ? o.ja : o.en}
      </button>
    ))
  const input = (k: 'tutorName' | 'callMe', ph: string) => (
    <input
      value={s[k]}
      maxLength={30}
      placeholder={ph}
      onChange={(e) => set(k, e.target.value)}
      className="text-sm px-3 py-1.5 rounded-lg w-44"
      style={{ background: 'var(--inset)', color: 'var(--text)', border: '1px solid var(--edge)' }}
    />
  )
  const bool = (k: 'warmUp' | 'recap' | 'useHistory') =>
    ([true, false] as const).map((v) => (
      <button key={String(v)} onClick={() => set(k, v)} className="px-3 py-1 text-xs font-medium rounded-full transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95" data-fill style={pillTabStyle(s[k] === v, th)}>
        {v ? (ja ? 'オン' : 'On') : ja ? 'オフ' : 'Off'}
      </button>
    ))
  const focusAll = [
    { v: 'speaking', ja: 'スピーキング', en: 'Speaking' },
    { v: 'listening', ja: 'リスニング', en: 'Listening' },
    { v: 'reading', ja: '音読', en: 'Reading aloud' },
    { v: 'vocabulary', ja: '語彙', en: 'Vocabulary' },
  ] as const

  return (
    <SquircleCard radius={20} className="p-5 sm:p-8">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{ja ? 'マイAIチューター' : 'My AI tutor'}</h2>
        <span className="text-xs" style={{ color: 'var(--accent)', opacity: saved ? 1 : 0, transition: 'opacity .2s' }}>{ja ? '保存しました' : 'Saved'}</span>
      </div>
      <p className="text-xs mb-2" style={{ color: 'var(--text-subtle)' }}>
        {ja ? '次のAIレッスンから反映されます。' : 'Changes apply from your next AI lesson.'}
      </p>
      <div className="space-y-4">
        {row(ja ? '声' : 'Voice', null, TUTOR_VOICES.map((v) => (
          <button key={v.id} onClick={() => set('voice', v.id)} className="px-3 py-1 text-xs font-medium rounded-full transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95" data-fill style={pillTabStyle(s.voice === v.id, th)} title={v.note}>
            {v.label}
          </button>
        )), true)}
        {row(ja ? '話す速さ' : 'Speaking speed', null, pills('speed', [{ v: 'slow', ja: 'ゆっくり', en: 'Slow' }, { v: 'normal', ja: 'ふつう', en: 'Normal' }, { v: 'natural', ja: 'ナチュラル', en: 'Natural' }]))}
        {row(ja ? '日本語のサポート' : 'Japanese support', null, pills('japanese', [{ v: 'english_only', ja: '英語のみ', en: 'English only' }, { v: 'when_stuck', ja: '困ったときだけ', en: 'When I’m stuck' }, { v: 'grammar', ja: '文法は日本語で', en: 'Grammar in Japanese' }]))}
        {row(ja ? '間違いの直し方' : 'Corrections', null, pills('corrections', [{ v: 'relaxed', ja: '小さな間違いは流す', en: 'Let small ones go' }, { v: 'end_of_activity', ja: 'アクティビティの後', en: 'After each activity' }, { v: 'immediate', ja: 'すぐに', en: 'Straight away' }]))}
        {row(ja ? '発音のチェック' : 'Pronunciation', null, pills('pronunciation', [{ v: 'relaxed', ja: 'ゆるめ', en: 'Relaxed' }, { v: 'normal', ja: 'ふつう', en: 'Normal' }, { v: 'strict', ja: 'しっかり', en: 'Strict' }]))}
        {row(ja ? '多めに練習したいこと' : 'Focus on', ja ? '複数選べます' : 'Choose any', focusAll.map((o) => {
          const on = s.focus.includes(o.v)
          return (
            <button key={o.v} onClick={() => set('focus', on ? (s.focus.length > 1 ? s.focus.filter((x) => x !== o.v) : s.focus) : [...s.focus, o.v])} className="px-3 py-1 text-xs font-medium rounded-full transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95" data-fill style={pillTabStyle(on, th)}>
              {ja ? o.ja : o.en}
            </button>
          )
        }))}
        {row(ja ? 'ペース' : 'Pace', null, pills('pace', [{ v: 'relaxed', ja: 'ゆったり', en: 'Relaxed' }, { v: 'standard', ja: 'ふつう', en: 'Standard' }, { v: 'brisk', ja: 'テンポよく', en: 'Brisk' }]))}
        {row(ja ? '雰囲気' : 'Tone', null, pills('tone', [{ v: 'warm', ja: 'やさしく', en: 'Warm' }, { v: 'calm', ja: '落ち着いて', en: 'Calm' }, { v: 'upbeat', ja: '明るく', en: 'Upbeat' }, { v: 'professional', ja: 'ビジネス風', en: 'Professional' }]))}
        {row(ja ? '話し方' : 'Formality', null, pills('formality', [{ v: 'casual', ja: 'カジュアル', en: 'Casual' }, { v: 'polite', ja: 'ていねい', en: 'Polite' }]))}
        {row(ja ? 'チューターの名前' : 'Tutor’s name', null, input('tutorName', ja ? '例：Emma' : 'e.g. Emma'))}
        {row(ja ? '呼んでほしい名前' : 'Call me', null, input('callMe', ja ? '例：Aiko' : 'e.g. Aiko'))}
        <div className="pt-4" style={{ borderTop: '1px solid var(--hairline)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{ja ? 'わたしについて' : 'About me'}</p>
          <p className="text-xs mt-1 mb-2" style={{ color: 'var(--text-subtle)' }}>
            {ja ? '仕事、趣味、目標など（会話の話題に使われます）' : 'Your job, hobbies and goals (used for conversation topics)'}
          </p>
          <textarea
            value={s.aboutMe}
            maxLength={600}
            rows={3}
            onChange={(e) => set('aboutMe', e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg"
            style={{ background: 'var(--inset)', color: 'var(--text)', border: '1px solid var(--edge)', resize: 'vertical' }}
          />
        </div>
        {row(ja ? '最初に軽い雑談' : 'Warm-up chat first', null, bool('warmUp'))}
        {row(ja ? '最後に3つのフレーズをまとめる' : 'Recap 3 phrases at the end', null, bool('recap'))}
        {row(ja ? 'レッスン履歴を使う' : 'Use my lesson history', ja ? '過去のレッスンの話題やよくある間違いを参考にします' : 'Lets the tutor use past topics and common mistakes', bool('useHistory'))}
      </div>
    </SquircleCard>
  )
}
