'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getPostLoginPath } from '@/lib/admin-redirect'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Features from '@/components/Features'
import StudentVoices from '@/components/StudentVoices'
import HowItWorks from '@/components/HowItWorks'
import InfoSection from '@/components/InfoSection'
import CtaSection from '@/components/CtaSection'
import Footer from '@/components/Footer'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace(getPostLoginPath(user.email))
    }
  }, [user, loading, router])

  if (loading || user) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }} />
      </main>
    )
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Header />
      <div className="max-w-5xl mx-auto">
        <Hero />
        <Features />
        <StudentVoices />
        <HowItWorks />
        <InfoSection />
        <CtaSection />
        <Footer />
      </div>
    </main>
  )
}
