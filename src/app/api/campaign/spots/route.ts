import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const CAMPAIGN_ID = '50hours-2026'
const MAX_SPOTS = 50

export async function GET() {
  try {
    const admin = getSupabaseAdmin()

    const { count, error } = await admin
      .from('campaign_signups')
      .select('*', { count: 'exact', head: true })
      .eq('campaign', CAMPAIGN_ID)

    if (error) {
      console.error('Spots count error:', error)
      return NextResponse.json({ remaining: MAX_SPOTS, total: MAX_SPOTS })
    }

    const taken = count ?? 0
    return NextResponse.json({
      remaining: Math.max(0, MAX_SPOTS - taken),
      total: MAX_SPOTS,
      taken,
    })
  } catch {
    return NextResponse.json({ remaining: MAX_SPOTS, total: MAX_SPOTS })
  }
}
