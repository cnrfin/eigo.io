'use client'

import { useRef } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { motion, useInView } from 'framer-motion'
import { Squircle } from '@squircle-js/react'

const POINT_KEYS = ['aboutPoint1', 'aboutPoint2', 'aboutPoint3', 'aboutPoint4'] as const

export default function Features() {
  const { t } = useLanguage()
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="about" ref={ref} className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-2xl sm:text-3xl font-bold mb-10"
          style={{ color: 'var(--text)' }}
        >
          {t('aboutTitle')}
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-10 md:gap-14 items-start">
          {/* Left — text content */}
          <div>
            {/* Lead paragraph */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-base leading-relaxed mb-8"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('aboutLead')}
            </motion.p>

            {/* Benefit points */}
            <div className="space-y-4">
              {POINT_KEYS.map((key, i) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
                  className="flex gap-3 items-start"
                >
                  <svg
                    className="w-5 h-5 mt-0.5 shrink-0"
                    style={{ color: 'var(--accent)' }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {t(key)}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Closing paragraph */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="text-base leading-relaxed mt-8"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('aboutClosing')}
            </motion.p>
          </div>

          {/* Right — profile photo in tall squircle */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex justify-center md:justify-end"
          >
            <Squircle asChild cornerRadius={32} cornerSmoothing={0.8}>
              <div
                className="w-56 h-72 sm:w-64 sm:h-80 overflow-hidden"
                style={{ background: 'var(--surface)' }}
              >
                <img
                  src="/profile.png"
                  alt="Connor — English teacher"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </Squircle>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
