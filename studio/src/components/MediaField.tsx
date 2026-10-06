import { useEffect, useRef, useState } from 'react'
import { resolveAsset } from '@slides'
import { api, assetBaseFor, type CourseImage } from '../api'
import { IconUpload, IconX } from '../ui/icons'

const ACCEPT = {
  video: 'video/mp4,video/webm,video/quicktime',
  audio: 'audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg',
}
const isVideo = (src: string) => /\.(mp4|webm|mov)$/i.test(src)
const MB = 1024 * 1024
const fmtSize = (n: number) => (n >= MB ? `${(n / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
/** Above this a clip may stutter next to the video call. */
const WARN_SIZE = 2 * MB

/** Pick a video or audio clip for a course: upload (button or drop) or choose one already in the course. */
export function MediaField({
  courseId,
  kind,
  value,
  onChange,
  onPoster,
}: {
  courseId: string
  kind: 'video' | 'audio'
  value: string
  onChange: (src: string) => void
  /** A poster was made from the video's first frame. */
  onPoster?: (src: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [library, setLibrary] = useState<CourseImage[] | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState<CourseImage | null>(null)
  const [size, setSize] = useState<number | null>(null)
  const base = assetBaseFor(courseId)

  useEffect(() => {
    if (!showLibrary) return
    api
      .listMedia(courseId)
      .then((all) => setLibrary(all.filter((f) => (kind === 'video') === isVideo(f.src))))
      .catch((e: Error) => setError(e.message))
  }, [showLibrary, courseId, kind])

  // Size of the current clip, for the warning.
  useEffect(() => {
    setSize(null)
    if (!value) return
    let live = true
    api
      .listMedia(courseId)
      .then((all) => live && setSize(all.find((f) => f.src === value)?.size ?? null))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [courseId, value])

  async function upload(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.uploadImage(courseId, file)
      setResult(res)
      onChange(res.src)
      if (res.poster) onPoster?.(res.poster)
      setShowLibrary(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="image-field media-field">
      <div
        className={`image-drop media-drop${dragOver ? ' is-over' : ''}`}
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
          kind === 'video' ? (
            <video src={resolveAsset(value, base)} controls muted playsInline />
          ) : (
            <div className="media-audio-preview">
              <audio src={resolveAsset(value, base)} controls />
            </div>
          )
        ) : (
          <div className="image-drop-empty">
            <span>{busy ? 'Uploading and compressing…' : kind === 'video' ? 'Drop a video here (MP4, WebM or MOV)' : 'Drop an audio clip here (MP3, M4A, WAV or OGG)'}</span>
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
        accept={ACCEPT[kind]}
        hidden
        onChange={(e) => {
          void upload(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {busy && value ? <div className="muted small">Uploading and compressing…</div> : null}
      {result && !busy ? (
        <div className="muted small media-result">
          {result.compressed && result.originalSize
            ? `Compressed ${fmtSize(result.originalSize)} → ${fmtSize(result.size)}${result.poster ? ', poster added' : ''}.`
            : null}
          {result.note ? ` ${result.note}` : null}
        </div>
      ) : null}
      {size != null && size > WARN_SIZE && !busy ? (
        <div className="field-error">This clip is {fmtSize(size)}. Over 2 MB it may stutter next to the video call. Upload it again to compress it.</div>
      ) : null}
      {error ? <div className="field-error">{error}</div> : null}
      {showLibrary ? (
        <div className="media-library">
          {library === null ? (
            <div className="muted small">Loading…</div>
          ) : library.length === 0 ? (
            <div className="muted small">No {kind} clips in this course yet.</div>
          ) : (
            library.map((f) => (
              <button
                key={f.name}
                type="button"
                className={`media-library-item${f.src === value ? ' is-active' : ''}`}
                onClick={() => {
                  onChange(f.src)
                  setShowLibrary(false)
                }}
              >
                {f.name} <span className="muted">· {fmtSize(f.size)}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
