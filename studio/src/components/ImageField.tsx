import { useEffect, useRef, useState } from 'react'
import { resolveAsset } from '@slides'
import { api, assetBaseFor, type CourseImage } from '../api'
import { IconImage, IconUpload, IconX } from '../ui/icons'

/** Pick an image for a course: upload (button or drop) or choose from the course library. */
export function ImageField({
  courseId,
  value,
  onChange,
  compact,
}: {
  courseId: string
  value: string
  onChange: (src: string) => void
  /** Small circular preview (for character avatars). */
  compact?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [library, setLibrary] = useState<CourseImage[] | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (!showLibrary) return
    api.listImages(courseId).then(setLibrary).catch((e: Error) => setError(e.message))
  }, [showLibrary, courseId])

  async function upload(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const img = await api.uploadImage(courseId, file)
      onChange(img.src)
      setShowLibrary(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const base = assetBaseFor(courseId)

  return (
    <div className={`image-field${compact ? ' is-compact' : ''}`}>
      <div
        className={`image-drop${dragOver ? ' is-over' : ''}`}
        onClick={compact ? () => fileRef.current?.click() : undefined}
        title={compact ? 'Click or drop an image' : undefined}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          void upload(e.dataTransfer.files[0])
        }}
      >
        {value ? (
          <img src={resolveAsset(value, base)} alt="" />
        ) : (
          <div className="image-drop-empty">
            <IconImage size={compact ? 18 : 22} />
            {compact ? null : <span>{busy ? 'Uploading…' : 'Drop an image here'}</span>}
          </div>
        )}
      </div>
      <div className="row gap-6">
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          <IconUpload size={14} /> Upload
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setShowLibrary((v) => !v)}>
          Library
        </button>
        {value ? (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange('')}>
            <IconX size={14} /> Remove
          </button>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml"
        hidden
        onChange={(e) => {
          void upload(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {error ? <div className="field-error">{error}</div> : null}
      {showLibrary ? (
        <div className="library">
          {library === null ? (
            <div className="muted small">Loading…</div>
          ) : library.length === 0 ? (
            <div className="muted small">No images in this course yet.</div>
          ) : (
            library.map((img) => (
              <button
                key={img.name}
                type="button"
                className={`library-item${img.src === value ? ' is-active' : ''}`}
                title={img.name}
                onClick={() => {
                  onChange(img.src)
                  setShowLibrary(false)
                }}
              >
                <img src={resolveAsset(img.src, base)} alt={img.name} loading="lazy" />
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
