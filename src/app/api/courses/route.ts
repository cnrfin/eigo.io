import { NextRequest, NextResponse } from 'next/server'
import { authenticate, isAdminTestUser } from '@/lib/test-auth'
import { hasTestAccess, isCourseTester } from '@/lib/test-entitlement'
import { getUserPermissions } from '@/lib/user-permissions'

/**
 * GET /api/courses[?exam=toeic]
 *   Published courses with levels, lesson summaries (no screens) and the
 *   caller's progress. Admins also see unpublished courses (draft preview).
 *   `entitled` tells the UI whether non-free lessons are locked.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const admin = isAdminTestUser(user)
  // Per-user feature permission: if an admin has switched off course access for
  // this user, hide the catalogue entirely (lesson routes also block direct
  // access). Admins themselves always see courses.
  if (!admin && !(await getUserPermissions(supabase, user.id)).courses_enabled) {
    return NextResponse.json({ courses: [], entitled: false })
  }
  const exam = request.nextUrl.searchParams.get('exam')

  let query = supabase.from('courses')
    .select('id, slug, exam_slug, title, title_ja, description, description_ja, published, order_index')
    .order('order_index')
  if (!admin && !(await isCourseTester(supabase, user))) query = query.eq('published', true)
  if (exam) query = query.eq('exam_slug', exam)
  const [{ data: courses, error }, entitled] = await Promise.all([query, hasTestAccess(supabase, user)])
  if (error) {
    console.error('Failed to load courses:', error)
    return NextResponse.json({ error: 'Could not load courses' }, { status: 500 })
  }
  if (!courses?.length) return NextResponse.json({ courses: [], entitled })

  const courseIds = courses.map(c => c.id)
  const { data: levels } = await supabase.from('course_levels')
    .select('id, course_id, order_index, title, title_ja').in('course_id', courseIds).order('order_index')
  const levelIds = (levels ?? []).map(l => l.id)
  const { data: lessons } = levelIds.length
    ? await supabase.from('lessons')
        .select('id, level_id, order_index, slug, title, title_ja, free, estimated_minutes')
        .in('level_id', levelIds).order('order_index')
    : { data: [] }
  const lessonIds = (lessons ?? []).map(l => l.id)
  // best_score is the learner's best lesson run (set on challenge completion).
  // Selected defensively so it works whether or not the column exists yet.
  const { data: progress } = lessonIds.length
    ? await supabase.from('lesson_progress')
        .select('lesson_id, status, screen_index, best_score').eq('user_id', user.id).in('lesson_id', lessonIds)
    : { data: [] }
  const progByLesson = new Map((progress ?? []).map(p => [p.lesson_id, p]))

  const shaped = courses.map(c => ({
    ...c,
    levels: (levels ?? []).filter(l => l.course_id === c.id).map(l => ({
      ...l,
      lessons: (lessons ?? []).filter(x => x.level_id === l.id).map(x => ({
        ...x,
        progress: progByLesson.get(x.id) ?? null,
        score: (progByLesson.get(x.id) as { best_score?: number } | undefined)?.best_score ?? null,
      })),
    })),
  }))

  return NextResponse.json({ courses: shaped, entitled })
}
