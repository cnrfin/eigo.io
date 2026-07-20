import SquircleBox from '@/components/ui/SquircleBox'

/* Two-app download CTA shared by the word pages and the sound-guide hubs:
   eigo.io (lessons + courses with a real teacher) and SayAfterMe (shadowing). */
const APPS = [
  { icon: '/eigoio.png', name: 'eigo.io', desc: 'イギリス人講師のレッスンとコースで、発音を実践的に上達させましょう。', href: 'https://apps.apple.com/jp/app/eigo-io/id6761731252' },
  { icon: '/sayafterme.png', name: 'SayAfterMe', desc: 'お手本の音声をシャドーイングして、発音とリズムを自然に身につけるアプリ。', href: 'https://apps.apple.com/jp/app/sayafterme/id6765954089' },
]

export default function AppCta() {
  return (
    <section>
      <h2 style={{ margin: '0 0 6px', fontSize: 'clamp(22px,3vw,28px)', fontWeight: 500, letterSpacing: '-.01em' }}>アプリで発音を練習しよう</h2>
      <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 15 }}>
        録音してその場でフィードバックを受けたり、お手本をまねたり。iPhone アプリで発音練習を続けられます。
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {APPS.map((app) => (
          <SquircleBox key={app.name} cornerRadius={22} style={{ padding: 28, textAlign: 'center', background: 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={app.icon} alt={app.name} width={64} height={64} style={{ borderRadius: 15, display: 'block', margin: '0 auto' }} />
            <div style={{ fontSize: 19, fontWeight: 700, marginTop: 12 }}>{app.name}</div>
            <p style={{ margin: '6px auto 28px', maxWidth: 280, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{app.desc}</p>
            <a href={app.href} target="_blank" rel="noopener noreferrer" className="lp-press" aria-label={`${app.name} を App Store でダウンロード`} style={{ display: 'inline-block', marginTop: 'auto' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="asb-black" src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/ja-jp?size=250x83" alt="App Store でダウンロード" style={{ height: 44, width: 'auto' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="asb-white" src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/white/ja-jp?size=250x83" alt="App Store でダウンロード" style={{ height: 44, width: 'auto' }} />
            </a>
          </SquircleBox>
        ))}
      </div>
    </section>
  )
}
