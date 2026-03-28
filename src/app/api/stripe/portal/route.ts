import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// Cache the portal configuration ID so we don't create a new one on every request
let cachedPortalConfigId: string | null = null

async function getPortalConfigId(): Promise<string> {
  if (cachedPortalConfigId) return cachedPortalConfigId

  const stripe = getStripe()

  // Check for existing configurations first
  const existing = await stripe.billingPortal.configurations.list({ limit: 10 })
  const match = existing.data.find((c) => c.is_default || c.active)
  if (match) {
    cachedPortalConfigId = match.id
    return match.id
  }

  // Create a new portal configuration: cancel at period end, not immediately
  const config = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'Manage your eigo subscription',
    },
    features: {
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
      },
      payment_method_update: {
        enabled: true,
      },
      invoice_history: {
        enabled: true,
      },
    },
  })

  cachedPortalConfigId = config.id
  return config.id
}

// POST /api/stripe/portal
// Creates a Stripe Customer Portal session for managing subscription
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    )
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Look up their Stripe customer ID
    const supabaseAdmin = getSupabaseAdmin()
    const { data: sub, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (subError || !sub?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 },
      )
    }

    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://eigo.io'

    let session
    try {
      const configId = await getPortalConfigId()
      session = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: `${baseUrl}/settings`,
        configuration: configId,
      })
    } catch {
      // Config may be stale — retry without custom configuration
      cachedPortalConfigId = null
      session = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: `${baseUrl}/settings`,
      })
    }

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Stripe portal error:', msg, error)
    return NextResponse.json(
      { error: `Failed to create portal session: ${msg}` },
      { status: 500 },
    )
  }
}
