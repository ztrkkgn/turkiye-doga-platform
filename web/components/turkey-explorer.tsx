'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { EVENTS, categoryLabel, analysisLabel, eventDateLabel, filterEvents, type EventCategory, type NatureEvent } from '@/lib/events';
import { date, number, validSummary, type Summary } from '@/lib/data';
import { monitoringState, type MonitoringStatus, type ChangeFeatures } from '@/lib/monitoring';
import { loadMonitoringSnapshot } from '@/lib/monitoring-source';

type ChangeFeature = ChangeFeatures['features'][number];

const CountryMap = dynamic(()=>import('./country-map').then(module=>module.CountryMap),{
  ssr:false,loading:()=> <div className="country-map-shell"><div className="country-map-loading">Türkiye haritası hazırlanıyor…</div></div>});

export function TurkeyExplorer() {
  const [query,setQuery] = useState('');
  const [category,setCategory] = useState<EventCategory|'all'>('all');
  const [analyzedOnly,setAnalyzedOnly] = useState(false);
  const [selectedId,setSelectedId] = useState<string|null>(null);
  const [summaries,setSummaries] = useState<Record<string,Summary>>({});
  const [dataError,setDataError] = useState(false);
  const [monitoring,setMonitoring] = useState<MonitoringStatus|null>(null);
  const [changes,setChanges] = useState<ChangeFeatures>({type:'FeatureCollection',features:[]});
  const [selectedChange,setSelectedChange] = useState<ChangeFeature|null>(null);
  const [monitoringError,setMonitoringError] = useState(false);
  const shown = useMemo(()=>filterEvents(EVENTS,query,category,analyzedOnly),[query,category,analyzedOnly]);
  const selected = shown.find(event=>event.id===selectedId);
  const analysisCount = EVENTS.filter(event=>event.analysis.status==='available').length;
  const visibleChanges = useMemo<ChangeFeatures>(()=>({type:'FeatureCollection',features:changes.features.filter(feature=>shown.some(event=>event.id===feature.properties.eventId)
    && monitoring?.regions.some(region=>region.id===feature.properties.regionId&&region.eventId===feature.properties.eventId
      && monitoringState(region,monitoring.freshnessMaxAgeDays)==='available'
      && region.latestObservationAt===feature.properties.afterDate&&region.referenceObservationAt===feature.properties.beforeDate))}),[changes,shown,monitoring]);
  const selectedChangeEvent = selectedChange ? EVENTS.find(event=>event.id===selectedChange.properties.eventId) : null;

  useEffect(()=>{
    const controller = new AbortController();
    Promise.all(EVENTS.filter(event=>event.analysis.status==='available').map(async event=>{
      try {
        const url = event.analysis.summaryUrl;
        if (!url) throw new Error('missing');
        const response = await fetch(url,{signal:controller.signal});
        if (!response.ok) throw new Error('unavailable');
        const value:unknown = await response.json();
        if (!validSummary(value,url.slice(0,url.lastIndexOf('/')+1)) || value.id!==event.id) throw new Error('invalid');
        return [event.id,value] as const;
      } catch (error) {
        if (!controller.signal.aborted) setDataError(true);
        return null;
      }
    })).then(results=>{if(!controller.signal.aborted)setSummaries(Object.fromEntries(results.filter(result=>result!==null)))});
    return ()=>controller.abort();
  },[]);

  useEffect(()=>{
    const controller=new AbortController();
    async function refresh() {
      try {
        const snapshot=await loadMonitoringSnapshot(controller.signal);
        if(!controller.signal.aborted){setMonitoring(snapshot.status);setChanges(snapshot.changes);setMonitoringError(false)}
      }catch{
        if(!controller.signal.aborted){setMonitoringError(true);setChanges({type:'FeatureCollection',features:[]})}
      }
    }
    refresh();
    const timer=window.setInterval(refresh,300000);
    const onVisible=()=>{if(document.visibilityState==='visible')refresh()};
    document.addEventListener('visibilitychange',onVisible);
    return()=>{controller.abort();window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible)};
  },[]);

  useEffect(()=>{setSelectedChange(null)},[query,category,analyzedOnly]);

  function selectEvent(id:string|null){setSelectedId(id);setSelectedChange(null)}
  function reset() {setQuery('');setCategory('all');setAnalyzedOnly(false);selectEvent(null)}
  function selectFromList(event: NatureEvent) {
    selectEvent(event.id);
    document.getElementById('turkiye-haritasi')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }

  return <>
    <section className="intro country-intro"><div><span className="eyebrow">GÜNCEL GÖZLEM / TÜRKİYE</span><h1>Bir ülke.<br/><em>Değişen doğası.</em></h1></div>
      <div className="intro-note"><p>Yangınlardan sulak alanlara,<br/>doğadaki değişimin izini sürün.</p><span>Kaynağı belgelenmiş olaylar. Gerçek uydu analizleri.</span></div></section>

    <section className="country-discovery" aria-label="Türkiye doğa olaylarını keşfet">
      <div className="monitoring-strip"><span><i/> Düzenli uydu izleme</span>{monitoring?<p>{monitoring.regions.length} seçili alan · {visibleChanges.features.length} görünür değişim adayı <span>Son kontrol: {new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'}).format(new Date(monitoring.checkedAt))}</span></p>:<p>{monitoringError?'Güncel izleme kaydına ulaşılamadı. Olay arşivi aşağıda kullanılabilir.':'Son uydu izleme kaydı yükleniyor…'}</p>}</div>
      <div className="event-filters"><div className="category-filters" role="group" aria-label="Olay türü">
        {([['all','Tüm olaylar'],['fire','Yangınlar'],['water','Su ve sulak alanlar']] as const).map(([value,label])=><button type="button" key={value} aria-pressed={category===value} onClick={()=>{setCategory(value);setSelectedId(null)}}>{label}</button>)}
      </div><label className="event-search"><span className="sr-only">İl, olay veya yıl ara</span><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={event=>{setQuery(event.target.value);setSelectedId(null)}} placeholder="İl, olay veya yıl ara"/></label></div>
      <div className="country-explorer" id="turkiye-haritasi">
        <aside className="country-panel" aria-live="polite">
          {selectedChange&&selectedChangeEvent ? <>
            <button type="button" className="back-to-country" onClick={()=>selectEvent(null)}>← Ülke görünümü</button>
            <span className="eyebrow">OTOMATİK TARAMA / İNCELEME ADAYI</span>
            <h2>NDVI {selectedChange.properties.direction==='decrease'?'azalış':'artış'} adayı</h2>
            <p className="event-location">{selectedChangeEvent.location}</p>
            <div className="candidate-metric"><span>Ortalama NDVI farkı</span><strong>{selectedChange.properties.delta>0?'+':''}{number(selectedChange.properties.delta,3)}</strong></div>
            <p className="selected-date">{date(selectedChange.properties.beforeDate)} → {date(selectedChange.properties.afterDate)}</p>
            <p className="selected-evidence">Bu nokta, yeni uydu gözlemleri arasında hesaplanan aykırı spektral değişimi gösterir. Yerinde doğrulanmış kayıp, yangın veya iyileşme sonucu değildir.</p>
            <Link className="primary-link" href={`/bolge/${selectedChangeEvent.slug}/#guncel-gozlemler`}>Güncel görüntüleri karşılaştır <span>→</span></Link>
            <p className="location-disclaimer">Bulut kalıntıları, gölge ve mevsimsel değişimler yanlış aday oluşturabilir.</p>
          </> : selected ? <>
            <button type="button" className="back-to-country" onClick={()=>selectEvent(null)}>← Ülke görünümü</button>
            <span className={`category-label ${selected.category}`}>{categoryLabel(selected.category)} · {selected.year}</span>
            <h2>{selected.title}</h2><p className="event-location">{selected.province} · {selected.location}</p>
            <p className="event-summary">{selected.summary}</p>
            <span className={`analysis-status ${selected.analysis.status}`}>{analysisLabel(selected)}</span>
            <p className="selected-date">{eventDateLabel(selected)}</p>
            <p className="selected-evidence">{selected.analysis.status==='available'?'Gerçek önce/sonra görüntüleri ve indeks sonuçları ayrıntı sayfasında.':'Bu olay için henüz uydu analizi yayımlanmadı. Belgelenmiş olay ve kaynaklarını inceleyebilirsiniz.'}</p>
            <Link className="primary-link" href={`/bolge/${selected.slug}/`}>Bu olayı incele <span>→</span></Link>
            <p className="location-disclaimer">Haritadaki işaret yaklaşık konumdur; olayın etki sınırı değildir.</p>
          </> : <>
            <span className="eyebrow">DOĞAYI YAKINDAN OKUYUN</span><h2>Türkiye’yi <br/>keşfedin.</h2>
            <p className="event-summary">Haritadan bir olayı seçin. Ne olduğunu, nerede yaşandığını ve elimizde hangi verilerin bulunduğunu birlikte görün.</p>
            <div className="country-counts"><div><strong>{EVENTS.length}</strong><span>kaynaklı olay kaydı</span></div><div><strong>{analysisCount}</strong><span>uydu analizi</span></div></div>
            <div className="scope-note"><span>KAPSAM BİLGİSİ</span><p>Harita tüm Türkiye’yi gösterir. Uydu analizleri yalnız işlenmiş çalışma alanlarında bulunur.</p></div>
            <a className="text-link" href="#olaylar">Olay listesine geç ↓</a>
          </>}
        </aside>
        <CountryMap events={shown} selectedId={selected?.id ?? null} onSelect={selectEvent} summaries={summaries} changes={visibleChanges} selectedChange={selectedChange}
          onChangeSelect={feature=>{setSelectedChange(feature);setSelectedId(feature.properties.eventId)}}/>
      </div>
      <div className="country-map-key"><div><span className="key-dot fire"/> Yangın <span className="key-dot water"/> Su ve sulak alan</div>
        <p>↓ / ↑: güncel NDVI değişim adayı · Dolu nokta: olay analizi var · Boş nokta: kaynaklı olay kaydı</p></div>
      {dataError&&<p className="catalog-data-warning" role="status">Bazı analiz katmanları yüklenemedi. Kaynaklı olay listesi kullanılabilir; yüklenemeyen katmanlar haritada gösterilmiyor.</p>}
    </section>

    <section className="events-section" id="olaylar" aria-labelledby="events-heading">
      <div className="section-top"><div><span className="eyebrow">OLAYLAR / YAKINDAN BAKIŞ</span><h2 id="events-heading">Her yerin bir hikâyesi var.</h2></div>
        <label className="analyzed-filter"><input type="checkbox" checked={analyzedOnly} onChange={event=>{setAnalyzedOnly(event.target.checked);setSelectedId(null)}}/>Yalnız uydu analizi olanlar</label></div>
      <p className="event-result-count" role="status">{EVENTS.length} olaydan {shown.length} tanesi gösteriliyor.</p>
      <div className="event-rows">{shown.map((event,index)=><article key={event.id} className={`event-row ${event.category}`}>
        <span className="event-row-number">{String(index+1).padStart(2,'0')}</span>
        <div className="event-row-story"><span className={`category-label ${event.category}`}>{categoryLabel(event.category)} · {event.year}</span><h3><Link href={`/bolge/${event.slug}/`}>{event.title}</Link></h3><p>{event.province} · {event.summary}</p></div>
        <span className={`analysis-status ${event.analysis.status}`}>{analysisLabel(event)}</span>
        <div className="event-row-actions"><button type="button" onClick={()=>selectFromList(event)}>Haritada göster ↗</button><Link href={`/bolge/${event.slug}/`} aria-label={`${event.title} ayrıntılarını aç`}>Ayrıntılar →</Link></div>
      </article>)}</div>
      {shown.length===0&&<div className="event-empty"><h3>Bu aramaya uygun olay bulunamadı.</h3><p>Başka bir il, olay veya yıl deneyin.</p><button type="button" onClick={reset}>Filtreleri temizle</button></div>}
      <div className="catalog-note"><span aria-hidden="true">↳</span><p>Olay arşivi ve güncel tarama ayrı katmanlardır. Düzenli tarama seçili alanlarla sınırlıdır; Türkiye’nin tamamını veya canlı yangınları izleyen bir sistem değildir. Otomatik adaylar insan incelemesi gerektirir.</p><Link href="/metodoloji/">Yöntem ve sınırlar ↗</Link></div>
    </section>
  </>;
}
