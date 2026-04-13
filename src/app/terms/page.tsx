'use client'

import { useLanguage } from '@/context/LanguageContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const content = {
  ja: {
    title: '利用規約',
    lastUpdated: '最終更新日：2026年4月11日',
    sections: [
      {
        heading: '1. サービスの概要',
        body: 'eigo.io（以下「当スクール」）は、Connor Finleyが個人事業として運営するオンライン英会話スクールです。当スクールは、マンツーマンの英会話レッスン、英語試験対策、発音トレーニング、翻訳・英文ライティングサービスを提供します。\n\n予約確認やリマインダーなどの通知は、メール、LINEメッセージ、またはプッシュ通知で送信されます。通知設定はアプリの設定画面からいつでも変更可能です。',
      },
      {
        heading: '2. アカウント登録',
        body: '当スクールのサービスを利用するには、アカウント登録が必要です。登録にはGoogle、Apple、LINE、またはメールアドレスを使用できます。利用者は、正確な情報を提供し、アカウントの安全管理に責任を負います。',
      },
      {
        heading: '3. レッスンの予約・キャンセル',
        body: 'レッスンは、アプリの予約画面から予約できます。キャンセルはレッスン開始の15分前まで可能で、レッスン分数は返還されます。15分以内のキャンセルは、レッスン分数の消化として扱われ、返還の対象外となります。\n\n講師側の都合によるキャンセルの場合は、レッスン分数の返還で対応します。',
      },
      {
        heading: '4. プランと料金',
        body: '当スクールでは以下のプランを提供しています：\n\n【ライトプラン】月120分（週約30分）\n・月額：10,000円（税込）\n・年額：100,000円（税込）\n\n【スタンダードプラン】月240分（週約60分）\n・月額：20,000円（税込）\n・年額：200,000円（税込）\n\n体験レッスン後48時間以内にご入会の場合、初回の料金が割引になります。\n\nお支払いはApple App内課金またはStripe（クレジットカード）で行えます。Apple経由の年額料金は異なる場合があります。お支払いは入会日と同日に自動更新されます。',
      },
      {
        heading: '5. 無料体験レッスン',
        body: '初回のお客様には、15分の無料体験レッスンを1回提供します。体験レッスンは入会の義務を伴いません。',
      },
      {
        heading: '6. レッスンの録画・文字起こし',
        body: 'すべてのレッスンは自動的に録画され、文字起こしが生成されます。これらはアプリの履歴画面から確認できます。録画データは復習目的で提供されるものであり、第三者への共有や商用利用は禁止します。',
      },
      {
        heading: '7. 禁止事項',
        body: '以下の行為を禁止します：\n\n・レッスン録画の無断転載・再配布\n・他の利用者へのなりすまし\n・サービスの不正利用やシステムへの不正アクセス\n・講師や他の利用者への嫌がらせ行為',
      },
      {
        heading: '8. 解約',
        body: 'サブスクリプションはいつでも解約できます。解約した場合、次回の課金は発生しません。残りのレッスン分数は現在の課金期間終了まで利用可能です。\n\nApple App内課金の場合は、iOSの設定画面またはアプリ内の「サブスクリプション管理」から解約できます。Stripeの場合は、アプリの設定画面から解約できます。connor@eigo.io へのご連絡でも対応いたします。',
      },
      {
        heading: '9. 免責事項',
        body: '当スクールは、サービスの中断やデータの損失について、合理的な範囲を超える責任を負いません。技術的な問題が発生した場合は、速やかに対応に努めます。',
      },
      {
        heading: '10. 規約の変更',
        body: '本規約は、必要に応じて変更されることがあります。重要な変更がある場合は、アプリ内でお知らせします。サービスの継続利用をもって、変更後の規約に同意したものとみなします。',
      },
      {
        heading: '11. 準拠法',
        body: '本規約は、イングランドおよびウェールズの法律に準拠し、解釈されます。',
      },
      {
        heading: '12. お問い合わせ',
        body: '本規約に関するご質問は、connor@eigo.io までお問い合わせください。\n\n運営者：Connor Finley\n所在地：イギリス\nメール：connor@eigo.io',
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    lastUpdated: 'Last updated: 11 April 2026',
    sections: [
      {
        heading: '1. About the service',
        body: 'eigo.io ("the School") is an online English school operated by Connor Finley as a sole trader based in the United Kingdom. We provide private 1-to-1 English conversation lessons, test preparation, pronunciation training, and translation and script writing services.\n\nBooking confirmations, reminders, and other notifications are sent via email, LINE message, or push notification. You can manage your notification preferences in the app settings.',
      },
      {
        heading: '2. Account registration',
        body: 'You must create an account to use our service. You can register using Google, Apple, LINE, or email. You are responsible for providing accurate information and keeping your account secure.',
      },
      {
        heading: '3. Booking and cancellation',
        body: 'Lessons can be booked through the booking screen in the app. Cancellations made at least 15 minutes before the lesson start time will receive a full minute refund. Late cancellations (within 15 minutes) will be counted as used minutes and are not eligible for a refund.\n\nIf the teacher cancels, your lesson minutes will be refunded.',
      },
      {
        heading: '4. Plans and pricing',
        body: 'We offer the following subscription plans:\n\nLite Plan — 120 minutes per month (approx. 30 min/week)\n• Monthly: ¥10,000 (tax included)\n• Yearly: ¥100,000 (tax included)\n\nStandard Plan — 240 minutes per month (approx. 60 min/week)\n• Monthly: ¥20,000 (tax included)\n• Yearly: ¥200,000 (tax included)\n\nA discounted rate is available for the first billing period if you subscribe within 48 hours of completing your trial lesson.\n\nPayment is processed via Apple In-App Purchase or Stripe (credit card). Yearly prices may differ when purchased through Apple. Subscriptions renew automatically on the same date each billing cycle.',
      },
      {
        heading: '5. Free trial lesson',
        body: 'New students receive one free 15-minute trial lesson. The trial does not commit you to a subscription.',
      },
      {
        heading: '6. Lesson recordings and transcriptions',
        body: 'All lessons are automatically recorded and transcribed. Recordings and transcriptions are available in the app for personal review. You may not redistribute, share publicly, or use recordings for commercial purposes.',
      },
      {
        heading: '7. Prohibited conduct',
        body: 'You agree not to:\n\n• Redistribute or publicly share lesson recordings\n• Impersonate another user\n• Attempt to exploit or gain unauthorised access to the service\n• Harass the teacher or other users',
      },
      {
        heading: '8. Cancelling your subscription',
        body: 'You may cancel your subscription at any time. After cancellation, you will not be charged again. You may continue to use remaining minutes until the end of your current billing period.\n\nFor Apple In-App Purchase subscriptions, you can cancel through iOS Settings or the "Manage Subscription" option in the app. For Stripe subscriptions, use the Settings page in the app. You can also contact connor@eigo.io for assistance.',
      },
      {
        heading: '9. Limitation of liability',
        body: 'We are not liable for service interruptions or data loss beyond what is reasonable. We will make every effort to resolve technical issues promptly.',
      },
      {
        heading: '10. Changes to these terms',
        body: 'We may update these terms from time to time. If we make significant changes, we will notify you in the app. Continued use of the service constitutes acceptance of the updated terms.',
      },
      {
        heading: '11. Governing law',
        body: 'These terms are governed by and interpreted in accordance with the laws of England and Wales.',
      },
      {
        heading: '12. Contact',
        body: 'If you have questions about these terms, contact us at connor@eigo.io.\n\nOperator: Connor Finley\nLocation: United Kingdom\nEmail: connor@eigo.io',
      },
    ],
  },
}

export default function TermsPage() {
  const { locale } = useLanguage()
  const c = content[locale]

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Header hideLogin />
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>{c.title}</h1>
        <p className="text-sm mb-12" style={{ color: 'var(--text-muted)' }}>{c.lastUpdated}</p>

        <div className="space-y-8">
          {c.sections.map((s) => (
            <div key={s.heading}>
              <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>{s.heading}</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="max-w-5xl mx-auto">
        <Footer />
      </div>
    </main>
  )
}
