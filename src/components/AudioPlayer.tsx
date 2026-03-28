'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Squircle } from '@squircle-js/react'
import { motion, AnimatePresence } from 'framer-motion'

type AudioPlayerProps = {
  src: string
  onClose: () => void
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function AudioPlayer({ src, onClose }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(true)

  const speeds = [1, 1.25, 1.5, 2]

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoadedMetadata = () => {
      setDuration(audio.duration)
      setLoading(false)
    }
    const onTimeUpdate = () => {
      if (!dragging) setCurrentTime(audio.currentTime)
    }
    const onEnded = () => setPlaying(false)
    const onCanPlay = () => setLoading(false)

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('canplay', onCanPlay)

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('canplay', onCanPlay)
    }
  }, [dragging])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
    setPlaying(!playing)
  }, [playing])

  const cycleSpeed = useCallback(() => {
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length]
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }, [speed])

  const skip = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds))
  }, [])

  const seekFromEvent = useCallback((clientX: number) => {
    const bar = progressRef.current
    const audio = audioRef.current
    if (!bar || !audio || !duration) return
    const rect = bar.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const newTime = pct * duration
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }, [duration])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true)
    seekFromEvent(e.clientX)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [seekFromEvent])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging) seekFromEvent(e.clientX)
  }, [dragging, seekFromEvent])

  const handlePointerUp = useCallback(() => {
    setDragging(false)
  }, [])

  const progress = duration ? (currentTime / duration) * 100 : 0

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4"
        style={{ pointerEvents: 'none' }}
      >
        <div className="max-w-xl mx-auto" style={{ pointerEvents: 'auto' }}>
          <Squircle asChild cornerRadius={16} cornerSmoothing={0.8}>
            <div
              className="p-4 shadow-lg"
              style={{
                background: 'color-mix(in srgb, var(--surface) 70%, transparent)',
                backdropFilter: 'blur(24px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                border: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 0.5px 0 rgba(255,255,255,0.08)',
              }}
            >
              <audio ref={audioRef} src={src} preload="metadata" />

              {/* Progress bar */}
              <div
                ref={progressRef}
                className="relative h-1.5 rounded-full cursor-pointer mb-2"
                style={{ background: 'var(--surface-alt)' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width]"
                  style={{
                    width: `${progress}%`,
                    background: 'var(--accent)',
                    transitionDuration: dragging ? '0ms' : '100ms',
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-sm"
                  style={{
                    left: `${progress}%`,
                    marginLeft: '-6px',
                    background: 'var(--accent)',
                    opacity: dragging ? 1 : 0,
                    transition: 'opacity 150ms',
                  }}
                />
              </div>

              {/* Time labels */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-subtle)' }}>
                  {formatTime(currentTime)}
                </span>
                <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-subtle)' }}>
                  {loading ? '--:--' : formatTime(duration)}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                {/* Speed (left) */}
                <Squircle asChild cornerRadius={6} cornerSmoothing={0.8}>
                  <button
                    onClick={cycleSpeed}
                    className="h-7 px-2 text-[11px] font-semibold tabular-nums transition-opacity hover:opacity-80"
                    style={{ background: 'var(--surface-alt)', color: 'var(--text-muted)' }}
                  >
                    {speed}x
                  </button>
                </Squircle>

                {/* Center controls */}
                <div className="flex items-center gap-4">
                  {/* Rewind 15s */}
                  <button
                    onClick={() => skip(-15)}
                    className="w-9 h-9 flex items-center justify-center transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      <text x="12" y="16" textAnchor="middle" fill="currentColor" stroke="none" fontSize="8" fontWeight="600">15</text>
                    </svg>
                  </button>

                  {/* Play / Pause */}
                  <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                    <button
                      onClick={togglePlay}
                      disabled={loading}
                      className="w-11 h-11 flex items-center justify-center transition-opacity hover:opacity-90 disabled:opacity-40"
                      style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                    >
                      {loading ? (
                        <span className="spinner-sm" />
                      ) : playing ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="6,3 20,12 6,21" />
                        </svg>
                      )}
                    </button>
                  </Squircle>

                  {/* Forward 15s */}
                  <button
                    onClick={() => skip(15)}
                    className="w-9 h-9 flex items-center justify-center transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      <text x="12" y="16" textAnchor="middle" fill="currentColor" stroke="none" fontSize="8" fontWeight="600">15</text>
                    </svg>
                  </button>
                </div>

                {/* Close (bottom-right) */}
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </Squircle>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
