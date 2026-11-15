import Link from 'next/link';
import { PilotViewer } from './pilot-viewer';
import { RecentObservations } from './recent-observations';
import { categoryLabel, eventDateLabel, type NatureEvent } from '@/lib/events';

function Sources({event}:{event:NatureEvent}) {
 return <section><span className="eyebrow">KAYNAKLAR / OLAYIN KAYDI</span><h2>İzlenebilir bir kaynak zinciri.</h2><ul className="sources-list">{event.sources.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><p className="caption">{source.publisher}</p></li>)}</ul></section>;
}
function Context({event}:{event:NatureEvent}) {
 return <><section><span className="eyebrow">OLAYIN BAĞLAMI</span><h2>Burada ne oldu?</h2>{event.story.map((paragraph,index)=><p key={index}>{paragraph}</p>)}</section>
 <section><span className="eyebrow">KONUM / YAKLAŞIK BÖLGE İŞARETİ</span><h2>{event.location}</h2><p>{event.coordinateNote}</p><p className="caption">Harita işareti: {new Intl.NumberFormat('tr-TR',{maximumFractionDigits:4}).format(event.coordinates[1])}°K, {new Intl.NumberFormat('tr-TR',{maximumFractionDigits:4}).format(event.coordinates[0])}°D. Bu işaret bir alan sınırı değildir.</p></section>
 <Sources event={event}/></>;
}
export function EventDetail({event}:{event:NatureEvent}) {
 if(event.analysis.status==='available'&&event.analysis.summaryUrl) return <>
  <RecentObservations event={event}/>
  <div className="content-width historical-case-label"><span className="eyebrow">TARİHSEL OLAY / {event.year}</span><p className="caption">Aşağıdaki karşılaştırma {event.year} yılındaki olaya aittir; güncel görüntü değildir.</p></div>
  <PilotViewer summaryUrl={event.analysis.summaryUrl} event={event} detail/>
  <article className="method-page" aria-label={`${event.title} olayının bağlamı ve kaynakları`}><div className="method-body"><Context event={event}/><Link className="primary-link" href="/#olaylar">Türkiye’deki olaylara dön <span>↗</span></Link></div></article>
 </>;
 return <><RecentObservations event={event}/><article className="method-page"><header><Link className="text-link" href="/#olaylar">← Türkiye’deki olaylar</Link><p className="eyebrow">{categoryLabel(event.category)} · {event.province} · {eventDateLabel(event)}</p><h1>{event.title}</h1><p className="method-lead">{event.summary}</p></header>
 <div className="scope-note" role="note"><span>OLAY DÖNEMİNİN UYDU ANALİZİ HENÜZ YOK</span><p>Bu sayfa, kaynaklarla belgelenen tarihsel olayın kaydıdır. Platform bu olayın yaşandığı dönem için henüz uydu görüntüsü karşılaştırması, kayıp ölçümü veya iyileşme analizi yayımlamadı. Düzenli taramaya alınan alanların güncel gözlemleri yukarıda ayrı olarak gösterilir.</p></div>
 <div className="method-body"><Context event={event}/><section><h2>Bu kaydı nasıl okumalı?</h2><p>Olayın tarihini, konumunu ve anlatısını aşağıdaki kaynaklardan doğrulayabilirsiniz. Başka kurumların veya araştırmaların bildirdiği sonuçlar, platformun kendi uydu analizi değildir. Yaklaşık konum işareti olayın etki alanını göstermez.</p><Link className="text-link" href="/metodoloji/">Yöntem ve verinin sınırları ↗</Link></section><Link className="primary-link" href="/#olaylar">Türkiye’deki olaylara dön <span>↗</span></Link></div>
 </article></>;
}
