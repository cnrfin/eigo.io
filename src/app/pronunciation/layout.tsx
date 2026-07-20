import Link from 'next/link'
import Footer from '@/components/Footer'
import PronHeader from './PronHeader'

/* Shared chrome for the whole pronunciation guide: the dedicated header, a
   discount announcement bar beneath it, and the site footer — all on the
   landing's page background so the guide feels of a piece with the home page. */
export default function PronunciationLayout({ children }: { children: React.ReactNode }) {
  return (
    // `.jp` gives the whole guide the Japanese font stack + palt metrics (which
    // cascade), so JA text wraps at natural phrase boundaries like the rest of
    // the site instead of falling back to Latin-font breaking.
    <div className="jp" style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      {/* Announcement bar — 1-to-1 lesson discount. Sits above the header at the
          very top; the sticky header rises over it as you scroll down. */}
      <Link
        href="/plans"
        className="pron-announce"
        style={{ display: 'block', textDecoration: 'none', textAlign: 'center', fontSize: 14, fontWeight: 700, padding: '10px 16px', lineHeight: 1.5 }}
      >
        🇬🇧 まずは15分の無料体験から。今なら割引価格ではじめられます
        {/* Chevron rather than an arrow glyph: it renders identically on every
            platform and sits on the text baseline instead of the CJK em box. */}
        <svg
          width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          style={{ display: 'inline-block', verticalAlign: '-2px', marginLeft: 5 }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>

      <PronHeader />

      {children}

      <Footer />
    </div>
  )
}
