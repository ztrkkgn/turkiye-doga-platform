'use client';
import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { baseMapStyle, TURKEY_BOUNDS } from '@/lib/map-style';
import type { NatureEvent } from '@/lib/events';
import type { Summary } from '@/lib/data';
import type { ChangeFeatures } from '@/lib/monitoring';

type ChangeFeature = ChangeFeatures['features'][number];

maplibregl.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs',import.meta.url).toString());
interface Props {
  events: NatureEvent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  summaries: Record<string, Summary>;
  changes: ChangeFeatures;
  selectedChange: ChangeFeature | null;
  onChangeSelect: (feature: ChangeFeature) => void;
}

export function CountryMap({events, selectedId, onSelect, summaries, changes, selectedChange, onChangeSelect}: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const changeMarkers = useRef<maplibregl.Marker[]>([]);
  const latest = useRef({events,selectedId,onSelect,changes,onChangeSelect});
  latest.current = {events,selectedId,onSelect,changes,onChangeSelect};
  const [ready,setReady] = useState(false);
  const [showLayers,setShowLayers] = useState(false);
  const [showChanges,setShowChanges] = useState(true);
  const [error,setError] = useState('');
  const overlays = useRef<string[]>([]);

  function paintChanges() {
    const current=map.current;
    if(!current)return;
    changeMarkers.current.forEach(marker=>marker.remove());
    changeMarkers.current=[];
    if(!showChanges)return;
    const groups=new Map<string,ChangeFeature[]>();
    latest.current.changes.features.forEach(feature=>{
      const province=latest.current.events.find(event=>event.id===feature.properties.eventId)?.province;
      const key=current.getZoom()<7.5
        ? `province:${province??feature.properties.regionId}`
        : current.getZoom()<8?feature.properties.regionId:feature.properties.id;
      groups.set(key,[...(groups.get(key)??[]),feature]);
    });
    groups.forEach(group=>{
      const button=document.createElement('button');button.type='button';
      let center:[number,number];
      if(group.length>1){
        center=[group.reduce((sum,feature)=>sum+feature.geometry.coordinates[0],0)/group.length,
          group.reduce((sum,feature)=>sum+feature.geometry.coordinates[1],0)/group.length];
        button.className='change-cluster';button.textContent=`${group.length} değişim adayı`;
        button.setAttribute('aria-label',`${group.length} otomatik değişim adayını haritada aç`);
        button.onclick=()=>{
          const bounds=new maplibregl.LngLatBounds();group.forEach(feature=>bounds.extend(feature.geometry.coordinates as [number,number]));
          current.fitBounds(bounds,{padding:80,maxZoom:12,duration:450});
        };
      }else{
        const feature=group[0];center=feature.geometry.coordinates as [number,number];
        button.className=`change-marker ${feature.properties.direction}`;
        button.textContent=feature.properties.direction==='decrease'?'↓':'↑';
        button.setAttribute('aria-label',`Otomatik NDVI ${feature.properties.direction==='decrease'?'azalış':'artış'} adayını incele`);
        button.title=`${feature.properties.beforeDate.slice(0,10)} → ${feature.properties.afterDate.slice(0,10)}`;
        button.onclick=()=>latest.current.onChangeSelect(feature);
      }
      changeMarkers.current.push(new maplibregl.Marker({element:button,anchor:'bottom',offset:group.length>1?[0,-32]:[0,0]}).setLngLat(center).addTo(current));
    });
  }

  function paintMarkers() {
    const current = map.current;
    if (!current) return;
    markers.current.forEach(marker => marker.remove());
    markers.current = [];
    const groups = new Map<string,NatureEvent[]>();
    latest.current.events.forEach(event => {
      const key = current.getZoom() < 7.5 ? event.province : event.id;
      groups.set(key,[...(groups.get(key) ?? []),event]);
    });
    for (const group of groups.values()) {
      const button = document.createElement('button');
      button.type = 'button';
      let coordinates: [number,number];
      if (group.length > 1) {
        coordinates = [group.reduce((sum,event)=>sum+event.coordinates[0],0)/group.length,
          group.reduce((sum,event)=>sum+event.coordinates[1],0)/group.length];
        button.className = 'event-cluster';
        button.textContent = `${group[0].province} · ${group.length}`;
        button.setAttribute('aria-label',`${group[0].province} ilindeki ${group.length} olaya yakınlaş`);
        button.onclick = () => {
          const bounds = new maplibregl.LngLatBounds();
          group.forEach(event => bounds.extend(event.coordinates));
          current.fitBounds(bounds,{padding:80,maxZoom:10.5,duration:450});
        };
      } else {
        const event = group[0];
        coordinates = event.coordinates;
        button.className = `event-marker ${event.category} ${event.analysis.status}${event.id === latest.current.selectedId ? ' is-selected' : ''}`;
        button.setAttribute('aria-label',`${event.title} olayını seç`);
        button.setAttribute('aria-pressed',String(event.id === latest.current.selectedId));
        const dot = document.createElement('span');
        dot.className = 'event-marker-dot';
        dot.setAttribute('aria-hidden','true');
        const label = document.createElement('span');
        label.className = 'event-marker-label';
        label.textContent = event.location;
        button.append(dot,label);
        button.onclick = () => latest.current.onSelect(event.id);
      }
      markers.current.push(new maplibregl.Marker({element:button,anchor:'bottom'}).setLngLat(coordinates).addTo(current));
    }
  }

  useEffect(()=>{
    if (!element.current) return;
    let current: maplibregl.Map | undefined;
    let observer: ResizeObserver | undefined;
    try {
      current = new maplibregl.Map({container:element.current,style:baseMapStyle(),
        bounds:TURKEY_BOUNDS,fitBoundsOptions:{padding:28},minZoom:3,maxZoom:16,
        attributionControl:{compact:false},locale:{'NavigationControl.ZoomIn':'Yakınlaştır',
          'NavigationControl.ZoomOut':'Uzaklaştır','AttributionControl.ToggleAttribution':'Harita kaynakları'}});
      map.current = current;
      current.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
      current.on('load',()=>{setReady(true);paintMarkers();paintChanges()});
      current.on('zoomend',paintMarkers);
      current.on('error',event=>{
        if (/WebGL|Worker failed/.test(event.error?.message ?? '')) setError('Etkileşimli harita yüklenemedi. Tüm olaylara aşağıdaki listeden erişebilirsiniz.');
      });
      observer = new ResizeObserver(()=>{
        current?.resize();
        if (!latest.current.selectedId) current?.fitBounds(TURKEY_BOUNDS,{padding:28,duration:0});
      });
      observer.observe(element.current);
    } catch {
      setError('Harita bu tarayıcıda başlatılamadı. Tüm olaylara aşağıdaki listeden erişebilirsiniz.');
    }
    return ()=>{observer?.disconnect();markers.current.forEach(marker=>marker.remove());changeMarkers.current.forEach(marker=>marker.remove());current?.remove();map.current=null};
  },[]);

  useEffect(()=>{
    if (!ready || !map.current) return;
    paintMarkers();
    const selected = events.find(event=>event.id===selectedId);
    if(selectedChange)map.current.flyTo({center:selectedChange.geometry.coordinates as [number,number],zoom:12,duration:500});
    else if (selected) map.current.flyTo({center:selected.coordinates,zoom:10.2,duration:550});
    else map.current.fitBounds(TURKEY_BOUNDS,{padding:28,duration:400});
  },[ready,events,selectedId,selectedChange]);

  useEffect(()=>{
    if(!ready||!map.current)return;
    const current=map.current;
    paintChanges();current.on('zoomend',paintChanges);
    return()=>{current.off('zoomend',paintChanges)};
  },[ready,changes,showChanges]);

  useEffect(()=>{
    const current = map.current;
    if (!ready || !current) return;
    overlays.current.forEach(id=>{if(current.getLayer(id))current.removeLayer(id);if(current.getSource(id))current.removeSource(id)});
    overlays.current = [];
    const visible = new Set(events.map(event=>event.id));
    Object.entries(summaries).forEach(([eventId,summary])=>{
      if (!visible.has(eventId) || !summary.comparisons.fire) return;
      const id = `analysis-${eventId}`;
      const [w,s,e,n] = summary.bbox;
      current.addSource(id,{type:'image',url:summary.comparisons.fire.dnbrUrl,
        coordinates:(summary.assets.imageCoordinates ?? [[w,n],[e,n],[e,s],[w,s]]) as [[number,number],[number,number],[number,number],[number,number]]});
      current.addLayer({id,type:'raster',source:id,layout:{visibility:showLayers?'visible':'none'},
        paint:{'raster-opacity':.82,'raster-fade-duration':0}});
      overlays.current.push(id);
    });
  },[ready,summaries,events]);

  useEffect(()=>{
    overlays.current.forEach(id=>{if(map.current?.getLayer(id))map.current.setLayoutProperty(id,'visibility',showLayers?'visible':'none')});
  },[showLayers]);

  return <div className="country-map-shell">
    <div className="country-map-canvas" ref={element} role="region" aria-label="Türkiye genelindeki önemli doğa olayları haritası"/>
    {!ready&&!error&&<div className="country-map-loading" role="status">Türkiye haritası yükleniyor…</div>}
    {error&&<p className="map-error" role="alert">{error}</p>}
    <div className="country-map-toolbar"><span className="map-status"><i/>{selectedId?'Seçilen olayın konumu':'Türkiye · ülke görünümü'}</span>
      <button type="button" onClick={()=>{onSelect(null);map.current?.fitBounds(TURKEY_BOUNDS,{padding:28,duration:450})}} disabled={!ready}>Türkiye’yi göster ↗</button></div>
    <div className="country-layer-control"><label><input type="checkbox" checked={showChanges} onChange={event=>setShowChanges(event.target.checked)} disabled={!ready}/><span>Güncel değişim adayları · NDVI</span></label>
      <label><input type="checkbox" checked={showLayers} onChange={event=>setShowLayers(event.target.checked)} disabled={!ready||Object.keys(summaries).length===0}/><span>Olay arşivi analizleri · dNBR</span></label>
      <p>Otomatik işaretler inceleme adayıdır. Yalnız taranan alanlar için sonuç bulunur.</p></div>
  </div>;
}
