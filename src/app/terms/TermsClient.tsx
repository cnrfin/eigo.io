'use client'

import { useLanguage } from '@/context/LanguageContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const content = {
  ja: {
    title: '利用規約',
    lastUpdated: '最終更新日：2026年5月3日',
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
        heading: '7. 「50時間無料英会話」キャンペーン',
        body: '当スクールは、「50時間無料英会話」キャンペーン（以下「本キャンペーン」）を実施する場合があります。本キャンペーンには以下の条件が適用されます：\n\n・本キャンペーンは18歳以上の方のみが対象です。未成年の方は参加できません。\n・参加者は、レッスンの録画、編集、およびYouTube、SNS、eigo.ioプラットフォームでの公開に同意するものとします。\n・ビデオ参加者の場合、映像と音声が公開されます。音声のみの参加者の場合、音声のみが使用されます。\n・すべての参加者は、レッスン後にダッシュボードからレッスン録画を個人的に確認できます。\n・録画コンテンツは、教育および宣伝目的で無期限に使用される場合があります。\n・動画参加者は最大60分（30分×2回）、音声のみの参加者は最大30分（30分×1回）のレッスンを受けられます。\n・本キャンペーンは無料で提供され、サブスクリプションへの加入義務はありません。キャンペーン参加時に作成されたアカウントは通常のeigo.ioアカウントとなり、キャンペーン終了後もご利用いただけます。',
      },
      {
        heading: '8. 禁止事項',
        body: '以下の行為を禁止します：\n\n・レッスン録画の無断転載・再配布\n・他の利用者へのなりすまし\n・サービスの不正利用やシステムへの不正アクセス\n・講師や他の利用者への嫌がらせ行為',
      },
      {
        heading: '9. 解約',
        body: 'サブスクリプションはいつでも解約できます。解約した場合、次回の課金は発生しません。残りのレッスン分数は現在の課金期間終了まで利用可能です。\n\nApple App内課金の場合は、iOSの設定画面またはアプリ内の「サブスクリプション管理」から解約できます。Stripeの場合は、アプリの設定画面から解約できます。connor@eigo.io へのご連絡でも対応いたします。',
      },
      {
        heading: '10. 免責事項',
        body: '当スクールは、サービスの中断やデータの損失について、合理的な範囲を超える責任を負いません。技術的な問題が発生した場合は、速やかに対応に努めます。',
      },
      {
        heading: '11. 規約の変更',
        body: '本規約は、必要に応じて変更されることがあります。重要な変更がある場合は、アプリ内でお知らせします。サービスの継続利用をもって、変更後の規約に同意したものとみなします。',
      },
      {
        heading: '12. 準拠法',
        body: '本規約は、イングランドおよびウェールズの法律に準拠し、解釈されます。',
      },
      {
        heading: '13. Say After Me（iOSアプリ）― サブスクリプション',
        body: 'Say After Meは、eigo.ioのもとで提供される語学学習用iOSアプリです。App Store経由のアプリ内サブスクリプションとして、以下の有料プランをご用意しています。\n\nスタンダード ― 月額£2.99または£19.99の買い切り（永久版）。プリセットされたフレーズデッキ全体、発音ドリル全体、保存ルーティン無制限、セッション履歴無制限、お気に入り無制限が解放されます。\n\nプロ ― 月額£9.99または年額£69.99。スタンダードのすべての機能に加え、AIによるフレーズ生成（暦月あたり100回まで）をご利用いただけます。\n\nAppleが定める自動更新に関する必須開示事項：お支払いは、ご購入確認時にお客様のApple IDアカウントに請求されます。サブスクリプションは、現在の期間終了の少なくとも24時間前に自動更新をオフにしない限り、自動的に更新されます。価格に変更がない場合、現在の期間終了の24時間前以内に同額が次期更新分として請求されます。サブスクリプションの管理および自動更新の停止は、購入後にApple IDアカウント設定から行えます。現在のサブスクリプション期間中の解約はできません。\n\n解約方法。iOSの「設定」アプリ → 上部のお名前 → 「サブスクリプション」 → 「Say After Me」 → 「サブスクリプションをキャンセルする」の順に操作してください。解約は現在の請求期間の終了時点で有効となり、それまではご利用いただけます。アプリ内設定の「サブスクリプションの管理」からも同じ画面へ遷移します。\n\n返金。App Storeでのご購入の返金は、当方ではなくAppleが対応します。https://reportaproblem.apple.com からご申請ください。\n\n生成回数の上限。Proプランでは、UTCの暦月あたり100回までAIによるフレーズ生成をご利用いただけます。未使用分は翌月に持ち越されません。カウンタは毎月1日のUTC 00:00にリセットされます。失敗した生成（翻訳または音声合成のエラー）は、カウンタに自動で返却されます。\n\n利用に関する規約。生成された音声は、個人の語学学習およびシャドーイング練習目的でのみご利用いただけます。差別的・欺瞞的・性的に露骨な内容、または実在の個人になりすます目的でのご利用は禁止します。\n\nサービスの可用性。AI生成は第三者サービス（OpenAI、ElevenLabs）に依存しており、最善の努力で提供されます。短時間のサービス停止が発生する場合があります。プリセットのデッキ音声は完全にオフラインで動作し、これらの影響を受けません。\n\n仕様変更。生成回数の上限、対応音声、対応言語は、今後のアップデートで変更される場合があります。重要な変更については、App Storeのリリースノートでお知らせします。',
      },
      {
        heading: '14. お問い合わせ',
        body: '本規約に関するご質問は、connor@eigo.io までお問い合わせください。\n\n運営者：Connor Finley\n所在地：イギリス\nメール：connor@eigo.io',
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    lastUpdated: 'Last updated: 3 May 2026',
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
        heading: '7. "50 Hours Free English" campaign',
        body: 'From time to time, the School may run promotional campaigns such as the "50 Hours Free English" campaign. The following terms apply to campaign participants:\n\n• The Campaign is open to adults aged 18 and over only. Minors are not eligible to participate.\n• By signing up, you consent to your lessons being recorded, edited, and published on YouTube, social media, and the eigo.io platform.\n• For video participants, your likeness and voice will appear in published content. For audio-only participants, only your voice is used.\n• All participants can review their lesson recordings privately from their dashboard after each lesson.\n• Recorded content may be used indefinitely for educational and promotional purposes.\n• Video participants receive up to 60 minutes of lessons (two 30-minute sessions). Audio-only participants receive up to 30 minutes (one 30-minute session).\n• The campaign is provided free of charge with no obligation to subscribe. Your account created during signup is a standard eigo.io account and remains yours after the campaign ends.',
      },
      {
        heading: '8. Prohibited conduct',
        body: 'You agree not to:\n\n• Redistribute or publicly share lesson recordings\n• Impersonate another user\n• Attempt to exploit or gain unauthorised access to the service\n• Harass the teacher or other users',
      },
      {
        heading: '9. Cancelling your subscription',
        body: 'You may cancel your subscription at any time. After cancellation, you will not be charged again. You may continue to use remaining minutes until the end of your current billing period.\n\nFor Apple In-App Purchase subscriptions, you can cancel through iOS Settings or the "Manage Subscription" option in the app. For Stripe subscriptions, use the Settings page in the app. You can also contact connor@eigo.io for assistance.',
      },
      {
        heading: '10. Limitation of liability',
        body: 'We are not liable for service interruptions or data loss beyond what is reasonable. We will make every effort to resolve technical issues promptly.',
      },
      {
        heading: '11. Changes to these terms',
        body: 'We may update these terms from time to time. If we make significant changes, we will notify you in the app. Continued use of the service constitutes acceptance of the updated terms.',
      },
      {
        heading: '12. Governing law',
        body: 'These terms are governed by and interpreted in accordance with the laws of England and Wales.',
      },
      {
        heading: '13. Say After Me (iOS app) — subscriptions',
        body: 'Say After Me is an iOS language-practice app published under the eigo.io umbrella. It offers two paid tiers, sold as in-app subscriptions through the App Store:\n\nStandard — £2.99 per month or £19.99 one-time lifetime. Unlocks the full prebuilt phrase deck, full pronunciation drills, unlimited saved queues, unlimited stored sessions, and unlimited favourites.\n\nPro — £9.99 per month or £69.99 per year. Includes everything in Standard, plus AI-powered phrase generation (limited to 100 generations per calendar month).\n\nApple\'s required auto-renewal disclosure: Payment will be charged to your Apple ID account at confirmation of purchase. Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period at the same price unless changed. Subscriptions may be managed and auto-renewal turned off in your Apple ID Account Settings after purchase. No cancellation of the current subscription is allowed during the active subscription period.\n\nHow to cancel. Open iOS Settings → tap your name at the top → Subscriptions → Say After Me → Cancel Subscription. Cancellation takes effect at the end of the current billing period; you keep access until then. The "Manage Subscription" row in the app\'s Settings deep-links to the same place.\n\nRefunds. Refund requests for App Store purchases are handled by Apple, not by us, at https://reportaproblem.apple.com.\n\nGeneration cap. The Pro tier provides 100 AI generations per UTC calendar month. Unused generations do not roll over. The counter resets at 00:00 UTC on the first day of each calendar month. Failed generations (translation or audio synthesis errors) are automatically refunded back into the counter.\n\nAcceptable use. Generated audio is provided for personal language learning and shadowing practice only. You agree not to use the service to generate hateful, deceptive, or sexually explicit content, or content intended to impersonate real individuals.\n\nService availability. AI generation depends on third-party providers (OpenAI, ElevenLabs) and is provided on a best-effort basis. Brief outages may occur. Prebuilt deck audio works fully offline and is not affected.\n\nChanges. We may update the AI generation cap, supported voices, or supported languages over time. Material changes will be communicated in the app\'s release notes on the App Store.',
      },
      {
        heading: '14. Contact',
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
