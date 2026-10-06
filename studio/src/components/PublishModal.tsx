import { useEffect, useState } from 'react'
import { validateCourse, type Course } from '@slides'
import { api, type StudioConfig } from '../api'
import { Modal } from '../ui/Modal'
import { IconDownload, IconSend } from '../ui/icons'

export function PublishModal({
  course,
  flush,
  onClose,
}: {
  course: Course
  flush: () => Promise<void>
  onClose: () => void
}) {
  const [config, setConfig] = useState<StudioConfig | null>(null)
  const [state, setState] = useState<'idle' | 'publishing' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const issues = validateCourse(course)
  const errors = issues.filter((i) => i.level === 'error')

  useEffect(() => {
    api.config().then(setConfig).catch(() => setConfig({ publishConfigured: false, publishTarget: null }))
  }, [])

  async function publish() {
    setState('publishing')
    try {
      await flush()
      const r = await api.publish(course.id)
      setState('done')
      setMessage(`Published at ${new Date(r.publishedAt).toLocaleString()}.`)
    } catch (e) {
      setState('error')
      setMessage((e as Error).message)
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(course, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${course.slug || course.id}.course.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <Modal
      title="Publish to eigo.io"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={exportJson}>
            <IconDownload size={15} /> Export JSON
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!config?.publishConfigured || errors.length > 0 || state === 'publishing'}
            onClick={publish}
          >
            <IconSend size={15} /> {state === 'publishing' ? 'Publishing…' : 'Publish'}
          </button>
        </>
      }
    >
      {config && !config.publishConfigured ? (
        <div className="notice">
          <strong>Publishing isn’t connected yet.</strong>
          <p>
            The eigo.io side (the endpoint that receives courses) is the next build step. Once it exists, add{' '}
            <code>EIGO_PUBLISH_URL</code> and <code>EIGO_PUBLISH_KEY</code> to <code>studio/.env.local</code> and restart the
            studio. Until then you can export the course as JSON.
          </p>
        </div>
      ) : config?.publishTarget ? (
        <p className="muted">
          Target: <code>{config.publishTarget}</code>
        </p>
      ) : null}

      <h3 className="issues-title">Checks</h3>
      {issues.length === 0 ? (
        <p className="ok">Everything looks good.</p>
      ) : (
        <ul className="issues">
          {issues.map((i, n) => (
            <li key={n} className={`issue issue-${i.level}`}>
              <span className="issue-level">{i.level === 'error' ? 'Error' : 'Warning'}</span>
              <span className="issue-where">{i.where}</span>
              <span>{i.message}</span>
            </li>
          ))}
        </ul>
      )}

      {state === 'done' ? <p className="ok">{message}</p> : null}
      {state === 'error' ? <p className="field-error">{message}</p> : null}
    </Modal>
  )
}
