import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe, PLAN_MINUTES } from '@/lib/stripe'
import type { PlanName, BillingInterval, PriceTier } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Extract period start/end from a Stripe Subscription object.
 * In the current Stripe API, period dates live on subscription items, not the subscription itself.
 */
function getSubscriptionPeriod(sub: Stripe.Subscription): { start: string; end: string } {
  const item = sub.items?.data?.[0]
  if (item) {
    return {
      start: new Date(item.current_period_start * 1000).toISOString(),
      end: new Date(item.current_period_end * 1000).toISOString(),
    }
  }
  // Fallback: use billing_cycle_anchor as start estimate
  return {
    start: new Date(sub.billing_cycle_anchor * 1000).toISOString(),
    end: new Date().toISOString(),
  }
}

/**
 * Extract the subscription ID from an invoice, handling the newer parent-based API.
 */
function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  // Newer API: invoice.parent.subscription_details.subscription
  const parent = invoice.parent as { subscription_details?: { subscription?: string | Stripe.Subscription } } | null
  if (parent?.subscription_details?.subscription) {
    const sub = parent.subscription_details.subscription
    return typeof sub === 'string' ? sub : sub.id
  }
  return null
}

// Stripe sends raw body — we need to read it as text for signature verification
export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const supabase = getSupabaseAdmin()

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session)
        break
      }

      case 'invoice.paid': {
        await handleInvoicePaid(supabase, stripe, event.data.object as Stripe.Invoice)
        break
      }

      case 'customer.subscription.updated': {
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription)
        break
      }

      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription)
        break
      }

      case 'invoice.payment_failed': {
        await handlePaymentFailed(supabase, event.data.object as Stripe.Invoice)
        break
      }

      default:
        // Unhandled event type — that's fine
        break
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err)
    // Return 200 anyway so Stripe doesn't retry endlessly
  }

  return NextResponse.json({ received: true })
}

// ---------- Event handlers ----------

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  session: Stripe.Checkout.Session,
) {
  const meta = session.metadata
  if (!meta?.supabase_user_id) {
    console.error('Checkout session missing supabase_user_id metadata')
    return
  }

  const userId = meta.supabase_user_id
  const plan = meta.plan as PlanName
  const interval = meta.interval as BillingInterval
  const tier = meta.tier as PriceTier
  const minutesPerMonth = parseInt(meta.minutes_per_month || '0', 10)
  const stripeCustomerId = session.customer as string
  const stripeSubscriptionId = session.subscription as string

  // Check for existing subscription record (idempotency)
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .single()

  if (existing) return // Already processed

  // Fetch the Stripe subscription to get period dates
  const stripe = getStripe()
  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
  const period = getSubscriptionPeriod(sub)

  // Upsert — handles case where user had a cancelled subscription record
  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        plan,
        billing_interval: interval,
        price_tier: tier,
        status: 'active',
        minutes_per_month: minutesPerMonth || PLAN_MINUTES[plan],
        current_period_start: period.start,
        current_period_end: period.end,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

  if (error) console.error('Failed to upsert subscription:', error)
}

async function handleInvoicePaid(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  stripe: Stripe,
  invoice: Stripe.Invoice,
) {
  // Only handle subscription invoices
  const subId = getSubscriptionIdFromInvoice(invoice)
  if (!subId) return

  // Fetch the subscription to get updated period dates
  const sub = await stripe.subscriptions.retrieve(subId)
  const period = getSubscriptionPeriod(sub)

  // Update period dates — this effectively resets the minute counter
  // because getMinuteBalance() queries by period_start
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: period.start,
      current_period_end: period.end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subId)

  if (error) console.error('Failed to update subscription period:', error)
}

async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  subscription: Stripe.Subscription,
) {
  const meta = subscription.metadata
  const plan = meta?.plan as PlanName | undefined
  const interval = meta?.interval as BillingInterval | undefined
  const period = getSubscriptionPeriod(subscription)

  // Stripe uses cancel_at (timestamp) instead of cancel_at_period_end in newer portal flows
  const cancelAt = (subscription as unknown as Record<string, unknown>).cancel_at as number | null
  const isCancellingAtPeriodEnd = subscription.cancel_at_period_end || (cancelAt != null && cancelAt > 0)

  const updateData: Record<string, unknown> = {
    status: subscription.status === 'active' ? 'active' : subscription.status,
    cancel_at_period_end: isCancellingAtPeriodEnd,
    current_period_start: period.start,
    current_period_end: period.end,
    updated_at: new Date().toISOString(),
  }

  // Update plan details if present in metadata (e.g. after an upgrade)
  if (plan && ['light', 'standard'].includes(plan)) {
    updateData.plan = plan
    updateData.minutes_per_month = PLAN_MINUTES[plan]
  }
  if (interval && ['monthly', 'yearly'].includes(interval)) {
    updateData.billing_interval = interval
  }

  const { error } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('stripe_subscription_id', subscription.id)

  if (error) console.error('Failed to update subscription:', error)
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  subscription: Stripe.Subscription,
) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) console.error('Failed to mark subscription as cancelled:', error)
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  invoice: Stripe.Invoice,
) {
  const subId = getSubscriptionIdFromInvoice(invoice)
  if (!subId) return

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subId)

  if (error) console.error('Failed to mark subscription as past_due:', error)
}
