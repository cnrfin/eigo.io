'use client'

import { useRef, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { motion, useInView } from 'framer-motion'
import { Squircle } from '@squircle-js/react'
import AuthModal from './AuthModal'

export default function CtaSection() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  const handleCta = () => {
    if (user) {
      window.location.href = '/dashboard'
    } else {
      setShowAuth(true)
    }
  }

  return (
    <>
      <section ref={ref} className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-xl mx-auto text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'var(--text)' }}>
            {t('ctaHeadline')}
          </h2>
          <p className="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
            {t('ctaSubheadline')}
          </p>
          <Squircle asChild cornerRadius={14} cornerSmoothing={0.8}>
            <button
              onClick={handleCta}
              className="font-semibold px-10 py-4 text-base sm:text-lg transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
            >
              {t('ctaButton')}
            </button>
          </Squircle>
        </motion.div>
      </section>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
