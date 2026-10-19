import Stripe from 'stripe'
import { AI_PLAN_MINUTES } from './minutes-core'

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

export type PlanName = 'light' | 'standard' | 'test' | 'ai'
export const PLAN_NAMES: PlanName[] = ['light', 'standard', 'test', 'ai']
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
  // Exam Pass (模試パス): tests only, no lesson minutes. Monthly, no trial price.
  'test_monthly_trial': 'STRIPE_PRICE_TEST_MONTHLY_FULL', // trial window doesn't discount tests
  'test_monthly_full': 'STRIPE_PRICE_TEST_MONTHLY_FULL',
  // AI plan: AI tutor lessons only (pilot until the AI rollout). No trial price (the trial is a free 5-minute AI call).
  'ai_monthly_trial': 'STRIPE_PRICE_AI_MONTHLY',
  'ai_monthly_full': 'STRIPE_PRICE_AI_MONTHLY',
  'ai_yearly_trial': 'STRIPE_PRICE_AI_YEARLY',
  'ai_yearly_full': 'STRIPE_PRICE_AI_YEARLY',
}

/** Which plan a Stripe price belongs to (plan switches made in the Billing Portal change the price, not our metadata). */
export function planForPriceId(priceId: string | null | undefined): { plan: PlanName; interval: BillingInterval } | null {
  if (!priceId) return null
  for (const [key, envVar] of Object.entries(PRICE_ENV_MAP)) {
    if (process.env[envVar] === priceId) {
      const [plan, interval] = key.split('_') as [PlanName, BillingInterval]
      return { plan, interval }
    }
  }
  return null
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
  test: 0,       // Exam Pass: tests only, no lesson minutes
  ai: 0,         // AI plan: no teacher-lesson minutes, AI minutes instead (AI_PLAN_MINUTES)
}

/** AI minutes a month on the AI plan (AI tutor lessons use them 1:1): set in minutes-core, shared with the browser. */
export { AI_PLAN_MINUTES }

/** AI minutes for one billing period (subscriptions.ai_minutes_per_month): yearly gets the year's up front. */
export function aiAllowance(plan: PlanName, interval: BillingInterval): number {
  return plan === 'ai' ? AI_PLAN_MINUTES * (interval === 'yearly' ? 12 : 1) : 0
}

/**
 * Minutes for one billing period (subscriptions.minutes_per_month holds this: minutes are counted per billing
 * period). Monthly plans get one month's minutes; yearly plans get the whole year's up front (12 × monthly).
 */
export function planAllowance(plan: PlanName, interval: BillingInterval): number {
  return PLAN_MINUTES[plan] * (interval === 'yearly' ? 12 : 1)
}

// ---------- Display prices (JPY) ----------

// Display names for plans
export const PLAN_DISPLAY_NAMES: Record<PlanName, string> = {
  light: 'Student Lite',
  standard: 'Student Standard',
  test: 'Exam Pass',
  ai: 'AI Plan',
}

export const PLAN_PRICES = {
  light: {
    monthly: { trial: 6000, full: 10000 },
    yearly: { trial: 66000, full: 100000 },
  },
  standard: {
    monthly: { trial: 12000, full: 20000 },
    yearly: { trial: 132000, full: 200000 },
  },
  test: {
    monthly: { trial: 2980, full: 2980 }, // no trial discount
  },
  ai: {
    monthly: { trial: 2980, full: 2980 },
    yearly: { trial: 29800, full: 29800 },
  },
} as const
