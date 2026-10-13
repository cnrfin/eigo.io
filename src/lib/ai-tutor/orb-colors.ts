/**
 * Colours for the AI tutor's avatar (a glass pebble), chosen by the student in AI tutor settings.
 * light = the top of the gradient inside the glass, deep = the bottom, accent = a second colour that
 * drifts through it. 0..1 RGB. Chosen by Connor from mockups/ai-orb-two-tone.html.
 */
export const ORB_COLORS = [
  { id: 'seaglass', ja: 'シーグラス', en: 'Sea glass', light: [0.82, 0.94, 0.89], deep: [0.3, 0.62, 0.54], accent: [0.56, 0.86, 0.84] },
  { id: 'sunset', ja: 'サンセット', en: 'Sunset', light: [0.99, 0.89, 0.93], deep: [0.82, 0.36, 0.52], accent: [0.96, 0.72, 0.25] },
  { id: 'glow', ja: 'グロウ', en: 'Glow', light: [0.99, 0.95, 0.82], deep: [0.85, 0.62, 0.2], accent: [0.88, 0.4, 0.58] },
  { id: 'cottoncandy', ja: 'コットンキャンディ', en: 'Cotton candy', light: [0.88, 0.89, 1], deep: [0.45, 0.5, 0.95], accent: [0.97, 0.58, 0.78] },
  { id: 'tropical', ja: 'トロピカル', en: 'Tropical', light: [1, 0.93, 0.76], deep: [0.98, 0.64, 0.2], accent: [0.95, 0.4, 0.36] },
  { id: 'champagne', ja: 'シャンパン', en: 'Champagne', light: [1, 0.93, 0.91], deep: [0.9, 0.6, 0.62], accent: [0.95, 0.8, 0.45] },
  { id: 'nebula', ja: 'ネビュラ', en: 'Nebula', light: [0.62, 0.64, 0.88], deep: [0.12, 0.13, 0.36], accent: [0.64, 0.36, 0.92] },
  { id: 'daydream', ja: 'デイドリーム', en: 'Daydream', light: [0.86, 0.94, 1], deep: [0.35, 0.62, 0.95], accent: [0.8, 0.66, 0.98] },
] as const
export type OrbColor = (typeof ORB_COLORS)[number]['id']
export type OrbPalette = (typeof ORB_COLORS)[number]
export const DEFAULT_ORB_COLOR: OrbColor = 'seaglass'

/** The first palette's ids, so settings saved before the two-tone colours keep a similar colour. */
const LEGACY: Record<string, OrbColor> = {
  sage: 'seaglass',
  ocean: 'daydream',
  lavender: 'cottoncandy',
  rose: 'sunset',
  peach: 'tropical',
  amber: 'glow',
  graphite: 'nebula',
}
export const orbColorId = (id: string | null | undefined): OrbColor =>
  ORB_COLORS.some((c) => c.id === id) ? (id as OrbColor) : (id && LEGACY[id]) || DEFAULT_ORB_COLOR
export const orbColor = (id: string | null | undefined): OrbPalette => ORB_COLORS.find((c) => c.id === orbColorId(id))!

const rgb = (c: readonly number[]) => `rgb(${c.map((v) => Math.round(v * 255)).join(',')})`
/** A flat CSS stand-in for a palette (settings swatches, and the avatar when WebGL is missing). */
export const orbSwatch = (p: OrbPalette) =>
  `radial-gradient(circle at 32% 28%, ${rgb(p.light)} 0, ${rgb(p.light)} 22%, transparent 58%), linear-gradient(150deg, ${rgb(p.accent)} 10%, ${rgb(p.deep)} 95%)`
