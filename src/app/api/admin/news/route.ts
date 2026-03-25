import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, getAdminSupabase } from '@/lib/admin'

// GET /api/admin/news — list all news (including unpublished)
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const supabase = getAdminSupabase()
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ news: data })
}

// POST /api/admin/news — create a new news item
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await request.json()
  const { date, title_ja, title_en, content_ja, content_en, published, poster_name, poster_avatar_url } = body

  // Prefer client-sent poster info, fall back to server-side user metadata
  const posterName = poster_name || admin.user_metadata?.full_name || admin.user_metadata?.name || admin.email?.split('@')[0] || ''
  const posterAvatarUrl = poster_avatar_url || admin.user_metadata?.avatar_url || admin.user_metadata?.picture || ''

  const supabase = getAdminSupabase()
  const { data, error } = await supabase
    .from('news')
    .insert({
      date: date || new Date().toISOString().split('T')[0],
      title_ja: title_ja || '',
      title_en: title_en || '',
      content_ja: content_ja || '',
      content_en: content_en || '',
      published: published ?? false,
      poster_name: posterName,
      poster_avatar_url: posterAvatarUrl,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ news: data })
}

// PUT /api/admin/news — update a news item
export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const supabase = getAdminSupabase()
  const { data, error } = await supabase
    .from('news')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ news: data })
}

// DELETE /api/admin/news?id=xxx
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const supabase = getAdminSupabase()
  const { error } = await supabase.from('news').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
