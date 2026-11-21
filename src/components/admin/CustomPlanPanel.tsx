'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Squircle } from '@squircle-js/react'
import SquircleBox from '@/components/ui/SquircleBox'
import {
  HOURLY_FLOOR_GBP, intervalLabel, periodMonths, salePrice, takeHomePerHour,
  type CustomOffer, type CustomPrice, type SaleInfo,
} from '@/lib/custom-plans'

interface PanelData {
  prices: CustomPrice[]
  sale: SaleInfo | null
  offers: CustomOffer[]
  activeSubscription: { plan: string; status: string; paymentSource: string } | null
}

const yen = (n: number) => `¥${n.toLocaleString('en-GB')}`
const PLAN_NAMES: Record<string, string> = { light: 'Student Lite', standard: 'Student Standard', test: 'Exam Pass', custom: 'custom', ai: 'AI' }

/**
 * Admin, Permissions tab: make a custom plan for the selected student and get
 * the eigo.io/pay link to send them.
 */
export default function CustomPlanPanel({ userId, userName, userEmail, accessToken }: {
  userId: string
  userName: string
  userEmail: string | null
  accessToken: string | undefined
}) {
  const [data, setData] = useState<PanelData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [priceId, setPriceId] = useState('')
  const [minutes, setMinutes] = useState('')
  const [applySale, setApplySale] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const headers = useMemo(() => ({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }), [accessToken])

  const load = useCallback(async () => {
    if (!accessToken) return
    setLoadError('')
    try {
      const r = await fetch(`/api/admin/custom-plans?userId=${encodeURIComponent(userId)}`, { headers })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not load')
      setData(d)
      setPriceId((cur) => (cur && d.prices.some((p: CustomPrice) => p.id === cur) ? cur : d.prices[0]?.id ?? ''))
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load')
    }
  }, [accessToken, headers, userId])

  useEffect(() => {
    setData(null)
    setMinutes('')
    setMsg('')
    load()
  }, [load])

  const price = data?.prices.find((p) => p.id === priceId) ?? null
  const mins = Math.round(Number(minutes))
  const saleOn = !!data?.sale && applySale
  const charge = price ? (saleOn && data?.sale ? salePrice(price.priceJpy, data.sale.percentOff) : price.priceJpy) : 0
  const hourly = price && mins > 0 ? takeHomePerHour(charge, mins) : null
  const months = price ? periodMonths(price.intervalUnit, price.intervalCount) : 1
  const openOffer = data?.offers.find((o) => o.status === 'open') ?? null
  const paidOffers = data?.offers.filter((o) => o.status === 'paid') ?? []
  const link = openOffer ? `${typeof window !== 'undefined' ? window.location.origin : 'https://eigo.io'}/pay/${openOffer.token}` : ''

  const create = async () => {
    if (!price) return setMsg('Pick a price first')
    if (!(mins > 0)) return setMsg('Enter the minutes for each payment')
    setBusy(true)
    setMsg('')
    try {
      const r = await fetch('/api/admin/custom-plans', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, priceId: price.id, minutes: mins, applySale: saleOn }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not create the link')
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not create the link')
    }
    setBusy(false)
  }

  const turnOff = async (offerId: string) => {
    setBusy(true)
    setMsg('')
    try {
      const r = await fetch(`/api/admin/custom-plans?offerId=${encodeURIComponent(offerId)}`, { method: 'DELETE', headers })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not turn off the link')
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not turn off the link')
    }
    setBusy(false)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard blocked: the link is selectable */ }
  }

  const fieldStyle = { background: 'var(--surface-hover)', color: 'var(--text)' }

  return (
    <SquircleBox cornerRadius={14} className="p-6 space-y-5" style={{ background: 'var(--surface)' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold" style={{ color: 'var(--text)' }}>Custom plan</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Charges automatically on the Stripe price’s schedule.</p>
        </div>
        {openOffer && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>Waiting for payment</span>
        )}
      </div>

      {loadError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{loadError}</p>}
      {!data && !loadError && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>}

      {data && data.activeSubscription && (
        <p className="text-sm px-4 py-3 rounded-lg" style={{ background: 'var(--amber-bg)', color: 'var(--text)' }}>
          {userName} has an active {PLAN_NAMES[data.activeSubscription.plan] ?? data.activeSubscription.plan} plan
          {data.activeSubscription.paymentSource === 'apple' ? ' through Apple' : ''}. They can’t pay a custom plan link until it’s cancelled.
        </p>
      )}

      {data && data.prices.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No custom prices in Stripe yet. Add a recurring JPY price to a product whose metadata has <code>eigo_custom</code> set to <code>true</code>.
        </p>
      )}

      {data && data.prices.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr]">
            <label className="block">
              <span className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Stripe price</span>
              <select value={priceId} onChange={(e) => setPriceId(e.target.value)} className="w-full text-sm px-3 py-2.5 rounded-lg border-none outline-none" style={fieldStyle}>
                {data.prices.map((p) => (
                  <option key={p.id} value={p.id}>
                    {yen(p.priceJpy)} {intervalLabel(p.intervalUnit, p.intervalCount, false)}{p.label ? ` · ${p.label}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Minutes per payment</span>
              <input
                type="number" inputMode="numeric" min={15} step={15} value={minutes} placeholder="360"
                onChange={(e) => setMinutes(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-lg border-none outline-none" style={fieldStyle}
              />
            </label>
          </div>
          {mins > 0 && months > 1.05 && (
            <p className="text-xs -mt-3" style={{ color: 'var(--text-muted)' }}>About {Math.round(mins / months)} minutes a month</p>
          )}

          {data.sale && (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{data.sale.name || 'Sale'}, {data.sale.percentOff}% off</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {data.sale.forever ? 'Kept for as long as they stay subscribed. ' : ''}
                  {data.sale.endsAt ? `If they pay after ${new Date(data.sale.endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, they pay full price.` : ''}
                </p>
              </div>
              <button
                onClick={() => setApplySale(!applySale)}
                role="switch" aria-checked={applySale} aria-label="Apply the sale"
                className="relative shrink-0 w-11 h-6 rounded-full transition-colors"
                style={{ background: applySale ? 'var(--accent)' : 'var(--surface-hover)' }}
              >
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform" style={{ left: 2, transform: applySale ? 'translateX(20px)' : 'translateX(0)' }} />
              </button>
            </div>
          )}

          {price && hourly != null && (
            <div className="px-4 py-3 rounded-lg" style={{ background: hourly >= HOURLY_FLOOR_GBP ? 'var(--accent-bg)' : 'var(--amber-bg)' }}>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm" style={{ color: 'var(--text)' }}>They pay {yen(charge)} {intervalLabel(price.intervalUnit, price.intervalCount, false)}</span>
                <span className="text-sm font-semibold" style={{ color: hourly >= HOURLY_FLOOR_GBP ? 'var(--accent)' : 'var(--warning)' }}>£{hourly.toFixed(2)} an hour</span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {hourly >= HOURLY_FLOOR_GBP
                  ? `Your take-home after Stripe fees, above your £${HOURLY_FLOOR_GBP.toFixed(2)} floor.`
                  : `Below your £${HOURLY_FLOOR_GBP.toFixed(2)} floor. Pick a higher price or fewer minutes.`}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {openOffer ? 'Creating a new link turns off the current one.' : `Only ${userEmail || userName} can pay it.`}
            </span>
            <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
              <button
                onClick={create} disabled={busy}
                className="px-5 py-2.5 text-sm font-medium transition-transform active:scale-95 disabled:opacity-50 shrink-0"
                style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
              >
                {busy ? '…' : 'Create payment link'}
              </button>
            </Squircle>
          </div>
        </>
      )}

      {msg && <p className="text-sm" style={{ color: 'var(--danger)' }}>{msg}</p>}

      {openOffer && (
        <div className="pt-5 space-y-3" style={{ borderTop: '1px solid var(--divider)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Send this to {userName} on LINE or by email: {yen(openOffer.applySale && data?.sale ? salePrice(openOffer.priceJpy, data.sale.percentOff) : openOffer.priceJpy)}{' '}
            {intervalLabel(openOffer.intervalUnit, openOffer.intervalCount, false)}, {openOffer.minutesPerPeriod} minutes{openOffer.applySale ? ', with the sale' : ''}
          </p>
          <div className="flex items-center gap-2 rounded-lg pl-3 pr-1.5 py-1.5" style={{ background: 'var(--surface-hover)' }}>
            <span className="flex-1 min-w-0 truncate font-mono text-xs select-all" style={{ color: 'var(--text)' }}>{link}</span>
            <button onClick={copy} className="px-3 py-1.5 text-xs font-medium rounded-md transition-transform active:scale-95" style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Works until {userName} pays or you turn it off</span>
            <button onClick={() => turnOff(openOffer.id)} disabled={busy} className="text-xs font-medium px-3 py-1.5 rounded-md" style={{ color: 'var(--danger)', border: '1px solid var(--edge)' }}>
              Turn off link
            </button>
          </div>
        </div>
      )}

      {paidOffers.length > 0 && (
        <div className="pt-4 space-y-1" style={{ borderTop: '1px solid var(--divider)' }}>
          {paidOffers.map((o) => (
            <p key={o.id} className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Paid {o.paidAt ? new Date(o.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}: {yen(o.priceJpy)}{' '}
              {intervalLabel(o.intervalUnit, o.intervalCount, false)}, {o.minutesPerPeriod} minutes{o.applySale ? ', with the sale' : ''}
            </p>
          ))}
        </div>
      )}
    </SquircleBox>
  )
}
