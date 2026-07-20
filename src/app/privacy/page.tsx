import PrivacyClient from './PrivacyClient'
import { localizedMetadata } from '@/lib/seo'

export const metadata = localizedMetadata({
  jaPath: '/privacy',
  locale: 'ja',
  title: 'プライバシーポリシー｜eigo.io',
  description: 'eigo.io のプライバシーポリシー。お客様の個人情報の取り扱いについてご説明します。',
})

export default function Page() {
  return <PrivacyClient />
}
