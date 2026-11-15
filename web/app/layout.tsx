import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { EVENTS } from '@/lib/events';
import monitoringRecord from '../public/data/monitoring/status.json';
import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {default:'Doğa İzleme — Türkiye’nin değişen doğası',template:'%s · Doğa İzleme'},
  description:'Türkiye’deki önemli doğa olaylarını haritada keşfedin. Güncel Sentinel-2 gözlemleri, otomatik değişim adayları ve kaynakları açık olay incelemeleri.',
};
export const viewport: Viewport = {width:'device-width',initialScale:1,themeColor:'#163d30'};
const dataYears=[...new Set([...EVENTS.filter(event=>event.analysis.status==='available').map(event=>event.year),
  ...monitoringRecord.regions.flatMap(region=>[region.referenceObservationAt,region.latestObservationAt]).filter(Boolean).map(value=>Number(value!.slice(0,4)))])].sort().join(', ');
export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="tr"><body><a className="skip-link" href="#icerik">İçeriğe geç</a>
  <header className="site-header"><Link href="/" className="brand" aria-label="Doğa İzleme ana sayfa"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 25V9l10-5 10 5v16l-10-5z"/><path d="M16 4v16M6 9l10 5 10-5"/></svg><span>doğa<span className="brand-light">izleme</span><small>TÜRKİYE</small></span></Link>
   <nav aria-label="Ana gezinme"><Link href="/">Türkiye haritası</Link><Link href="/#olaylar">Olay arşivi</Link><Link href="/metodoloji/">Yöntem & kaynaklar</Link></nav>
   <span className="release"><i/> Açık doğa gözlemi</span>
  </header>
  <main id="icerik">{children}</main>
  <footer className="site-footer"><p>Açık veri. Açık yöntem. Ortak doğa.</p><span>Contains modified Copernicus Sentinel data ({dataYears}). Çekim tarihleri her analiz kaydında belirtilir. <Link href="/metodoloji/">Verinin sınırlarını okuyun ↗</Link></span></footer>
 </body></html>
}
