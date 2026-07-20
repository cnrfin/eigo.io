import PrivacyClient from '@/app/privacy/PrivacyClient'
import { localizedMetadata } from '@/lib/seo'

export const metadata = localizedMetadata({
  jaPath: '/privacy',
  locale: 'en',
  title: 'Privacy Policy | Eigo.io',
  description: 'The eigo.io privacy policy, explaining how we handle your personal information.',
})

export default function Page() {
  return <PrivacyClient />
}
