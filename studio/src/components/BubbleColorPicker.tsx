import { BUBBLE_COLORS } from '@slides'

/** Pick a character's speech-bubble colour from the brand set. */
export function BubbleColorPicker({ value, onChange }: { value: number; onChange: (color: number) => void }) {
  return (
    <div className="bubble-colors" role="radiogroup" aria-label="Bubble colour">
      {BUBBLE_COLORS.map((c, i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          title={c.label}
          className={`bubble-swatch${value === i ? ' is-on' : ''}`}
          style={{ background: c.bg, color: c.fg }}
          onClick={() => onChange(i)}
        >
          Aa
        </button>
      ))}
    </div>
  )
}
