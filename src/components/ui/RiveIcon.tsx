'use client'

import { forwardRef, useEffect, useImperativeHandle } from 'react'
import {
  useRive,
  useStateMachineInput,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceColor,
} from '@rive-app/react-canvas'
import { useTheme } from '@/context/ThemeContext'

// Matches the names inside public/icons.riv — keep these consistent in the
// Rive editor for every artboard:
//   state machine: "State Machine 1", trigger input: "hover",
//   view model color property: "iconColor" (bound to every stroke)
const SRC = '/icons.riv'
const STATE_MACHINE = 'State Machine 1'
const TRIGGER = 'hover'
const DARK_INPUT = 'dark' // boolean on the "light" artboard (theme toggle morph)
const COLOR_PROP = 'iconColor'

export type RiveIconVariant = 'text' | 'muted' | 'subtle'

// Mirrors the CSS tokens per theme: nav icons use --text, topbar icons use
// --text-muted, disabled items use --text-subtle.
const VARIANT_RGB: Record<RiveIconVariant, Record<'light' | 'dark', [number, number, number]>> = {
  text: { light: [43, 43, 45], dark: [232, 232, 237] }, // #2b2b2d / #e8e8ed
  muted: { light: [112, 112, 117], dark: [107, 107, 122] }, // #707075 / #6b6b7a
  subtle: { light: [159, 160, 162], dark: [74, 74, 88] }, // #9fa0a2 / #4a4a58
}

export interface RiveIconHandle {
  fire: () => void
}

interface RiveIconProps {
  artboard: string
  size?: number
  variant?: RiveIconVariant
  /** Syncs the "dark" boolean input (light artboard). The state machine plays
   *  the morph one-shot whenever this flips. */
  dark?: boolean
  /** Optional explicit stroke colour, overriding `variant` (e.g. white on a dark
   *  pill). Pass a stable reference to avoid re-running the colour effect. */
  colorRgb?: [number, number, number]
}

// Renders one artboard from icons.riv. The hover one-shot is fired by the
// PARENT container (e.g. the nav row's onMouseEnter) via the imperative ref.
const RiveIcon = forwardRef<RiveIconHandle, RiveIconProps>(function RiveIcon({ artboard, size = 22, variant = 'text', dark, colorRgb }, ref) {
  const { theme } = useTheme()
  const { rive, RiveComponent } = useRive({
    src: SRC,
    artboard,
    stateMachines: STATE_MACHINE,
    autoplay: true,
    shouldDisableRiveListeners: true,
  })
  const trigger = useStateMachineInput(rive, STATE_MACHINE, TRIGGER)
  const darkInput = useStateMachineInput(rive, STATE_MACHINE, DARK_INPUT)

  // Keep the light/dark boolean in step with the app theme; the state machine
  // takes care of playing the morph (or snapping on first load via Entry).
  useEffect(() => {
    if (dark === undefined || !darkInput) return
    // eslint-disable-next-line react-hooks/immutability -- Rive inputs are set by assigning .value; this mutates the Rive runtime, not React state
    darkInput.value = dark
  }, [dark, darkInput])

  // Theme-aware stroke colour via data binding. We create a fresh instance at
  // runtime (useNew) so this works even when no editor instance is exported,
  // and set both property names found in the file.
  const viewModel = useViewModel(rive, { name: 'ViewModel1' })
  const viewModelInstance = useViewModelInstance(viewModel, { useNew: true, rive })
  const { setRgb: setIconColor } = useViewModelInstanceColor(COLOR_PROP, viewModelInstance)
  const { setRgb: setColorProperty } = useViewModelInstanceColor('colorProperty', viewModelInstance)

  useEffect(() => {
    const [r, g, b] = colorRgb ?? VARIANT_RGB[variant][theme === 'dark' ? 'dark' : 'light']
    setIconColor(r, g, b)
    setColorProperty(r, g, b)
  }, [theme, variant, colorRgb, setIconColor, setColorProperty])

  useImperativeHandle(ref, () => ({ fire: () => trigger?.fire() }), [trigger])

  // Crossfade: static SVG (exported from the same Rive artboard's idle state,
  // in /public/icons/<artboard>.svg) shows on first paint, then the canvas
  // fades in once the runtime + file are ready. The fallback is rendered as a
  // currentColor-filled CSS mask, so it picks up exactly the colour the Rive
  // icon will use — identical shape AND colour, the swap is invisible.
  // (The "light" artboard idles as a moon when dark: light-dark.svg.)
  const loaded = !!rive
  const maskSrc = `/icons/${artboard}${artboard === 'light' && dark ? '-dark' : ''}.svg`
  const maskCss = `url(${maskSrc}) no-repeat center / contain`
  return (
    <span aria-hidden className="relative block pointer-events-none" style={{ width: size, height: size }}>
      <span
        className="absolute inset-0"
        style={{
          background: 'currentColor',
          WebkitMask: maskCss,
          mask: maskCss,
          opacity: loaded ? 0 : 1,
          transition: 'opacity 150ms ease-out',
        }}
      />
      <RiveComponent style={{ width: '100%', height: '100%', opacity: loaded ? 1 : 0, transition: 'opacity 150ms ease-out' }} />
    </span>
  )
})

export default RiveIcon
