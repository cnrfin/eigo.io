'use client'

import dynamic from 'next/dynamic'

// The Whereby SDK and WebRTC only exist in the browser, so the classroom is
// never server-rendered. (ssr:false is only allowed from a Client Component.)
const ClassroomApp = dynamic(() => import('./ClassroomApp'), {
  ssr: false,
  loading: () => <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)' }} />,
})

export default function ClassroomLoader({ bookingId }: { bookingId: string }) {
  return <ClassroomApp bookingId={bookingId} />
}
