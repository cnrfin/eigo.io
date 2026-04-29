'use client'

import { useLanguage } from '@/context/LanguageContext'
import { motion } from 'framer-motion'

export default function Hero() {
  const { t, locale } = useLanguage()

  const appStoreBadge = locale === 'ja'
    ? 'https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/ja-jp?size=250x83'
    : 'https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83'

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

      {/* App Store badge */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
      >
        <a
          href="https://apps.apple.com/gb/app/eigo-io/id6761731252"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block transition-opacity hover:opacity-80"
        >
          <img
            src={appStoreBadge}
            alt="Download on the App Store"
            style={{ height: '54px', width: 'auto' }}
          />
        </a>
      </motion.div>
    </section>
  )
}
