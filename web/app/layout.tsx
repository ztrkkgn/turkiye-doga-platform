import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {default:'Doğa İzleme — Türkiye’nin değişen doğası',template:'%s · Doğa İzleme'},
  description:'Türkiye’nin doğasındaki değişimi açık Sentinel-2 verileriyle inceleyin. Marmaris 2021 pilotu, gerçek görüntüler ve açık yöntemler.',
};
export const viewport: Viewport = {width:'device-width',initialScale:1,themeColor:'#163d30'};
export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="tr"><body><a className="skip-link" href="#icerik">İçeriğe geç</a>
  <header className="site-header"><Link href="/" className="brand" aria-label="Doğa İzleme ana sayfa"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 25V9l10-5 10 5v16l-10-5z"/><path d="M16 4v16M6 9l10 5 10-5"/></svg><span>doğa<span className="brand-light">izleme</span><small>TÜRKİYE</small></span></Link>
   <nav aria-label="Ana gezinme"><Link href="/">Harita</Link><Link href="/bolge/mugla-marmaris-2021/">Marmaris pilotu</Link><Link href="/metodoloji/">Yöntem & kaynaklar</Link></nav>
   <span className="release"><i/> İlk araştırma sürümü</span>
  </header>
  <main id="icerik">{children}</main>
  <footer className="site-footer"><p>Açık veri. Açık yöntem. Ortak doğa.</p><span>Contains modified Copernicus Sentinel data (2021). Earth Search üzerinden işlenmiştir. <Link href="/metodoloji/">Verinin sınırlarını okuyun ↗</Link></span></footer>
 </body></html>
}
