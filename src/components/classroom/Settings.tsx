'use client'

import { useEffect, useState } from 'react'
import { getUsableCameraEffectPresets, isAudioDenoiserSupported, type UseLocalMediaResult } from '@whereby.com/browser-sdk/react'
import { useTheme } from '@/context/ThemeContext'
import type { ClassroomT } from '@/lib/classroom/i18n'
import { Ico } from './Icons'
import type { FxMode, Prefs } from './prefs'

/**
 * Settings: Audio & video (devices, background, noise reduction, mirror, HD,
 * low data), Classroom (cursors; the teacher also decides whether the
 * student can draw) and Appearance (visual effects, theme).
 */

// Background presets we offer, in this order, when the device can run them.
const BACKGROUNDS: { id: string; key: 'bgBlur' | 'bgHeavyBlur' | 'bgCabin' | 'bgStudio' | 'bgDay' }[] = [
  { id: 'blur', key: 'bgBlur' },
  { id: 'heavy-blur', key: 'bgHeavyBlur' },
  { id: 'cabin', key: 'bgCabin' },
  { id: 'studio', key: 'bgStudio' },
  { id: 'day', key: 'bgDay' },
]

const canPickSpeaker = typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype

function Sw({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return <button className={`sw${on ? ' on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={onClick} />
}

export default function Settings({
  t,
  open,
  onClose,
  isTeacher,
  otherName,
  localMedia,
  speakerId,
  setSpeakerId,
  prefs,
  setPrefs,
  studentDraw,
  setStudentDraw,
  applyBackground,
  applyDenoise,
  applyHd,
  applyLowData,
  videoBusy,
}: {
  t: ClassroomT
  open: boolean
  onClose: () => void
  isTeacher: boolean
  otherName: string
  localMedia: UseLocalMediaResult
  speakerId: string
  setSpeakerId: (id: string) => void
  prefs: Prefs
  setPrefs: (p: Partial<Prefs>) => void
  studentDraw: boolean
  setStudentDraw: (on: boolean) => void
  applyBackground: (id: string) => Promise<boolean>
  applyDenoise: (on: boolean) => Promise<boolean>
  applyHd: (on: boolean) => void
  applyLowData: (on: boolean) => void
  /** a camera change is in progress: ignore further camera changes until it's done */
  videoBusy: boolean
}) {
  const [pane, setPane] = useState<'av' | 'cls' | 'look'>('av')
  const [bgs, setBgs] = useState<string[] | null>(null)
  const [denoiseOk, setDenoiseOk] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const { state, actions } = localMedia

  useEffect(() => {
    if (!open) return
    let live = true
    getUsableCameraEffectPresets()
      .then((ids) => live && setBgs(ids))
      .catch(() => live && setBgs([]))
    isAudioDenoiserSupported()
      .then((ok) => live && setDenoiseOk(ok))
      .catch(() => {})
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => {
      live = false
      window.removeEventListener('keydown', k)
    }
  }, [open, onClose])

  const offered = BACKGROUNDS.filter((b) => bgs?.includes(b.id))

  return (
    <div className={`scrim${open ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal smodal" role="dialog" aria-modal="true" aria-label={t('settings')}>
        <div className="mhead">
          <h2>{t('settings')}</h2>
          <button className="ib" onClick={onClose} aria-label={t('close')}>
            <Ico name="x" style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <div className="tabs">
          <button className={`pill${pane === 'av' ? ' on' : ''}`} onClick={() => setPane('av')}>
            {t('tabAv')}
          </button>
          <button className={`pill${pane === 'cls' ? ' on' : ''}`} onClick={() => setPane('cls')}>
            {t('tabClassroom')}
          </button>
          <button className={`pill${pane === 'look' ? ' on' : ''}`} onClick={() => setPane('look')}>
            {t('tabLook')}
          </button>
        </div>

        <div className={`spane${pane === 'av' ? ' on' : ''}`}>
          <div className="row">
            <div className="l">
              <b>{t('microphone')}</b>
            </div>
            <select value={state.currentMicrophoneDeviceId || ''} onChange={(e) => actions.setMicrophoneDevice(e.target.value)}>
              {state.microphoneDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `${t('microphone')} ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
          {canPickSpeaker && state.speakerDevices.length > 0 && (
            <div className="row">
              <div className="l">
                <b>{t('speaker')}</b>
              </div>
              <select value={speakerId} onChange={(e) => setSpeakerId(e.target.value)}>
                {state.speakerDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `${t('defaultSpeaker')} ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="row">
            <div className="l">
              <b>{t('camera')}</b>
            </div>
            <select value={state.currentCameraDeviceId || ''} onChange={(e) => actions.setCameraDevice(e.target.value)}>
              {state.cameraDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `${t('camera')} ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
          {offered.length > 0 && (
            <div className="row">
              <div className="l">
                <b>{t('background')}</b>
                <span>{t('backgroundHint')}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  disabled={videoBusy}
                  className={`pill${!prefs.background ? ' on' : ''}`}
                  onClick={async () => (await applyBackground('')) && setPrefs({ background: '' })}
                >
                  {t('bgNone')}
                </button>
                {offered.map((b) => (
                  <button
                    key={b.id}
                    disabled={videoBusy}
                    className={`pill${prefs.background === b.id ? ' on' : ''}`}
                    onClick={async () => (await applyBackground(b.id)) && setPrefs({ background: b.id })}
                  >
                    {t(b.key)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {denoiseOk && (
            <div className="row">
              <div className="l">
                <b>{t('noiseReduction')}</b>
                <span>{t('noiseReductionHint')}</span>
              </div>
              <Sw
                on={prefs.denoise}
                label={t('noiseReduction')}
                onClick={async () => (await applyDenoise(!prefs.denoise)) && setPrefs({ denoise: !prefs.denoise })}
              />
            </div>
          )}
          <div className="row">
            <div className="l">
              <b>{t('mirror')}</b>
              <span>{t('mirrorHint')}</span>
            </div>
            <Sw on={prefs.mirror} label={t('mirror')} onClick={() => setPrefs({ mirror: !prefs.mirror })} />
          </div>
          <div className="row">
            <div className="l">
              <b>{t('hdVideo')}</b>
            </div>
            <Sw
              on={prefs.hd}
              label={t('hdVideo')}
              onClick={() => {
                if (videoBusy) return
                applyHd(!prefs.hd)
                setPrefs({ hd: !prefs.hd })
              }}
            />
          </div>
          <div className="row">
            <div className="l">
              <b>{t('lowData')}</b>
              <span>{t('lowDataHint')}</span>
            </div>
            <Sw
              on={prefs.lowData}
              label={t('lowData')}
              onClick={() => {
                if (videoBusy) return
                applyLowData(!prefs.lowData)
                setPrefs({ lowData: !prefs.lowData })
              }}
            />
          </div>
        </div>

        <div className={`spane${pane === 'cls' ? ' on' : ''}`}>
          {isTeacher && (
            <div className="row">
              <div className="l">
                <b>{t('studentDraw')}</b>
                <span>{t('studentDrawHint', { name: otherName })}</span>
              </div>
              <Sw on={studentDraw} label={t('studentDraw')} onClick={() => setStudentDraw(!studentDraw)} />
            </div>
          )}
          <div className="row">
            <div className="l">
              <b>{t('showCursors')}</b>
              <span>{t('showCursorsHint')}</span>
            </div>
            <Sw on={prefs.cursors} label={t('showCursors')} onClick={() => setPrefs({ cursors: !prefs.cursors })} />
          </div>
        </div>

        <div className={`spane${pane === 'look' ? ' on' : ''}`}>
          <div className="row">
            <div className="l">
              <b>{t('visualEffects')}</b>
              <span>{t('visualEffectsHint')}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['auto', 'full', 'lite'] as FxMode[]).map((m) => (
                <button key={m} className={`pill${prefs.fx === m ? ' on' : ''}`} onClick={() => setPrefs({ fx: m })}>
                  {t(m === 'auto' ? 'fxAuto' : m === 'full' ? 'fxFull' : 'fxLite')}
                </button>
              ))}
            </div>
          </div>
          <div className="row">
            <div className="l">
              <b>{t('theme')}</b>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className={`pill${theme !== 'light' ? ' on' : ''}`} onClick={() => theme === 'light' && toggleTheme()}>
                {t('themeDark')}
              </button>
              <button className={`pill${theme === 'light' ? ' on' : ''}`} onClick={() => theme !== 'light' && toggleTheme()}>
                {t('themeLight')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
