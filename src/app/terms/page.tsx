import TermsClient from './TermsClient'
import { localizedMetadata } from '@/lib/seo'

export const metadata = localizedMetadata({
  jaPath: '/terms',
  locale: 'ja',
  title: '利用規約｜eigo.io',
  description: 'eigo.io の利用規約。サービスのご利用条件についてご説明します。',
})

export default function Page() {
  return <TermsClient />
}
