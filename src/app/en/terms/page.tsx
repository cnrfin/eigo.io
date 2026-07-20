import TermsClient from '@/app/terms/TermsClient'
import { localizedMetadata } from '@/lib/seo'

export const metadata = localizedMetadata({
  jaPath: '/terms',
  locale: 'en',
  title: 'Terms of Service | Eigo.io',
  description: 'The eigo.io terms of service, covering the conditions for using our service.',
})

export default function Page() {
  return <TermsClient />
}
