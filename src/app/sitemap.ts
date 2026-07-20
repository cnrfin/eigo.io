import type { MetadataRoute } from 'next'
import { getPublishedWords, publishedSoundGuides } from '@/lib/pronunciation/words'

const BASE = 'https://eigo.io'

// Public marketing pages. Japanese at the root, English under /en. Each entry
// emits both language URLs with hreflang alternates so search engines index the
// pair together.
const PAGES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/plans', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
]

const enPath = (path: string) => (path === '/' ? '/en' : `/en${path}`)

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const bilingual = PAGES.flatMap(({ path, changeFrequency, priority }) => {
    const languages = { ja: `${BASE}${path}`, en: `${BASE}${enPath(path)}` }
    return [
      { url: `${BASE}${path}`, lastModified: now, changeFrequency, priority, alternates: { languages } },
      { url: `${BASE}${enPath(path)}`, lastModified: now, changeFrequency, priority: priority * 0.9, alternates: { languages } },
    ]
  })

  // Japanese-only programmatic pronunciation pages (no English counterpart, so
  // no hreflang alternates). Index page + one page per seeded word.
  const pronunciation: MetadataRoute.Sitemap = [
    { url: `${BASE}/pronunciation`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    // Sound-guide hubs target the higher-volume "sound" queries — priority above words.
    ...publishedSoundGuides().map((g) => ({
      url: `${BASE}/pronunciation/sounds/${g.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...getPublishedWords().map((w) => ({
      url: `${BASE}/pronunciation/${w.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ]

  return [...bilingual, ...pronunciation]
}
