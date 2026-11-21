import type { Metadata } from 'next'
import PayClient from './PayClient'

// A private payment link for one student: never indexed.
export const metadata: Metadata = {
  title: { absolute: 'プランのお支払い｜eigo.io' },
  robots: { index: false, follow: false },
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <PayClient token={token} />
}
