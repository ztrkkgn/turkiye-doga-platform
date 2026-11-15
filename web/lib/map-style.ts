import type { StyleSpecification } from 'maplibre-gl';

export const TURKEY_BOUNDS: [[number,number],[number,number]] = [[25.5,35.5],[45,42.5]];

export function baseMapStyle(): StyleSpecification {
  return {version:8, sources:{osm:{type:'raster', tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    tileSize:256, maxzoom:19, attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıcıları'}},
    layers:[{id:'base',type:'raster',source:'osm',paint:{'raster-saturation':-.65,'raster-opacity':.8}}]};
}
