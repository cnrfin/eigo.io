import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateNextReview, type ReviewRating } from '@/lib/srs'

/**
 * GET /api/vocabulary
 * Fetch all vocabulary cards for the current user, with phrase details and SRS fields.
 * Optional: ?due=true to only return cards that are due for review.
 */
export async function GET(request: NextRequest) {
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
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const dueOnly = new URL(request.url).searchParams.get('due') === 'true'

  // Fetch cards with SRS fields
  let query = supabase
    .from('vocabulary_cards')
    .select('id, phrase_id, comfort_level, last_reviewed, review_count, interval_days, ease_factor, next_review_at, created_at')
    .eq('user_id', user.id)

  if (dueOnly) {
    query = query.lte('next_review_at', new Date().toISOString())
  }

  query = query.order('next_review_at', { ascending: true })

  const { data: cards, error } = await query

  if (error) {
    console.error('Failed to fetch vocabulary cards:', error)
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 })
  }

  if (!cards || cards.length === 0) {
    return NextResponse.json({ cards: [], dueCount: 0 })
  }

  // Fetch phrase details for all cards
  const phraseIds = cards.map(c => c.phrase_id).filter(Boolean)
  const { data: phrases } = await supabase
    .from('vocabulary_phrases')
    .select('id, phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category, booking_id')
    .in('id', phraseIds)

  const phraseMap = new Map((phrases || []).map(p => [p.id, p]))

  const cardsWithPhrases = cards.map(c => ({
    id: c.id,
    comfort_level: c.comfort_level,
    last_reviewed: c.last_reviewed,
    review_count: c.review_count,
    interval_days: c.interval_days,
    ease_factor: c.ease_factor,
    next_review_at: c.next_review_at,
    created_at: c.created_at,
    phrase: phraseMap.get(c.phrase_id) || null,
  })).filter(c => c.phrase !== null)

  // Count due cards
  const now = new Date().toISOString()
  const dueCount = cardsWithPhrases.filter(c => c.next_review_at <= now).length

  return NextResponse.json({ cards: cardsWithPhrases, dueCount })
}

/**
 * POST /api/vocabulary
 * Add a phrase to user's vocabulary bank: { phraseId: string }
 * Update via SRS review: { cardId: string, rating: 1|2|3|4 }
 * Legacy comfort update: { cardId: string, comfortLevel: 'learning'|'reviewing'|'mastered' }
 */
export async function POST(request: NextRequest) {
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
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let body: {
    phraseId?: string
    cardId?: string
    comfortLevel?: string
    rating?: number
    action?: string
    phrase_en?: string
    phrase_ja?: string
    example_en?: string
    explanation_en?: string
    explanation_ja?: string
    category?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // ── Edit phrase fields ──────────────────────────────────────
  if (body.action === 'updatePhrase' && body.cardId) {
    // Look up the card to get phrase_id, verify ownership
    const { data: card } = await supabase
      .from('vocabulary_cards')
      .select('phrase_id')
      .eq('id', body.cardId)
      .eq('user_id', user.id)
      .single()

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    const phraseUpdate: Record<string, string> = {}
    if (body.phrase_en !== undefined) phraseUpdate.phrase_en = body.phrase_en
    if (body.phrase_ja !== undefined) phraseUpdate.translation_ja = body.phrase_ja
    if (body.example_en !== undefined) phraseUpdate.example_en = body.example_en
    if (body.explanation_en !== undefined) phraseUpdate.explanation_en = body.explanation_en
    if (body.explanation_ja !== undefined) phraseUpdate.explanation_ja = body.explanation_ja
    if (body.category !== undefined) phraseUpdate.category = body.category

    if (Object.keys(phraseUpdate).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { error } = await supabase
      .from('vocabulary_phrases')
      .update(phraseUpdate)
      .eq('id', card.phrase_id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to update phrase:', error)
      return NextResponse.json({ error: 'Failed to update phrase' }, { status: 500 })
    }

    return NextResponse.json({ status: 'updated' })
  }

  // SRS review — new rating-based system
  if (body.cardId && body.rating) {
    const rating = body.rating as ReviewRating
    if (![1, 2, 3, 4].includes(rating)) {
      return NextResponse.json({ error: 'Invalid rating (must be 1-4)' }, { status: 400 })
    }

    // Fetch current card SRS state
    const { data: currentCard } = await supabase
      .from('vocabulary_cards')
      .select('review_count, interval_days, ease_factor')
      .eq('id', body.cardId)
      .eq('user_id', user.id)
      .single()

    if (!currentCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    const update = calculateNextReview(
      currentCard.interval_days ?? 1,
      currentCard.ease_factor ?? 2.5,
      rating
    )

    const { error } = await supabase
      .from('vocabulary_cards')
      .update({
        comfort_level: update.comfort_level,
        interval_days: update.interval_days,
        ease_factor: update.ease_factor,
        next_review_at: update.next_review_at,
        last_reviewed: new Date().toISOString(),
        review_count: (currentCard.review_count || 0) + 1,
      })
      .eq('id', body.cardId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to update card' }, { status: 500 })
    }

    return NextResponse.json({ status: 'reviewed', ...update })
  }

  // Legacy comfort level update (for manual override from card view)
  if (body.cardId && body.comfortLevel) {
    const validLevels = ['learning', 'reviewing', 'mastered']
    if (!validLevels.includes(body.comfortLevel)) {
      return NextResponse.json({ error: 'Invalid comfort level' }, { status: 400 })
    }

    const { data: currentCard } = await supabase
      .from('vocabulary_cards')
      .select('review_count')
      .eq('id', body.cardId)
      .eq('user_id', user.id)
      .single()

    const { error } = await supabase
      .from('vocabulary_cards')
      .update({
        comfort_level: body.comfortLevel,
        last_reviewed: new Date().toISOString(),
        review_count: (currentCard?.review_count || 0) + 1,
      })
      .eq('id', body.cardId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to update card' }, { status: 500 })
    }

    return NextResponse.json({ status: 'updated' })
  }

  // Add new card
  if (body.phraseId) {
    const { data: phrase } = await supabase
      .from('vocabulary_phrases')
      .select('id, user_id')
      .eq('id', body.phraseId)
      .single()

    if (!phrase || phrase.user_id !== user.id) {
      return NextResponse.json({ error: 'Phrase not found' }, { status: 404 })
    }

    const { data: card, error } = await supabase
      .from('vocabulary_cards')
      .upsert(
        {
          user_id: user.id,
          phrase_id: body.phraseId,
          comfort_level: 'learning',
          interval_days: 1,
          ease_factor: 2.5,
          next_review_at: new Date().toISOString(), // Due immediately
        },
        { onConflict: 'user_id,phrase_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('Failed to add card:', error)
      return NextResponse.json({ error: 'Failed to add to bank' }, { status: 500 })
    }

    return NextResponse.json({ status: 'added', card })
  }

  return NextResponse.json({ error: 'phraseId or cardId+rating required' }, { status: 400 })
}

/**
 * PATCH /api/vocabulary
 * Update phrase fields for a vocabulary card.
 * Body: { cardId: string, phrase_en?: string, phrase_ja?: string, example_en?: string, explanation_en?: string, explanation_ja?: string, category?: string }
 */
export async function PATCH(request: NextRequest) {
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
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    cardId?: string
    phrase_en?: string
    phrase_ja?: string
    example_en?: string
    explanation_en?: string
    explanation_ja?: string
    category?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.cardId) {
    return NextResponse.json({ error: 'cardId required' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Look up the card to get phrase_id, verify ownership
  const { data: card } = await supabase
    .from('vocabulary_cards')
    .select('phrase_id')
    .eq('id', body.cardId)
    .eq('user_id', user.id)
    .single()

  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  // Build the update object for vocabulary_phrases
  const phraseUpdate: Record<string, string> = {}
  if (body.phrase_en !== undefined) phraseUpdate.phrase_en = body.phrase_en
  if (body.phrase_ja !== undefined) phraseUpdate.translation_ja = body.phrase_ja
  if (body.example_en !== undefined) phraseUpdate.example_en = body.example_en
  if (body.explanation_en !== undefined) phraseUpdate.explanation_en = body.explanation_en
  if (body.explanation_ja !== undefined) phraseUpdate.explanation_ja = body.explanation_ja
  if (body.category !== undefined) phraseUpdate.category = body.category

  if (Object.keys(phraseUpdate).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('vocabulary_phrases')
    .update(phraseUpdate)
    .eq('id', card.phrase_id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to update phrase:', error)
    return NextResponse.json({ error: 'Failed to update phrase' }, { status: 500 })
  }

  return NextResponse.json({ status: 'updated' })
}

/**
 * DELETE /api/vocabulary?cardId=xxx
 * Remove a card from user's bank.
 */
export async function DELETE(request: NextRequest) {
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
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cardId = new URL(request.url).searchParams.get('cardId')
  if (!cardId) {
    return NextResponse.json({ error: 'cardId required' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { error } = await supabase
    .from('vocabulary_cards')
    .delete()
    .eq('id', cardId)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to remove card' }, { status: 500 })
  }

  return NextResponse.json({ status: 'removed' })
}
