/**
 * Saving animations (design: mockups/ai-panel.html).
 *
 * flashSaved: the word-bank button flashes white with a quick squash (wide, then tall) and settles back.
 * shrinkInto: a card shrinks into a target (the word-bank button, or the new row in the open word list)
 * as one piece: a copy of the card, drawn inside the same container so its colours don't change, with its
 * own animations off; its contents fade early so it reads as a shape morphing into the target.
 * Both do nothing with "reduce motion" on (shrinkInto just calls onDone).
 */

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function flashSaved(el: HTMLElement | null) {
  if (!el || reduced() || !el.animate) return
  const bg = getComputedStyle(el).backgroundColor
  const fg = getComputedStyle(el).color
  el.animate(
    [
      { transform: 'scale(1, 1)', background: bg, color: fg },
      { transform: 'scale(1.22, .8)', background: '#fff', color: '#000', offset: 0.3 },
      { transform: 'scale(.9, 1.12)', offset: 0.6 },
      { transform: 'scale(1, 1)', background: bg, color: fg },
    ],
    { duration: 420, easing: 'cubic-bezier(.3, 1.4, .5, 1)' },
  )
}

/** A row that has just arrived in a list: one white-to-accent flash. */
export function flashRow(el: HTMLElement | null, accent = 'var(--accent-bg)') {
  if (!el || reduced() || !el.animate) return
  el.animate([{ background: '#fff' }, { background: accent, offset: 0.35 }, { background: 'transparent' }], { duration: 900, easing: 'ease-out' })
}

export function shrinkInto(card: HTMLElement, target: HTMLElement | DOMRect, opts: { radius?: number; onDone?: () => void } = {}) {
  const done = () => opts.onDone?.()
  const host = card.parentElement
  if (reduced() || !card.animate || !host) return done()
  const r = card.getBoundingClientRect()
  const t = target instanceof HTMLElement ? target.getBoundingClientRect() : target
  if (!r.width || !r.height || !t.width || !t.height) return done()
  const ghost = card.cloneNode(true) as HTMLElement
  ghost.removeAttribute('id')
  ghost.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'))
  ghost.setAttribute('aria-hidden', 'true')
  const cs = getComputedStyle(card)
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${r.left}px`,
    top: `${r.top}px`,
    right: 'auto',
    bottom: 'auto',
    width: `${r.width}px`,
    height: `${r.height}px`,
    margin: '0',
    transform: 'none',
    transformOrigin: '0 0',
    animation: 'none',
    pointerEvents: 'none',
    zIndex: '100',
    overflow: 'hidden',
    boxSizing: 'border-box',
    background: cs.backgroundColor,
  })
  ghost.querySelectorAll<HTMLElement>('*').forEach((x) => {
    x.style.animation = 'none'
    x.style.transition = 'none'
  })
  // same container: same colour variables, so nothing changes colour on the way
  host.appendChild(ghost)
  card.style.visibility = 'hidden'
  const sx = t.width / r.width
  const sy = t.height / r.height
  const rad = opts.radius ?? 10
  const D = 520
  ghost.animate(
    [
      { transform: 'translate(0, 0) scale(1, 1)', borderRadius: cs.borderRadius || '20px' },
      { transform: `translate(${t.left - r.left}px, ${t.top - r.top}px) scale(${sx}, ${sy})`, borderRadius: `${rad / sx}px / ${rad / sy}px` },
    ],
    { duration: D, easing: 'cubic-bezier(.5, 0, .2, 1)', fill: 'forwards' },
  )
  for (const c of Array.from(ghost.children)) (c as HTMLElement).animate([{ opacity: 1 }, { opacity: 0 }], { duration: D * 0.45, easing: 'ease-out', fill: 'forwards' })
  if (target instanceof HTMLElement)
    ghost.animate([{ background: cs.backgroundColor }, { background: getComputedStyle(target).backgroundColor }], { duration: D, easing: 'ease-in', fill: 'forwards' })
  window.setTimeout(() => {
    ghost.remove()
    done()
  }, D)
}
