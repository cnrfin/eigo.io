import type { Metadata } from 'next'
import ClassroomLoader from '@/components/classroom/ClassroomLoader'

export const metadata: Metadata = {
  title: 'Classroom · eigo.io',
  robots: { index: false, follow: false },
}

/** /classroom/[bookingId]: the eigo video classroom (pilot). Everything runs client-side. */
export default async function ClassroomPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  return <ClassroomLoader bookingId={bookingId} />
}
