'use client'

import { LanguageProvider } from '@/context/LanguageContext'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { SquircleNoScript } from '@squircle-js/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <SquircleNoScript />
          {children}
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
