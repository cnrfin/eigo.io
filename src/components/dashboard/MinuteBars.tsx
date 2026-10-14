'use client'

import Link from 'next/link'

/**
 * Minutes left, as thin bars (profile popup, Settings). AI pilot only.
 * Lite/Standard: lesson minutes + AI minutes (top-ups). AI plan: AI minutes only.
 */

export type MinuteInfo = {
  plan: { left: number; total: number } | null
  /** AI plan: always; Lite/Standard: only once they have a top-up (unexpired) */
  ai: { left: number; total: number } | null
}

/** Build the bars from the /api/subscription response. */
export function minuteInfo(d: unknown): MinuteInfo | null {
  const r = d as {
    subscription?: { plan?: string; status?: string } | null
    balance?: { minutesRemaining: number; minutesPerMonth: number } | null
    aiMinutes?: { total: number; left: number; topupLeft: number; topupTotal?: number } | null
    features?: { aiEnabled?: boolean }
  } | null
  if (!r?.features?.aiEnabled) return null
  const aiPlan = r.subscription?.plan === 'ai' && r.subscription.status !== 'cancelled'
  const plan = !aiPlan && r.balance && r.balance.minutesPerMonth > 0 ? { left: r.balance.minutesRemaining, total: r.balance.minutesPerMonth } : null
  const a = r.aiMinutes
  const aiLeft = a ? a.left + a.topupLeft : 0
  const aiTotal = a ? a.total + (a.topupTotal ?? a.topupLeft) : 0
  const hasAi = aiPlan || aiTotal > 0
  return { plan, ai: hasAi ? { left: aiLeft, total: Math.max(aiTotal, aiLeft) } : null }
}

function Bar({ label, left, total, unit }: { label: string; left: number; total: number; unit: string }) {
  const pct = total > 0 ? Math.min(100, (left / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--text)' }}>
          {total > 0 && left !== total ? `${left} / ${total}${unit}` : `${left}${unit}`}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--inset)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)', transition: 'width .4s ease' }} />
      </div>
    </div>
  )
}

export default function MinuteBars({ info, locale, onTopup }: { info: MinuteInfo; locale: 'ja' | 'en'; onTopup?: () => void }) {
  const ja = locale === 'ja'
  const unit = ja ? '分' : ' min'
  return (
    <div className="flex flex-col gap-3">
      {info.plan && <Bar label={ja ? 'レッスン' : 'Lessons'} left={info.plan.left} total={info.plan.total} unit={unit} />}
      {info.ai && <Bar label={ja ? 'AIレッスン' : 'AI lessons'} left={info.ai.left} total={info.ai.total} unit={unit} />}
      <Link
        href="/dashboard/topup"
        onClick={onTopup}
        className="text-center text-xs font-medium py-2 rounded-lg transition-transform duration-[120ms] ease-out active:scale-95"
        style={{ background: 'var(--inset)', color: 'var(--text)' }}
      >
        {ja ? 'AI分数を追加' : 'Add AI minutes'}
      </Link>
    </div>
  )
}
