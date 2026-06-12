'use client'

import { useEffect, useState } from 'react'
import {
  useRive,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceColor,
  Layout,
  Fit,
  Alignment,
} from '@rive-app/react-webgl2'
import { useTheme } from '@/context/ThemeContext'
import { useLanguage } from '@/context/LanguageContext'

/**
 * Illustration slot for the pronunciation-course announcement modal.
 *
 * Loads public/rive/pron101.riv: 500x500 artboard, transparent background,
 *   state machine 'State Machine 1', view model 'ViewModel1' with Color
 *   properties 'textColor' / 'colorProperty' bound to the themed fills
 *   (same convention as icons.riv; both are set, matching RiveIcon).
 *   Optional: a text run exported as 'copy' for locale-dependent words —
 *   it is set to the JA/EN string below when present.
 *
 * Theme changes recolor the text live (no remount); until the file exists
 * (or if it fails to load) the slot collapses to nothing.
 */
const TEXT_RGB: Record<'light' | 'dark', [number, number, number]> = {
  light: [43, 43, 45],    // --text  #2b2b2d
  dark: [232, 232, 237],  // --text  #e8e8ed
}

export default function PronAnnounceArt() {
  const { theme } = useTheme()
  const { locale } = useLanguage()
  const [failed, setFailed] = useState(false)
  const { rive, RiveComponent } = useRive({
    src: '/rive/pron101.riv',
    stateMachines: 'State Machine 1',
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoadError: () => setFailed(true),
  })

  // Theme-aware text colour via data binding (mirrors RiveIcon): a fresh
  // instance at runtime works even when no editor instance was exported.
  const viewModel = useViewModel(rive, { name: 'ViewModel1' })
  const viewModelInstance = useViewModelInstance(viewModel, { useNew: true, rive })
  const { setRgb: setTextColor } = useViewModelInstanceColor('textColor', viewModelInstance)
  const { setRgb: setColorProperty } = useViewModelInstanceColor('colorProperty', viewModelInstance)
  useEffect(() => {
    const [r, g, b] = TEXT_RGB[theme === 'dark' ? 'dark' : 'light']
    setTextColor(r, g, b)
    setColorProperty(r, g, b)
  }, [theme, setTextColor, setColorProperty])

  // Locale-dependent words inside the art (only applies if the file exports
  // a text run named 'copy'; harmless otherwise).
  useEffect(() => {
    if (!rive) return
    try { rive.setTextRunValue('copy', locale === 'ja' ? 'LとR、いえますか？' : 'How’s your L & R?') } catch { /* no such run */ }
  }, [rive, locale])

  if (failed) return null
  // square artboard: centered at a height that keeps the CTA above the fold
  return (
    <div className="mx-auto" style={{ width: 230, aspectRatio: '1 / 1' }} aria-hidden>
      <RiveComponent style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
