export interface Observation {
  datetime: string; itemId: string; productId: string; cloudCover: number;
  baseline: string; boaOffsetApplied: boolean | null; validFraction: number;
  ndviMean: number; nbrMean: number; rgbUrl: string; ndviUrl: string; nbrUrl: string;
}
export interface Period { id: string; label: string; start: string; end: string; status: 'available' | 'missing'; reason?: string; observation?: Observation }
export interface Summary {
  schemaVersion: 1; id: string; name: string; province: string; status: string;
  description?: string; bbox: [number,number,number,number]; areaKm2: number; generatedAt: string; methodVersion: string;
  grid: {crs: string; resolutionM: number; width: number; height: number}; periods: Period[];
  comparisons: {fire?: {before: string; after: string; commonValidFraction: number; ndviDeltaMean: number; dnbrMean: number; dnbrUrl: string; ndviDeltaUrl: string; pixelCount: number}};
  sources: {title: string; url: string}[]; limitations: string[];
  assets: {aoiUrl: string; imageCoordinates?: [number,number][]};
}
export const date = (value: string) => new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value));
export const number = (value: number, digits=2) => new Intl.NumberFormat('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
export const percent = (value: number) => `${number(value * 100,1)}%`;
const record = (v:unknown): v is Record<string,unknown> => !!v && typeof v === 'object';
const bounded = (v:unknown,min:number,max:number):v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const timestamp = (v:unknown):v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
const asset = (v:unknown):v is string => typeof v === 'string' && v.startsWith('/data/marmaris/') && !v.includes('..');
function observation(v:unknown):boolean {
 if(!record(v)) return false;
 return timestamp(v.datetime) && typeof v.itemId==='string' && typeof v.productId==='string'
  && typeof v.baseline==='string' && (typeof v.boaOffsetApplied==='boolean' || v.boaOffsetApplied===null)
  && bounded(v.cloudCover,0,100) && bounded(v.validFraction,0,1)
  && bounded(v.ndviMean,-1,1) && bounded(v.nbrMean,-1,1)
  && asset(v.rgbUrl) && asset(v.ndviUrl) && asset(v.nbrUrl);
}
export function validSummary(value: unknown): value is Summary {
 if(!record(value) || value.schemaVersion!==1 || !Array.isArray(value.bbox) || value.bbox.length!==4) return false;
 const [w,s,e,n]=value.bbox;
 if(!bounded(w,-180,180)||!bounded(e,-180,180)||!bounded(s,-85,85)||!bounded(n,-85,85)||w>=e||s>=n) return false;
 if(!timestamp(value.generatedAt)||typeof value.methodVersion!=='string'||!bounded(value.areaKm2,0,1e6))return false;
 const g=value.grid;
 if(!record(g)||typeof g.crs!=='string'||!bounded(g.resolutionM,1,10000)||!bounded(g.width,1,1e7)||!bounded(g.height,1,1e7))return false;
 if(!Array.isArray(value.periods)||!value.periods.every(p=>record(p)&&typeof p.id==='string'&&typeof p.label==='string'&&timestamp(p.start)&&timestamp(p.end)&&(p.status==='missing'||(p.status==='available'&&observation(p.observation)))))return false;
 if(!record(value.comparisons)||!record(value.assets)||!asset(value.assets.aoiUrl))return false;
 const f=value.comparisons.fire;
 if(f!==undefined&&(!record(f)||!bounded(f.commonValidFraction,0,1)||!bounded(f.ndviDeltaMean,-2,2)||!bounded(f.dnbrMean,-2,2)||!bounded(f.pixelCount,1,1e10)||!asset(f.dnbrUrl)||!asset(f.ndviDeltaUrl)))return false;
 if(value.assets.imageCoordinates!==undefined&&(!Array.isArray(value.assets.imageCoordinates)||value.assets.imageCoordinates.length!==4||!value.assets.imageCoordinates.every(c=>Array.isArray(c)&&c.length===2&&bounded(c[0],-180,180)&&bounded(c[1],-85,85))))return false;
 return Array.isArray(value.sources)&&value.sources.every(s=>record(s)&&typeof s.title==='string'&&typeof s.url==='string'&&/^https?:\/\//.test(s.url))
  && Array.isArray(value.limitations)&&value.limitations.every(s=>typeof s==='string');
}
