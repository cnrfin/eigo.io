'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { motion, useInView } from 'framer-motion'
import SquircleBox from './ui/SquircleBox'

/* ── Google-style avatar colours ── */
const AVATAR_COLORS = [
  '#4285F4', '#EA4335', '#FBBC05', '#34A853',
  '#FF6D01', '#46BDC6', '#7B61FF', '#E91E63',
]

function colorForName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/* ── Review data ── */
const REVIEWS = [
  { name: 'Toshi', text: 'He is a very kind teacher. He patiently listens to students even if their English is not good. He is also very knowledgeable about grammar. Above all, he is a very nice person. I recommend him.' },
  { name: 'KAORI', text: 'とても優しい。私の拙い英語も理解しようとしてくれる。' },
  { name: 'Ayumi', text: 'He is a very good teacher for me. He is patient, gentle and kind. And his English is so clear that I can understand what he says. 初心者の私にも聞き取りやすいようにはっきりゆっくり話してくれます。' },
  { name: 'Mami', text: 'I think he is the best teacher, especially for Japanese students and beginners, because he is kind and speaks very clear English.' },
  { name: 'Emi', text: 'Connor is an awesome tutor and a nice guy. I always enjoy talking to him. 英会話初心者が外国人から感じがちな威圧感もなく、最高に優しい先生です。' },
  { name: 'Yuto', text: 'He is patient, friendly. You can improve English skills through conversation with him :)' },
  { name: 'MIKI', text: 'いつも拙い英語を解釈してくれて有り難いです。日本語に理解のある先生なので初心者の方も安心して受講できます★' },
  { name: 'Takuya', text: 'He is very friendly. He speaks very politely. He is a very good teacher for beginners. Thank you for every lesson.' },
  { name: 'Namiko', text: "He's so sincere and very kind. I usually get so nervous in the lesson, but he makes me relaxed. He sounds posh and classy." },
  { name: 'Noriko', text: 'Very nice teacher! He is easy to talk to. I enjoyed his lesson. Thank you.' },
  { name: 'Aki', text: 'Connor先生は日本語を理解していらっしゃるので発音の指導の時に日本語の似ている音を例に挙げて説明してくれます。優しい雰囲気の方なのでネイティブの先生と話すことに慣れていない方にもおすすめします。' },
  { name: 'Tatsuo', text: 'Connor is very friendly and listens to me carefully. He can make me relaxed while talking. I greatly appreciate him.' },
  { name: 'Ruiko', text: 'とても気さくで話しやすいですし、説明もわかりやすく大変親切かつ熱心な先生だと思います。間違っても優しく指導してくれます。' },
  { name: 'Maho O', text: 'He is a very good teacher to me. He is very kind and patient. I love English after his lesson.' },
  { name: 'Ayaka', text: "He is really nice teacher!! If I don't understand a word, he explains it to me in an easy-to-understand way." },
  { name: 'Yuji S', text: 'Super-clear pronunciation, attention to detail and very kind personality :)' },
  { name: 'Takako', text: 'Connor先生は、忍耐強く話を聞いてくれます。そして、間違ったセンテンスは正しく言い直してくれるので、後で動画で復習ができます。初心者にはおすすめです。' },
  { name: 'Sara', text: 'とても優しく丁寧に教えていただけます！' },
  { name: 'Teruko', text: 'A teacher who teaches beginners very carefully. It will teach you various ways of expressing English. I highly recommend this teacher.' },
]

/* ── Single review card ── */
function ReviewCard({ name, text, isCentre }: { name: string; text: string; isCentre: boolean }) {
  const bg = colorForName(name)
  const initial = name.charAt(0).toUpperCase()

  return (
    <SquircleBox
      cornerRadius={18}
      className="p-6 sm:p-7 h-full flex flex-col select-none"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${isCentre ? 'var(--border)' : 'var(--border-subtle)'}`,
      }}
    >
      <span
        className="text-3xl leading-none font-serif mb-2 block select-none"
        style={{ color: 'var(--accent)', opacity: 0.45 }}
      >
        &ldquo;
      </span>
      <p className="text-sm leading-relaxed flex-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
        {text}
      </p>
      <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: bg, color: '#fff' }}
        >
          {initial}
        </div>
        <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{name}</span>
      </div>
    </SquircleBox>
  )
}

/* ────────────────────────────────────────────
   Coverflow carousel with swipe gesture
   ──────────────────────────────────────────── */

const VISIBLE_RANGE = 2
const CARD_WIDTH = 300
const GAP = 40
const SWIPE_THRESHOLD = 40 // px drag to trigger card change

function getCoverflowStyle(offset: number) {
  const absOff = Math.abs(offset)
  const sign = offset < 0 ? 1 : -1

  if (absOff === 0) {
    return { rotateY: 0, scale: 1, x: 0, opacity: 1 }
  }

  return {
    rotateY: sign * 45,
    scale: 0.78 - absOff * 0.04,
    x: offset * (CARD_WIDTH * 0.52 + GAP),
    opacity: absOff <= VISIBLE_RANGE ? 1 - absOff * 0.2 : 0,
  }
}

export default function StudentVoices() {
  const { t } = useLanguage()
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-60px' })

  const [active, setActive] = useState(0)
  const total = REVIEWS.length

  // Wrap-safe advance by N cards
  const advance = useCallback(
    (n: number) => setActive((i) => ((i + n) % total + total) % total),
    [total],
  )

  /* ── Two-finger swipe (trackpad / mouse wheel) → always 1 card ──
     A single trackpad swipe fires a burst of wheel events over ~300-500ms.
     We accumulate the direction, then advance once when the burst ends. */
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wheelDirection = useRef<number>(0)
  const wheelLocked = useRef(false) // lock until spring animation settles

  useEffect(() => {
    const el = stageRef.current
    if (!el) return

    const handler = (e: WheelEvent) => {
      const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY)
      if (!isHorizontal) return
      e.preventDefault()

      // If we already advanced for this gesture, just eat the remaining events
      if (wheelLocked.current) return

      // Record direction from this event
      if (e.deltaX !== 0) wheelDirection.current = e.deltaX > 0 ? 1 : -1

      // Reset the "end of gesture" timer on each event
      if (wheelTimer.current) clearTimeout(wheelTimer.current)
      wheelTimer.current = setTimeout(() => {
        // Gesture ended — advance exactly 1 card
        if (wheelDirection.current !== 0) {
          advance(wheelDirection.current)
          wheelDirection.current = 0

          // Lock out the next gesture for 400ms so a quick follow-up
          // swipe doesn't double-fire
          wheelLocked.current = true
          setTimeout(() => { wheelLocked.current = false }, 400)
        }
      }, 60) // 60ms of silence = gesture ended
    }

    el.addEventListener('wheel', handler, { passive: false })
    return () => {
      el.removeEventListener('wheel', handler)
      if (wheelTimer.current) clearTimeout(wheelTimer.current)
    }
  }, [advance])

  /* ── Drag: cards flow past in real-time, momentum on release ── */
  const CARD_STEP = 100 // px of drag to advance 1 card
  const dragAccum = useRef(0)
  const dragLastX = useRef(0)
  const dragActive = useRef(false)
  const dragLastTime = useRef(0)
  const dragVelocity = useRef(0) // px/ms at release

  const startDrag = useCallback((clientX: number) => {
    dragActive.current = true
    dragLastX.current = clientX
    dragAccum.current = 0
    dragLastTime.current = Date.now()
    dragVelocity.current = 0
  }, [])

  const moveDrag = useCallback((clientX: number) => {
    if (!dragActive.current) return

    const dx = clientX - dragLastX.current
    const now = Date.now()
    const dt = Math.max(now - dragLastTime.current, 1)

    // Track velocity (smoothed)
    dragVelocity.current = dx / dt

    dragLastX.current = clientX
    dragLastTime.current = now

    // Accumulate drag distance
    dragAccum.current += dx

    // Each time we cross a card-step boundary, advance one card
    while (dragAccum.current >= CARD_STEP) {
      dragAccum.current -= CARD_STEP
      advance(-1) // dragged right → go to previous card
    }
    while (dragAccum.current <= -CARD_STEP) {
      dragAccum.current += CARD_STEP
      advance(1) // dragged left → go to next card
    }
  }, [advance])

  const endDrag = useCallback(() => {
    if (!dragActive.current) return
    dragActive.current = false

    // Momentum: use release velocity to advance extra cards
    const v = dragVelocity.current // px/ms, negative = dragged left
    const momentumCards = Math.round(Math.abs(v) * 4) // scale velocity to card count
    if (momentumCards > 0) {
      advance(v < 0 ? momentumCards : -momentumCards)
    }
  }, [advance])

  // Mouse pointer events
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    startDrag(e.clientX)
  }, [startDrag])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    moveDrag(e.clientX)
  }, [moveDrag])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    endDrag()
  }, [endDrag])

  // Touch events (mobile)
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) startDrag(e.touches[0].clientX)
  }, [startDrag])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) moveDrag(e.touches[0].clientX)
  }, [moveDrag])

  const onTouchEnd = useCallback(() => {
    endDrag()
  }, [endDrag])

  // Build visible card indices
  const visibleIndices: number[] = []
  for (let off = -VISIBLE_RANGE; off <= VISIBLE_RANGE; off++) {
    visibleIndices.push(((active + off) % total + total) % total)
  }

  return (
    <section ref={sectionRef} className="py-20 overflow-hidden">
      <div className="max-w-4xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-2xl sm:text-3xl font-bold text-center mb-14"
          style={{ color: 'var(--text)' }}
        >
          {t('reviewsTitle')}
        </motion.h2>
      </div>

      {/* Coverflow stage with edge fade gradients */}
      <div className="relative" style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Left fade */}
        <div
          className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none"
          style={{ width: 120, background: 'linear-gradient(to right, var(--bg), transparent)' }}
        />
        {/* Right fade */}
        <div
          className="absolute right-0 top-0 bottom-0 z-10 pointer-events-none"
          style={{ width: 120, background: 'linear-gradient(to left, var(--bg), transparent)' }}
        />

        {/* Interactive stage */}
        <div
          ref={stageRef}
          className="relative mx-auto flex items-center justify-center"
          style={{ perspective: 1000, height: 320, cursor: 'grab', userSelect: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {visibleIndices.map((idx) => {
            let offset = idx - active
            if (offset > total / 2) offset -= total
            if (offset < -total / 2) offset += total

            const s = getCoverflowStyle(offset)

            return (
              <motion.div
                key={`${idx}-${REVIEWS[idx].name}`}
                initial={false}
                animate={{
                  rotateY: s.rotateY,
                  scale: s.scale,
                  x: s.x,
                  opacity: s.opacity,
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                className="absolute pointer-events-none"
                style={{
                  width: CARD_WIDTH,
                  zIndex: 10 - Math.abs(offset),
                  transformStyle: 'preserve-3d',
                }}
              >
                <ReviewCard
                  name={REVIEWS[idx].name}
                  text={REVIEWS[idx].text}
                  isCentre={offset === 0}
                />
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
