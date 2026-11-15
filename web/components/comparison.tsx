'use client';
import { useId, useState } from 'react';
import { date, type Observation } from '@/lib/data';
import './comparison.css';
export function Comparison({before,after,heading='Aynı yer, iki farklı tarih.',eyebrow='02 / UYDU GÖZLEMİ',beforeLabel='ÖNCE',afterLabel='SONRA'}:{before:Observation;after:Observation;heading?:string;eyebrow?:string;beforeLabel?:string;afterLabel?:string}) {
 const [position,setPosition] = useState(50); const [aspectRatio,setAspectRatio] = useState(4 / 3); const id=useId(); const [failedUrls,setFailedUrls]=useState<string[]>([]);
 const imageFailed=failedUrls.includes(before.rgbUrl)||failedUrls.includes(after.rgbUrl);
 const failed=(url:string)=>setFailedUrls(previous=>previous.includes(url)?previous:[...previous,url]);
 const loaded=(url:string)=>setFailedUrls(previous=>previous.filter(value=>value!==url));
 return <section className="comparison-section" aria-labelledby={`${id}-title`}><div className="section-top"><div><span className="eyebrow">{eyebrow}</span><h2 id={`${id}-title`}>{heading}</h2></div><p>Çizgiyi sürükleyerek gerçek Sentinel-2<br/>görüntülerini karşılaştırın.</p></div>
 <div className="comparison-image" style={{'--split':`${position}%`, aspectRatio} as React.CSSProperties}>
  <img className="comparison-base" onError={()=>failed(after.rgbUrl)} onLoad={e=>{loaded(after.rgbUrl);const image=e.currentTarget;if(image.naturalWidth&&image.naturalHeight)setAspectRatio(image.naturalWidth/image.naturalHeight)}} src={after.rgbUrl} alt={`${afterLabel}, doğal renk uydu görüntüsü, ${date(after.datetime)}`} draggable={false}/>
  <img className="comparison-before" onError={()=>failed(before.rgbUrl)} onLoad={()=>loaded(before.rgbUrl)} src={before.rgbUrl} alt={`${beforeLabel}, doğal renk uydu görüntüsü, ${date(before.datetime)}`} draggable={false}/>
  <div className="compare-label before-label">{beforeLabel}<span>{date(before.datetime)}</span></div><div className="compare-label after-label">{afterLabel}<span>{date(after.datetime)}</span></div>
  <div className="comparison-line" aria-hidden="true"><span>↔</span></div>
  <label htmlFor={id} className="sr-only">Önce ve sonra görüntülerinin karşılaştırma konumu</label><input id={id} className="comparison-range" disabled={imageFailed} aria-describedby={imageFailed?`${id}-error`:undefined} type="range" min="0" max="100" value={position} onChange={e=>setPosition(Number(e.target.value))}/>
  {imageFailed&&<div className="comparison-feedback" id={`${id}-error`} role="alert"><p><strong>Uydu görüntüsü yüklenemedi.</strong><span>Görüntülerden en az birine erişilemediği için karşılaştırma şu anda kullanılamıyor. Sayfayı yeniden yükleyerek tekrar deneyebilirsiniz.</span></p></div>}
 </div><p className="caption">Doğal renk görünümü · Aynı alan, ortak renk ölçeği. Su ve koyu yüzeyler görüntüde korunur; metrikler daha dar bir geçerli kara maskesinde hesaplanır. Boş alanlar maskelenmiştir. Görsel fark tek başına değişimin nedenini kanıtlamaz.</p>
 </section>
}
