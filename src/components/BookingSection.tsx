'use client'

import { useRef, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { motion, useInView } from 'framer-motion'
import SquircleBox from './ui/SquircleBox'
import AuthModal from './AuthModal'

const LESSON_TYPES = [
  { key: 'lesson15' as const, duration: 15 },
  { key: 'lesson30' as const, duration: 30 },
  { key: 'lesson45' as const, duration: 45 },
  { key: 'lesson60' as const, duration: 60 },
]

export default function BookingSection() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  const handleBooking = (duration: number) => {
    if (!user) {
      setShowAuth(true)
      return
    }
    window.location.href = `/dashboard?duration=${duration}`
  }

  return (
    <>
      <section ref={ref} className="py-20 px-6">
        <div className="max-w-xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-2xl sm:text-3xl font-bold mb-8 text-center"
            style={{ color: 'var(--text)' }}
          >
            {t('bookingTitle')}
          </motion.h2>
          <div className="space-y-3">
            {LESSON_TYPES.map(({ key, duration }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 12 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.05 + i * 0.06 }}
              >
                <SquircleBox
                  cornerRadius={14}
                  className="transition-colors group"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <button
                    onClick={() => handleBooking(duration)}
                    className="w-full flex items-center justify-between px-6 py-4 transition-colors"
                    style={{ color: 'var(--text)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span className="font-medium">{t(key)}</span>
                    <svg
                      className="w-4 h-4 transition-transform group-hover:translate-x-1"
                      style={{ color: 'var(--text-muted)' }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </SquircleBox>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
