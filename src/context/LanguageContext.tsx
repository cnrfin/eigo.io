'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Locale, translations, TranslationKey, urlLocaleFor, otherLocalePath } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'

type LanguageContextType = {
  locale: Locale
  t: (key: TranslationKey) => string
  toggleLocale: () => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function getBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'ja'
  const lang = navigator.language || ''
  return lang.startsWith('ja') ? 'ja' : 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // `prefLocale` is the browser/profile preference (used on the dashboard and
  // the prototype landings). On URL-scoped public routes the path wins, so the
  // effective locale below is `urlLocale ?? prefLocale`.
  const [prefLocale, setPrefLocale] = useState<Locale>(getBrowserLocale)
  const [userId, setUserId] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const urlLocale = urlLocaleFor(pathname)
  const locale: Locale = urlLocale ?? prefLocale

  // Keep <html lang> in sync with the active language for accessibility + SEO.
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  // Load preferred language from Supabase profile on auth
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      setUserId(session.user.id)

      const { data } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', session.user.id)
        .single()

      if (data?.preferred_language && (data.preferred_language === 'ja' || data.preferred_language === 'en')) {
        setPrefLocale(data.preferred_language)
      }
    }

    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id)
        supabase
          .from('profiles')
          .select('preferred_language')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.preferred_language && (data.preferred_language === 'ja' || data.preferred_language === 'en')) {
              setPrefLocale(data.preferred_language)
            }
          })
      } else {
        setUserId(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const t = (key: TranslationKey): string => {
    return translations[locale][key] || key
  }

  const toggleLocale = useCallback(() => {
    // On URL-scoped public routes, switching language means navigating to the
    // other-language URL (/plans <-> /en/plans). Off the public tree (dashboard,
    // prototype landings) we flip the stored preference instead.
    if (urlLocale) {
      router.push(otherLocalePath(pathname))
      return
    }
    setPrefLocale(prev => {
      const next = prev === 'ja' ? 'en' : 'ja'

      // Persist to Supabase if logged in
      if (userId) {
        supabase
          .from('profiles')
          .update({ preferred_language: next })
          .eq('id', userId)
          .then(({ error }) => {
            if (error) console.error('Failed to save language preference:', error)
          })
      }

      return next
    })
  }, [urlLocale, pathname, router, userId])

  return (
    <LanguageContext.Provider value={{ locale, t, toggleLocale }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}
