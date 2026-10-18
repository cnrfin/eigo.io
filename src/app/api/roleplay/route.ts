import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-jwt'
import { aiAccess } from '@/lib/ai-tutor/access'
import { sceneById } from '@/lib/roleplay'
import { recordMission, sceneSummaries } from '@/lib/roleplay/progress'

/**
 * Role-plays (ai-panel-implementation-plan.md, phase 3).
 * GET  /api/roleplay              → { scenes: SceneSummary[] }   the list for the pickers, with the student's progress
 * GET  /api/roleplay?scene=<id>   → { scene: Scene }             one scene in full, when it starts
 * POST /api/roleplay  { sceneId, role, level }  → { cleared }    a mission completed (moves the level on)
 * For anyone with the AI tutor (pilot students, AI plan, admins).
 */
async function auth(request: NextRequest) {
  const h = request.headers.get('Authorization') ?? ''
  if (!h.startsWith('Bearer ')) return null
  const v = await verifySupabaseToken(h.slice(7))
  if (!v.ok) return null
  return (await aiAccess(v.user)).ok ? v.user : null
}

export async function GET(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const id = request.nextUrl.searchParams.get('scene')
  if (id) {
    const scene = sceneById(id)
    return scene ? NextResponse.json({ scene }) : NextResponse.json({ error: 'Unknown scene' }, { status: 404 })
  }
  return NextResponse.json({ scenes: await sceneSummaries(user.id) }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  let b: { sceneId?: string; role?: string; level?: number }
  try {
    b = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const role = b.role === 'b' ? 'b' : 'a'
  const level = b.level === 1 || b.level === 2 ? b.level : 0
  if (!sceneById(b.sceneId)) return NextResponse.json({ error: 'Unknown scene' }, { status: 404 })
  return NextResponse.json(await recordMission(user.id, b.sceneId!, role, level))
}
