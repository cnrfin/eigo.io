import { randomBytes } from 'node:crypto'
import type Stripe from 'stripe'
import type { CustomOffer, CustomPrice, IntervalUnit, SaleInfo } from '@/lib/custom-plans'

/**
 * Server side of custom plans.
 *
 * Stripe setup (done by hand in the Stripe dashboard):
 * - Custom prices: recurring JPY prices on a product whose metadata has
 *   eigo_custom = true. Only those appear in the admin picker.
 * - The sale: a percent-off coupon whose ID is in STRIPE_SALE_COUPON_ID. Its
 *   "redeem by" date ends the sale; after that it's no longer offered.
 */

export const CUSTOM_PRODUCT_FLAG = 'eigo_custom'

/** Active recurring JPY prices on products tagged eigo_custom=true. */
export async function listCustomPrices(stripe: Stripe): Promise<CustomPrice[]> {
  const prices: CustomPrice[] = []
  for await (const p of stripe.prices.list({ active: true, type: 'recurring', currency: 'jpy', expand: ['data.product'], limit: 100 })) {
    const product = p.product as Stripe.Product | Stripe.DeletedProduct
    if (!product || ('deleted' in product && product.deleted)) continue
    const prod = product as Stripe.Product
    if (!prod.active || prod.metadata?.[CUSTOM_PRODUCT_FLAG] !== 'true') continue
    const parsed = toCustomPrice(p, prod)
    if (parsed) prices.push(parsed)
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
  return {
    id: p.id,
    label: p.nickname || prod.name,
    priceJpy: p.unit_amount, // JPY has no minor unit
    intervalUnit: p.recurring.interval as IntervalUnit,
    intervalCount: p.recurring.interval_count,
  }
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
    status: r.status,
    createdAt: r.created_at,
    paidAt: r.paid_at,
  }
}
