/**
 * Short, friendly articulation reminders per target sound, shared by the
 * shadowing grids and the graded challenge. Keyed by the content `targetSound`
 * code; bilingual.
 */
export const SOUND_NAME: Record<string, string> = {
  r: 'R', l: 'L', th: 'TH', dh: 'TH', s: 'S', z: 'Z', sh: 'SH', v: 'V', b: 'B', f: 'F', h: 'H',
  // Vowels
  ee: 'Long "ee"', ih: 'Short "i"', oo: 'Long "oo"', uh: 'Short "oo"',
  ae: 'The "a" in cat', ah: 'The "u" in cut', eh: 'The "e" in bed', er: 'The "er" in work', aw: 'The "aw" in walk',
}

export const CUE: Record<string, { en: string; ja: string }> = {
  r: { en: 'Pull your tongue back so it touches nothing, and round your lips.', ja: '舌を奥に引いてどこにも触れさせず、唇を丸めます。' },
  l: { en: 'Touch your tongue tip to the ridge behind your top teeth and hold.', ja: '舌先を上の歯ぐきのふくらみに当てて保ちます。' },
  th: { en: 'Let your tongue tip peek out between your teeth.', ja: '舌先を歯のあいだから少しのぞかせます。' },
  s: { en: 'Keep your tongue inside, behind your teeth, for a thin hiss.', ja: '舌は歯の内側にとどめ、細い「スー」を出します。' },
  sh: { en: 'Round your lips and pull your tongue back.', ja: '唇を丸めて、舌を奥に引きます。' },
  v: { en: 'Rest your top teeth on your lower lip and let it buzz.', ja: '上の歯を下くちびるにのせて、震わせます。' },
  b: { en: 'Press both lips together, then pop them open.', ja: '上下のくちびるを合わせて、ぱっと開きます。' },
  f: { en: 'Top teeth on your lower lip, just air, no voice.', ja: '上の歯を下くちびるに当て、声を出さず息だけ。' },
  h: { en: 'Open your mouth and breathe out gently, no teeth.', ja: '口を開けて、歯を使わずやさしく息を出します。' },
  // Vowels
  ee: { en: 'Smile, tongue high and tense, and hold it long.', ja: '口を横に引いて、舌を高く張り、長めにのばします。' },
  ih: { en: 'Relax your mouth, tongue a touch lower, and keep it short.', ja: '口の力を抜き、舌を少し下げて、短く切ります。' },
  oo: { en: 'Round your lips tight, push them forward, and hold it long.', ja: '唇をしっかり丸めて前に突き出し、長くのばします。' },
  uh: { en: 'Relax your lips, barely rounded, and keep it short.', ja: '唇の力を抜き、軽く丸めて、短く出します。' },
  ae: { en: 'Open wide and spread your lips for a flat "a".', ja: '口を大きく開けて横に広げ、平たい「ア」を出します。' },
  ah: { en: 'Relax, mouth half open, a short central "uh".', ja: '力を抜いて口を半分開け、短い「ア」を出します。' },
  eh: { en: 'Open a little, lips slightly spread, like "e" in red.', ja: '口を少し開けて軽く横に引く、「エ」の音です。' },
  er: { en: 'Mouth relaxed and central, holding a long, even sound.', ja: '口を中ほどでリラックスさせ、長く一定にのばします。' },
  aw: { en: 'Round your lips, tongue back, jaw open, like a long "aw".', ja: '唇を丸めて舌を奥に引き、あごを開けて、長い「オー」。' },
}
