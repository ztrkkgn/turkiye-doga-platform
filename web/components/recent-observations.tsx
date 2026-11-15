'use client';
import { useEffect, useId, useState } from 'react';
import { Comparison } from './comparison';
import { date, number, validSummary, type Summary } from '@/lib/data';
import { monitoringState, type MonitoringRegion, type MonitoringStatus } from '@/lib/monitoring';
import { loadMonitoringSnapshot, monitoringAssetUrl, type MonitoringSnapshot } from '@/lib/monitoring-source';
import type { NatureEvent } from '@/lib/events';
import './recent-observations.css';

const STATUS_URL='/data/monitoring/status.json';
const labels={available:'Karşılaştırılabilir gözlemler',stale:'Güncel görüntü yetersiz',error:'İzleme kontrolünde sorun', 'insufficient-data':'Yeterli geçerli gözlem yok'};
function timestamp(value:string) {
 return new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'}).format(new Date(value));
}
export function RecentObservations({event}:{event:NatureEvent}) {
 const headingId=useId();
 const [status,setStatus]=useState<MonitoringStatus|null>(null);
 const [snapshot,setSnapshot]=useState<MonitoringSnapshot|null>(null);
 const [region,setRegion]=useState<MonitoringRegion|undefined>();
 const [summary,setSummary]=useState<Summary|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('');setStatus(null);setSnapshot(null);setRegion(undefined);setSummary(null);
  async function load() {
   try {
    const loaded=await loadMonitoringSnapshot(controller.signal);
    const value=loaded.status;
    if(controller.signal.aborted)return;
    setStatus(value);setSnapshot(loaded);
    const selected=value.regions.find(item=>item.eventId===event.id);setRegion(selected);
    if(!selected||monitoringState(selected,value.freshnessMaxAgeDays)!=='available'||!selected.summaryUrl)return;
    const result=await fetch(monitoringAssetUrl(selected.summaryUrl,loaded.baseUrl),{signal:controller.signal,cache:'no-store'});
    if(!result.ok)throw new Error('summary-unavailable');
    const data:unknown=await result.json();
    const prefix=selected.summaryUrl.slice(0,selected.summaryUrl.lastIndexOf('/')+1);
    if(!validSummary(data,prefix)||data.id!==selected.id)throw new Error('invalid-summary');
    const before=data.periods.find(period=>period.id==='before')?.observation;
    const after=data.periods.find(period=>period.id==='after')?.observation;
    if(!before||!after||Date.parse(before.datetime)!==Date.parse(selected.referenceObservationAt!)||Date.parse(after.datetime)!==Date.parse(selected.latestObservationAt!))throw new Error('invalid-summary');
    if(!controller.signal.aborted)setSummary(data);
   } catch(problem) {
    if(controller.signal.aborted)return;
    const message=problem instanceof Error?problem.message:'';
    setError(message.startsWith('invalid-')?'Güncel izleme kaydı doğrulama kontrolünden geçmedi. Görüntüler ve aday değişimler gösterilmiyor.':'Güncel izleme verisi yüklenemedi. Son uydu gözlemlerine şu anda erişilemiyor.');
   } finally {if(!controller.signal.aborted)setLoading(false)}
  }
  load();return ()=>controller.abort();
 },[event.id]);
 const state=region&&status?monitoringState(region,status.freshnessMaxAgeDays):undefined;
 const observation=(id:string)=>{const raw=summary?.periods.find(period=>period.id===id)?.observation;return raw&&snapshot?{...raw,rgbUrl:monitoringAssetUrl(raw.rgbUrl,snapshot.baseUrl),ndviUrl:monitoringAssetUrl(raw.ndviUrl,snapshot.baseUrl),nbrUrl:monitoringAssetUrl(raw.nbrUrl,snapshot.baseUrl)}:undefined};
 const before=observation('before');
 const after=observation('after');
 const comparison=summary?.comparisons.fire;
 const available=state==='available'&&before&&after&&!error;
 return <section id="guncel-gozlemler" className="content-width recent-observations" aria-labelledby={headingId}>
  <div className="section-top"><div><span className="eyebrow">BÖLGESEL İZLEME / SON GÖZLEMLER</span><h2 id={headingId}>Son uydu gözlemleri.</h2></div>{state&&!error&&<span className="recent-status" data-state={state}>{labels[state]}</span>}</div>
  <p className="recent-intro"><strong>{event.location}.</strong> Bu bölüm seçilmiş alanlardaki güncel izlemeye ayrılmıştır. Yeni gözlemlerden hesaplanan işaretler, incelenmesi gereken <strong>aday değişimlerdir</strong>; tarihsel olayın yeniden yaşandığı anlamına gelmez.</p>
  {loading&&<p className="caption" role="status">Son izleme kaydı yükleniyor…</p>}
  {error&&<div className="scope-note" role="alert"><span>VERİ YÜKLENEMEDİ</span><p>{error}</p></div>}
  {status&&<dl className="recent-dates"><div><dt>Son veri kontrolü</dt><dd>{timestamp(status.checkedAt)}<small>Türkiye saati · görüntü çekim tarihi değildir</small></dd></div><div><dt>Son uydu çekimi</dt><dd>{region?.latestObservationAt?date(region.latestObservationAt):'Geçerli gözlem kaydı yok'}</dd></div><div><dt>Referans uydu çekimi</dt><dd>{region?.referenceObservationAt?date(region.referenceObservationAt):'Karşılaştırma kaydı yok'}</dd></div></dl>}
  {status&&!region&&!error&&<div className="scope-note" role="note"><span>DÜZENLİ TARAMA KAPSAMI</span><p>Bu olay alanı düzenli taramada değil. Bu sayfadaki tarihsel kayıt, güncel bir uydu analizi olarak yorumlanamaz.</p></div>}
  {region&&state!=='available'&&!error&&<div className="scope-note" role="note"><span>{state==='stale'?'GÜNCELLİK SINIRI':state==='error'?'KONTROL TAMAMLANAMADI':'GÖZLEM YETERSİZ'}</span><p>{region.reason|| (state==='stale'?`Son geçerli uydu çekimi ${status!.freshnessMaxAgeDays} günlük güncellik sınırını aşıyor. Güncel karşılaştırma gösterilmiyor.`:state==='error'?'Bu alanın son veri kontrolü tamamlanamadı. Güncel sonuç gösterilmiyor.':'Bulut, veri kalitesi veya gözlem sayısı güncel bir karşılaştırma için yeterli değil. Bu dönem için görüntü veya değişim sonucu üretilmiyor.')}</p></div>}
  {available&&<>
   <div className="recent-metrics"><p><strong>{region!.candidateCount}</strong> incelenecek aday değişim alanı</p>{comparison&&<p><strong>{comparison.ndviDeltaMean>0?'+':''}{number(comparison.ndviDeltaMean,3)}</strong> ortak geçerli kara piksellerinde ortalama NDVI farkı</p>}</div>
   <Comparison before={before} after={after} heading="Referans ve son geçerli gözlem." eyebrow="GERÇEK SENTINEL-2 / DOĞAL RENK" beforeLabel="REFERANS" afterLabel="SON GÖZLEM"/>
   <div className="scope-note" role="note"><span>ADAY DEĞİŞİM / DOĞRULANMAMIŞ</span><p>İşaretler NDVI farkına dayanır; kayıp, yangın, kesim veya iyileşmenin kesin kanıtı değildir. Mevsim, tarım, nem ve veri maskesi farkları da sinyali etkileyebilir. {region!.candidateCount===0?'Aday bulunmaması, alanda değişim olmadığı anlamına gelmez.':'Neden ve etki için görüntülerin ve saha bilgisinin ayrıca incelenmesi gerekir.'}</p></div>
  </>}
  {status&&<><p className="caption">Veri kaynağı: {snapshot?.origin==='repository'?'otomatik güncellenen açık kaynak deposu':'bu sürümle kaydedilmiş yerel çıktı'}. Güncellik sınırı: son uydu çekiminden itibaren {status.freshnessMaxAgeDays} gün. Düzenli tarama seçilmiş çalışma alanlarını kapsar; Türkiye’nin tamamı taranmaz.</p><details className="recent-method"><summary>İzleme yöntemi ve sınırları</summary><p>{status.method.description}</p><ul>{status.method.limitations.map((limitation,index)=><li key={index}>{limitation}</li>)}</ul><p>{status.method.name} · {status.method.version}</p></details><div className="recent-downloads"><a href={monitoringAssetUrl(STATUS_URL,snapshot?.baseUrl??'')} download>İzleme kaydını indir ↓</a>{available&&region?.summaryUrl&&<a href={monitoringAssetUrl(region.summaryUrl,snapshot?.baseUrl??'')} download>Gözlem analizini indir ↓</a>}</div></>}
 </section>;
}
