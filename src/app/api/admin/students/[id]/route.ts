import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['cnrfin93@gmail.com']

/**
 * GET /api/admin/students/[id]
 * Full progress data for a single student:
 *   - profile info
 *   - vocab stats (total, by comfort level, total reviews)
 *   - recent vocab activity (last 10 reviewed cards)
 *   - full phrase bank with SRS data
 *   - lesson summaries with mistake patterns
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await params
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token)
  if (authError || !user || !ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Fetch everything in parallel
  const [profileRes, cardsRes, phrasesRes, summariesRes, bookingsRes] = await Promise.all([
    // Profile
    supabase
      .from('profiles')
      .select('id, display_name, email, avatar_url, created_at')
      .eq('id', studentId)
      .single(),

    // Vocab cards with SRS fields
    supabase
      .from('vocabulary_cards')
      .select('id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at')
      .eq('user_id', studentId)
      .order('last_reviewed', { ascending: false, nullsFirst: false }),

    // All phrases for this student
    supabase
      .from('vocabulary_phrases')
      .select('id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, booking_id, created_at')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false }),

    // Lesson summaries with mistake patterns
    supabase
      .from('lesson_summaries')
      .select('id, booking_id, summary_en, summary_ja, key_topics, mistake_patterns, created_at')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false }),

    // Bookings for lesson context
    supabase
      .from('bookings')
      .select('id, date, start_time, duration_minutes, status')
      .eq('user_id', studentId)
      .order('date', { ascending: false }),
  ])

  if (profileRes.error || !profileRes.data) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const cards = cardsRes.data || []
  const phrases = phrasesRes.data || []
  const summaries = summariesRes.data || []
  const bookings = bookingsRes.data || []

  // Build phrase map for card enrichment
  const phraseMap = new Map(phrases.map(p => [p.id, p]))

  // Enrich cards with phrase data
  const enrichedCards = cards.map(c => ({
    ...c,
    phrase: phraseMap.get(c.phrase_id) || null,
  })).filter(c => c.phrase !== null)

  // Compute stats
  const now = new Date().toISOString()
  const stats = {
    totalPhrases: enrichedCards.length,
    learning: enrichedCards.filter(c => c.comfort_level === 'learning').length,
    reviewing: enrichedCards.filter(c => c.comfort_level === 'reviewing').length,
    mastered: enrichedCards.filter(c => c.comfort_level === 'mastered').length,
    totalReviews: enrichedCards.reduce((sum, c) => sum + (c.review_count || 0), 0),
    dueNow: enrichedCards.filter(c => c.next_review_at <= now).length,
    avgEase: enrichedCards.length > 0
      ? Math.round(enrichedCards.reduce((sum, c) => sum + (c.ease_factor || 2.5), 0) / enrichedCards.length * 100) / 100
      : 0,
    totalLessons: bookings.length,
    analyzedLessons: summaries.length,
  }

  // Recent activity: last 10 reviewed cards
  const recentActivity = enrichedCards
    .filter(c => c.last_reviewed)
    .slice(0, 10)

  // Build booking map for summaries
  const bookingMap = new Map(bookings.map(b => [b.id, b]))

  // Summaries with booking context
  const enrichedSummaries = summaries.map(s => ({
    ...s,
    booking: bookingMap.get(s.booking_id) || null,
  }))

  return NextResponse.json({
    profile: profileRes.data,
    stats,
    recentActivity,
    cards: enrichedCards,
    summaries: enrichedSummaries,
    bookings,
  })
}
