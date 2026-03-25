import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/news — public endpoint, returns published news only
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data, error } = await supabase
    .from('news')
    .select('id, date, title_ja, title_en, content_ja, content_en, poster_name, poster_avatar_url')
    .eq('published', true)
    .order('date', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Failed to fetch news:', error)
    return NextResponse.json({ news: [] })
  }

  return NextResponse.json({ news: data })
}
