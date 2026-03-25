'use client'

import { useLanguage } from '@/context/LanguageContext'
import { motion } from 'framer-motion'
import { Squircle } from '@squircle-js/react'

export default function Hero() {
  const { t } = useLanguage()

  const scrollDown = () => {
    const el = document.getElementById('about')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="flex flex-col items-center justify-center text-center px-6 pt-28 sm:pt-40 pb-24 sm:pb-32">
      {/* "hello!" with breathing pulse */}
      <motion.h1
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: 1,
          scale: [1, 1.04, 1],
        }}
        transition={{
          opacity: { duration: 0.6 },
          scale: {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
        className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight"
        style={{ color: 'var(--accent)' }}
      >
        hello!
      </motion.h1>

      {/* Subheadline */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
        className="text-base sm:text-lg max-w-md mt-8 mb-12 leading-relaxed whitespace-pre-line"
        style={{ color: 'var(--text-secondary)' }}
      >
        {t('heroSubheadline')}
      </motion.p>

      {/* CTA — scrolls down */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
      >
        <Squircle asChild cornerRadius={14} cornerSmoothing={0.8}>
          <button
            onClick={scrollDown}
            className="inline-block font-semibold px-10 py-4 text-base sm:text-lg transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
          >
            {t('heroCta')}
          </button>
        </Squircle>
      </motion.div>
    </section>
  )
}
