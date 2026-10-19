import { createRoot } from 'react-dom/client'
import { act } from 'react'
import ClassroomApp from '@/components/classroom/ClassroomApp'
const g = globalThis as any
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
export async function run(join: any) {
  g.log = []
  g.fakeStream = { id: 'local', getAudioTracks: () => [], getVideoTracks: () => [] }
  g.roomState = { connectionStatus: 'connecting', remoteParticipants: [], localParticipant: { isAudioEnabled: true, isVideoEnabled: true, stream: g.fakeStream }, cloudRecording: undefined }
  const calls: any[] = []
  g.fetch = async (url: string, init: any = {}) => {
    calls.push([url, init.method || 'GET', init.body || ''])
    g.log.push('fetch ' + (init.method || 'GET') + ' ' + url + ' ' + (init.body || ''))
    if (url.endsWith('/join')) return new Response(JSON.stringify(join), { status: 200 })
    if (url.endsWith('/event')) { const type = JSON.parse(init.body).type; return new Response(JSON.stringify({ session: { startedAt: type === 'start' ? new Date(Date.now() - 1000).toISOString() : join.session.startedAt, endedAt: type === 'end' ? new Date().toISOString() : null, studentJoinedAt: null, recordingStoppedAt: null } })) }
    if (url.includes('/course?')) return new Response(JSON.stringify({ course: g.COURSE, version: 1, assetBase: 'https://cdn/x/' }))
    if (url.endsWith('/library')) return new Response(JSON.stringify({ courses: [{ id: 'c_greatbritain', title: 'Great Britain for Beginners', level: 'A2', units: g.COURSE.units.map((u: any) => ({ title: u.title, lessons: u.lessons.map((l: any) => ({ id: l.id, title: l.title, slides: l.slides.length })) })) }], progress: { c_greatbritain: { lessonId: g.COURSE.units[0].lessons[1].id, slideId: g.COURSE.units[0].lessons[1].slides[4].id, completed: [g.COURSE.units[0].lessons[0].id] } } }))
    if (url.endsWith('/state') || url.endsWith('/ink') || url.endsWith('/activity')) return new Response(JSON.stringify({ ok: true }))
    if (url.endsWith('/words') && (init.method || 'GET') === 'GET') return new Response(JSON.stringify({ saved: [] }))
    if (url.includes('/words')) return new Response(JSON.stringify({ ok: true }))
    if (url.endsWith('/lookup')) { const b = JSON.parse(init.body); return new Response(JSON.stringify({ term: b.term.toLowerCase(), pos: 'noun', ja: 'テスト', meaning: 'a test meaning', example: 'This is a **' + b.term + '**.' })) }
    if (url.endsWith('/translate')) return new Response(JSON.stringify({ translation: 'よくできました！' }))
    if (url.endsWith('/ai-session')) return new Response(JSON.stringify(g.aiSessionResponse ?? { sessionId: 'live_1', sdp: 'v=0 answer', endsAt: join.window.end }), { status: g.aiSessionStatus ?? 200 })
    if (url.endsWith('/ai-report')) return new Response(JSON.stringify({ ok: true }))
    if (url.includes('/api/roleplay?scene=')) { const id = decodeURIComponent(url.split('scene=')[1]); const sc = (g.RP_SCENES ?? []).find((x: any) => x.id === id); return new Response(JSON.stringify(sc ? { scene: sc } : { error: 'x' }), { status: sc ? 200 : 404 }) }
    if (url.endsWith('/api/roleplay')) return new Response(JSON.stringify({ scenes: g.RP_LIST ?? [] }))
    if (url.endsWith('/api/slide-courses/catalog')) return new Response(JSON.stringify({ courses: g.CATALOG ?? [] }))
    if (url.endsWith('/ai-assist')) {
      const b = JSON.parse(init.body)
      if (b.mode === 'prepare') return new Response(JSON.stringify(g.prepResponse ?? { card: null }))
      if (g.assistDelay) await new Promise((r) => setTimeout(r, g.assistDelay))
      return new Response(JSON.stringify(g.assistResponse ?? { card: null }))
    }
    if (url.endsWith('/ai-turn')) { if (g.turnDelay) await new Promise((r) => setTimeout(r, g.turnDelay)); const tr = typeof g.turnResponse === 'function' ? g.turnResponse(JSON.parse(String(init.body ?? '{}'))) : g.turnResponse; return new Response(JSON.stringify(tr ?? { move: 'stay', slide: null })) }
    if (url.endsWith('/ai-open')) { const L2 = g.COURSE.units[0].lessons[1]; return new Response(JSON.stringify({ open: { courseId: 'c_greatbritain', lessonId: L2.id, slideId: L2.slides[0].id }, title: 'Great Britain, lesson 2: ' + L2.title })) }
    if (url.endsWith('/ai-welcome')) {
      const b = JSON.parse(init.body)
      if (b.op === 'about') return new Response(JSON.stringify((typeof g.welcomeAbout === 'function' ? g.welcomeAbout(b) : g.welcomeAbout) ?? { facts: {}, pick: null }))
      if (b.op === 'scene') { const sc = (g.RP_SCENES ?? []).find((x: any) => x.id === b.sceneId); return new Response(JSON.stringify(sc ? { scene: sc } : { error: 'x' }), { status: sc ? 200 : 404 }) }
      if (b.op === 'save') return new Response(JSON.stringify({ aboutMe: 'saved' }), { status: g.welcomeSaveStatus ?? 200 })
      if (b.op === 'record') return new Response(JSON.stringify({ cleared: 1 }))
      return new Response('{}', { status: 400 })
    }
    if (url.endsWith('/ai-transcript')) return new Response(JSON.stringify({ ok: true }))
    if (url.endsWith('/messages')) return new Response(JSON.stringify({ message: { id: 'm' + calls.length, from: join.role, text: JSON.parse(init.body).text, at: new Date().toISOString() } }))
    return new Response('{}')
  }
  document.body.innerHTML = '<div id="root"></div>'
  const root = createRoot(document.getElementById('root')!)
  await act(async () => { root.render(<ClassroomApp bookingId="b1" />) })
  for (let i = 0; i < 5; i++) await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
  return { root, calls }
}
export const tick = async (ms = 30) => { await act(async () => { await new Promise((r) => setTimeout(r, ms)) }) }
export const click = async (el: Element | null) => { if (!el) throw new Error('missing element'); await act(async () => { (el as HTMLElement).click() }); await tick() }
export const $ = (s: string) => document.querySelector(s)
