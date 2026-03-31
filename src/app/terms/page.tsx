'use client'

import { useLanguage } from '@/context/LanguageContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const content = {
  ja: {
    title: '利用規約',
    lastUpdated: '最終更新日：2026年3月25日',
    sections: [
      {
        heading: '1. サービスの概要',
        body: 'eigo.io（以下「当スクール」）は、Connor Finleyが個人事業として運営するオンライン英会話スクールです。当スクールは、マンツーマンの英会話レッスン、英語試験対策、発音トレーニング、翻訳・英文ライティングサービスを提供します。\n\n予約確認やリマインダーなどの通知は、メールまたはLINEメッセージで送信されます。LINEでログインされた利用者には、LINEメッセージで通知が届きます。設定画面から通知先メールアドレスを登録することで、メール通知に変更することも可能です。',
      },
      {
        heading: '2. アカウント登録',
        body: '当スクールのサービスを利用するには、アカウント登録が必要です。登録にはGoogle、LINE、またはメールアドレスを使用できます。利用者は、正確な情報を提供し、アカウントの安全管理に責任を負います。',
      },
      {
        heading: '3. レッスンの予約・キャンセル',
        body: 'レッスンは、ダッシュボードのカレンダーから予約できます。キャンセルはレッスン開始の1時間前まで無料で可能です。1時間以内のキャンセルは、レッスン1回分の消化として扱われ、返金の対象外となります。\n\n講師側の都合によるキャンセルの場合は、振替レッスンまたは該当分の返金で対応します。',
      },
      {
        heading: '4. 料金・お支払い',
        body: '月額料金はStripeを通じて請求されます。\n\n・体験レッスン後48時間以内にご入会の場合：12,000円/月（税込）\n・体験なしでのご入会：20,000円/月（税込）\n\n月4時間までのレッスンが予約可能です。お支払いは入会日と同日に毎月自動的に課金されます。',
      },
      {
        heading: '5. 無料体験レッスン',
        body: '初回のお客様には、無料体験レッスンを1回提供します。体験レッスンは入会の義務を伴いません。',
      },
      {
        heading: '6. レッスンの録画・文字起こし',
        body: 'すべてのレッスンは自動的に録画され、文字起こしが生成されます。これらは利用者のダッシュボードから確認できます。録画データは復習目的で提供されるものであり、第三者への共有や商用利用は禁止します。',
      },
      {
        heading: '7. 禁止事項',
        body: '以下の行為を禁止します：\n\n・レッスン録画の無断転載・再配布\n・他の利用者へのなりすまし\n・サービスの不正利用やシステムへの不正アクセス\n・講師や他の利用者への嫌がらせ行為',
      },
      {
        heading: '8. 解約',
        body: 'アカウントはいつでも解約できます。解約した場合、次回の課金は発生しません。当月分の残りのレッスンは課金期間終了まで利用可能です。解約の手続きは、設定画面またはconnor@eigo.ioへの連絡で行えます。',
      },
      {
        heading: '9. 免責事項',
        body: '当スクールは、サービスの中断やデータの損失について、合理的な範囲を超える責任を負いません。技術的な問題が発生した場合は、速やかに対応に努めます。',
      },
      {
        heading: '10. 規約の変更',
        body: '本規約は、必要に応じて変更されることがあります。重要な変更がある場合は、サイト上でお知らせします。サービスの継続利用をもって、変更後の規約に同意したものとみなします。',
      },
      {
        heading: '11. 準拠法',
        body: '本規約は、イギリス法に準拠し、解釈されます。',
      },
      {
        heading: '12. お問い合わせ',
        body: '本規約に関するご質問は、connor@eigo.io までお問い合わせください。\n\n運営者：Connor Finley\n所在地：イギリス\nメール：connor@eigo.io',
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    lastUpdated: 'Last updated: 25 March 2026',
    sections: [
      {
        heading: '1. About the service',
        body: 'eigo.io ("the School") is an online English school operated by Connor Finley as a sole trader based in the United Kingdom. We provide private 1-to-1 English conversation lessons, test preparation, pronunciation training, and translation and script writing services.\n\nBooking confirmations, reminders, and other notifications are sent via email or LINE message. If you sign in with LINE, notifications will be sent as LINE messages by default. You can set a notification email address in Settings to receive notifications by email instead.',
      },
      {
        heading: '2. Account registration',
        body: 'You must create an account to use our service. You can register using Google, LINE, or email. You are responsible for providing accurate information and keeping your account secure.',
      },
      {
        heading: '3. Booking and cancellation',
        body: 'Lessons can be booked through the calendar on your dashboard. Cancellations must be made at least 1 hour before the lesson start time. Late cancellations (within 1 hour) will be counted as a used lesson and are not eligible for a refund.\n\nIf the teacher cancels, you will receive a replacement lesson or a refund for that session.',
      },
      {
        heading: '4. Pricing and payment',
        body: 'Monthly fees are billed through Stripe.\n\n• After a trial lesson (joined within 48 hours): ¥12,000/month (tax included)\n• Without a trial lesson: ¥20,000/month (tax included)\n\nYou may book up to 4 hours of lessons per month. Payment is automatically charged on the same date each month as your sign-up date.',
      },
      {
        heading: '5. Free trial lesson',
        body: 'New students receive one free trial lesson. The trial does not commit you to a subscription.',
      },
      {
        heading: '6. Lesson recordings and transcriptions',
        body: 'All lessons are automatically recorded and transcribed. Recordings and transcriptions are available on your dashboard for personal review. You may not redistribute, share publicly, or use recordings for commercial purposes.',
      },
      {
        heading: '7. Prohibited conduct',
        body: 'You agree not to:\n\n• Redistribute or publicly share lesson recordings\n• Impersonate another user\n• Attempt to exploit or gain unauthorised access to the service\n• Harass the teacher or other users',
      },
      {
        heading: '8. Cancelling your subscription',
        body: 'You may cancel your subscription at any time. After cancellation, you will not be charged again. You may continue to use remaining lessons until the end of your current billing period. To cancel, use the Settings page or contact connor@eigo.io.',
      },
      {
        heading: '9. Limitation of liability',
        body: 'We are not liable for service interruptions or data loss beyond what is reasonable. We will make every effort to resolve technical issues promptly.',
      },
      {
        heading: '10. Changes to these terms',
        body: 'We may update these terms from time to time. If we make significant changes, we will notify you on the site. Continued use of the service constitutes acceptance of the updated terms.',
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
