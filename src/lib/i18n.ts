export type Locale = 'ja' | 'en'

export const translations = {
  ja: {
    // Header
    greeting: 'こんにちは！',
    welcome: 'eigo.ioへようこそ！',
    welcomeSub: '下のメニューからレッスンを予約できます！',
    enterClassroom: '入室する',

    // Landing Hero
    heroLine1: '英語レッスン、',
    heroHeadline: '英語を話せる自分に\n出会いませんか',
    heroSubheadline: 'ネイティブ講師と、オンラインで英会話。\nいつでも、どこでも。',
    heroCta: 'eigo.ioについて',

    // About / Benefits
    aboutTitle: 'eigo.ioについて',
    aboutLead: 'eigo.ioは、イギリス出身の英語講師Connorが運営するオンライン英会話スクールです。日本人生徒への指導経験は8000時間以上。こんなレッスンができます：',
    aboutPoint1: 'プライベート・マンツーマン英会話レッスン',
    aboutPoint2: '英語試験対策（IELTS・TOEIC・英検）',
    aboutPoint3: 'イギリス英語の発音トレーニング',
    aboutPoint4: '翻訳・英文ライティングサービス',
    aboutClosing: 'すべてのレッスンはプラットフォーム上で行われ、録画と文字起こしが自動で残ります。',

    // Reviews
    reviewsTitle: '生徒の声',

    // How it works
    howTitle: 'レッスンの流れ',
    howStep1Title: '会員登録',
    howStep1Desc: 'Google・LINE・メールで\nかんたん登録',
    howStep2Title: '日時を選ぶ',
    howStep2Desc: 'カレンダーから\n空いている時間を予約',
    howStep3Title: 'レッスン開始',
    howStep3Desc: 'マイページから\n教室に入るだけ',
    howStep4Title: 'レッスンを振り返る',
    howStep4Desc: 'レッスン後にサマリーと\nフィードバックを確認',
    howStep5Title: 'フレーズを復習する',
    howStep5Desc: 'レッスンから抽出された\nフレーズを繰り返し学習',

    // CTA
    ctaHeadline: '英会話、始めてみませんか？',
    ctaSubheadline: '初回体験レッスンは無料です',
    ctaButton: '無料体験レッスンを予約する',

    // Nav
    login: 'ログイン',
    signup: '新規登録',
    logout: 'ログアウト',
    dashboard: 'マイページ',

    // Booking
    bookingTitle: '予約',
    lesson15: '15分',
    lesson30: '30分',
    lesson45: '45分',
    lesson60: '60分',
    bookLesson: '予約する',

    // Info
    infoTitle: 'スクール情報',
    contact: 'お問い合わせ',
    lessonInfo: 'レッスン',
    email: 'メール',
    lineId: 'LINE ID',
    whatsapp: 'WhatsApp',
    hours: 'レッスン時間',
    hoursValue: '毎日 06:00 - 08:00 / 16:00 - 02:00 JST',
    duration: '時間',
    durationValue: '15分 / 30分 / 45分 / 60分',
    level: 'レベル',
    levelValue: '初級〜上級',
    type: '形式',
    typeValue: 'オンライン・マンツーマン',
    classroom: '教室',
    classroomValue: 'マイページから入室できます。Zoom等は不要！',
    access: '含まれるもの',
    accessValue: 'マイページ、予約、録画、文字起こし、AI分析、フレーズバンク、アプリ',

    // Pricing
    pricingTitle: '料金',
    litePrice: 'Student Lite',
    litePriceValue: '¥10,000/月  or  ¥120,000/年',
    litePriceDetail: '月120分（週30分）',
    litePriceTrialNote: '体験後48時間以内: ¥6,000/月 or ¥60,000/年',
    standardPrice: 'Student Standard',
    standardPriceValue: '¥20,000/月  or  ¥240,000/年',
    standardPriceDetail: '月240分（週60分）',
    standardPriceTrialNote: '体験後48時間以内: ¥12,000/月 or ¥120,000/年',
    trialNote: '体験レッスン',
    trialNoteValue: '無料15分 — 体験後48時間以内の入会で最大50%オフ',
    billingNote: 'お支払い',
    billingNoteValue: 'Stripeで安全に処理。月額または年額。いつでも変更・解約可能',

    // Auth
    emailPlaceholder: 'メールアドレス',
    passwordPlaceholder: 'パスワード',
    firstNamePlaceholder: '名前',
    lastNamePlaceholder: '苗字',
    loginButton: 'ログイン',
    signupButton: '新規登録',
    noAccount: 'アカウントがない方',
    hasAccount: 'アカウントをお持ちの方',
    settings: '設定',

    // Dashboard
    welcomeBack: 'おかえり',
    upcomingLessons: '予約中のレッスン',
    noUpcoming: '予約はありません',
    bookNewLesson: 'レッスン予約',
    selectTime: '時間を選んでください',
    tabHome: 'ホーム',
    tabBooking: '予約',
    tabHistory: '履歴',
    news: 'お知らせ',
    noNews: 'お知らせはありません',
    enterClassroomIn: '10分前から入室できます',
    noHistory: '履歴はありません',
    lessonCompleted: '完了',
    watchRecording: '録画',
    noRecording: '録画なし',
    loadingRecording: '読み込み中...',
    recordingError: '取得に失敗',
    closePlayer: '閉じる',

    // Calendar
    prevMonth: '前月',
    nextMonth: '翌月',
    sunday: '日',
    monday: '月',
    tuesday: '火',
    wednesday: '水',
    thursday: '木',
    friday: '金',
    saturday: '土',
    availableSlots: '空き時間',
    confirmBooking: '予約する',

    // Footer
    footerTagline: 'ネイティブ講師とオンラインで英会話レッスン。いつでも、どこでも。',
    copyright: '© 2026 eigo.io All Rights Reserved.',
    langToggle: 'English',
  },
  en: {
    // Header
    greeting: 'Hello!',
    welcome: 'Welcome to eigo.io!',
    welcomeSub: 'Book a lesson from the menu below!',
    enterClassroom: 'Enter',

    // Landing Hero
    heroLine1: 'English lessons,',
    heroHeadline: 'Start speaking English\nwith confidence',
    heroSubheadline: 'Take online English lessons anywhere anytime with a native English tutor.',
    heroCta: 'Learn about eigo.io',

    // About / Benefits
    aboutTitle: 'About eigo.io',
    aboutLead: 'Eigo.io is a school run by myself, Connor, an English teacher from the UK with over 8000 hours+ of experience teaching Japanese students. I offer:',
    aboutPoint1: 'Private 1 to 1 english conversation practise',
    aboutPoint2: 'English test preparation (IELTS, TOEIC, EIKEN)',
    aboutPoint3: 'British English pronunciation training',
    aboutPoint4: 'Translation and English script writing services',
    aboutClosing: 'All lessons are done on the platform with video recordings and transcriptions.',

    // Reviews
    reviewsTitle: "What our students say",

    // How it works
    howTitle: 'How it works',
    howStep1Title: 'Sign up',
    howStep1Desc: 'Create an account with\nGoogle, LINE, or email',
    howStep2Title: 'Pick a time',
    howStep2Desc: 'Choose an available\nslot from the calendar',
    howStep3Title: 'Start your lesson',
    howStep3Desc: 'Enter the classroom\nfrom your dashboard',
    howStep4Title: 'Review your lesson',
    howStep4Desc: 'Get a summary and\nfeedback after each lesson',
    howStep5Title: 'Build your vocabulary',
    howStep5Desc: 'Study personalised phrases\nfrom your lessons',

    // CTA
    ctaHeadline: 'Ready to start speaking?',
    ctaSubheadline: 'Your first trial lesson is free',
    ctaButton: 'Book a free trial lesson',

    // Nav
    login: 'Log in',
    signup: 'Sign up',
    logout: 'Log out',
    dashboard: 'Dashboard',

    // Booking
    bookingTitle: 'Book',
    lesson15: '15 min',
    lesson30: '30 min',
    lesson45: '45 min',
    lesson60: '60 min',
    bookLesson: 'Book',

    // Info
    infoTitle: 'Info',
    contact: 'Contact',
    lessonInfo: 'Lessons',
    email: 'Email',
    lineId: 'LINE ID',
    whatsapp: 'WhatsApp',
    hours: 'Hours',
    hoursValue: 'Daily 06:00–08:00 / 16:00–02:00 JST',
    duration: 'Duration',
    durationValue: '15 / 30 / 45 / 60 min',
    level: 'Level',
    levelValue: 'Beginner to Advanced',
    type: 'Format',
    typeValue: 'Online, 1-on-1',
    classroom: 'Classroom',
    classroomValue: 'Join from your dashboard. No Zoom needed!',
    access: 'Includes',
    accessValue: 'Dashboard, booking, recordings, transcripts, AI analysis, phrase bank, app',

    // Pricing
    pricingTitle: 'Pricing',
    litePrice: 'Student Lite',
    litePriceValue: '¥10,000/mo  or  ¥120,000/yr',
    litePriceDetail: '120 min/month (30 min/week)',
    litePriceTrialNote: 'With trial: ¥6,000/mo or ¥60,000/yr',
    standardPrice: 'Student Standard',
    standardPriceValue: '¥20,000/mo  or  ¥240,000/yr',
    standardPriceDetail: '240 min/month (60 min/week)',
    standardPriceTrialNote: 'With trial: ¥12,000/mo or ¥120,000/yr',
    trialNote: 'Trial lesson',
    trialNoteValue: 'Free 15 min — up to 50% off when you join within 48h',
    billingNote: 'Billing',
    billingNoteValue: 'Processed securely via Stripe. Monthly or yearly. Change or cancel anytime',

    // Auth
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    firstNamePlaceholder: 'First name',
    lastNamePlaceholder: 'Last name',
    loginButton: 'Log in',
    signupButton: 'Sign up',
    noAccount: "No account?",
    hasAccount: 'Have an account?',
    settings: 'Settings',

    // Dashboard
    welcomeBack: 'Welcome back',
    upcomingLessons: 'Upcoming',
    noUpcoming: 'No upcoming lessons',
    bookNewLesson: 'Book a lesson',
    selectTime: 'Pick a time',
    tabHome: 'Home',
    tabBooking: 'Book',
    tabHistory: 'History',
    news: 'News',
    noNews: 'No announcements',
    enterClassroomIn: 'Opens 10 min before',
    noHistory: 'No history yet',
    lessonCompleted: 'Done',
    watchRecording: 'Recording',
    noRecording: 'No recording',
    loadingRecording: 'Loading...',
    recordingError: 'Failed',
    closePlayer: 'Close',

    // Calendar
    prevMonth: 'Prev',
    nextMonth: 'Next',
    sunday: 'Sun',
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    availableSlots: 'Available',
    confirmBooking: 'Book',

    // Footer
    footerTagline: 'Take online English lessons anywhere anytime with a native English tutor.',
    copyright: '© 2026 eigo.io',
    langToggle: '日本語',
  },
} as const

export type TranslationKey = keyof typeof translations.ja
