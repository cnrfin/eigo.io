import { NextRequest } from 'next/server'
import { assetBaseFor, loadCourse } from '@/lib/classroom/courses'
import { json, loadClassroom } from '@/lib/classroom/server'

/**
 * GET /api/classroom/[id]/course?courseId=c_greatbritain
 * A published course's full JSON for the slide renderer, plus the public base
 * URL its images and videos load from. Either person in the lesson may load it.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadClassroom(request, id)
  if (ctx instanceof Response) return ctx

  const courseId = request.nextUrl.searchParams.get('courseId') || ''
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(courseId)) return json(400, { error: 'courseId required' })
  const c = await loadCourse(courseId)
  if (!c) return json(404, { error: 'Course not found' })

  return json(200, { course: c.course, version: c.version, assetBase: assetBaseFor(courseId) })
}
