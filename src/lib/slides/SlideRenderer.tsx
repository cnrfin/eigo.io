'use client'

/**
 * Renders an eigo slide. Shared by the course studio and the eigo.io lesson
 * page — keep it free of Next.js / app-specific imports.
 *
 * The slide is laid out on a fixed 1280×960 (4:3) stage and scaled to fit the
 * container width, so typography and spacing are identical at every size.
 * Import './slides.css' once wherever this is used.
 */
import { createContext, Fragment, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { STAGE_H, STAGE_W } from './templates'
import type {
  Block,
  Character,
  CalloutBlock,
  DialogueBlock,
  HeadingBlock,
  ImageBlock,
  ListBlock,
  MatchBlock,
  MediaBlock,
  PhrasesBlock,
  Slide,
  TextBlock,
  TrueFalseBlock,
  VocabBlock,
  VocabItem,
} from './types'

export type SlideMode = 'student' | 'teacher' | 'editor'

export interface SlideRendererProps {
  slide: Slide
  /** student hides tutor-only blocks; teacher/editor show them, marked. */
  mode?: SlideMode
  /** Prefix for relative image paths, e.g. "/files/c_123/" or a storage URL. */
  assetBase?: string
  /** Rendered on top of the slide in UNSCALED container space (percent coords). */
  overlay?: ReactNode
  className?: string
}

export function resolveAsset(src: string, assetBase = ''): string {
  if (!src) return ''
  if (/^(https?:|data:|blob:|\/)/.test(src)) return src
  return assetBase.replace(/\/?$/, '/') + src
}

/** **bold**, __underline__ + line breaks. Blank lines start a new paragraph. */
export function RichText({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/)
  return (
    <>
      {paragraphs.map((p, pi) => (
        <p key={pi} className="es-p">
          {p.split('\n').map((line, li) => (
            <Fragment key={li}>
              {li > 0 && <br />}
              {line.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).map((seg, si) =>
                seg.startsWith('**') && seg.endsWith('**') && seg.length > 4 ? (
                  <strong key={si}>{seg.slice(2, -2)}</strong>
                ) : seg.startsWith('__') && seg.endsWith('__') && seg.length > 4 ? (
                  <u key={si} className="es-u">
                    {seg.slice(2, -2)}
                  </u>
                ) : (
                  <Fragment key={si}>{seg}</Fragment>
                ),
              )}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  )
}

function HeadingView({ b }: { b: HeadingBlock }) {
  return (
    <h2 className={`es-heading es-size-${b.size} es-align-${b.align}`} style={{ textAlign: b.align }}>
      {b.text}
    </h2>
  )
}

function TextView({ b }: { b: TextBlock }) {
  return (
    <div className={`es-text es-size-${b.size} es-tone-${b.tone}`} style={{ textAlign: b.align }}>
      <RichText text={b.text} />
    </div>
  )
}

function ListView({ b }: { b: ListBlock }) {
  const Tag = b.style === 'numbered' ? 'ol' : 'ul'
  return (
    <div className={`es-list es-size-${b.size} es-tone-${b.tone}`}>
      {b.title ? <div className="es-list-title">{b.title}</div> : null}
      <Tag className={`es-list-items es-list-${b.style}`} style={typeof b.gap === 'number' ? { gap: b.gap } : undefined}>
        {b.items.map((item, i) => (
          <li key={i}>
            <span className="es-marker" aria-hidden>
              {b.style === 'numbered' ? i + 1 : b.style === 'check' ? '✓' : ''}
            </span>
            <span className="es-li-text">
              <RichText text={item} />
            </span>
          </li>
        ))}
      </Tag>
    </div>
  )
}

/** object-fit plus the crop position/zoom (crop only applies to Fill). */
export function imageStyle(b: Pick<ImageBlock, 'fit' | 'crop'>): CSSProperties {
  const c = b.fit === 'cover' ? b.crop : undefined
  if (!c) return { objectFit: b.fit }
  const pos = `${c.x}% ${c.y}%`
  return {
    objectFit: 'cover',
    objectPosition: pos,
    ...(c.zoom > 1 ? { transform: `scale(${c.zoom})`, transformOrigin: pos } : null),
  }
}

function ImageView({ b, assetBase }: { b: ImageBlock; assetBase?: string }) {
  const src = resolveAsset(b.src, assetBase)
  return (
    <figure className={`es-image${b.rounded ? ' is-rounded' : ''}${src ? ' has-src' : ''}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={b.alt} style={imageStyle(b)} draggable={false} />
      ) : (
        <div className="es-image-empty">Image</div>
      )}
      {b.credit ? <figcaption className="es-credit">{b.credit}</figcaption> : null}
    </figure>
  )
}

/**
 * “Save to my cards”. The eigo.io lesson page provides this so a student can
 * turn any vocabulary row into a review card. Without a provider (studio,
 * teacher view) the button shows as a preview and does nothing.
 */
export interface VocabSaveApi {
  isSaved: (item: VocabItem) => boolean
  toggle: (item: VocabItem) => void
}
const VocabSaveContext = createContext<VocabSaveApi | null>(null)
export function SlideVocabSave({ value, children }: { value: VocabSaveApi | null; children: ReactNode }) {
  return <VocabSaveContext.Provider value={value}>{children}</VocabSaveContext.Provider>
}

function VocabView({ b }: { b: VocabBlock }) {
  const save = useContext(VocabSaveContext)
  return (
    <div className="es-vocab-table">
      {b.items.map((it, i) => {
        const saved = save?.isSaved(it) ?? false
        return (
          <div key={it.id ?? i} className="es-vrow">
            <div className="es-vword">
              <div className="es-vocab-term">{it.term}</div>
              {it.pos ? <div className="es-vocab-pos">{it.pos}</div> : null}
              {b.showJa && it.ja ? <div className="es-vocab-ja es-jp">{it.ja}</div> : null}
            </div>
            <div className="es-vmean">
              {b.showMeaning && it.meaning ? <div className="es-vocab-meaning">{it.meaning}</div> : null}
              {b.showExample && it.example ? (
                <div className="es-vocab-example">
                  <RichText text={it.example} />
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className={`es-vsave${saved ? ' is-saved' : ''}${save ? '' : ' is-preview'}`}
              aria-label={saved ? `Saved: ${it.term}` : `Save “${it.term}” to my review cards`}
              aria-pressed={saved}
              title={saved ? 'Saved to your cards' : 'Save to your cards'}
              tabIndex={save ? 0 : -1}
              onClick={save ? () => save.toggle(it) : undefined}
            >
              <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
                {saved ? (
                  <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Play/pause events from video and audio blocks. The eigo.io lesson page can
 * use this to keep the teacher’s and student’s clips in sync; the studio
 * doesn’t need it.
 */
export interface MediaSyncApi {
  onEvent?: (blockId: string, action: 'play' | 'pause' | 'ended', time: number) => void
}
const MediaSyncContext = createContext<MediaSyncApi | null>(null)
export function SlideMediaSync({ value, children }: { value: MediaSyncApi | null; children: ReactNode }) {
  return <MediaSyncContext.Provider value={value}>{children}</MediaSyncContext.Provider>
}

const fmt = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')

function PlayIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  )
}
function PauseIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
    </svg>
  )
}

/** `live` is false in the editor and slide thumbnails, so nothing autoplays there. */
function MediaView({ b, assetBase, blockId, live }: { b: MediaBlock; assetBase?: string; blockId: string; live: boolean }) {
  const sync = useContext(MediaSyncContext)
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const src = resolveAsset(b.src, assetBase)
  const poster = b.poster ? resolveAsset(b.poster, assetBase) : undefined

  const autoplay = b.kind === 'video' && !!b.autoplay && live
  useEffect(() => {
    const el = ref.current
    // Autoplay when the slide opens. Muted, because browsers block autoplay with sound.
    if (el && autoplay) {
      el.muted = true
      void el.play().catch(() => undefined)
    }
    // Stop when the slide changes or the clip is replaced.
    return () => el?.pause()
  }, [src, autoplay])

  const toggle = () => {
    const el = ref.current
    if (!el || !src) return
    if (el.paused) void el.play().catch(() => undefined)
    else el.pause()
  }
  const events = {
    onPlay: () => {
      setPlaying(true)
      sync?.onEvent?.(blockId, 'play', ref.current?.currentTime ?? 0)
    },
    onPause: () => {
      setPlaying(false)
      sync?.onEvent?.(blockId, 'pause', ref.current?.currentTime ?? 0)
    },
    onEnded: () => {
      setPlaying(false)
      sync?.onEvent?.(blockId, 'ended', ref.current?.duration ?? 0)
    },
    onTimeUpdate: () => setTime(ref.current?.currentTime ?? 0),
    onLoadedMetadata: () => setDuration(ref.current?.duration ?? 0),
  }
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || !duration) return
    const r = e.currentTarget.getBoundingClientRect()
    el.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration
  }
  const pct = duration ? (time / duration) * 100 : 0

  if (b.kind === 'audio')
    return (
      <div className={`es-audio${src ? '' : ' is-empty'}`}>
        <button type="button" className="es-media-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} disabled={!src}>
          {playing ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
        </button>
        <div className="es-audio-main">
          <div className="es-audio-label">{b.label || (src ? 'Listen' : 'Audio clip')}</div>
          <div className="es-audio-track" onClick={seek}>
            <div className="es-audio-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="es-audio-time">
          {fmt(time)} / {fmt(duration)}
        </div>
        {src ? <audio ref={ref} src={src} preload="metadata" loop={b.loop} {...events} /> : null}
      </div>
    )

  return (
    <figure className={`es-video${b.rounded ? ' is-rounded' : ''}${src ? '' : ' is-empty'}${playing ? ' is-playing' : ''}`}>
      {src ? (
        <video
          ref={ref}
          src={src}
          poster={poster}
          playsInline
          muted={autoplay || undefined}
          preload={autoplay ? 'auto' : 'metadata'}
          loop={b.loop}
          style={{ objectFit: b.fit }}
          onClick={toggle}
          {...events}
        />
      ) : (
        <div className="es-image-empty">Video</div>
      )}
      {src ? (
        <>
          {playing ? null : (
            <button type="button" className="es-media-btn es-video-play" onClick={toggle} aria-label="Play">
              <PlayIcon size={44} />
            </button>
          )}
          <div className="es-video-bar">
            <button type="button" className="es-video-mini" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
            </button>
            <div className="es-video-track" onClick={seek}>
              <div className="es-audio-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </>
      ) : null}
    </figure>
  )
}

function PhrasesView({ b }: { b: PhrasesBlock }) {
  return (
    <div className="es-phrases">
      {b.title ? <div className="es-list-title">{b.title}</div> : null}
      <div className="es-pills">
        {b.items.filter((x) => x.trim()).map((item, i) => (
          <span key={i} className="es-pill">
            <RichText text={item} />
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Each speaker keeps the same colour on every slide (by name), so recurring
 * characters are recognisable across a whole course. Sides alternate by order
 * of appearance within the dialogue.
 */
export function speakerColor(name: string): number {
  let x = 1
  for (const c of name.trim().toLowerCase()) x = (x * 35 + c.charCodeAt(0)) % 1000003
  return x % 4
}

/** Brand speech-bubble colours a character can use (index = Character.color). */
export const BUBBLE_COLORS = [
  { label: 'Warm grey', bg: '#efeeeb', fg: '#151414' },
  { label: 'Peach', bg: '#fae1d8', fg: '#4a2a1f' },
  { label: 'Teal tint', bg: '#dff5f2', fg: '#0b4f4b' },
  { label: 'Ink', bg: '#1c1c22', fg: '#f3f3f5' },
  { label: 'Deep teal', bg: '#007f78', fg: '#ffffff' },
  { label: 'Soft teal', bg: '#c9efeb', fg: '#0b4f4b' },
  { label: 'Soft yellow', bg: '#fbf0c4', fg: '#4f3e05' },
  { label: 'Soft lavender', bg: '#ece6f8', fg: '#3b2a63' },
] as const

/** The bubble colour for a speaker: the character's chosen colour, else one picked from the name. */
export function characterColor(name: string, characters: Character[] = []): number {
  const key = name.trim().toLowerCase()
  const ch = characters.find((c) => c.name.trim().toLowerCase() === key)
  if (ch && typeof ch.color === 'number' && ch.color >= 0 && ch.color < BUBBLE_COLORS.length) return ch.color
  return speakerColor(name || '?')
}

interface CharacterCtx {
  characters: Character[]
  assetBase?: string
}
const CharactersContext = createContext<CharacterCtx>({ characters: [] })

/**
 * Provide a course's characters to every slide rendered inside, so dialogue
 * avatars show each character's picture. Wrap a lesson page / editor once.
 */
export function SlideCharacters({
  characters,
  assetBase,
  children,
}: {
  characters: Character[] | undefined
  assetBase?: string
  children: ReactNode
}) {
  return <CharactersContext.Provider value={{ characters: characters ?? [], assetBase }}>{children}</CharactersContext.Provider>
}

function DialogueView({ b }: { b: DialogueBlock }) {
  const { characters, assetBase } = useContext(CharactersContext)
  const avatarFor = (speaker: string) => {
    const key = speaker.trim().toLowerCase()
    const ch = characters.find((c) => c.name.trim().toLowerCase() === key)
    return ch?.avatar ? resolveAsset(ch.avatar, assetBase) : ''
  }
  const speakers: string[] = []
  for (const l of b.lines) if (!speakers.includes(l.speaker)) speakers.push(l.speaker)
  return (
    <div className={`es-dialogue es-size-${b.size}`}>
      {b.lines.map((l, i) => {
        const idx = Math.max(0, speakers.indexOf(l.speaker))
        const side = idx % 2 === 0 ? 'left' : 'right'
        const color = characterColor(l.speaker, characters)
        return (
          <div key={i} className={`es-line es-line-${side}`}>
            <div className={`es-avatar es-speaker-${color}`} data-speaker={l.speaker} title={l.speaker}>
              {avatarFor(l.speaker) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarFor(l.speaker)} alt={l.speaker} draggable={false} />
              ) : (
                (l.speaker || '?').trim().charAt(0).toUpperCase()
              )}
            </div>
            <div className={`es-bubble es-speaker-${color}`}>
              <span className="es-sr-only">{l.speaker}: </span>
              <RichText text={l.text} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CalloutView({ b }: { b: CalloutBlock }) {
  const { characters } = useContext(CharactersContext)
  const cls = b.character?.trim()
    ? `es-callout es-callout-char es-speaker-${characterColor(b.character, characters)}`
    : `es-callout es-callout-${b.tone}`
  return (
    <div className={cls}>
      {b.title ? <div className="es-callout-title">{b.title}</div> : null}
      <div className="es-callout-body">
        <RichText text={b.text} />
      </div>
    </div>
  )
}


/**
 * Shared answer state for interactive blocks (true/false, matching). The live
 * lesson page provides this so the teacher's and student's screens stay in sync
 * and can show a toast for each answer. Without a provider (studio preview) each
 * block keeps its own local state.
 */
export interface ActivityApi {
  get: (blockId: string) => unknown
  set: (blockId: string, state: unknown) => void
  onResult?: (blockId: string, result: { correct: boolean; message: string }) => void
}
const ActivityContext = createContext<ActivityApi | null>(null)
export function SlideActivity({ value, children }: { value: ActivityApi | null; children: ReactNode }) {
  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>
}
function useActivityState<T>(blockId: string, initial: T): [T, (v: T) => void, ActivityApi | null] {
  const api = useContext(ActivityContext)
  const [local, setLocal] = useState<T>(initial)
  const [, bump] = useState(0)
  if (api) {
    const v = (api.get(blockId) as T | undefined) ?? initial
    return [v, (n) => (api.set(blockId, n), bump((x) => x + 1)), api]
  }
  return [local, setLocal, null]
}

const TickIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)
const CrossIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

function TrueFalseView({ b, blockId, mode }: { b: TrueFalseBlock; blockId: string; mode: SlideMode }) {
  const [st, setSt, api] = useActivityState<{ answers: boolean[] }>(blockId, { answers: [] })
  const teacher = mode !== 'student'
  const tf = (v: boolean) => (v ? 'True' : 'False')
  if (mode === 'editor')
    return (
      <div className="es-tf">
        {b.items.map((it, i) => (
          <div key={i} className="es-tf-row is-done">
            <span className="es-tf-n">{i + 1}</span>
            <span className="es-tf-q">
              <RichText text={it.text} />
            </span>
            <span className="es-tf-key">{tf(it.answer)}</span>
          </div>
        ))}
      </div>
    )
  const n = st.answers.length
  const done = n >= b.items.length
  const right = st.answers.filter((a, i) => a === b.items[i]?.answer).length
  const answer = (a: boolean) => {
    const it = b.items[n]
    if (!it) return
    setSt({ answers: [...st.answers, a] })
    const correct = a === it.answer
    api?.onResult?.(blockId, { correct, message: correct ? `Correct! It’s ${tf(it.answer).toLowerCase()}.` : `Not quite. It’s ${tf(it.answer).toLowerCase()}.` })
  }
  return (
    <div className="es-tf">
      {b.items.slice(0, Math.min(n + 1, b.items.length)).map((it, i) => {
        if (i < n) {
          const ok = st.answers[i] === it.answer
          return (
            <div key={i} className={`es-tf-row is-done ${ok ? 'is-right' : 'is-wrong'}`}>
              <span className="es-tf-n">{i + 1}</span>
              <span className="es-tf-q">
                <RichText text={it.text} />
              </span>
              <span className="es-tf-res">
                {tf(it.answer)}
                {ok ? <TickIcon /> : <CrossIcon />}
              </span>
            </div>
          )
        }
        return (
          <div key={i} className="es-tf-row is-current">
            <span className="es-tf-n">{i + 1}</span>
            <span className="es-tf-q">
              <RichText text={it.text} />
              {teacher && it.why !== undefined ? (
                <span className="es-tf-why">
                  <span className="es-tutor-tag">Teacher</span>
                  {tf(it.answer)}
                  {it.why ? `: ${it.why}` : ''}
                </span>
              ) : null}
            </span>
            <span className="es-tf-btns">
              <button type="button" className="es-tf-true" onClick={() => answer(true)}>
                True
              </button>
              <button type="button" className="es-tf-false" onClick={() => answer(false)}>
                False
              </button>
            </span>
          </div>
        )
      })}
      <div className="es-tf-foot">
        {done ? (
          <>
            <b>
              {right} of {b.items.length} correct
            </b>
            <button type="button" className="es-act-reset" onClick={() => setSt({ answers: [] })}>
              Try again
            </button>
          </>
        ) : (
          <span>
            {n + 1} of {b.items.length}
          </span>
        )}
      </div>
    </div>
  )
}

/** Same order on every screen: shuffle seeded by the block id. */
function seededOrder(n: number, seed: string): number[] {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  const a = [...Array(n).keys()]
  for (let i = n - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0
    const j = h % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  if (n > 1 && a.every((v, i) => v === i)) a.push(a.shift() as number)
  return a
}

function MatchView({ b, blockId, mode, assetBase }: { b: MatchBlock; blockId: string; mode: SlideMode; assetBase?: string }) {
  const [st, setSt, api] = useActivityState<{ done: number[] }>(blockId, { done: [] })
  const [pick, setPick] = useState<{ k: 'w' | 'p'; i: number } | null>(null)
  const [shake, setShake] = useState(-1)
  const order = seededOrder(b.pairs.length, blockId)
  const editor = mode === 'editor'
  const done = editor ? b.pairs.map((_, i) => i) : st.done
  const all = done.length === b.pairs.length
  const tryPair = (w: number, p: number) => {
    setPick(null)
    if (w === p) {
      const next = [...done, w]
      setSt({ done: next })
      if (next.length === b.pairs.length) api?.onResult?.(blockId, { correct: true, message: 'All matched!' })
    } else {
      setShake(p)
      setTimeout(() => setShake(-1), 420)
      api?.onResult?.(blockId, { correct: false, message: 'Not quite. Try again.' })
    }
  }
  const tapWord = (i: number) => {
    if (editor || done.includes(i)) return
    if (pick?.k === 'p') tryPair(i, pick.i)
    else setPick({ k: 'w', i })
  }
  const tapPic = (i: number) => {
    if (editor || done.includes(i)) return
    if (pick?.k === 'w') tryPair(pick.i, i)
    else setPick({ k: 'p', i })
  }
  return (
    <div className="es-match">
      <div className="es-match-words">
        {order.map((i) => (
          <button
            key={i}
            type="button"
            className={`es-match-word${done.includes(i) ? ' is-done' : ''}${pick?.k === 'w' && pick.i === i ? ' is-picked' : ''}`}
            onClick={() => tapWord(i)}
          >
            {b.pairs[i].term}
          </button>
        ))}
      </div>
      <div className="es-match-pics">
        {b.pairs.map((p, i) => (
          <button
            key={i}
            type="button"
            aria-label={done.includes(i) ? p.term : `Picture ${i + 1}`}
            className={`es-match-pic${done.includes(i) ? ' is-done' : ''}${pick?.k === 'p' && pick.i === i ? ' is-picked' : ''}${shake === i ? ' is-shake' : ''}`}
            onClick={() => tapPic(i)}
          >
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveAsset(p.image, assetBase)} alt={p.alt ?? ''} draggable={false} />
            ) : (
              <span className="es-match-empty">Picture {i + 1}</span>
            )}
            {done.includes(i) ? <span className="es-match-tag">{p.term}</span> : null}
          </button>
        ))}
      </div>
      {editor ? null : (
        <div className="es-match-foot">
          {all ? (
            <>
              <b>All matched!</b>
              <button type="button" className="es-act-reset" onClick={() => setSt({ done: [] })}>
                Try again
              </button>
            </>
          ) : (
            <span>Tap a word, then its picture</span>
          )}
        </div>
      )}
    </div>
  )
}

export function BlockView({ block, assetBase, mode = 'student' }: { block: Block; assetBase?: string; mode?: SlideMode }) {
  switch (block.type) {
    case 'heading':
      return <HeadingView b={block} />
    case 'text':
      return <TextView b={block} />
    case 'list':
      return <ListView b={block} />
    case 'image':
      return <ImageView b={block} assetBase={assetBase} />
    case 'vocab':
      return <VocabView b={block} />
    case 'dialogue':
      return <DialogueView b={block} />
    case 'callout':
      return <CalloutView b={block} />
    case 'phrases':
      return <PhrasesView b={block} />
    case 'media':
      return <MediaView b={block} assetBase={assetBase} blockId={block.id} live={mode !== 'editor'} />
    case 'truefalse':
      return <TrueFalseView b={block} blockId={block.id} mode={mode} />
    case 'match':
      return <MatchView b={block} blockId={block.id} mode={mode} assetBase={assetBase} />
  }
}

/**
 * Decorative layer: soft organic shapes that FRAME the slide. Content slides
 * get a flowing shape hugging the top-right corner (balancing the left-aligned
 * title) and a small counterweight in the bottom-left — a diagonal frame that
 * leads the eye into the content. Covers get a large shape cradling the image
 * column. Everything stays in the margins or behind opaque blocks.
 */
function SlideDecor({ cover }: { cover: boolean }) {
  if (cover)
    return (
      <svg className="es-decor" viewBox="0 0 1280 960" aria-hidden>
        <path
          className="es-d-shape-a"
          d="M640 960 C 630 820 720 700 860 650 C 1000 600 1050 470 1110 350 C 1160 250 1220 205 1280 195 L 1280 960 Z"
        />
        <path
          className="es-d-shape-b"
          d="M820 960 C 830 860 900 790 1000 760 C 1110 728 1170 640 1210 540 C 1235 478 1258 450 1280 440 L 1280 960 Z"
        />
        <path className="es-d-shape-c" d="M0 0 L 320 0 C 300 70 220 118 130 124 C 66 128 22 162 0 210 Z" />
      </svg>
    )
  return (
    <svg className="es-decor" viewBox="0 0 1280 960" aria-hidden>
      <path className="es-d-shape-a" d="M840 0 C 870 92 980 150 1090 150 C 1180 150 1235 205 1280 262 L 1280 0 Z" />
      <path className="es-d-shape-b" d="M1000 0 C 1020 58 1095 92 1165 86 C 1218 82 1255 106 1280 136 L 1280 0 Z" />
      <path className="es-d-shape-a" d="M0 812 C 52 822 96 872 108 960 L 0 960 Z" />
    </svg>
  )
}

/** Eyebrow label + title, left-aligned on the content grid. */
function SlideHeader({ label, title }: { label: string; title: string }) {
  return (
    <header className="es-header">
      {label ? <span className="es-eyebrow">{label}</span> : null}
      <h1 className="es-header-title">{title}</h1>
    </header>
  )
}

/** The 1280×960 (4:3) slide, unscaled. */
export function SlideCanvas({ slide, mode = 'student', assetBase }: Omit<SlideRendererProps, 'overlay' | 'className'>) {
  return (
    <div
      className={`es-canvas es-bg-${slide.background}${slide.header ? '' : ' is-cover'}${slide.flashback ? ' is-flashback' : ''}`}
      style={{ width: STAGE_W, height: STAGE_H }}
    >
      <SlideDecor cover={!slide.header} />
      <div className="es-watermark" aria-hidden>
        eigo.io
      </div>
      {slide.header ? <SlideHeader label={slide.header.label} title={slide.header.title} /> : null}
      {slide.blocks.map((b) => {
        if (b.tutorOnly && mode === 'student') return null
        return (
          <div
            key={b.id}
            data-block-id={b.id}
            className={`es-block es-block-${b.type}${b.tutorOnly ? ' is-tutor' : ''}`}
            style={{
              left: `${b.frame.x}%`,
              top: `${b.frame.y}%`,
              width: `${b.frame.w}%`,
              height: `${b.frame.h}%`,
            }}
          >
            {b.tutorOnly ? <span className="es-tutor-tag">Teacher</span> : null}
            <BlockView block={b} assetBase={assetBase} mode={mode} />
          </div>
        )
      })}
    </div>
  )
}

/** Scales the slide to the container's width (4:3). */
export function SlideRenderer({ slide, mode = 'student', assetBase, overlay, className }: SlideRendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(el.clientWidth / STAGE_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} className={`es-stage${className ? ` ${className}` : ''}`} style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}>
      <div className="es-scaler" style={{ transform: `scale(${scale})`, visibility: scale ? 'visible' : 'hidden' }}>
        <SlideCanvas slide={slide} mode={mode} assetBase={assetBase} />
      </div>
      {overlay ? <div className="es-overlay">{overlay}</div> : null}
    </div>
  )
}

export default SlideRenderer
