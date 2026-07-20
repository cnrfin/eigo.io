'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Squircle } from '@squircle-js/react'
import SquircleBox from '@/components/ui/SquircleBox'
import { useTheme } from '@/context/ThemeContext'
import { pillTabStyle } from '@/lib/pill-tabs'
import type { SoundTrainerData, TWord } from '@/lib/pronunciation/words'

/* Interactive R/L sound trainer. Real UK recordings drive the audio; the compare
   tiles visualise the actual waveform via a Web Audio AnalyserNode. Styled from
   the site tokens; squircle surfaces; dashboard pill-tabs for the how-to. */

const MAGENTA = 'var(--v3-level)'   // the landing's magenta (level-check card #e85d8a), for the L side
const colorFor = (role: 'r' | 'l') => (role === 'r' ? 'var(--accent)' : MAGENTA)
const pillCls = 'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-[120ms] ease-out hover:scale-[1.03] active:scale-95'

// One shared AudioContext; one audio element playing at a time.
let _ctx: AudioContext | null = null
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!_ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (AC) _ctx = new AC()
  }
  return _ctx
}
let _current: HTMLAudioElement | null = null
function playOnly(a: HTMLAudioElement) { if (_current && _current !== a) _current.pause(); _current = a }
function playUrl(url: string) { const a = new Audio(url); playOnly(a); a.play().catch(() => {}) }

// Answer feedback sounds, shared with the course lesson player (public/sounds).
// Decoded into Web Audio buffers up front — HTMLAudio adds noticeable lag on
// the first play, which would land after the on-screen feedback.
const SFX = ['correct', 'wrong'] as const
type Sfx = (typeof SFX)[number]
const sfxBuffers: Partial<Record<Sfx, AudioBuffer>> = {}
let sfxRequested = false
function loadSfx() {
  if (sfxRequested) return
  const ctx = getCtx()
  if (!ctx) return
  sfxRequested = true
  for (const name of SFX) {
    fetch(`/sounds/${name}.mp3`)
      .then((r) => r.arrayBuffer())
      .then((b) => ctx.decodeAudioData(b))
      .then((buf) => { sfxBuffers[name] = buf })
      .catch(() => {})
  }
}
function playSfx(name: Sfx) {
  try {
    const ctx = getCtx()
    const buf = sfxBuffers[name]
    if (!ctx || !buf) return
    // Autoplay policy: this runs inside the click handler, so resuming is allowed.
    if (ctx.state === 'suspended') void ctx.resume()
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start()
  } catch { /* no sound is never an error */ }
}

const card: CSSProperties = { background: 'var(--card)', boxShadow: 'inset 0 0 0 1px var(--border)', padding: 'clamp(20px,3vw,28px)', display: 'block' }
const secTitle: CSSProperties = { margin: '0 0 16px', fontSize: 19, fontWeight: 500, letterSpacing: '-.01em' }

function CompareTile({ w, voice, short }: { w: TWord; voice: number; short: string }) {
  const color = colorFor(w.role)
  const aRef = useRef<HTMLAudioElement>(null)
  const anRef = useRef<AnalyserNode | null>(null)
  const srcRef = useRef<MediaElementAudioSourceNode | null>(null)
  const bars = useRef<(HTMLSpanElement | null)[]>([])
  const raf = useRef(0)
  const BARS = 15

  const reset = () => bars.current.forEach((b) => { if (b) b.style.height = '5px' })
  const viz = () => {
    const an = anRef.current
    if (an) {
      const data = new Uint8Array(an.frequencyBinCount)
      const loop = () => { an.getByteFrequencyData(data); bars.current.forEach((b, i) => { if (b) b.style.height = Math.max(4, (data[i * 2] || 0) / 255 * 28) + 'px' }); raf.current = requestAnimationFrame(loop) }
      loop()
    } else {
      const loop = () => { bars.current.forEach((b) => { if (b) b.style.height = (5 + Math.random() * 18) + 'px' }); raf.current = requestAnimationFrame(loop) }
      loop()
    }
  }
  const play = () => {
    const a = aRef.current; if (!a) return
    a.src = w.audio[voice]
    const c = getCtx()
    if (c) {
      if (!srcRef.current) {
        try { srcRef.current = c.createMediaElementSource(a); anRef.current = c.createAnalyser(); anRef.current.fftSize = 64; srcRef.current.connect(anRef.current); anRef.current.connect(c.destination) } catch { /* ignore */ }
      }
      if (c.state === 'suspended') c.resume()
    }
    playOnly(a); a.currentTime = 0; a.play().catch(() => {})
  }
  useEffect(() => {
    const a = aRef.current; if (!a) return
    const onPlay = () => viz()
    const onStop = () => { cancelAnimationFrame(raf.current); reset() }
    a.addEventListener('play', onPlay); a.addEventListener('ended', onStop); a.addEventListener('pause', onStop)
    return () => { a.removeEventListener('play', onPlay); a.removeEventListener('ended', onStop); a.removeEventListener('pause', onStop); cancelAnimationFrame(raf.current) }
  }, [])

  return (
    <SquircleBox cornerRadius={20} style={{ boxShadow: 'inset 0 0 0 1px var(--border)', padding: 22, textAlign: 'center' }}>
      <audio ref={aRef} preload="none" />
      <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1 }}>{w.word}</div>
      <div style={{ fontSize: 17, fontWeight: 600, color, marginTop: 6 }}>{w.ipa}</div>
      <div className="jp" style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{w.ja}</div>
      <button onClick={play} aria-label={`${w.word} を再生`} className="lp-press" style={{ width: 58, height: 58, borderRadius: '50%', border: 0, background: color, color: '#fff', fontSize: 20, cursor: 'pointer', margin: '16px 0 0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>▶</button>
      <div style={{ display: 'flex', gap: 3, justifyContent: 'center', alignItems: 'center', height: 30, marginTop: 12 }}>
        {Array.from({ length: BARS }).map((_, i) => <span key={i} ref={(el) => { bars.current[i] = el }} style={{ width: 3, height: 5, borderRadius: 3, background: color, display: 'block' }} />)}
      </div>
      <p className="jp" style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '12px 0 0', lineHeight: 1.6 }}>{short}</p>
    </SquircleBox>
  )
}

export default function SoundTrainer({ data }: { data: SoundTrainerData }) {
  const { theme } = useTheme()
  const [voice, setVoice] = useState(0)
  const [tab, setTab] = useState<'r' | 'l'>('r')
  const [q, setQ] = useState<{ target: TWord; opts: TWord[] } | null>(null)
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [fb, setFb] = useState<{ t: string; ok: boolean } | null>(null)
  const [answered, setAnswered] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const newQ = () => {
    const p = data.pairs[Math.floor(Math.random() * data.pairs.length)]
    const target = p[Math.floor(Math.random() * 2)]
    setQ({ target, opts: [...p].sort(() => Math.random() - 0.5) }); setFb(null); setAnswered(null)
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { newQ(); loadSfx() }, [])

  const choose = (w: TWord) => {
    if (answered || !q) return
    setAnswered(w.slug); setTotal((t) => t + 1)
    const right = w.slug === q.target.slug
    playSfx(right ? 'correct' : 'wrong')
    if (right) { setStreak((s) => s + 1); setScore((s) => s + 1); setFb({ t: '正解！', ok: true }) }
    else { setStreak(0); setFb({ t: `もう一度きいてみよう（正解は ${q.target.word}）`, ok: false }) }
    setTimeout(newQ, 1300)
  }

  const th = theme === 'dark' ? 'dark' : 'light'
  const side = data.sides[tab]
  const sideCol = colorFor(tab)
  const keyBg = tab === 'r' ? 'var(--accent-bg)' : 'rgba(232,93,138,0.15)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1 — compare */}
      <SquircleBox cornerRadius={22} style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <h2 style={{ ...secTitle, margin: 0 }} className="jp">聞き比べる</h2>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {data.voiceLabels.map((label, i) => (
              <button key={label} onClick={() => setVoice(i)} aria-pressed={voice === i} className={`jp ${pillCls}`} style={pillTabStyle(voice === i, th)}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 14 }}>
          {data.featured.map((w) => <CompareTile key={w.slug} w={w} voice={voice} short={data.sides[w.role].short} />)}
        </div>
      </SquircleBox>

      {/* 2 — how to */}
      <SquircleBox cornerRadius={22} style={card}>
        <h2 style={secTitle} className="jp">発音のしかた</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {(['r', 'l'] as const).map((s) => (
            <button key={s} onClick={() => setTab(s)} aria-pressed={tab === s} className={`jp ${pillCls}`} style={pillTabStyle(tab === s, th)}>{data.sides[s].label} の作り方</button>
          ))}
        </div>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {side.steps.map((st, i) => (
            <li key={i} className="jp" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <span style={{ flex: 'none', width: 28, height: 28, borderRadius: '50%', background: 'var(--card-inset)', color: sideCol, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
              <span style={{ fontSize: 16, lineHeight: 1.7, paddingTop: 3 }}>{st}</span>
            </li>
          ))}
        </ol>
        <SquircleBox cornerRadius={14} style={{ background: keyBg, padding: '14px 16px', marginTop: 14, display: 'block' }}>
          <p className="jp" style={{ margin: 0, fontSize: 14, lineHeight: 1.8 }}><span style={{ color: sideCol, fontWeight: 700, marginRight: 8 }}>ポイント</span>{side.keyJa}</p>
        </SquircleBox>
      </SquircleBox>

      {/* 3 — game */}
      <SquircleBox cornerRadius={22} style={card}>
        <h2 style={secTitle} className="jp">どっちに聞こえた？</h2>
        <div style={{ textAlign: 'center' }}>
          <button onClick={() => q && playUrl(q.target.audio[voice])} aria-label="音声を再生" className="lp-press" style={{ width: 72, height: 72, borderRadius: '50%', border: 0, background: 'var(--accent)', color: '#fff', fontSize: 26, cursor: 'pointer', marginBottom: 16 }}>▶</button>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {q?.opts.map((o) => {
              const isTarget = answered && o.slug === q.target.slug
              const isWrong = answered === o.slug && o.slug !== q.target.slug
              const bg = isTarget ? 'var(--accent)' : isWrong ? 'rgba(232,93,138,.2)' : 'var(--card-inset)'
              const col = isTarget ? '#fff' : 'var(--text)'
              return (
                <Squircle key={o.slug} asChild cornerRadius={14} cornerSmoothing={0.8}>
                  <button onClick={() => choose(o)} className="lp-press" style={{ minWidth: 150, height: 54, background: bg, color: col, border: 0, fontSize: 18, fontWeight: 600, cursor: 'pointer' }}>{o.word}</button>
                </Squircle>
              )
            })}
          </div>
          <div className="jp" style={{ height: 22, marginTop: 14, fontSize: 14, fontWeight: 600, color: fb?.ok ? 'var(--accent)' : MAGENTA }}>{fb?.t || ''}</div>
          <div className="jp" style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 14, fontSize: 14, color: 'var(--text-secondary)' }}>
            <span>連続正解 <b style={{ color: 'var(--accent)', fontSize: 16 }}>{streak}</b></span>
            <span>スコア <b style={{ color: 'var(--accent)', fontSize: 16 }}>{score}</b> / {total}</span>
          </div>
        </div>
      </SquircleBox>

      {/* 4 — similar words */}
      <SquircleBox cornerRadius={22} style={card}>
        <h2 style={secTitle} className="jp">聞きまちがえやすい単語</h2>
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {data.pairs.map(([a, b]) => (
            <div key={a.slug} style={{ display: 'flex', alignItems: 'center', gap: '10px 18px', flexWrap: 'wrap', padding: '13px 2px', borderBottom: '1px solid var(--border)' }}>
              {[a, b].map((x) => (
                <div key={x.slug} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ minWidth: 92 }}><b style={{ fontSize: 17, fontWeight: 600 }}>{x.word}</b> <span style={{ fontSize: 12, color: colorFor(x.role) }}>{x.ipa}</span></span>
                  <button onClick={() => playUrl(x.audio[voice])} aria-label={`${x.word} を再生`} className="lp-press" style={{ width: 38, height: 38, borderRadius: '50%', border: 0, background: 'var(--card-inset)', color: 'var(--text-secondary)', cursor: 'pointer', flex: 'none', fontSize: 13 }}>▶</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </SquircleBox>

      {/* 5 — faq */}
      <SquircleBox cornerRadius={22} style={card}>
        <h2 style={secTitle} className="jp">よくある質問</h2>
        {data.faqs.map((f, i) => (
          <div key={i} className="jp" style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', background: 'transparent', border: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '15px 0', textAlign: 'left', color: 'var(--text)' }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{f.q}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 18, transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: '.15s' }}>+</span>
            </button>
            {openFaq === i && <p style={{ margin: '0 0 15px', fontSize: 14, lineHeight: 1.85, color: 'var(--text-secondary)' }}>{f.a}</p>}
          </div>
        ))}
      </SquircleBox>
    </div>
  )
}
