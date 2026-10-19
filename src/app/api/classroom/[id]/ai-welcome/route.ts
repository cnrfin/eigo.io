import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { json, loadClassroom } from '@/lib/classroom/server'
import { SCENES, sceneById } from '@/lib/roleplay'
import { recordMission } from '@/lib/roleplay/progress'
import { normalizeSettings } from '@/lib/ai-tutor/settings'
import { welcomeFacts } from '@/lib/ai-tutor/welcome-helper'
import { FACT_KEYS, mergeAboutMe, type Facts } from '@/lib/classroom/welcome'

/**
 * POST /api/classroom/[id]/ai-welcome   the free 5-minute welcome call (lib/classroom/welcome.ts)
 *   { op: 'about', sessionId, lines: [{ from, text }] } → { facts, thin }  the About-you facts, for the end screen
 *   { op: 'scenes' }                                    → { scenes }        the role-plays' ids and titles (to spot the one the tutor suggests)
 *   { op: 'save', facts }                               → { aboutMe }       confirmed: added to About me
 *   { op: 'scene', sceneId }                            → { scene }         the suggested role-play in full
 *   { op: 'record', sceneId }                           → { cleared }       its mission completed (初級, their own role)
 * Only for the student's own welcome call (profiles.ai_trial_booking_id). Saving also works on the end screen,
 * after the call.
 */
export const maxDuration = 15

type In = { from: string; text: string }

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id, { allowWhenEnded: true })
  if (ctx instanceof Response) return ctx
  const { booking } = ctx
  if (booking.lesson_kind !== 'ai' || booking.user_id !== ctx.user.id) return json(403, { error: 'Not allowed' })
  const db = getSupabaseAdmin()
  const { data: prof } = await db.from('profiles').select('ai_trial_booking_id').eq('id', ctx.user.id).maybeSingle()
  if (prof?.ai_trial_booking_id !== booking.id) return json(403, { error: 'Not the welcome call' })

  let b: { op?: string; sessionId?: string; lines?: unknown; facts?: unknown; sceneId?: string }
  try {
    b = await request.json()
  } catch {
    return json(400, { error: 'Invalid body' })
  }

  if (b.op === 'about') {
    const { data: sess } = await db.from('ai_sessions').select('ended_at').eq('session_id', String(b.sessionId ?? '')).eq('booking_id', booking.id).maybeSingle()
    if (!sess || sess.ended_at) return json(409, { facts: {}, thin: [], pick: null })
    const lines = (Array.isArray(b.lines) ? (b.lines as In[]) : [])
      .filter((l) => l && (l.from === 'student' || l.from === 'tutor') && typeof l.text === 'string' && l.text.trim())
      .slice(-24)
      .map((l) => ({ from: l.from as 'student' | 'tutor', text: l.text.slice(0, 600) }))
    return json(200, await welcomeFacts(lines))
  }

  if (b.op === 'save') {
    // the student's own About me (they can also edit it in their AI tutor settings): what they confirmed or typed
    const raw = (b.facts && typeof b.facts === 'object' ? b.facts : {}) as Record<string, unknown>
    const facts: Facts = {}
    for (const k of FACT_KEYS) {
      const v = typeof raw[k] === 'string' ? (raw[k] as string).replace(/\s+/g, ' ').replace(/[<>]/g, '').trim().slice(0, 80) : ''
      if (v) facts[k] = v
    }
    if (!Object.keys(facts).length) return json(400, { error: 'Nothing to save' })
    const { data: row } = await db.from('ai_tutor_profiles').select('settings').eq('user_id', ctx.user.id).maybeSingle()
    const settings = normalizeSettings(row?.settings)
    const aboutMe = mergeAboutMe(settings.aboutMe, facts)
    const { error } = await db
      .from('ai_tutor_profiles')
      .upsert({ user_id: ctx.user.id, settings: normalizeSettings({ ...settings, aboutMe }), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) return json(500, { error: 'Could not save' })
    return json(200, { aboutMe })
  }

  if (b.op === 'scenes') {
    return json(200, { scenes: SCENES.map((s) => ({ id: s.id, en: s.title.en, ja: s.title.ja })) })
  }

  if (b.op === 'scene') {
    const scene = sceneById(b.sceneId)
    return scene ? json(200, { scene }) : json(404, { error: 'Unknown scene' })
  }

  if (b.op === 'record') {
    const scene = sceneById(b.sceneId)
    if (!scene) return json(404, { error: 'Unknown scene' })
    return json(200, await recordMission(ctx.user.id, scene.id, scene.studentRole, 0))
  }

  return json(400, { error: 'Unknown op' })
}
