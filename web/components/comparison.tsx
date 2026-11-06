'use client';
import { useId, useState } from 'react';
import { date, type Observation } from '@/lib/data';
export function Comparison({before,after}:{before:Observation;after:Observation}) {
 const [position,setPosition] = useState(50); const [aspectRatio,setAspectRatio] = useState(4 / 3); const id=useId();
 return <section className="comparison-section" aria-labelledby="comparison-title"><div className="section-top"><div><span className="eyebrow">02 / UYDU GÖZLEMİ</span><h2 id="comparison-title">Aynı yer, iki farklı tarih.</h2></div><p>Çizgiyi sürükleyerek gerçek Sentinel-2<br/>görüntülerini karşılaştırın.</p></div>
 <div className="comparison-image" style={{'--split':`${position}%`, aspectRatio} as React.CSSProperties}>
  <img className="comparison-base" onLoad={e=>{const image=e.currentTarget;if(image.naturalWidth&&image.naturalHeight)setAspectRatio(image.naturalWidth/image.naturalHeight)}} src={after.rgbUrl} alt={`Yangın sonrası doğal renk uydu görüntüsü, ${date(after.datetime)}`} draggable={false}/>
  <img className="comparison-before" src={before.rgbUrl} alt={`Yangın öncesi doğal renk uydu görüntüsü, ${date(before.datetime)}`} draggable={false}/>
  <div className="compare-label before-label">ÖNCE<span>{date(before.datetime)}</span></div><div className="compare-label after-label">SONRA<span>{date(after.datetime)}</span></div>
  <div className="comparison-line" aria-hidden="true"><span>↔</span></div>
  <label htmlFor={id} className="sr-only">Önce ve sonra görüntülerinin karşılaştırma konumu</label><input id={id} className="comparison-range" type="range" min="0" max="100" value={position} onChange={e=>setPosition(Number(e.target.value))}/>
 </div><p className="caption">Doğal renk görünümü · Aynı alan, ortak renk ölçeği. Su ve koyu yüzeyler görüntüde korunur; metrikler daha dar bir geçerli kara maskesinde hesaplanır. Boş alanlar maskelenmiştir. Görsel fark tek başına değişimin nedenini kanıtlamaz.</p>
 </section>
}
