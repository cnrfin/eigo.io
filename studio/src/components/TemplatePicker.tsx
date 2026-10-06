import { useMemo } from 'react'
import { SlideRenderer, TEMPLATES, createSlide } from '@slides'
import { Modal } from '../ui/Modal'

export function TemplatePicker({ onPick, onClose }: { onPick: (templateId: string) => void; onClose: () => void }) {
  // Build one preview slide per template (stable for the modal's lifetime).
  const previews = useMemo(() => TEMPLATES.map((t) => ({ t, slide: createSlide(t.id) })), [])
  return (
    <Modal title="Add a slide" onClose={onClose} wide>
      <div className="template-grid">
        {previews.map(({ t, slide }) => (
          <button key={t.id} type="button" className="template-card" onClick={() => onPick(t.id)}>
            <div className="template-preview">
              <SlideRenderer slide={slide} mode="editor" />
            </div>
            <div className="template-name">{t.name}</div>
            <div className="template-desc">{t.description}</div>
          </button>
        ))}
      </div>
    </Modal>
  )
}
