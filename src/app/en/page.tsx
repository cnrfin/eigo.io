import LandingClient from '@/app/LandingClient'
import { localizedMetadata } from '@/lib/seo'

export const metadata = localizedMetadata({
  jaPath: '/',
  locale: 'en',
  title: 'Online English Lessons with a Native UK Teacher | Eigo.io',
  description:
    'One-to-one online English lessons with a native tutor from the UK. Conversation practice, British pronunciation, IELTS/TOEIC/EIKEN prep, and smart review. Your first 15-minute trial is free.',
})

export default function Page() {
  return <LandingClient />
}
