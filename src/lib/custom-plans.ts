/**
 * Custom plans: a plan made for one student, paid through eigo.io/pay/<token>.
 * Shared, client-safe helpers (labels and take-home maths). The Stripe and
 * database side lives in custom-plans-server.ts.
 */

export type IntervalUnit = 'day' | 'week' | 'month' | 'year'

/** A Stripe price the admin can offer (a recurring JPY price on a product tagged eigo_custom=true). */
export interface CustomPrice {
  id: string
  label: string // the price's nickname in Stripe, else the product name
  priceJpy: number
  intervalUnit: IntervalUnit
  intervalCount: number
}

export interface CustomOffer {
  id: string
  token: string
  stripePriceId: string
  priceJpy: number
  intervalUnit: IntervalUnit
  intervalCount: number
  minutesPerPeriod: number
  applySale: boolean
  status: 'open' | 'paid' | 'cancelled'
  createdAt: string
  paidAt: string | null
}

/** The sale coupon, if one is set up and still redeemable. */
export interface SaleInfo {
  percentOff: number
  endsAt: string | null
  /** The coupon's name in Stripe (shown to the student), e.g. 年末年始キャンペーン */
  name: string | null
  /** true when the discount stays for as long as they're subscribed */
  forever: boolean
}

/** How often a price charges: "3ヶ月ごと" / "every 3 months". */
export function intervalLabel(unit: IntervalUnit, count: number, ja: boolean): string {
  if (ja) {
    const u = { day: '日', week: '週間', month: 'ヶ月', year: '年' }[unit]
    if (count === 1) return { day: '毎日', week: '毎週', month: '毎月', year: '毎年' }[unit]
    return `${count}${u}ごと`
  }
  if (count === 1) return { day: 'every day', week: 'every week', month: 'every month', year: 'every year' }[unit]
  return `every ${count} ${unit}s`
}

/** Short form after a price: "/ 3ヶ月" / "/ 3 months". */
export function perIntervalLabel(unit: IntervalUnit, count: number, ja: boolean): string {
  if (ja) {
    const u = { day: '日', week: '週', month: '月', year: '年' }[unit]
    return count === 1 ? `/ ${u}` : `/ ${count}${{ day: '日', week: '週間', month: 'ヶ月', year: '年' }[unit]}`
  }
  return count === 1 ? `/ ${unit}` : `/ ${count} ${unit}s`
}

/** Roughly how many months a billing period is, for "120 a month" style hints. */
export function periodMonths(unit: IntervalUnit, count: number): number {
  return { day: count / 30.44, week: (count * 7) / 30.44, month: count, year: count * 12 }[unit]
}

/** The price after the sale's percentage, to the yen (as Stripe rounds a percent-off coupon on JPY). */
export function salePrice(priceJpy: number, percentOff: number): number {
  return Math.round((priceJpy * (100 - percentOff)) / 100)
}

// ---------- Take-home maths (admin only, a guide not an invoice) ----------

/** Stripe UK on a Japanese card: international card 3.25%, currency conversion 2%, Billing 0.7%, plus 20p. */
export const STRIPE_FEE_PCT = 0.0595
export const STRIPE_FEE_FIXED_GBP = 0.2
/** Yen per pound. Rough and moves; only used to warn when a price is near the floor. */
export const GBP_JPY = 208
/** The hourly take-home a custom plan should clear. */
export const HOURLY_FLOOR_GBP = 12.1

/** Pounds kept per teaching hour after Stripe fees, if every minute is used. */
export function takeHomePerHour(chargeJpy: number, minutes: number): number {
  if (minutes <= 0) return 0
  const net = (chargeJpy / GBP_JPY) * (1 - STRIPE_FEE_PCT) - STRIPE_FEE_FIXED_GBP
  return net / (minutes / 60)
}
