export default function JsonLd() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': 'https://eigo.io/#organization',
    name: 'Eigo.io',
    url: 'https://eigo.io',
    logo: 'https://eigo.io/icon-512.png',
    image: 'https://eigo.io/OG.png',
    description:
      'Private online English lessons with a native UK tutor. 1-on-1 conversation practice for Japanese learners.',
    slogan: 'Everything you need to speak English',
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
    knowsLanguage: ['en', 'ja'],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'connor@eigo.io',
      contactType: 'customer support',
      availableLanguage: ['English', 'Japanese'],
    },
    sameAs: [
      'https://www.instagram.com/eigo.io',
      'https://apps.apple.com/gb/app/eigo-io/id6761731252',
    ],
    // Real plans from /plans (JPY, monthly). The free 15-minute trial is listed
    // first so it can surface as the entry offer.
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Plans',
      itemListElement: [
        {
          '@type': 'Offer',
          name: 'Free trial lesson',
          description: 'A free 15-minute trial lesson, no subscription needed.',
          price: 0,
          priceCurrency: 'JPY',
          availability: 'https://schema.org/InStock',
        },
        {
          '@type': 'Offer',
          name: 'Student Lite',
          description: '30 minutes of lessons per week (about 2 hours a month).',
          price: 10000,
          priceCurrency: 'JPY',
          availability: 'https://schema.org/InStock',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: 10000,
            priceCurrency: 'JPY',
            unitText: 'MONTH',
          },
        },
        {
          '@type': 'Offer',
          name: 'Student Standard',
          description: '60 minutes of lessons per week (about 4 hours a month).',
          price: 20000,
          priceCurrency: 'JPY',
          availability: 'https://schema.org/InStock',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: 20000,
            priceCurrency: 'JPY',
            unitText: 'MONTH',
          },
        },
        {
          '@type': 'Offer',
          name: 'Exam Pass',
          description: 'Unlimited full mock exams (TOEIC, IELTS, EIKEN, Versant) plus every prep course.',
          price: 2980,
          priceCurrency: 'JPY',
          availability: 'https://schema.org/InStock',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: 2980,
            priceCurrency: 'JPY',
            unitText: 'MONTH',
          },
        },
      ],
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
