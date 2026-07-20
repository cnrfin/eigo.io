'use client'

import HCaptcha from '@hcaptcha/react-hcaptcha'
import { forwardRef, useImperativeHandle, useRef } from 'react'

/* Invisible hCaptcha for bot protection on auth calls. Render it once, then
   call `getToken()` (via ref) right before a Supabase auth request and pass the
   token in `options.captchaToken`. Supabase's captcha setting is global, so the
   token is needed on signInWithPassword, signUp, and signInAnonymously.

   If NEXT_PUBLIC_HCAPTCHA_SITEKEY is unset (e.g. local dev before configuring),
   it renders nothing and getToken() returns null — the auth call then proceeds
   without a token, which is fine as long as captcha is also disabled in Supabase. */

const SITEKEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY

export type HCaptchaHandle = { getToken: () => Promise<string | null> }

const InvisibleHCaptcha = forwardRef<HCaptchaHandle>(function InvisibleHCaptcha(_props, ref) {
  const captchaRef = useRef<HCaptcha>(null)

  useImperativeHandle(ref, () => ({
    getToken: async () => {
      if (!SITEKEY || !captchaRef.current) return null
      try {
        const res = await captchaRef.current.execute({ async: true })
        return res?.response ?? null
      } catch {
        return null
      }
    },
  }))

  if (!SITEKEY) return null
  return <HCaptcha ref={captchaRef} sitekey={SITEKEY} size="invisible" />
})

export default InvisibleHCaptcha
