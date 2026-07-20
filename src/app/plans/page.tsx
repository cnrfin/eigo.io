import PlansClient from './PlansClient'
import { localizedMetadata } from '@/lib/seo'

export const metadata = localizedMetadata({
  jaPath: '/plans',
  locale: 'ja',
  title: '料金プラン｜オンライン英会話 eigo.io',
  description:
    'eigo.io の料金プラン。月額・年額から選べ、無料体験後48時間以内のご入会で最大45%オフ。模試が受け放題のExam Passもご用意しています。',
})

export default function Page() {
  return <PlansClient />
}
