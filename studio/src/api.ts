import type { Course, CourseSummary } from '@slides'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init)
  const text = await r.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!r.ok) {
    const msg = data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : `Request failed (${r.status})`
    throw new ApiError(r.status, msg)
  }
  return data as T
}

const json = (body: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export interface StudioConfig {
  publishConfigured: boolean
  publishTarget: string | null
}

export interface CourseImage {
  name: string
  src: string
  size: number
  /** Video/audio uploads: size before compression, poster made from the first frame, and any message. */
  originalSize?: number
  compressed?: boolean
  poster?: string
  note?: string
}

export const api = {
  config: () => request<StudioConfig>('/api/config'),
  listCourses: () => request<CourseSummary[]>('/api/courses'),
  createCourse: (title: string) => request<Course>('/api/courses', { method: 'POST', ...json({ title }) }),
  importCourse: (course: Course) => request<Course>('/api/courses', { method: 'POST', ...json({ course }) }),
  getCourse: (id: string) => request<Course>(`/api/courses/${encodeURIComponent(id)}`),
  saveCourse: (course: Course, baseUpdatedAt: string | null, keepalive = false) =>
    request<{ ok: true; updatedAt: string }>(`/api/courses/${encodeURIComponent(course.id)}`, {
      method: 'PUT',
      keepalive,
      headers: { 'Content-Type': 'application/json', ...(baseUpdatedAt ? { 'If-Match': baseUpdatedAt } : {}) },
      body: JSON.stringify(course),
    }),
  deleteCourse: (id: string) => request<{ ok: true }>(`/api/courses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  listImages: (id: string) => request<CourseImage[]>(`/api/courses/${encodeURIComponent(id)}/images`),
  listMedia: (id: string) => request<CourseImage[]>(`/api/courses/${encodeURIComponent(id)}/images?kind=media`),
  uploadImage: (id: string, file: File) =>
    request<CourseImage>(`/api/courses/${encodeURIComponent(id)}/images?name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    }),
  publish: (id: string) =>
    request<{ ok: true; publishedAt: string; result: unknown }>(`/api/courses/${encodeURIComponent(id)}/publish`, {
      method: 'POST',
    }),
}

/** Asset base for rendering a course's relative image paths in the studio. */
export const assetBaseFor = (courseId: string) => `/files/${encodeURIComponent(courseId)}/`
