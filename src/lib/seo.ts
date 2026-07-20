import type { Metadata } from 'next'

type Locale = 'ja' | 'en'

/* Canonical + hreflang alternates for a public marketing page. `jaPath` is the
   Japanese (root) path, e.g. '/plans'; the English URL is '/en' + path. The
   canonical points at the current locale's own URL, and `languages` emits the
   hreflang links (x-default -> Japanese). metadataBase in the root layout makes
   these relative paths resolve to https://eigo.io. */
export function localizedAlternates(jaPath: string, locale: Locale): Metadata['alternates'] {
  const enPath = jaPath === '/' ? '/en' : `/en${jaPath}`
  return {
    canonical: locale === 'en' ? enPath : jaPath,
    languages: {
      ja: jaPath,
      en: enPath,
      'x-default': jaPath,
    },
  }
}

/* Full per-language metadata for a public page: localized title/description,
   canonical + hreflang, and matching Open Graph / Twitter cards. */
export function localizedMetadata(opts: { jaPath: string; locale: Locale; title: string; description: string }): Metadata {
  const { jaPath, locale, title, description } = opts
  return {
    title: { absolute: title },
    description,
    alternates: localizedAlternates(jaPath, locale),
    openGraph: {
      title,
      description,
      siteName: 'Eigo.io',
      type: 'website',
      locale: locale === 'en' ? 'en_GB' : 'ja_JP',
      images: ['/OG.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/OG.png'],
    },
  }
}
