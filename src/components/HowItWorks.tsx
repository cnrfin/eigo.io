'use client'

import { useRef } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { motion, useInView } from 'framer-motion'

const STEPS = [
  { title: 'howStep1Title', desc: 'howStep1Desc', num: '1' },
  { title: 'howStep2Title', desc: 'howStep2Desc', num: '2' },
  { title: 'howStep3Title', desc: 'howStep3Desc', num: '3' },
  { title: 'howStep4Title', desc: 'howStep4Desc', num: '4' },
  { title: 'howStep5Title', desc: 'howStep5Desc', num: '5' },
] as const

export default function HowItWorks() {
  const { t } = useLanguage()
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-2xl sm:text-3xl font-bold text-center mb-14"
          style={{ color: 'var(--text)' }}
        >
          {t('howTitle')}
        </motion.h2>

        {/* Row 1: Steps 1–3 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
          {STEPS.slice(0, 3).map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.12 }}
              className="text-center"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold mx-auto mb-4"
                style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
              >
                {step.num}
              </div>
              <h3 className="font-semibold text-base mb-2" style={{ color: 'var(--text)' }}>
                {t(step.title)}
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-muted)' }}>
                {t(step.desc)}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Row 2: Steps 4–5, centered */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-6 mt-10 sm:max-w-md sm:mx-auto">
          {STEPS.slice(3).map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.46 + i * 0.12 }}
              className="text-center"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold mx-auto mb-4"
                style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
              >
                {step.num}
              </div>
              <h3 className="font-semibold text-base mb-2" style={{ color: 'var(--text)' }}>
                {t(step.title)}
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-muted)' }}>
                {t(step.desc)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
