'use client';
import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map } from 'maplibre-gl';
import type { Summary } from '@/lib/data';
maplibregl.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString());
export function PilotMap({data,detail=false}:{data:Summary;detail?:boolean}) {
 const container = useRef<HTMLDivElement>(null); const map=useRef<Map|null>(null);
 const [ready,setReady]=useState(false); const [showChange,setShowChange]=useState(true); const [error,setError]=useState('');
 const [focus,setFocus]=useState(detail);
 useEffect(()=>{
  if (!container.current) return;
  setReady(false);setFocus(detail);
  let current:Map;
  try {
   current = new maplibregl.Map({container:container.current,center:[34.8,39],zoom:5.3,minZoom:3,maxZoom:16,style:{version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıcıları'}},layers:[{id:'base',type:'raster',source:'osm',paint:{'raster-saturation':-.65,'raster-opacity':.75}}]},attributionControl:{compact:true}});
   map.current=current;
   current.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
   current.on('error',event=>{ if(event.error?.message?.includes('WebGL')) setError('Harita bu tarayıcıda başlatılamadı. Uydu görüntülerini ve analiz ayrıntılarını aşağıdan inceleyebilirsiniz.'); });
   current.on('load',()=>{
    current.addSource('pilot',{type:'geojson',data:data.assets.aoiUrl});
    current.addLayer({id:'pilot-fill',type:'fill',source:'pilot',paint:{'fill-color':'#bc592d','fill-opacity':.12}});
    if(data.comparisons.fire){
     const [w,s,e,n]=data.bbox;
     const coords = data.assets.imageCoordinates ?? [[w,n],[e,n],[e,s],[w,s]];
     current.addSource('dnbr',{type:'image',url:data.comparisons.fire.dnbrUrl,coordinates:coords as [[number,number],[number,number],[number,number],[number,number]]});
     current.addLayer({id:'change',type:'raster',source:'dnbr',paint:{'raster-opacity':.82,'raster-fade-duration':0}});
    }
    current.addLayer({id:'pilot-outline',type:'line',source:'pilot',paint:{'line-color':'#a44d2b','line-width':2,'line-dasharray':[3,2]}});
    const dot=document.createElement('button');dot.className='pilot-marker';dot.type='button';dot.setAttribute('aria-label',`${data.name} çalışma alanına yakınlaş`);dot.textContent=data.name;dot.onclick=()=>{current.fitBounds([[data.bbox[0],data.bbox[1]],[data.bbox[2],data.bbox[3]]],{padding:80,maxZoom:12,duration:500});setFocus(true)};
    new maplibregl.Marker({element:dot,anchor:'bottom'}).setLngLat([(data.bbox[0]+data.bbox[2])/2,(data.bbox[1]+data.bbox[3])/2]).addTo(current);
    if(detail) current.fitBounds([[data.bbox[0],data.bbox[1]],[data.bbox[2],data.bbox[3]]],{padding:70,maxZoom:12,duration:0});
    else current.fitBounds([[25.5,35.5],[45,42.5]],{padding:25,duration:0});
    setReady(true);
   });
  } catch {setError('Etkileşimli harita yüklenemedi. Analiz ve görüntülere aşağıdan erişebilirsiniz.');}
  return ()=>{current?.remove();map.current=null};
 },[data,detail]);
 useEffect(()=>{if(ready&&map.current?.getLayer('change'))map.current.setLayoutProperty('change','visibility',showChange?'visible':'none')},[showChange,ready]);
 function fitPilot(){map.current?.fitBounds([[data.bbox[0],data.bbox[1]],[data.bbox[2],data.bbox[3]]],{padding:70,maxZoom:12,duration:500});setFocus(true)}
 function fitTurkey(){map.current?.fitBounds([[25.5,35.5],[45,42.5]],{padding:25,duration:500});setFocus(false)}
 return <div className="map-shell"><div ref={container} className="map-canvas" role="region" aria-label={`Türkiye ve ${data.name} analiz alanının etkileşimli haritası`}/>
  {error&&<p className="map-error" role="alert">{error}</p>}
  <div className="map-topline"><span className="map-status"><i/> {focus?data.name:'Türkiye · analiz kapsamı'}</span><button onClick={focus?fitTurkey:fitPilot} disabled={!ready}>{focus?'Türkiye görünümü ↗':'Pilota yakınlaş ↗'}</button></div>
  <div className="map-legend"><span className="eyebrow">GÖSTERİLEN VERİ</span>{data.comparisons.fire?<><label className="layer-toggle"><input type="checkbox" checked={showChange} onChange={e=>setShowChange(e.target.checked)} disabled={!ready}/><span>Yangın dönemi · dNBR</span></label><div className="dnbr-ramp" aria-label="dNBR renk ölçeği: mavi eksi 0,5, açık nötr sıfır, turuncu artı 1"><i/><span>−0,5<span>0</span>+1,0</span></div><p>Gösterim aralığı. Hasar sınıfı değildir.</p><span className="legend-line"><i/> Kesikli sınır: çalışma alanı</span></>:<p>Analiz katmanı henüz yayımlanmadı.</p>}</div>
  <span className="map-note">Yalnızca işlenmiş pilot alan gösterilir.</span>
 </div>
}
