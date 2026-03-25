export default function JsonLd() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'Eigo.io',
    url: 'https://eigo.io',
    description:
      'Private online English lessons with a native UK tutor. 1-on-1 conversation practice for Japanese learners.',
    founder: {
      '@type': 'Person',
      name: 'Connor Finley',
      jobTitle: 'English Teacher',
      nationality: { '@type': 'Country', name: 'United Kingdom' },
    },
    areaServed: {
      '@type': 'Country',
      name: 'Japan',
    },
    availableLanguage: [
      { '@type': 'Language', name: 'English' },
      { '@type': 'Language', name: 'Japanese' },
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'connor@eigo.io',
      contactType: 'customer support',
      availableLanguage: ['English', 'Japanese'],
    },
    sameAs: ['https://www.instagram.com/eigo.io'],
    offers: {
      '@type': 'Offer',
      category: 'Online English Lessons',
      priceCurrency: 'JPY',
      availability: 'https://schema.org/InStock',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
