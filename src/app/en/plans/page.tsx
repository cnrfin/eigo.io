import PlansClient from '@/app/plans/PlansClient'
import { localizedMetadata } from '@/lib/seo'

export const metadata = localizedMetadata({
  jaPath: '/plans',
  locale: 'en',
  title: 'Pricing & Plans | Eigo.io Online English',
  description:
    'Eigo.io pricing. Monthly or yearly plans, up to 45% off when you subscribe within 48 hours of your free trial, plus an Exam Pass for unlimited mock tests.',
})

export default function Page() {
  return <PlansClient />
}
