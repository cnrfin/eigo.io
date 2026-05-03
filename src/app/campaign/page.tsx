'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Squircle } from '@squircle-js/react'

const MAX_SPOTS = 50

const text = {
  en: {
    badge: 'Limited Campaign',
    heroTitle1: '50 Hours of',
    heroTitle2: 'Free English Lessons',
    heroSub: '50 people can apply for free English conversation lessons with a native tutor. Video participants get 60 minutes, audio-only get 30 minutes.',
    cta: 'Sign Up Free',
    spotsRemaining: 'spots remaining',
    spotsFull: 'All spots have been filled!',
    howItWorks: 'How It Works',
    howItWorksSub: 'Three simple steps to get started.',
    step1Title: 'Sign Up',
    step1Desc: 'Fill out the form below and choose video or audio-only.',
    step2Title: 'Book 2 Lessons',
    step2Desc: 'Video: two 30-minute lessons (60 min total). Audio-only: one 30-minute lesson.',
    step3Title: 'Have Fun',
    step3Desc: 'Enjoy your lessons and we\'ll handle the editing, subtitles, and publishing.',
    styleTitle: 'Choose Your Style',
    styleSub: 'Comfortable on camera or prefer audio-only? Either way works.',
    videoTag: 'VIDEO',
    videoTitle: 'Video Recording',
    videoDesc: 'Your face and voice appear in the published lesson. You get 60 minutes (2 x 30 min).',
    audioTag: 'AUDIO ONLY',
    audioTitle: 'Audio Recording',
    audioDesc: 'Only your voice is used and subtitles will be shown instead. You get 30 minutes (1 x 30 min).',
    audioNote: 'Please use a quiet room with earphones or a headset for the best audio quality.',
    usageTitle: 'How Your Lesson Will Be Used',
    usageSub: 'Your lessons become free learning material for English students across Japan.',
    ytTitle: 'YouTube Full Lessons',
    ytDesc: 'Each lesson is published as a vertical video with subtitles and useful phrases.',
    snsTitle: 'SNS Short Clips',
    snsDesc: 'Short clips of funny or educational moments shared on social media.',
    libTitle: 'eigo.io Learning Library',
    libDesc: 'Phrases and vocabulary from your lessons may appear in the eigo.io app.',
    consentTitle: 'Content Rights Agreement',
    consentIntro: 'By signing up, an eigo.io account will be created for you. You agree to our ',
    termsLink: 'Terms of Service',
    and: ' and ',
    privacyLink: 'Privacy Policy',
    consentTail: ', as well as the following:',
    consent1: 'eigo.io may record, edit, and publish your lesson recordings on YouTube, social media, and the eigo.io platform.',
    consent2: 'For video participants, your likeness and voice will appear. For audio-only, only your voice is used.',
    consent3: 'Video recordings of your lessons will be available from your dashboard for private review.',
    consent4: 'Content may be used indefinitely for educational and promotional purposes.',
    consent5: 'This campaign is only open to adults (18+). Minors are not eligible to participate.',
    formTitle: 'Sign Up',
    formSub: 'Secure your spot, it only takes a minute.',
    labelName: 'Name',
    labelEmail: 'Email',
    labelPassword: 'Password',
    labelConfirmPassword: 'Confirm Password',
    labelLevel: 'English Level',
    labelRecording: 'Recording Preference',
    labelNotes: 'Anything else? (optional)',
    notesPlaceholder: 'Topics you\'d like to talk about, schedule preferences, etc.',
    selectLevel: 'Select level',
    beginner: 'Beginner (初級)',
    intermediate: 'Intermediate (中級)',
    advanced: 'Advanced (上級)',
    selectOption: 'Select option',
    video: 'Video (face + voice)',
    audioOnly: 'Audio only (voice)',
    consentCheck: 'I have read and agree to the Content Rights Agreement above.',
    submit: 'Submit Application',
    submitting: 'Submitting...',
    submitted: 'Account Created!',
    pwMismatch: 'Passwords do not match.',
    faqTitle: 'FAQ',
    faq1q: 'Is it really free?',
    faq1a: 'Yes, 100% free. Video participants get two 30-minute lessons (60 min) and audio-only participants get one 30-minute lesson. We use the recordings to create free educational content.',
    faq2q: 'Who is the tutor?',
    faq2a: 'All lessons are with Connor, a native English tutor based in Japan and the founder of eigo.io.',
    faq3q: 'Can I choose audio-only?',
    faq3a: 'Absolutely. If you prefer not to show your face, select \'Audio only\' and your video won\'t be recorded or published.',
    faq4q: 'Will my face be shown in videos?',
    faq4a: 'Only audio from video recordings is used in promotional materials. The full video is still recorded privately and available for you to review your lesson.',
    faq5q: 'What topics will we talk about?',
    faq5a: 'Whatever you like! Daily life, travel, work, hobbies, all tailored to your level.',
    faq6q: 'Can I remove my content later?',
    faq6a: 'You can request removal of any unpublished content. Once a video is published, we cannot guarantee removal, but please contact us and we\'ll do our best.',
    navHowItWorks: 'How It Works',
  },
  ja: {
    badge: '期間限定キャンペーン',
    heroTitle1: '50時間の',
    heroTitle2: '無料英会話レッスン',
    heroSub: 'ネイティブ講師との無料英会話レッスンに50名様が応募できます。動画参加は60分、音声のみは30分。',
    cta: '無料で申し込む',
    spotsRemaining: '名分の枠が残っています',
    spotsFull: '全ての枠が埋まりました！',
    howItWorks: '参加の流れ',
    howItWorksSub: '3つのステップで簡単に始められます。',
    step1Title: '申し込み',
    step1Desc: '下のフォームから申し込み、動画または音声のみを選択。',
    step2Title: 'レッスンを2回予約',
    step2Desc: '動画：30分レッスン2回（計60分）。音声のみ：30分レッスン1回。',
    step3Title: 'レッスンを楽しむ',
    step3Desc: 'レッスンを楽しんでください。編集・字幕・公開はこちらで対応します。',
    styleTitle: '参加スタイルを選択',
    styleSub: 'カメラOKですか？音声のみでも大丈夫です。',
    videoTag: '動画',
    videoTitle: '動画レッスン',
    videoDesc: '顔と声がレッスン動画に掲載されます。60分（30分×2回）のレッスン。',
    audioTag: '音声のみ',
    audioTitle: '音声レッスン',
    audioDesc: '音声のみ使用され、顔の代わりに字幕が表示されます。30分（30分×1回）のレッスン。',
    audioNote: '音質のため、静かな部屋でイヤホンまたはヘッドセットをご使用ください。',
    usageTitle: 'レッスンの活用方法',
    usageSub: 'あなたのレッスンは、日本中の英語学習者のための無料教材になります。',
    ytTitle: 'YouTube フルレッスン',
    ytDesc: '各レッスンは字幕と役立つフレーズ付きの縦型動画として公開されます。',
    snsTitle: 'SNS ショートクリップ',
    snsDesc: '面白い場面や学びになる瞬間をSNSでショートクリップとして共有します。',
    libTitle: 'eigo.io 学習ライブラリ',
    libDesc: 'レッスンのフレーズや語彙がeigo.ioアプリに掲載されることがあります。',
    consentTitle: 'コンテンツ利用の同意事項',
    consentIntro: 'お申し込みにより、eigo.ioアカウントが作成されます。',
    termsLink: '利用規約',
    and: ' と ',
    privacyLink: 'プライバシーポリシー',
    consentTail: 'に同意し、以下の内容にも同意いただいたものとします：',
    consent1: 'eigo.ioがレッスンの録画を編集し、YouTube・SNS・eigo.ioプラットフォームで公開すること。',
    consent2: '動画参加者は映像と音声が公開されます。音声のみの参加者は声のみが使用されます。',
    consent3: 'レッスンの録画はダッシュボードから非公開で確認できます。',
    consent4: 'コンテンツは教育・プロモーション目的で無期限に使用される場合があります。',
    consent5: '本キャンペーンは18歳以上の方のみが対象です。未成年の方はご参加いただけません。',
    formTitle: 'お申し込み',
    formSub: 'お申し込みは1分で完了します。',
    labelName: 'お名前',
    labelEmail: 'メールアドレス',
    labelPassword: 'パスワード',
    labelConfirmPassword: 'パスワード確認',
    labelLevel: '英語レベル',
    labelRecording: '収録スタイル',
    labelNotes: 'その他ご要望（任意）',
    notesPlaceholder: '話したいトピック、希望の時間帯など',
    selectLevel: 'レベルを選択',
    beginner: '初級（Beginner）',
    intermediate: '中級（Intermediate）',
    advanced: '上級（Advanced）',
    selectOption: 'オプションを選択',
    video: '動画（顔＋声）',
    audioOnly: '音声のみ（声）',
    consentCheck: '上記のコンテンツ利用の同意事項を確認し、同意します。',
    submit: '申し込む',
    submitting: '送信中...',
    submitted: 'アカウント作成完了！',
    pwMismatch: 'パスワードが一致しません。',
    faqTitle: 'よくある質問',
    faq1q: '本当に無料ですか？',
    faq1a: 'はい、完全無料です。動画参加者は30分レッスン2回（計60分）、音声のみの参加者は30分レッスン1回を受けられます。録音は無料の教育コンテンツとして活用されます。',
    faq2q: '講師は誰ですか？',
    faq2a: 'レッスンはすべて、日本在住のネイティブ英語講師でeigo.ioの創設者であるConnorが担当します。',
    faq3q: '音声のみの参加はできますか？',
    faq3a: 'もちろんです。顔を出したくない場合は「音声のみ」を選択してください。動画は録画・公開されません。',
    faq4q: '動画に顔は映りますか？',
    faq4a: 'プロモーション素材には動画録画の音声のみが使用されます。動画全体は非公開で録画され、レッスンの振り返りに利用できます。',
    faq5q: 'どんなトピックで話しますか？',
    faq5a: 'お好きなトピックで大丈夫です！日常生活、旅行、仕事、趣味など、レベルに合わせた会話レッスンです。',
    faq6q: '後からコンテンツを削除できますか？',
    faq6a: '未公開のコンテンツは削除をリクエストできます。公開後は削除を保証できませんが、ご連絡いただければ可能な限り対応いたします。',
    navHowItWorks: '参加の流れ',
  },
}

export default function CampaignPage() {
  const { locale } = useLanguage()
  const t = text[locale]

  const [spotsRemaining, setSpotsRemaining] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [englishLevel, setEnglishLevel] = useState('')
  const [recordingPref, setRecordingPref] = useState('')
  const [notes, setNotes] = useState('')
  const [consented, setConsented] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const pwMismatch = confirmPassword.length > 0 && password !== confirmPassword

  const fetchSpots = useCallback(async () => {
    try {
      const res = await fetch('/api/campaign/spots')
      const data = await res.json()
      setSpotsRemaining(data.remaining)
    } catch {
      setSpotsRemaining(MAX_SPOTS)
    }
  }, [])

  useEffect(() => { fetchSpots() }, [fetchSpots])

  const spotsFull = spotsRemaining !== null && spotsRemaining <= 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pwMismatch || submitting || submitted || spotsFull) return

    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/campaign/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          english_level: englishLevel,
          recording_preference: recordingPref,
          notes: notes.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        setSubmitting(false)
        return
      }

      setSubmitted(true)
      fetchSpots()
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  const spotsPercent = spotsRemaining !== null ? ((MAX_SPOTS - spotsRemaining) / MAX_SPOTS) * 100 : 0

  // Badge colors: dark mode uses light/bright tones, light mode uses darker tones for contrast
  const badgeAccentBg = 'var(--accent-bg)'
  const badgeAccentText = 'var(--accent)'
  const badgeWarnBg = 'rgba(240,176,64,0.15)'
  const badgeWarnText = 'var(--warning)'

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Header hideLogin />

      {/* Hero */}
      <section className="text-center" style={{ padding: '5rem 0 3rem' }}>
        <div className="max-w-5xl mx-auto px-6">
          <span
            className="inline-block text-xs font-semibold tracking-wide px-4 py-1.5 mb-6"
            style={{
              borderRadius: 50,
              background: badgeAccentBg,
              color: badgeAccentText,
              border: '1px solid rgba(0,194,184,0.25)',
            }}
          >
            {t.badge}
          </span>

          <h1 className="font-extrabold tracking-tight leading-tight mb-4" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', color: 'var(--text)' }}>
            {t.heroTitle1}<br />
            <span style={{ color: 'var(--accent)' }}>{t.heroTitle2}</span>
          </h1>

          <p className="text-base mb-8 mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)', maxWidth: '34rem' }}>
            {t.heroSub}
          </p>

          <Squircle asChild cornerRadius={14} cornerSmoothing={0.8}>
            <a
              href="#how-it-works"
              className="text-base font-semibold px-10 py-3.5 transition-opacity hover:opacity-90 inline-block"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {t.navHowItWorks}
            </a>
          </Squircle>

          {/* Spots counter */}
          <div className="mt-8 text-center">
            <div className="h-1.5 mx-auto overflow-hidden" style={{ maxWidth: '16rem', borderRadius: 4, background: 'var(--surface-hover)' }}>
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${spotsPercent}%`,
                  borderRadius: 4,
                  background: 'linear-gradient(90deg, var(--accent), var(--accent-light))',
                }}
              />
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
              {spotsFull ? (
                <span style={{ color: 'var(--danger)' }}>{t.spotsFull}</span>
              ) : (
                <><strong style={{ color: 'var(--accent)' }}>{spotsRemaining ?? MAX_SPOTS}</strong> {t.spotsRemaining}</>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16" id="how-it-works">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--text)' }}>{t.howItWorks}</h2>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>{t.howItWorksSub}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { num: '1', title: t.step1Title, desc: t.step1Desc },
              { num: '2', title: t.step2Title, desc: t.step2Desc },
              { num: '3', title: t.step3Title, desc: t.step3Desc },
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div
                  className="w-10 h-10 rounded-full inline-flex items-center justify-center font-bold text-sm mb-3"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  {step.num}
                </div>
                <h3 className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Choose Your Style */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--text)' }}>{t.styleTitle}</h2>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>{t.styleSub}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div
              className="glass-card p-7"
              style={{ borderColor: 'rgba(0,194,184,0.35)', borderRadius: 18, background: 'var(--surface)' }}
            >
              <span
                className="inline-block text-xs font-bold tracking-wider uppercase px-2.5 py-0.5 mb-3"
                style={{ borderRadius: 6, background: badgeAccentBg, color: badgeAccentText }}
              >
                {t.videoTag}
              </span>
              <h3 className="font-bold text-lg mb-1.5" style={{ color: 'var(--text)' }}>{t.videoTitle}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.videoDesc}</p>
            </div>
            <div className="glass-card p-7" style={{ borderRadius: 18, background: 'var(--surface)' }}>
              <span
                className="inline-block text-xs font-bold tracking-wider uppercase px-2.5 py-0.5 mb-3"
                style={{ borderRadius: 6, background: badgeWarnBg, color: badgeWarnText }}
              >
                {t.audioTag}
              </span>
              <h3 className="font-bold text-lg mb-1.5" style={{ color: 'var(--text)' }}>{t.audioTitle}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.audioDesc}</p>
            </div>
          </div>

          {/* Audio quality note */}
          <div
            className="flex items-center gap-2.5 mt-6 px-4 py-3.5"
            style={{
              borderRadius: 12,
              background: 'rgba(240,176,64,0.08)',
              border: '1px solid rgba(240,176,64,0.2)',
            }}
          >
            <span className="text-base flex-shrink-0">🎧</span>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t.audioNote}</p>
          </div>
        </div>
      </section>

      {/* Content Usage */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--text)' }}>{t.usageTitle}</h2>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>{t.usageSub}</p>

          <div className="flex flex-col gap-4">
            {[
              { icon: '▶', title: t.ytTitle, desc: t.ytDesc },
              { icon: '📱', title: t.snsTitle, desc: t.snsDesc },
              { icon: '📖', title: t.libTitle, desc: t.libDesc },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 items-start">
                <div
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-sm"
                  style={{ borderRadius: 10, background: 'var(--surface-hover)' }}
                >
                  {item.icon}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{item.title}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Rights */}
      <section className="py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="p-6" style={{ borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-bold mb-2" style={{ color: 'var(--text)' }}>{t.consentTitle}</h3>
            <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t.consentIntro}
              <a href="/terms" target="_blank" style={{ color: 'var(--accent)' }}>{t.termsLink}</a>
              {t.and}
              <a href="/privacy" target="_blank" style={{ color: 'var(--accent)' }}>{t.privacyLink}</a>
              {t.consentTail}
            </p>
            <ul className="flex flex-col gap-2">
              {[t.consent1, t.consent2, t.consent3, t.consent4, t.consent5].map((item) => (
                <li
                  key={item}
                  className="text-sm pl-5 relative leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span className="absolute left-0 font-bold" style={{ color: 'var(--accent)' }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Sign-Up Form */}
      <section className="py-16" id="signup">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--text)' }}>{t.formTitle}</h2>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>{t.formSub}</p>

          <form
            onSubmit={handleSubmit}
            className="glass-card p-8"
            style={{ borderColor: 'rgba(0,194,184,0.35)', borderRadius: 20, background: 'var(--surface)' }}
          >
            <div className="flex flex-col gap-4">
              {/* Name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t.labelName}</label>
                  <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Taro Yamada"
                      className="w-full px-4 py-3 text-sm transition-colors focus:outline-none"
                      style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
                  </Squircle>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t.labelEmail}</label>
                  <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 text-sm transition-colors focus:outline-none"
                      style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
                  </Squircle>
                </div>
              </div>

              {/* Password + Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t.labelPassword}</label>
                  <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 text-sm transition-colors focus:outline-none"
                      style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
                  </Squircle>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t.labelConfirmPassword}</label>
                  <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 text-sm transition-colors focus:outline-none"
                      style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
                  </Squircle>
                  {pwMismatch && (
                    <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{t.pwMismatch}</p>
                  )}
                </div>
              </div>

              {/* Level + Recording */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t.labelLevel}</label>
                  <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                    <select
                      required
                      value={englishLevel}
                      onChange={(e) => setEnglishLevel(e.target.value)}
                      className="w-full px-4 py-3 text-sm transition-colors focus:outline-none appearance-none cursor-pointer"
                      style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: englishLevel ? 'var(--text)' : 'var(--text-muted)' }}
                    >
                      <option value="" disabled>{t.selectLevel}</option>
                      <option value="beginner">{t.beginner}</option>
                      <option value="intermediate">{t.intermediate}</option>
                      <option value="advanced">{t.advanced}</option>
                    </select>
                  </Squircle>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t.labelRecording}</label>
                  <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                    <select
                      required
                      value={recordingPref}
                      onChange={(e) => setRecordingPref(e.target.value)}
                      className="w-full px-4 py-3 text-sm transition-colors focus:outline-none appearance-none cursor-pointer"
                      style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: recordingPref ? 'var(--text)' : 'var(--text-muted)' }}
                    >
                      <option value="" disabled>{t.selectOption}</option>
                      <option value="video">{t.video}</option>
                      <option value="audio">{t.audioOnly}</option>
                    </select>
                  </Squircle>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t.labelNotes}</label>
                <Squircle asChild cornerRadius={12} cornerSmoothing={0.8}>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t.notesPlaceholder}
                    className="w-full px-4 py-3 text-sm transition-colors focus:outline-none resize-y"
                    style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)', minHeight: '5rem' }}
                  />
                </Squircle>
              </div>

              {/* Consent toggle */}
              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setConsented(!consented)}
                  className="rounded-full transition-colors relative shrink-0"
                  style={{ width: '48px', height: '24px', background: consented ? 'var(--accent)' : 'var(--surface-alt, var(--surface-hover))' }}
                >
                  <span
                    className={`absolute rounded-full transition-transform duration-200 shadow-sm ${!consented ? 'toggle-handle-off' : ''}`}
                    style={{
                      width: '20px', height: '20px', top: '2px', left: '2px',
                      ...(!consented ? {} : { background: '#fff' }),
                      transform: consented ? 'translateX(24px)' : 'translateX(0px)',
                    }}
                  />
                </button>
                <span className="text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>{t.consentCheck}</span>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
              )}

              {/* Submit */}
              <Squircle asChild cornerRadius={14} cornerSmoothing={0.8}>
                <button
                  type="submit"
                  disabled={submitting || submitted || pwMismatch || spotsFull || !consented}
                  className="w-full py-3.5 text-base font-semibold transition-opacity hover:opacity-90 disabled:opacity-45 disabled:cursor-not-allowed mt-1"
                  style={{
                    background: submitted ? '#22c55e' : 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                  }}
                >
                  {submitted ? t.submitted : submitting ? t.submitting : t.submit}
                </button>
              </Squircle>
            </div>
          </form>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold tracking-tight mb-6" style={{ color: 'var(--text)' }}>{t.faqTitle}</h2>

          {[
            { q: t.faq1q, a: t.faq1a },
            { q: t.faq2q, a: t.faq2a },
            { q: t.faq3q, a: t.faq3a },
            { q: t.faq4q, a: t.faq4a },
            { q: t.faq5q, a: t.faq5a },
            { q: t.faq6q, a: t.faq6a },
          ].map((faq) => (
            <div key={faq.q} className="py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{faq.q}</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="max-w-5xl mx-auto">
        <Footer />
      </div>
    </main>
  )
}
