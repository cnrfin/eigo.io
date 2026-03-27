'use client'

import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import { useState, useEffect, useRef } from 'react'
import { Squircle } from '@squircle-js/react'
import SquircleBox from '@/components/ui/SquircleBox'
import Header from '@/components/Header'
import { motion } from 'framer-motion'

export default function SettingsPage() {
  const { user, loading, session, signOut, refreshAvatar, avatarUrl: profileAvatarUrl, gcalConnected, setGcalConnected } = useAuth()
  const { t, locale } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  const [displayName, setDisplayName] = useState('')
  const [editingDisplayName, setEditingDisplayName] = useState(false)
  const [savingDisplayName, setSavingDisplayName] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Subscription
  const [subscription, setSubscription] = useState<{
    plan: string; billingInterval: string; priceTier: string; status: string;
    cancelAtPeriodEnd: boolean; currentPeriodEnd: string;
  } | null>(null)
  const [balance, setBalance] = useState<{
    minutesPerMonth: number; minutesUsed: number; minutesRemaining: number;
    periodStart: string; periodEnd: string;
  } | null>(null)
  const [loadingSub, setLoadingSub] = useState(true)
  const [openingPortal, setOpeningPortal] = useState(false)

  // Avatar upload
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Contact email (for LINE users or anyone who wants notifications to a different address)
  const [contactEmail, setContactEmail] = useState('')
  const [editingContactEmail, setEditingContactEmail] = useState(false)
  const [savingContactEmail, setSavingContactEmail] = useState(false)
  const isLineUser = !!user?.user_metadata?.line_user_id

  // Google Calendar connection
  const gcalLoading = gcalConnected === null
  const [disconnectingGcal, setDisconnectingGcal] = useState(false)

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setDisplayName(user.user_metadata.full_name)
    } else if (user?.user_metadata?.name) {
      setDisplayName(user.user_metadata.name)
    } else if (user?.email && !user.email.endsWith('@line.eigo.io')) {
      setDisplayName(user.email.split('@')[0])
    }
  }, [user])

  // Load contact_email from profile
  useEffect(() => {
    if (!session?.access_token) return
    const loadContactEmail = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase
          .from('profiles')
          .select('contact_email')
          .eq('id', user?.id)
          .single()
        if (data?.contact_email) setContactEmail(data.contact_email)
      } catch {
        // ignore
      }
    }
    loadContactEmail()
  }, [session?.access_token, user?.id])

  // Load subscription data
  useEffect(() => {
    if (!session?.access_token) { setLoadingSub(false); return }
    const loadSub = async () => {
      try {
        const res = await fetch('/api/subscription', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setSubscription(data.subscription)
          setBalance(data.balance)
        }
      } catch {
        // ignore
      } finally {
        setLoadingSub(false)
      }
    }
    loadSub()
  }, [session?.access_token])

  const handleOpenPortal = async () => {
    if (!session?.access_token) return
    setOpeningPortal(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setSaveMessage({ type: 'error', text: locale === 'ja' ? 'エラーが発生しました' : 'Something went wrong' })
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setOpeningPortal(false)
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/'
    }
  }, [user, loading])

  const handleSaveContactEmail = async () => {
    if (!session?.access_token) return
    setSavingContactEmail(true)
    setSaveMessage(null)

    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ contact_email: contactEmail.trim() }),
      })

      if (res.ok) {
        setEditingContactEmail(false)
        setSaveMessage({
          type: 'success',
          text: locale === 'ja' ? '通知先メールを保存しました' : 'Notification email saved',
        })
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        const errData = await res.json().catch(() => ({}))
        setSaveMessage({
          type: 'error',
          text: errData?.error === 'Invalid email format'
            ? locale === 'ja' ? 'メールアドレスの形式が正しくありません' : 'Invalid email format'
            : locale === 'ja' ? '保存に失敗しました' : 'Failed to save',
        })
      }
    } catch {
      setSaveMessage({
        type: 'error',
        text: locale === 'ja' ? 'エラーが発生しました' : 'An error occurred',
      })
    } finally {
      setSavingContactEmail(false)
    }
  }

  const handleDisconnectGcal = async () => {
    if (!session?.access_token) return
    setDisconnectingGcal(true)
    try {
      await fetch('/api/profile/google-calendar-token', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      setGcalConnected(false)
      setSaveMessage({ type: 'success', text: locale === 'ja' ? 'Googleカレンダーの連携を解除しました' : 'Google Calendar disconnected' })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch {
      setSaveMessage({ type: 'error', text: locale === 'ja' ? 'エラーが発生しました' : 'An error occurred' })
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setDisconnectingGcal(false)
    }
  }

  const avatarUrl = avatarPreview || profileAvatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !session?.access_token) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setSaveMessage({ type: 'error', text: locale === 'ja' ? '画像ファイルを選択してください' : 'Please select an image file' })
      setTimeout(() => setSaveMessage(null), 3000)
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setSaveMessage({ type: 'error', text: locale === 'ja' ? 'ファイルサイズは2MB以下にしてください' : 'File must be under 2MB' })
      setTimeout(() => setSaveMessage(null), 3000)
      return
    }

    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setUploadingAvatar(true)
    setSaveMessage(null)

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        // Verify the remote URL actually loads before switching away from the local base64 preview
        if (data.avatarUrl) {
          const img = new Image()
          img.onload = () => setAvatarPreview(data.avatarUrl)
          img.onerror = () => {} // keep local base64 preview
          img.src = data.avatarUrl
        }
        setSaveMessage({ type: 'success', text: locale === 'ja' ? 'プロフィール画像を更新しました' : 'Profile picture updated' })
        // Refresh avatar from profiles table so header and other pages pick it up
        await refreshAvatar()
      } else {
        const errData = await res.json().catch(() => ({}))
        console.error('Avatar upload failed:', errData)
        setSaveMessage({ type: 'error', text: locale === 'ja' ? 'アップロードに失敗しました' : 'Upload failed' })
        setAvatarPreview(null)
      }
    } catch {
      setSaveMessage({ type: 'error', text: locale === 'ja' ? 'エラーが発生しました' : 'An error occurred' })
      setAvatarPreview(null)
    } finally {
      setUploadingAvatar(false)
      // Reset file input so re-selecting the same file works
      if (fileInputRef.current) fileInputRef.current.value = ''
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  const handleSaveDisplayName = async () => {
    if (!session?.access_token) return
    setSavingDisplayName(true)
    setSaveMessage(null)

    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ display_name: displayName }),
      })

      if (res.ok) {
        setEditingDisplayName(false)
        setSaveMessage({
          type: 'success',
          text: locale === 'ja' ? '保存しました' : 'Saved successfully',
        })
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage({
          type: 'error',
          text: locale === 'ja' ? '保存に失敗しました' : 'Failed to save',
        })
      }
    } catch {
      setSaveMessage({
        type: 'error',
        text: locale === 'ja' ? 'エラーが発生しました' : 'An error occurred',
      })
    } finally {
      setSavingDisplayName(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </main>
    )
  }

  if (!user) return null

  return (
    <>
      <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="max-w-2xl mx-auto">
          <Header />

          <motion.section
            className="py-8 px-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Back link */}
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="flex items-center gap-2 mb-8 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>←</span>
              <span>{t('dashboard')}</span>
            </button>

            {/* Title */}
            <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--text)' }}>
              {locale === 'ja' ? '設定' : 'Settings'}
            </h1>

            <motion.div
              className="space-y-6"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.07 } },
              }}
            >
              {/* Profile Section */}
              <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
              <SquircleBox cornerRadius={16} className="p-5 sm:p-8" style={{ background: 'var(--surface)' }}>
                <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text)' }}>
                  {locale === 'ja' ? 'プロフィール' : 'Profile'}
                </h2>

                <div className="space-y-6">
                  {/* Avatar with upload */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="relative group shrink-0"
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="w-16 h-16 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium"
                          style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                        >
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div
                        className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0, 0, 0, 0.45)' }}
                      >
                        {uploadingAvatar ? (
                          <span className="spinner-sm" />
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                        )}
                      </div>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {locale === 'ja' ? 'プロフィール画像' : 'Profile picture'}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
                        {locale === 'ja' ? 'クリックして画像を変更' : 'Click to change'}
                      </p>
                    </div>
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      {locale === 'ja' ? '表示名' : 'Display name'}
                    </label>
                    {editingDisplayName ? (
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="flex-1 px-4 py-2.5 text-sm rounded-lg transition-colors"
                          style={{
                            background: 'var(--surface-hover)',
                            color: 'var(--text)',
                            border: '1px solid var(--border)',
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveDisplayName()
                          }}
                        />
                        <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                          <button
                            onClick={handleSaveDisplayName}
                            disabled={savingDisplayName}
                            className="px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 hover:opacity-90"
                            style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                          >
                            {savingDisplayName ? '...' : (locale === 'ja' ? '保存' : 'Save')}
                          </button>
                        </Squircle>
                        <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                          <button
                            onClick={() => {
                              setEditingDisplayName(false)
                              if (user?.user_metadata?.full_name) {
                                setDisplayName(user.user_metadata.full_name)
                              } else if (user?.user_metadata?.name) {
                                setDisplayName(user.user_metadata.name)
                              } else if (user?.email) {
                                setDisplayName(user.email.split('@')[0])
                              }
                            }}
                            disabled={savingDisplayName}
                            className="px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 hover:opacity-80"
                            style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}
                          >
                            {locale === 'ja' ? 'キャンセル' : 'Cancel'}
                          </button>
                        </Squircle>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-base" style={{ color: 'var(--text)' }}>
                          {displayName}
                        </p>
                        <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                          <button
                            onClick={() => setEditingDisplayName(true)}
                            className="px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-80"
                            style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}
                          >
                            {locale === 'ja' ? '編集' : 'Edit'}
                          </button>
                        </Squircle>
                      </div>
                    )}
                    {saveMessage && (
                      <p
                        className="text-sm mt-2"
                        style={{
                          color: saveMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
                        }}
                      >
                        {saveMessage.text}
                      </p>
                    )}
                  </div>

                  {/* Email — show real email for non-LINE users, notification email for LINE users */}
                  {!isLineUser && (
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {locale === 'ja' ? 'メールアドレス' : 'Email'}
                      </label>
                      <p className="text-base" style={{ color: 'var(--text)' }}>
                        {user.email}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
                        {locale === 'ja' ? '変更はできません' : 'Cannot be changed'}
                      </p>
                    </div>
                  )}

                  {/* Notification Email — shown for LINE users */}
                  {isLineUser && (
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {locale === 'ja' ? '通知先メールアドレス' : 'Notification email'}
                      </label>
                      <p className="text-xs mb-3" style={{ color: 'var(--text-subtle)' }}>
                        {locale === 'ja'
                          ? '予約確認やリマインダーをメールで受け取りたい場合は、メールアドレスを入力してください。未設定の場合はLINEで通知されます。'
                          : 'Enter an email to receive booking confirmations and reminders by email. If not set, notifications will be sent via LINE.'}
                      </p>
                      {editingContactEmail ? (
                        <div className="flex gap-3">
                          <input
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            placeholder={locale === 'ja' ? 'example@email.com' : 'example@email.com'}
                            className="flex-1 px-4 py-2.5 text-sm rounded-lg transition-colors"
                            style={{
                              background: 'var(--surface-hover)',
                              color: 'var(--text)',
                              border: '1px solid var(--border)',
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveContactEmail()
                            }}
                          />
                          <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                            <button
                              onClick={handleSaveContactEmail}
                              disabled={savingContactEmail}
                              className="px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 hover:opacity-90"
                              style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                            >
                              {savingContactEmail ? '...' : (locale === 'ja' ? '保存' : 'Save')}
                            </button>
                          </Squircle>
                          <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                            <button
                              onClick={() => setEditingContactEmail(false)}
                              disabled={savingContactEmail}
                              className="px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 hover:opacity-80"
                              style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}
                            >
                              {locale === 'ja' ? 'キャンセル' : 'Cancel'}
                            </button>
                          </Squircle>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-base" style={{ color: contactEmail ? 'var(--text)' : 'var(--text-subtle)' }}>
                            {contactEmail || (locale === 'ja' ? '未設定（LINEで通知）' : 'Not set (LINE notifications)')}
                          </p>
                          <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                            <button
                              onClick={() => setEditingContactEmail(true)}
                              className="px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-80"
                              style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}
                            >
                              {locale === 'ja' ? '編集' : 'Edit'}
                            </button>
                          </Squircle>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </SquircleBox>
              </motion.div>

              {/* Preferences Section */}
              <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
              <SquircleBox cornerRadius={16} className="p-5 sm:p-8" style={{ background: 'var(--surface)' }}>
                <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text)' }}>
                  {locale === 'ja' ? 'プリファレンス' : 'Preferences'}
                </h2>

                <div className="space-y-4">
                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        {locale === 'ja' ? 'テーマ' : 'Theme'}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
                        {theme === 'dark'
                          ? locale === 'ja'
                            ? 'ダークモード'
                            : 'Dark mode'
                          : locale === 'ja'
                            ? 'ライトモード'
                            : 'Light mode'}
                      </p>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className="w-12 h-6 rounded-full transition-colors relative shrink-0"
                      style={{ background: theme === 'dark' ? 'var(--surface-alt)' : 'var(--accent)' }}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200 shadow-sm ${theme === 'dark' ? 'toggle-handle-off' : ''}`}
                        style={{
                          ...(theme === 'dark' ? {} : { background: '#fff' }),
                          transform: theme === 'dark' ? 'translateX(0px)' : 'translateX(24px)',
                        }}
                      />
                    </button>
                  </div>
                </div>
              </SquircleBox>
              </motion.div>

              {/* Subscription / Your Plan */}
              <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
              <SquircleBox cornerRadius={16} className="p-5 sm:p-8" style={{ background: 'var(--surface)' }}>
                <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text)' }}>
                  {locale === 'ja' ? 'プラン' : 'Your Plan'}
                </h2>

                {loadingSub ? (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
                ) : !subscription || subscription.status === 'cancelled' ? (
                  <div>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                      {locale === 'ja'
                        ? 'プランに登録していません。レッスンを予約するにはプランの選択が必要です。'
                        : "You don't have an active plan. Subscribe to start booking lessons."}
                    </p>
                    <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                      <button
                        onClick={() => (window.location.href = '/plans')}
                        className="px-5 py-2.5 text-sm font-medium transition-colors hover:opacity-90"
                        style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                      >
                        {locale === 'ja' ? 'プランを選ぶ' : 'Choose a plan'}
                      </button>
                    </Squircle>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Plan name & status */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-medium" style={{ color: 'var(--text)' }}>
                          {subscription.plan === 'light' ? 'Student Lite' : 'Student Standard'}
                          <span className="text-sm font-normal ml-2" style={{ color: 'var(--text-muted)' }}>
                            ({subscription.billingInterval === 'monthly'
                              ? (locale === 'ja' ? '月額' : 'Monthly')
                              : (locale === 'ja' ? '年額' : 'Yearly')})
                          </span>
                        </p>
                      </div>
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{
                          background: subscription.status === 'active'
                            ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: subscription.status === 'active'
                            ? 'var(--success)' : 'var(--danger)',
                        }}
                      >
                        {subscription.status === 'active'
                          ? (locale === 'ja' ? '有効' : 'Active')
                          : subscription.status === 'past_due'
                            ? (locale === 'ja' ? '未払い' : 'Past due')
                            : subscription.status}
                      </span>
                    </div>

                    {/* Minute usage bar */}
                    {balance && (
                      <div>
                        <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                          <span>
                            {locale === 'ja'
                              ? `${balance.minutesRemaining} / ${balance.minutesPerMonth}分 残り`
                              : `${balance.minutesRemaining} / ${balance.minutesPerMonth} min remaining`}
                          </span>
                        </div>
                        <div
                          className="h-2 rounded-full overflow-hidden"
                          style={{ background: 'var(--surface-hover)' }}
                        >
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background: balance.minutesRemaining < 30 ? 'var(--danger)' : 'var(--accent)',
                            }}
                            initial={{ width: '100%' }}
                            animate={{ width: `${Math.min(100, (balance.minutesRemaining / balance.minutesPerMonth) * 100)}%` }}
                            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
                          />
                        </div>
                        <p className="text-xs mt-2" style={{ color: 'var(--text-subtle)' }}>
                          {subscription.cancelAtPeriodEnd
                            ? (locale === 'ja'
                              ? `${new Date(balance.periodEnd).toLocaleDateString('ja-JP')} に解約されます`
                              : `Cancels on ${new Date(balance.periodEnd).toLocaleDateString('en-GB')}`)
                            : (locale === 'ja'
                              ? `次回更新: ${new Date(balance.periodEnd).toLocaleDateString('ja-JP')}`
                              : `Renews: ${new Date(balance.periodEnd).toLocaleDateString('en-GB')}`)}
                        </p>
                      </div>
                    )}

                    {/* Manage button */}
                    <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                      <button
                        onClick={handleOpenPortal}
                        disabled={openingPortal}
                        className="px-5 py-2.5 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                        style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}
                      >
                        {openingPortal
                          ? '...'
                          : locale === 'ja' ? 'プランを管理する' : 'Manage plan'}
                      </button>
                    </Squircle>
                  </div>
                )}
              </SquircleBox>
              </motion.div>

              {/* Google Calendar Integration — hidden until Google OAuth verification is complete */}
              {false && <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
              <SquircleBox cornerRadius={16} className="p-5 sm:p-8" style={{ background: 'var(--surface)' }}>
                <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
                  {locale === 'ja' ? 'カレンダー' : 'Calendar'}
                </h2>
                <p className="text-xs mb-6" style={{ color: 'var(--text-subtle)' }}>
                  {locale === 'ja'
                    ? 'レッスンの予約をカレンダーに自動追加できます'
                    : 'Automatically add lesson bookings to your calendar'}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Google Calendar icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="4" width="18" height="18" rx="2" stroke="var(--text-muted)" strokeWidth="1.5" />
                      <path d="M3 9h18" stroke="var(--text-muted)" strokeWidth="1.5" />
                      <path d="M8 2v4M16 2v4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="12" cy="15" r="2" fill="var(--accent)" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        Google Calendar
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: gcalConnected ? 'var(--success)' : 'var(--text-subtle)' }}>
                        {gcalLoading
                          ? '...'
                          : gcalConnected
                            ? locale === 'ja' ? '接続済み' : 'Connected'
                            : locale === 'ja' ? '未接続' : 'Not connected'}
                      </p>
                    </div>
                  </div>

                  {!gcalLoading && (
                    gcalConnected ? (
                      <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                        <button
                          onClick={handleDisconnectGcal}
                          disabled={disconnectingGcal}
                          className="px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                          style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}
                        >
                          {disconnectingGcal ? '...' : (locale === 'ja' ? '解除' : 'Disconnect')}
                        </button>
                      </Squircle>
                    ) : (
                      <Squircle asChild cornerRadius={10} cornerSmoothing={0.8}>
                        <button
                          onClick={async () => {
                            // Clear the explicit disconnect flag so the token store won't be skipped
                            if (session?.access_token) {
                              await fetch('/api/profile/google-calendar-status', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${session.access_token}`,
                                },
                                body: JSON.stringify({ reset: true }),
                              }).catch(() => {})
                            }
                            // Re-trigger Google OAuth with calendar scope to get a fresh token
                            const { supabase } = await import('@/lib/supabase')
                            supabase.auth.signInWithOAuth({
                              provider: 'google',
                              options: {
                                redirectTo: `${window.location.origin}/settings`,
                                scopes: 'https://www.googleapis.com/auth/calendar.events',
                                queryParams: {
                                  access_type: 'offline',
                                  prompt: 'consent',
                                },
                              },
                            })
                          }}
                          className="px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-90"
                          style={{ background: 'var(--accent)', color: 'var(--selected-text)' }}
                        >
                          {locale === 'ja' ? '接続する' : 'Connect'}
                        </button>
                      </Squircle>
                    )
                  )}
                </div>
              </SquircleBox>
              </motion.div>}

              {/* Sign out - simple link style, no container */}
              <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="text-center pt-2 pb-8">
                <button
                  onClick={() => signOut()}
                  className="text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {locale === 'ja' ? 'ログアウト' : 'Sign out'}
                </button>
              </motion.div>
            </motion.div>
          </motion.section>
        </div>
      </main>
    </>
  )
}
