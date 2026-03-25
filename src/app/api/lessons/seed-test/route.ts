import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['cnrfin93@gmail.com']

/**
 * POST /api/lessons/seed-test
 *
 * Admin-only: Seeds AI analysis test data onto a user's most recent completed lesson.
 * Body: { userId?: string } — defaults to current user if omitted
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

  if (!ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let body: { userId?: string } = {}
  try { body = await request.json() } catch { /* use defaults */ }

  const targetUserId = body.userId || user.id

  // Find the most recent completed booking for the target user
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, date, start_time, duration_minutes, status')
    .eq('user_id', targetUserId)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(5)

  if (!bookings || bookings.length === 0) {
    // Create a fake completed booking if none exist
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0]

    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: targetUserId,
        date: dateStr,
        start_time: '10:00:00',
        duration_minutes: 30,
        status: 'completed',
        transcription_id: 'test-seed-transcription',
      })
      .select()
      .single()

    if (bookingError) {
      return NextResponse.json({ error: 'Failed to create test booking: ' + bookingError.message }, { status: 500 })
    }

    bookings!.push(newBooking)
  }

  const booking = bookings![0]

  // Check if summary already exists for this booking
  const { data: existing } = await supabase
    .from('lesson_summaries')
    .select('id')
    .eq('booking_id', booking.id)
    .single()

  if (existing) {
    return NextResponse.json({
      status: 'already_exists',
      message: `Test data already exists for booking ${booking.id} (${booking.date} ${booking.start_time})`,
      bookingId: booking.id,
    })
  }

  // Insert test summary
  const { data: summary, error: summaryError } = await supabase
    .from('lesson_summaries')
    .insert({
      booking_id: booking.id,
      user_id: targetUserId,
      summary_en: 'The lesson covered daily conversation and grammar practice. The student talked about their weekend shopping trip and an upcoming business trip to Singapore. Key grammar points included present perfect continuous, correct use of "there were" with plural nouns, and natural collocations like "give a presentation."',
      summary_ja: 'このレッスンは、日常会話と文法練習を組み合わせた内容でした。学生は週末の買い物の話をし、その後シンガポールへの出張について話して、「went shopping」「there were」「現在完了進行形」などの言い方や、「give a presentation」といったプレゼン関連の表現を練習しました。',
      key_topics: ['daily conversation', 'present perfect continuous', 'countable nouns', 'business travel', 'presentations'],
      mistake_patterns: [
        {
          type: 'grammar',
          example_student: 'There was so many people there.',
          correction: 'There were so many people there.',
          explanation_ja: '「people」は複数なので、be動詞は「was」ではなく「were」を使います。だから「There were so many people.」が自然です。',
          explanation_en: '"People" is plural, so we use "were," not "was." That\'s why "There were so many people there" is correct.',
        },
        {
          type: 'word choice',
          example_student: 'this time I need to do presentation in English',
          correction: 'this time I need to give a presentation in English',
          explanation_ja: '英語では「プレゼンをする」は基本的に「do a presentation」より「give a presentation」を使います。なので「give a presentation」が自然です。',
          explanation_en: 'In English, we usually say "give a presentation," not "do a presentation." So "give a presentation" sounds natural.',
        },
        {
          type: 'grammar',
          example_student: 'I went to shopping with my friend on Saturday.',
          correction: 'I went shopping with my friend on Saturday.',
          explanation_ja: '「買い物に行く」は英語では「go shopping」で「go to shopping」とは言いません。だから「I went shopping...」が正解です。',
          explanation_en: 'In English we say "go shopping," not "go to shopping." So "I went shopping..." is correct.',
        },
        {
          type: 'grammar',
          example_student: 'I went there before, two times.',
          correction: "I've been there before, twice.",
          explanation_ja: '回数は「two times」でも通じますが、より自然なのは「twice」です。また「before」を使うなら「I\'ve been there before」が定番です。',
          explanation_en: '"Two times" is understandable, but "twice" is more natural. Also with "before," "I\'ve been there before" is the usual pattern.',
        },
      ],
    })
    .select()
    .single()

  if (summaryError) {
    return NextResponse.json({ error: 'Failed to insert summary: ' + summaryError.message }, { status: 500 })
  }

  // Insert test phrases
  const testPhrases = [
    {
      booking_id: booking.id,
      user_id: targetUserId,
      phrase_en: 'How was your weekend?',
      example_en: 'How was your weekend? Did you do anything fun?',
      translation_ja: '週末どうだった？何か楽しいことした？',
      explanation_ja: '会話の最初に使う定番の聞き方です。',
      explanation_en: 'A standard conversation opener to ask about someone\'s weekend.',
      category: 'daily',
    },
    {
      booking_id: booking.id,
      user_id: targetUserId,
      phrase_en: "I've been looking for",
      example_en: "I've been looking for a new jacket since last month.",
      translation_ja: 'ずっと探していた',
      explanation_ja: '過去から今まで続いている行動を表す現在完了進行形。「ずっと〜していた」というニュアンスです。',
      explanation_en: 'Present perfect continuous — expresses an action that started in the past and continued until now.',
      category: 'daily',
    },
    {
      booking_id: booking.id,
      user_id: targetUserId,
      phrase_en: 'give a presentation',
      example_en: 'I need to give a presentation in English at the conference.',
      translation_ja: 'プレゼンをする',
      explanation_ja: 'ビジネスで「プレゼンをする」は「give a presentation」が自然。「do a presentation」はあまり使いません。',
      explanation_en: 'The natural collocation for presenting at work. "Give a presentation" is preferred over "do a presentation."',
      category: 'business',
    },
    {
      booking_id: booking.id,
      user_id: targetUserId,
      phrase_en: 'Sounds like a plan',
      example_en: "I'll prepare the slides before next week. — Sounds like a plan!",
      translation_ja: 'いいね、そうしよう',
      explanation_ja: '相手の提案に賛成するときのカジュアルな表現。友達同士でもビジネスでも使えます。',
      explanation_en: 'A casual way to agree with someone\'s suggestion. Works in both casual and professional settings.',
      category: 'daily',
    },
    {
      booking_id: booking.id,
      user_id: targetUserId,
      phrase_en: "I'm a little nervous",
      example_en: "I'm a little nervous about the presentation next week.",
      translation_ja: 'ちょっと緊張している',
      explanation_ja: '不安や緊張を表すときに使います。「a little」をつけると控えめな表現になります。',
      explanation_en: 'Used to express mild anxiety. Adding "a little" softens the statement.',
      category: 'daily',
    },
    {
      booking_id: booking.id,
      user_id: targetUserId,
      phrase_en: 'Is it your first time?',
      example_en: 'Is it your first time going to Singapore?',
      translation_ja: '初めてですか？',
      explanation_ja: '「〜するのは初めてですか？」と聞くときの定番フレーズ。後ろに動詞のing形を続けます。',
      explanation_en: 'A common way to ask if someone has done something before. Follow with a gerund (-ing form).',
      category: 'travel',
    },
    {
      booking_id: booking.id,
      user_id: targetUserId,
      phrase_en: 'Would you like to',
      example_en: 'Would you like to practice your presentation in our next lesson?',
      translation_ja: '〜しませんか？',
      explanation_ja: '丁寧に提案するときの表現。「Do you want to」よりフォーマルで優しい印象です。',
      explanation_en: 'A polite way to make a suggestion. More formal and gentler than "Do you want to."',
      category: 'social',
    },
    {
      booking_id: booking.id,
      user_id: targetUserId,
      phrase_en: 'work on',
      example_en: 'We can work on the structure and delivery next time.',
      translation_ja: '〜に取り組む',
      explanation_ja: '何かを改善したり練習したりするときに使います。「work on + 名詞」の形で使います。',
      explanation_en: 'Used when improving or practicing something. Used in the pattern "work on + noun."',
      category: 'general',
    },
  ]

  const { data: insertedPhrases, error: phrasesError } = await supabase
    .from('vocabulary_phrases')
    .insert(testPhrases)
    .select()

  if (phrasesError) {
    return NextResponse.json({ error: 'Failed to insert phrases: ' + phrasesError.message }, { status: 500 })
  }

  // Add a few phrases to the vocab bank with SRS fields
  const now = new Date()
  const cardsToInsert = (insertedPhrases || []).slice(0, 4).map((p, i) => ({
    user_id: targetUserId,
    phrase_id: p.id,
    comfort_level: i === 0 ? 'mastered' : i === 1 ? 'reviewing' : 'learning',
    interval_days: i === 0 ? 30 : i === 1 ? 7 : 1,
    ease_factor: i === 0 ? 2.8 : i === 1 ? 2.5 : 2.5,
    next_review_at: i === 0
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()  // mastered: due in 30 days
      : new Date(now.getTime() - 1000).toISOString(),  // reviewing/learning: due now (for testing)
    review_count: i === 0 ? 8 : i === 1 ? 3 : 0,
  }))

  const { error: cardsError } = await supabase
    .from('vocabulary_cards')
    .insert(cardsToInsert)

  if (cardsError) {
    console.error('Failed to insert test cards:', cardsError)
  }

  return NextResponse.json({
    status: 'seeded',
    bookingId: booking.id,
    bookingDate: booking.date,
    summaryId: summary.id,
    phrasesCount: insertedPhrases?.length || 0,
    cardsCount: cardsToInsert.length,
    message: `Test data seeded on booking ${booking.date} ${booking.start_time}`,
  })
}

/**
 * DELETE /api/lessons/seed-test
 * Admin-only: Remove all test seed data for a user.
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

  if (!ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let body: { userId?: string } = {}
  try { body = await request.json() } catch { /* use defaults */ }
  const targetUserId = body.userId || user.id

  // Delete cards first (FK constraint), then phrases, then summaries
  await supabase.from('vocabulary_cards').delete().eq('user_id', targetUserId)
  await supabase.from('vocabulary_phrases').delete().eq('user_id', targetUserId)
  await supabase.from('lesson_summaries').delete().eq('user_id', targetUserId)

  return NextResponse.json({ status: 'cleared', userId: targetUserId })
}
