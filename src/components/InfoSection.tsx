'use client'

import { useRef } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { motion, useInView } from 'framer-motion'

type RowData = { label: string; value: string; note?: string }

export default function InfoSection() {
  const { t } = useLanguage()
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const rows: RowData[] = [
    { label: t('hours'), value: t('hoursValue') },
    { label: t('duration'), value: t('durationValue') },
    { label: t('level'), value: t('levelValue') },
    { label: t('type'), value: t('typeValue') },
    { label: t('classroom'), value: t('classroomValue') },
    { label: t('access'), value: t('accessValue') },
    { label: t('trialPrice'), value: `${t('trialPriceValue')}\n${t('trialPriceDetail')}`, note: t('trialPriceNote') },
    { label: t('regularPrice'), value: `${t('regularPriceValue')}\n${t('regularPriceDetail')}` },
    { label: t('billingNote'), value: t('billingNoteValue') },
    { label: t('email'), value: 'connor@eigo.io' },
    { label: t('lineId'), value: 'cnrfin' },
  ]

  return (
    <section ref={ref} className="py-20 px-6">
      <div className="max-w-2xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl font-bold mb-10 text-center"
          style={{ color: 'var(--text)' }}
        >
          {t('infoTitle')}
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border-subtle)' }}
        >
          {rows.map((row, i) => (
            <div
              key={row.label}
              className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr]"
              style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined }}
            >
              {/* Label cell */}
              <div
                className="px-4 py-3.5 text-sm font-semibold flex items-start"
                style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}
              >
                {row.label}
              </div>

              {/* Value cell */}
              <div
                className="px-4 py-3.5 text-sm whitespace-pre-line"
                style={{ color: 'var(--text-secondary)' }}
              >
                {row.value}
                {row.note && (
                  <span className="block text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {row.note}
                  </span>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
