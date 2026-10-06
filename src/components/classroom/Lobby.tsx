'use client'

import { useRef, useState } from 'react'
import { VideoView, type UseLocalMediaResult } from '@whereby.com/browser-sdk/react'
import type { JoinInfo } from '@/lib/classroom/client'
import type { ClassroomT } from '@/lib/classroom/i18n'
import { audioContext, useAudioLevel } from './audio'
import { Ico } from './Icons'

/**
 * Pre-join check (Whereby-style): camera preview, camera / mic toggles with a
 * live mic level, device pickers, a speaker test chime, then "Join lesson".
 * Uses the same local media the room will use, so nothing restarts on join.
 */

const canPickSpeaker = typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype

export function lessonTitle(info: JoinInfo, t: ClassroomT) {
  return info.lesson ? `Lesson ${info.lesson.number}: ${info.lesson.lessonTitle}` : t('freeTalk')
}

export default function Lobby({
  info,
  t,
  localMedia,
  speakerId,
  setSpeakerId,
  joining,
  onJoin,
  mirror = true,
}: {
  info: JoinInfo
  t: ClassroomT
  localMedia: UseLocalMediaResult
  speakerId: string
  setSpeakerId: (id: string) => void
  joining: boolean
  onJoin: () => void
  mirror?: boolean
}) {
  const { state, actions } = localMedia
  const stream = state.localStream
  const camOn = state.isCameraEnabled
  const micOn = state.isMicrophoneEnabled
  const denied = !!state.startError && !stream
  const lvlRef = useRef<HTMLElement | null>(null)
  const barsRef = useRef<HTMLSpanElement | null>(null)
  const [testing, setTesting] = useState(false)

  useAudioLevel(micOn ? stream : null, (v) => {
    if (lvlRef.current) lvlRef.current.style.transform = `scaleX(${v.toFixed(2)})`
    const n = Math.round(v * 5)
    barsRef.current?.querySelectorAll('i').forEach((b, i) => b.classList.toggle('lit', i < n))
  })

  const noCam = !stream || !camOn
  const noCamText = denied
    ? t('allowCamMicBody', { name: info.other.name })
    : stream && !camOn
      ? t('cameraOff')
      : t('startingCamera')

  async function testSpeaker() {
    if (testing) return
    setTesting(true)
    try {
      const ac = audioContext()
      if (!ac) return
      await ac.resume()
      const sink = (ac as AudioContext & { setSinkId?: (id: string) => Promise<void> }).setSinkId
      if (sink && speakerId) await sink.call(ac, speakerId === 'default' ? '' : speakerId).catch(() => {})
      ;[523.25, 659.25, 783.99].forEach((f, i) => {
        const o = ac.createOscillator()
        const g = ac.createGain()
        const t0 = ac.currentTime + i * 0.18
        o.frequency.value = f
        o.type = 'sine'
        g.gain.setValueAtTime(0, t0)
        g.gain.linearRampToValueAtTime(0.18, t0 + 0.02)
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5)
        o.connect(g).connect(ac.destination)
        o.start(t0)
        o.stop(t0 + 0.55)
      })
    } finally {
      setTimeout(() => setTesting(false), 800)
    }
  }

  const start = new Date(info.window.start)
  const startTime = start.toLocaleTimeString(info.uiLang === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
  const initial = (info.me.name || '?').trim().charAt(0).toUpperCase()

  return (
    <div className="lobby on" aria-label={t('joinLesson')}>
      <div className="lobbyTop">
        <div className="logo">
          eigo<b>.</b>io
        </div>
      </div>
      <div className="lcard">
        <div className={`lprev${mirror ? ' mirror' : ''}${noCam ? ' nocam' : ''}${denied ? ' denied' : ''}`}>
          {stream && <VideoView stream={stream} muted mirror={false} playsInline />}
          <div className="lnocam">
            <div className="avatar" style={{ background: '#dff5f2' }}>
              {initial}
            </div>
            <span>{noCamText}</span>
            <button className="lallow" onClick={() => window.location.reload()}>
              {t('allowCamMic')}
            </button>
          </div>
          <div className="lctl">
            <span style={{ width: 44 }} />
            <div className="mid">
              <button
                className={`lbtn${camOn ? ' on' : ' off'}`}
                title={t('camOnOff')}
                aria-pressed={camOn}
                onClick={() => actions.toggleCameraEnabled(!camOn)}
              >
                <Ico name={camOn ? 'cam' : 'camoff'} />
              </button>
              <button
                className={`lbtn${micOn ? ' on' : ' off'}`}
                title={t('micOnOff')}
                aria-pressed={micOn}
                onClick={() => actions.toggleMicrophoneEnabled(!micOn)}
              >
                <Ico name={micOn ? 'mic' : 'micoff'} />
                <i className="lvl" ref={lvlRef} />
              </button>
            </div>
            <span style={{ width: 44 }} />
          </div>
        </div>
        <div className="lbody">
          <div className="lhead">
            <b>{lessonTitle(info, t)}</b>
            <span>
              {info.lesson ? `${info.lesson.courseTitle} · ` : ''}
              {t('withName', { name: info.other.name })}
            </span>
          </div>
          <label className="dev">
            <Ico name="cam" />
            <select
              value={state.currentCameraDeviceId || ''}
              onChange={(e) => actions.setCameraDevice(e.target.value)}
              aria-label={t('camera')}
            >
              {state.cameraDevices.length ? (
                state.cameraDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `${t('camera')} ${i + 1}`}
                  </option>
                ))
              ) : (
                <option value="">{t('camera')}</option>
              )}
            </select>
            <Ico name="down" className="ico chev" />
          </label>
          <label className="dev">
            <Ico name="mic" />
            <select
              value={state.currentMicrophoneDeviceId || ''}
              onChange={(e) => actions.setMicrophoneDevice(e.target.value)}
              aria-label={t('microphone')}
            >
              {state.microphoneDevices.length ? (
                state.microphoneDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `${t('microphone')} ${i + 1}`}
                  </option>
                ))
              ) : (
                <option value="">{t('microphone')}</option>
              )}
            </select>
            <span className="mbars" ref={barsRef}>
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <Ico name="down" className="ico chev" />
          </label>
          <label className="dev">
            <Ico name="speaker" />
            {canPickSpeaker && state.speakerDevices.length ? (
              <select value={speakerId} onChange={(e) => setSpeakerId(e.target.value)} aria-label={t('defaultSpeaker')}>
                {state.speakerDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `${t('defaultSpeaker')} ${i + 1}`}
                  </option>
                ))}
              </select>
            ) : (
              <select disabled aria-label={t('systemSpeaker')}>
                <option>{t('systemSpeaker')}</option>
              </select>
            )}
            <button
              type="button"
              className="ltest"
              onClick={(e) => {
                e.preventDefault()
                testSpeaker()
              }}
            >
              {t('test')}
            </button>
            <Ico name="down" className="ico chev" />
          </label>
          <div className="lstatus">
            <span className="dot" />
            {t('startsAt', { time: startTime })}
          </div>
        </div>
        <div className="lfoot">
          <button className="ebtn" id="joinBtn" onClick={onJoin} disabled={joining}>
            {joining ? t('joining') : t('joinLesson')}
          </button>
        </div>
      </div>
    </div>
  )
}
