/**
 * Colours for the AI tutor's glass orb (chosen by the student in AI tutor settings).
 * light = the top of the gradient inside the glass, deep = the bottom. 0..1 RGB.
 */
export const ORB_COLORS = [
  { id: 'sage', ja: 'セージ', en: 'Sage', light: [0.82, 0.94, 0.89], deep: [0.3, 0.62, 0.54] },
  { id: 'ocean', ja: 'オーシャン', en: 'Ocean', light: [0.84, 0.91, 0.99], deep: [0.25, 0.45, 0.85] },
  { id: 'lavender', ja: 'ラベンダー', en: 'Lavender', light: [0.91, 0.89, 0.99], deep: [0.5, 0.42, 0.85] },
  { id: 'rose', ja: 'ローズ', en: 'Rose', light: [0.99, 0.89, 0.93], deep: [0.82, 0.36, 0.52] },
  { id: 'peach', ja: 'ピーチ', en: 'Peach', light: [0.99, 0.91, 0.86], deep: [0.9, 0.48, 0.36] },
  { id: 'amber', ja: 'アンバー', en: 'Amber', light: [0.99, 0.95, 0.82], deep: [0.85, 0.62, 0.2] },
  { id: 'graphite', ja: 'グラファイト', en: 'Graphite', light: [0.92, 0.93, 0.94], deep: [0.35, 0.38, 0.42] },
] as const
export type OrbColor = (typeof ORB_COLORS)[number]['id']
export const DEFAULT_ORB_COLOR: OrbColor = 'sage'
export const orbColor = (id: string | null | undefined) => ORB_COLORS.find((c) => c.id === id) ?? ORB_COLORS[0]
