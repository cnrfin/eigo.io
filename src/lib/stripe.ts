import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('Missing STRIPE_SECRET_KEY')
    _stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia' })
  }
  return _stripe
}

// ---------- Price ID helpers ----------

export type PlanName = 'light' | 'standard'
export type BillingInterval = 'monthly' | 'yearly'
export type PriceTier = 'trial' | 'full'

const PRICE_ENV_MAP: Record<string, string> = {
  'light_monthly_trial': 'STRIPE_PRICE_LIGHT_MONTHLY_TRIAL',
  'light_monthly_full': 'STRIPE_PRICE_LIGHT_MONTHLY_FULL',
  'light_yearly_trial': 'STRIPE_PRICE_LIGHT_YEARLY_TRIAL',
  'light_yearly_full': 'STRIPE_PRICE_LIGHT_YEARLY_FULL',
  'standard_monthly_trial': 'STRIPE_PRICE_STANDARD_MONTHLY_TRIAL',
  'standard_monthly_full': 'STRIPE_PRICE_STANDARD_MONTHLY_FULL',
  'standard_yearly_trial': 'STRIPE_PRICE_STANDARD_YEARLY_TRIAL',
  'standard_yearly_full': 'STRIPE_PRICE_STANDARD_YEARLY_FULL',
}

/**
 * Look up the Stripe Price ID for a given plan + interval + tier combination.
 */
export function getStripePriceId(
  plan: PlanName,
  interval: BillingInterval,
  tier: PriceTier,
): string {
  const key = `${plan}_${interval}_${tier}`
  const envVar = PRICE_ENV_MAP[key]
  if (!envVar) throw new Error(`Unknown price combination: ${key}`)
  const priceId = process.env[envVar]
  if (!priceId) throw new Error(`Missing env var ${envVar}`)
  return priceId
}

// ---------- Plan → minutes mapping ----------

export const PLAN_MINUTES: Record<PlanName, number> = {
  light: 120,    // 30 min/week ≈ 2 hr/month
  standard: 240, // 60 min/week ≈ 4 hr/month
}

// ---------- Display prices (JPY) ----------

// Display names for plans
export const PLAN_DISPLAY_NAMES: Record<PlanName, string> = {
  light: 'Student Lite',
  standard: 'Student Standard',
}

export const PLAN_PRICES = {
  light: {
    monthly: { trial: 6000, full: 10000 },
    yearly: { trial: 60000, full: 120000 },
  },
  standard: {
    monthly: { trial: 12000, full: 20000 },
    yearly: { trial: 120000, full: 240000 },
  },
} as const
