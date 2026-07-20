import LandingClient from './LandingClient'
import { localizedMetadata } from '@/lib/seo'

export const metadata = localizedMetadata({
  jaPath: '/',
  locale: 'ja',
  title: 'オンライン英会話 eigo.io｜イギリス人講師とマンツーマン英会話',
  description:
    'イギリス人ネイティブ講師とのマンツーマン・オンライン英会話。発音、IELTS・TOEIC・英検対策、レッスン後の復習まで。初回15分の体験レッスンは無料です。',
})

export default function Page() {
  return <LandingClient />
}
