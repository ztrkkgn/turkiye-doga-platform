'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Comparison } from './comparison';
import { date, number, percent, validSummary, type Summary } from '@/lib/data';
import { categoryLabel, eventDateLabel, type NatureEvent } from '@/lib/events';
const PilotMap = dynamic(()=>import('./pilot-map').then(m=>m.PilotMap),{ssr:false,loading:()=> <div className="map-shell map-loading">Harita hazırlanıyor…</div>});
export function PilotViewer({detail=true,summaryUrl,event}:{detail?:boolean;summaryUrl:string;event:NatureEvent}) {
 const [data,setData]=useState<Summary|null>(null); const [error,setError]=useState('');
 useEffect(()=>{setData(null);setError('');const controller=new AbortController();fetch(summaryUrl,{signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error('unavailable');const s:unknown=await r.json();if(!validSummary(s,summaryUrl.slice(0,summaryUrl.lastIndexOf('/')+1))||s.id!==event.id)throw new Error('invalid');setData(s)}).catch(e=>{if(e.name!=='AbortError')setError(e.message==='invalid'?'Analiz dosyası veri doğrulama kontrolünden geçmedi. Kontroller tamamlanana kadar sonuçlar gösterilmiyor.':'Doğrulanmış analiz dosyası henüz yüklenemedi. Veri üretimi tamamlandığında bu sayfa yalnızca gerçek sonuçları gösterecek.')});return()=>controller.abort()},[summaryUrl,event.id]);
 const before=data?.periods.find(p=>p.id==='before')?.observation; const after=data?.periods.find(p=>p.id==='after')?.observation; const fire=data?.comparisons.fire;
 return <>
 <section className="intro"><div><Link className="text-link" href="/#olaylar">← Türkiye’deki olaylar</Link><h1>{event.title}</h1></div><div className="intro-note"><p>{event.location}<br/>{event.province} · {eventDateLabel(event)}</p><span>{event.summary}</span></div></section>
 <section className="explorer" aria-label="Pilot harita ve bölge özeti">
  <aside className="pilot-panel"><span className="eyebrow">01 / UYDU ANALİZİ</span><div className="pilot-title"><h2>{event.title.split(' · ')[0]}</h2><span>{data?.name || event.location} · {event.province}</span></div><div className="event-tag"><i/> {event.year} · {categoryLabel(event.category)}</div><p className="pilot-description">{event.summary}</p>
   <div className="scope-note"><span>ARAŞTIRMA NOTU</span><p>Bu alan bir inceleme kesitidir. Yangının kesin sınırını veya Türkiye genelindeki durumu temsil etmez.</p></div>
   <dl className="pilot-meta"><div><dt>Veri kaynağı</dt><dd>Sentinel-2 L2A</dd></div><div><dt>Analiz çözünürlüğü</dt><dd>{data?`${data.grid.resolutionM} metre`:'—'}</dd></div><div><dt>İncelenen alan</dt><dd>{data?`${number(data.areaKm2,1)} km²`:'—'}</dd></div><div><dt>Analiz durumu</dt><dd>Ön inceleme</dd></div></dl>
   <a className="primary-link" href="#gozlem">Gözlemleri incele <span>↓</span></a>{!detail&&<Link className="subtle-link" href={`/bolge/${event.slug}/`}>Bölgenin kalıcı bağlantısı ↗</Link>}
  </aside>{data?<PilotMap data={data} detail={detail}/>:<div className="map-shell map-loading"><p role={error?'alert':'status'}>{error||'Gerçek analiz çıktısı yükleniyor…'}</p></div>}
 </section>
 <div className="coverage-strip"><span><i/> {event.year} · {event.province}</span><p>Türkiye’nin tamamı henüz analiz edilmedi. İyileşme zaman serileri sonraki analiz aşamasında eklenecek.</p><Link href="/metodoloji/">Nasıl ölçüyoruz? ↗</Link></div>
 <div className="content-width" id="gozlem">
 {before&&after?<Comparison before={before} after={after}/>:<section className="empty-state"><h2>Uydu karşılaştırması</h2><p>{error||'Karşılaştırma için doğrulanmış görüntüler bekleniyor.'}</p></section>}
 <section className="findings-section" aria-labelledby="findings-title"><div className="section-top"><div><span className="eyebrow">03 / ÖLÇÜLEN DEĞİŞİM</span><h2 id="findings-title">Görüntüden ölçüme.</h2></div><Link className="text-link" href="/metodoloji/">İndeksleri anlamak ↗</Link></div>
 {fire?<><div className="metrics"><article><span>NDVI farkı</span><strong className="loss-value">{fire.ndviDeltaMean>0?'+':''}{number(fire.ndviDeltaMean,3)}</strong><p>Sonra − önce. Ortak geçerli piksellerde bitki örtüsü indeksinin ortalama değişimi.</p></article><article><span>Ortalama dNBR</span><strong>{number(fire.dnbrMean,3)}</strong><p>Önce − sonra. Yangın dönemindeki spektral değişim; doğrudan hasar yüzdesi değildir.</p></article><article><span>Ortak geçerli alan</span><strong>{percent(fire.commonValidFraction)}</strong><p>Her iki tarihte de bulut ve geçersiz piksel kontrollerini geçen çalışma alanı payı.</p></article></div><div className="interpretation"><span aria-hidden="true">↳</span><p>Bu iki gözlem arasındaki fark, yangınla birlikte mevsim, nem ve arazi örtüsünden de etkilenebilir. NDVI; ağaç sayısını, biyoçeşitliliği veya ormanın tamamen iyileşmesini ölçmez.</p></div></>:<p className="empty-state">Karşılaştırmalı metrik henüz yayımlanmadı.</p>}
 <div className="recovery-note"><div><span className="eyebrow">YANGIN SONRASI / İYİLEŞME TAKİBİ</span><h3>Zaman serisi hazırlanacak.</h3></div><p>Bu ilk sürümde yıllık iyileşme analizi işlenmedi. Eksik yıllar için değer veya toparlanma oranı gösterilmiyor.</p></div>
 </section>
 {data&&<section className="provenance-section" aria-labelledby="provenance-title"><div className="section-top"><div><span className="eyebrow">04 / VERİNİN KAYDI</span><h2 id="provenance-title">Her sonucun bir kaynağı var.</h2></div><a className="text-link" href={summaryUrl} download>Analiz kaydını indir ↓</a></div>
 <div className="observations">{data.periods.map(p=><article key={p.id}><span className="eyebrow">{p.label}</span>{p.status==='available'&&p.observation?<><h3>{date(p.observation.datetime)}</h3><dl><div><dt>Çekim saati (UTC)</dt><dd>{new Date(p.observation.datetime).toISOString().slice(11,19)}</dd></div><div><dt>Geçerli alan</dt><dd>{percent(p.observation.validFraction)}</dd></div><div><dt>Tüm karo bulutluluğu</dt><dd>{number(p.observation.cloudCover,2)}%</dd></div><div><dt>İşleme baseline</dt><dd>{p.observation.baseline}</dd></div></dl><details><summary>Ürün kimliklerini göster</summary><p className="product-id">{p.observation.itemId}</p><p className="product-id">{p.observation.productId}</p></details></>:<p>{p.reason||'Yeterli gözlem yok.'}</p>}</article>)}</div>
 <div className="provenance-bottom"><div><h3>Sınırlar ve belirsizlikler</h3><ul>{data.limitations.map((l,i)=><li key={i}>{l}</li>)}</ul></div><div><h3>Açık kaynaklar</h3><ul className="sources-list">{data.sources.map((s,i)=><li key={i}><a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a></li>)}</ul><p className="caption">Analiz: {date(data.generatedAt)}<br/>Yöntem: {data.methodVersion}<br/>Grid: {data.grid.crs} · {data.grid.resolutionM} m</p></div></div>
 </section>}
 </div></>
}
