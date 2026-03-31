'use client'

import { useLanguage } from '@/context/LanguageContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const content = {
  ja: {
    title: 'プライバシーポリシー',
    lastUpdated: '最終更新日：2026年3月25日',
    sections: [
      {
        heading: '1. はじめに',
        body: 'eigo.io（以下「当スクール」）は、Connor Finleyが運営する個人事業によるオンライン英会話スクールです。当スクールは、利用者のプライバシーを尊重し、個人情報の保護に努めます。本ポリシーは、当スクールが収集する情報、その利用目的、および利用者の権利について説明します。',
      },
      {
        heading: '2. 収集する情報',
        body: '当スクールは、以下の情報を収集する場合があります：\n\n・氏名、メールアドレス（アカウント登録時）\n・Googleアカウント情報（Google認証によるログイン時）\n・LINEアカウント情報（LINE認証によるログイン時：ユーザーID、表示名、プロフィール画像）\n・レッスンの予約履歴、録画データ、文字起こしデータ\n・Googleカレンダーへのアクセス（利用者が任意で許可した場合のみ）\n・Stripeを通じた決済情報（カード情報は当スクールでは保管しません）\n・通知先メールアドレス（LINEログインの利用者が任意で設定した場合）',
      },
      {
        heading: '3. 情報の利用目的',
        body: '収集した情報は、以下の目的で利用します：\n\n・アカウントの作成・管理\n・レッスンの予約・実施・録画の提供\n・レッスン内容の文字起こしの提供\n・利用者のGoogleカレンダーへのレッスン予定の追加（許可された場合）\n・月額料金の請求処理\n・予約確認・リマインダーなどの通知の送信（メールまたはLINEメッセージ）\n・サービスの改善',
      },
      {
        heading: '4. 情報の共有',
        body: '当スクールは、以下の場合を除き、利用者の個人情報を第三者に提供しません：\n\n・Supabase（認証・データベース）\n・Google（認証・カレンダー連携）\n・Stripe（決済処理）\n・Whereby（ビデオレッスン）\n・LINE（認証・通知メッセージの送信）\n・Resend（メール通知の送信）\n\nこれらのサービスは、それぞれのプライバシーポリシーに基づいて情報を取り扱います。LINEでログインされた利用者には、予約確認やリマインダーがLINEメッセージとして送信されます。通知先メールアドレスを設定した場合は、メールでの通知に切り替わります。',
      },
      {
        heading: '5. データの保管',
        body: 'レッスンの録画データおよび文字起こしデータは、サービス提供期間中保管されます。アカウントを削除された場合、関連するデータは合理的な期間内に削除されます。',
      },
      {
        heading: '6. 利用者の権利',
        body: '利用者は、以下の権利を有します：\n\n・自身の個人情報へのアクセス\n・個人情報の訂正・削除の要求\n・Googleカレンダー連携の解除（設定画面から可能）\n・アカウントの削除\n\nこれらの要求は、connor@eigo.io までご連絡ください。',
      },
      {
        heading: '7. Cookieについて',
        body: '当スクールは、認証状態の維持およびテーマ設定の保存のためにCookieおよびローカルストレージを使用します。広告目的のCookieは使用しません。',
      },
      {
        heading: '8. お子様のプライバシー',
        body: '当スクールのサービスは、16歳未満の方を対象としていません。16歳未満の方の個人情報を意図的に収集することはありません。',
      },
      {
        heading: '9. 本ポリシーの変更',
        body: '本ポリシーは、必要に応じて更新されることがあります。重要な変更がある場合は、サイト上でお知らせします。',
      },
      {
        heading: '10. お問い合わせ',
        body: '本ポリシーに関するご質問は、connor@eigo.io までお問い合わせください。\n\n運営者：Connor Finley\n所在地：イギリス\nメール：connor@eigo.io',
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: 25 March 2026',
    sections: [
      {
        heading: '1. Introduction',
        body: 'eigo.io ("the School") is an online English school operated by Connor Finley as a sole trader based in the United Kingdom. We respect your privacy and are committed to protecting your personal data. This policy explains what information we collect, how we use it, and your rights.',
      },
      {
        heading: '2. Information we collect',
        body: 'We may collect the following information:\n\n• Name and email address (when you create an account)\n• Google account information (if you sign in with Google)\n• LINE account information (if you sign in with LINE: user ID, display name, profile picture)\n• Lesson booking history, video recordings, and transcriptions\n• Google Calendar access (only if you explicitly grant permission)\n• Payment information via Stripe (card details are not stored by us)\n• Notification email address (if you sign in with LINE and optionally provide one)',
      },
      {
        heading: '3. How we use your information',
        body: 'We use the information we collect to:\n\n• Create and manage your account\n• Schedule, deliver, and record lessons\n• Provide lesson transcriptions\n• Add lessons to your Google Calendar (if you grant permission)\n• Process monthly subscription payments\n• Send booking confirmations, reminders, and other notifications (via email or LINE message)\n• Improve our service',
      },
      {
        heading: '4. Sharing your information',
        body: 'We do not sell your personal data. We share information only with the following service providers, each of which processes data under their own privacy policies:\n\n• Supabase (authentication and database)\n• Google (authentication and calendar integration)\n• Stripe (payment processing)\n• Whereby (video lessons)\n• LINE (authentication and push notifications)\n• Resend (email notifications)\n\nIf you sign in with LINE, booking confirmations and reminders will be sent to you as LINE messages. If you set a notification email address in Settings, notifications will be sent by email instead.',
      },
      {
        heading: '5. Data retention',
        body: 'Lesson recordings and transcriptions are retained for the duration of your account. If you delete your account, associated data will be removed within a reasonable timeframe.',
      },
      {
        heading: '6. Your rights',
        body: 'You have the right to:\n\n• Access your personal data\n• Request correction or deletion of your data\n• Disconnect Google Calendar integration (via Settings)\n• Delete your account\n\nTo exercise these rights, contact us at connor@eigo.io.',
      },
      {
        heading: '7. Cookies',
        body: 'We use cookies and local storage to maintain your login session and save your theme preference. We do not use advertising cookies.',
      },
      {
        heading: '8. Children\'s privacy',
        body: 'Our service is not intended for children under 16. We do not knowingly collect personal data from children under 16.',
      },
      {
        heading: '9. Changes to this policy',
        body: 'We may update this policy from time to time. If we make significant changes, we will notify you on the site.',
      },
      {
        heading: '10. Contact',
        body: 'If you have questions about this policy, contact us at connor@eigo.io.\n\nOperator: Connor Finley\nLocation: United Kingdom\nEmail: connor@eigo.io',
      },
    ],
  },
}

export default function PrivacyPage() {
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
