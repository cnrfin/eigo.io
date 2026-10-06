'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChatMsg } from '@/lib/classroom/client'
import type { ClassroomT } from '@/lib/classroom/i18n'
import { Ico } from './Icons'

/**
 * Lesson chat (right-hand panel). Messages are stored by author (teacher /
 * student) so both sides render them correctly; the teacher's bubbles are
 * peach. Enter sends, Shift+Enter makes a new line, and Japanese IME
 * composition never sends by accident.
 * (Attachments and translation come in later steps.)
 */
export default function ChatPanel({
  t,
  role,
  otherName,
  messages,
  startedLabel,
  onSend,
  onClose,
}: {
  t: ClassroomT
  role: 'teacher' | 'student'
  otherName: string
  messages: ChatMsg[]
  startedLabel: string | null
  onSend: (text: string) => Promise<boolean>
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const box = useRef<HTMLDivElement | null>(null)
  const ta = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (box.current) box.current.scrollTop = 1e6
  }, [messages.length])

  const grow = () => {
    const el = ta.current
    if (!el) return
    el.style.height = '42px'
    el.style.height = Math.min(132, el.scrollHeight) + 'px'
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    const v = text.trim()
    if (!v || sending) return
    setSending(true)
    const ok = await onSend(v)
    setSending(false)
    if (ok) {
      setText('')
      requestAnimationFrame(grow)
    }
  }

  return (
    <div className="chatIn">
      <div className="chatCard">
        <header>
          <h3>{t('chatTitle')}</h3>
          <button className="ib" title={t('closeChat')} aria-label={t('closeChat')} onClick={onClose}>
            <Ico name="x" style={{ width: 18, height: 18 }} />
          </button>
        </header>
        <div className="msgs" ref={box}>
          {startedLabel && <div className="sys">{startedLabel}</div>}
          {messages.map((m) => {
            const mine = m.from === role
            return (
              <div key={m.id} className={`msg ${mine ? 'me' : 'them'} ${m.from}`}>
                <span className="meta">{mine ? t('youShort') : otherName}</span>
                <div className="mrow">
                  <div className="b" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {m.file ? `📎 ${m.file.name}` : m.text}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <form className="compose" onSubmit={submit}>
          <div className="field">
            <textarea
              ref={ta}
              rows={1}
              value={text}
              placeholder={t('messagePlaceholder', { name: otherName })}
              onChange={(e) => {
                setText(e.target.value)
                grow()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault()
                  submit()
                }
              }}
            />
            <button className={`fbtn send${text.trim() ? ' ready' : ''}`} title={t('send')} aria-label={t('send')} disabled={sending}>
              <Ico name="send" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
