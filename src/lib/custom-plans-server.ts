import { randomBytes } from 'node:crypto'
import type Stripe from 'stripe'
import { minutesFromWeekly, type CustomOffer, type CustomPrice, type IntervalUnit, type SaleInfo } from '@/lib/custom-plans'

/**
 * Server side of custom plans.
 *
 * Stripe setup (done by hand in the Stripe dashboard):
 * - Custom prices: recurring JPY prices on a product whose metadata has
 *   eigo_custom = true. Only those appear in the admin picker.
 * - The sale: a percent-off coupon whose ID is in STRIPE_SALE_COUPON_ID. Its
 *   "redeem by" date ends the sale; after that it's no longer offered.
 * - The 48-hour trial price, for 3-month custom plans only: a 38%-off coupon,
 *   duration "forever", whose ID is in STRIPE_TRIAL_COUPON_3MONTH (¥27,500 →
 *   ¥17,050, between the standard trial monthly and yearly rates per hour).
 *   Monthly and yearly custom plans keep their price; other lengths have no trial.
 */

export const CUSTOM_PRODUCT_FLAG = 'eigo_custom'

/** Active recurring JPY prices on products tagged eigo_custom=true, each with its trial discount (if any). */
export async function listCustomPrices(stripe: Stripe): Promise<CustomPrice[]> {
  const trials = await getTrialCoupons(stripe)
  const prices: CustomPrice[] = []
  for await (const p of stripe.prices.list({ active: true, type: 'recurring', currency: 'jpy', expand: ['data.product'], limit: 100 })) {
    const product = p.product as Stripe.Product | Stripe.DeletedProduct
    if (!product || ('deleted' in product && product.deleted)) continue
    const prod = product as Stripe.Product
    if (!prod.active || prod.metadata?.[CUSTOM_PRODUCT_FLAG] !== 'true') continue
    const parsed = toCustomPrice(p, prod)
    if (parsed) prices.push({ ...parsed, trialPercent: trials.get(trialKey(parsed.intervalUnit, parsed.intervalCount))?.percentOff ?? null })
  }
  return prices.sort((a, b) => a.priceJpy - b.priceJpy)
}

/** One price, only if it's an active custom price. */
export async function getCustomPrice(stripe: Stripe, priceId: string): Promise<CustomPrice | null> {
  try {
    const p = await stripe.prices.retrieve(priceId, { expand: ['product'] })
    const prod = p.product as Stripe.Product
    if (!p.active || p.currency !== 'jpy' || !p.recurring || !prod?.active || prod.metadata?.[CUSTOM_PRODUCT_FLAG] !== 'true') return null
    return toCustomPrice(p, prod)
  } catch {
    return null
  }
}

function toCustomPrice(p: Stripe.Price, prod: Stripe.Product): CustomPrice | null {
  if (!p.recurring || p.unit_amount == null) return null
  const unit = p.recurring.interval as IntervalUnit
  const count = p.recurring.interval_count
  return {
    id: p.id,
    label: p.nickname || prod.name,
    priceJpy: p.unit_amount, // JPY has no minor unit
    intervalUnit: unit,
    intervalCount: count,
    minutes: suggestedMinutes(p, prod, unit, count),
    trialPercent: null, // filled in by listCustomPrices
  }
}

/**
 * Minutes per payment to pre-fill in the admin: an eigo_minutes metadata value on
 * the price or product wins; otherwise "週90分" in the name means 90 a week.
 */
function suggestedMinutes(p: Stripe.Price, prod: Stripe.Product, unit: IntervalUnit, count: number): number | null {
  const meta = Number(p.metadata?.eigo_minutes || prod.metadata?.eigo_minutes)
  if (Number.isFinite(meta) && meta > 0) return Math.round(meta)
  const weekly = (p.nickname || '').match(/週\s*(\d+)\s*分/) || prod.name.match(/週\s*(\d+)\s*分/)
  return weekly ? minutesFromWeekly(Number(weekly[1]), unit, count) : null
}

/** The sale coupon while it can still be redeemed, else null. */
export async function getActiveSale(stripe: Stripe): Promise<(SaleInfo & { couponId: string }) | null> {
  const couponId = process.env.STRIPE_SALE_COUPON_ID
  if (!couponId) return null
  try {
    const c = await stripe.coupons.retrieve(couponId)
    if (!c.valid || !c.percent_off) return null
    return {
      couponId: c.id,
      percentOff: c.percent_off,
      endsAt: c.redeem_by ? new Date(c.redeem_by * 1000).toISOString() : null,
      name: c.name ?? null,
      forever: c.duration === 'forever',
    }
  } catch {
    return null
  }
}

export interface TrialCoupon { couponId: string; percentOff: number }

/** Billing lengths that have a trial coupon (only 3 months for now). */
const TRIAL_COUPON_ENV: Record<string, string> = {
  'month:3': 'STRIPE_TRIAL_COUPON_3MONTH',
}

function trialKey(unit: IntervalUnit, count: number): string {
  return `${unit}:${count}`
}

async function retrieveTrialCoupon(stripe: Stripe, couponId: string): Promise<TrialCoupon | null> {
  try {
    const c = await stripe.coupons.retrieve(couponId)
    // must stay on for the whole subscription, like the standard plans' trial prices
    if (!c.valid || !c.percent_off || c.duration !== 'forever') return null
    return { couponId: c.id, percentOff: c.percent_off }
  } catch {
    return null
  }
}

/** Every trial coupon that's set up and usable, keyed by billing length. */
async function getTrialCoupons(stripe: Stripe): Promise<Map<string, TrialCoupon>> {
  const entries = await Promise.all(Object.entries(TRIAL_COUPON_ENV).map(async ([key, envVar]) => {
    const id = process.env[envVar]
    return [key, id ? await retrieveTrialCoupon(stripe, id) : null] as const
  }))
  return new Map(entries.filter((e): e is readonly [string, TrialCoupon] => !!e[1]))
}

/** The trial coupon for one billing length, or null if there isn't a usable one. */
export async function getTrialCoupon(stripe: Stripe, unit: IntervalUnit, count: number): Promise<TrialCoupon | null> {
  const envVar = TRIAL_COUPON_ENV[trialKey(unit, count)]
  const id = envVar ? process.env[envVar] : undefined
  return id ? retrieveTrialCoupon(stripe, id) : null
}

/** A short, unguessable link token. */
export function newOfferToken(): string {
  return randomBytes(9).toString('base64url')
}

export interface OfferRow {
  id: string
  token: string
  user_id: string
  stripe_price_id: string
  price_jpy: number
  interval_unit: IntervalUnit
  interval_count: number
  minutes_per_period: number
  apply_sale: boolean
  apply_trial: boolean
  trial_percent: number | null
  expires_at: string | null
  status: 'open' | 'paid' | 'cancelled'
  stripe_subscription_id: string | null
  created_at: string
  paid_at: string | null
}

export function toOffer(r: OfferRow): CustomOffer {
  return {
    id: r.id,
    token: r.token,
    stripePriceId: r.stripe_price_id,
    priceJpy: r.price_jpy,
    intervalUnit: r.interval_unit,
    intervalCount: r.interval_count,
    minutesPerPeriod: r.minutes_per_period,
    applySale: r.apply_sale,
    applyTrial: r.apply_trial,
    trialPercent: r.trial_percent,
    expiresAt: r.expires_at,
    status: r.status,
    createdAt: r.created_at,
    paidAt: r.paid_at,
  }
}
