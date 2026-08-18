// Map a language code (BCP-47-ish, e.g. 'ja', 'en', 'zh-TW') to an English name for use
// in prompts ("natural {name} translations"). eigo-web's preferred_language is only ja/en;
// CUPS's native_language may be broader. Unknown codes fall back to Japanese (the base market).
const LANGUAGE_NAMES: Record<string, string> = {
  ja: 'Japanese',
  en: 'English',
  zh: 'Chinese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  it: 'Italian',
  ru: 'Russian',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
  hi: 'Hindi',
  ar: 'Arabic',
  tr: 'Turkish',
  pl: 'Polish',
  nl: 'Dutch',
  tl: 'Tagalog',
}

/** English display name for a language code, for prompt text. Falls back to Japanese. */
export function languageName(code: string | null | undefined): string {
  const base = String(code || '').trim().toLowerCase().split(/[-_]/)[0]
  return LANGUAGE_NAMES[base] || 'Japanese'
}
