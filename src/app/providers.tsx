'use client'

import { LanguageProvider } from '@/context/LanguageContext'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { SquircleNoScript } from '@squircle-js/react'
import TapFill from '@/components/ui/TapFill'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <SquircleNoScript />
          <TapFill />
          {children}
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
