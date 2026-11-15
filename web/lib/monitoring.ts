import type { FeatureCollection, Point } from 'geojson';

export type MonitoringRegionState = 'available' | 'insufficient-data' | 'stale' | 'error';
export interface MonitoringRegion {
  id: string;
  eventId: string;
  title: string;
  coordinates: [number, number];
  bbox: [number, number, number, number];
  status: MonitoringRegionState;
  latestObservationAt?: string;
  referenceObservationAt?: string;
  summaryUrl?: string;
  candidateCount: number;
  reason?: string;
}
export interface MonitoringStatus {
  schemaVersion: 1;
  checkedAt: string;
  generatedAt: string;
  mode: 'regional';
  freshnessMaxAgeDays: number;
  featuresUrl: string;
  method: {name: string; version: string; description: string; limitations: string[]};
  regions: MonitoringRegion[];
}
export interface ChangeProperties {
  id: string;
  regionId: string;
  eventId: string;
  direction: 'decrease' | 'increase';
  metric: 'NDVI';
  delta: number;
  areaHa: number;
  beforeDate: string;
  afterDate: string;
  reviewStatus: 'unreviewed';
  threshold?: number;
}
export type ChangeFeatures = FeatureCollection<Point, ChangeProperties>;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value==='object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value==='string' && value.trim().length>0;
const finite = (value: unknown,min: number,max: number): value is number => typeof value==='number' && Number.isFinite(value) && value>=min && value<=max;
const isoDate = (value: unknown): value is string => typeof value==='string' && /^\d{4}-\d{2}-\d{2}(?:T.+)?$/.test(value) && Number.isFinite(Date.parse(value));
const slug = (value: unknown): value is string => typeof value==='string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const position = (value: unknown): value is [number,number] => Array.isArray(value) && value.length===2 && finite(value[0],-180,180) && finite(value[1],-85,85);
const summaryPath = (value: unknown): value is string => typeof value==='string' && /^\/data\/monitor-[a-z0-9]+(?:-[a-z0-9]+)*\/summary\.json$/.test(value);
function region(value: unknown): value is MonitoringRegion {
  if(!object(value)||!slug(value.id)||!slug(value.eventId)||!text(value.title)||!position(value.coordinates)||!Array.isArray(value.bbox)||value.bbox.length!==4)return false;
  const [west,south,east,north]=value.bbox;
  if(!finite(west,-180,180)||!finite(east,-180,180)||!finite(south,-85,85)||!finite(north,-85,85)||west>=east||south>=north)return false;
  if(!['available','insufficient-data','stale','error'].includes(String(value.status))||!finite(value.candidateCount,0,1e7)||!Number.isInteger(value.candidateCount))return false;
  if(value.reason!==undefined&&!text(value.reason))return false;
  if(value.summaryUrl!==undefined&&(!summaryPath(value.summaryUrl)||value.summaryUrl!==`/data/${value.id}/summary.json`))return false;
  if(value.latestObservationAt!==undefined&&!isoDate(value.latestObservationAt))return false;
  if(value.referenceObservationAt!==undefined&&!isoDate(value.referenceObservationAt))return false;
  if(isoDate(value.latestObservationAt)&&isoDate(value.referenceObservationAt)&&Date.parse(value.referenceObservationAt)>=Date.parse(value.latestObservationAt))return false;
  return value.status!=='available'||(summaryPath(value.summaryUrl)&&isoDate(value.latestObservationAt)&&isoDate(value.referenceObservationAt));
}
export function validMonitoringStatus(value: unknown): value is MonitoringStatus {
  if(!object(value)||value.schemaVersion!==1||value.mode!=='regional'||!isoDate(value.checkedAt)||!isoDate(value.generatedAt)||!finite(value.freshnessMaxAgeDays,1,90)||!Number.isInteger(value.freshnessMaxAgeDays))return false;
  if(typeof value.featuresUrl!=='string'||!/^\/data\/monitoring\/[a-zA-Z0-9_-]+\.geojson$/.test(value.featuresUrl))return false;
  const method=value.method;
  if(!object(method)||!text(method.name)||!text(method.version)||!text(method.description)||!Array.isArray(method.limitations)||!method.limitations.every(text))return false;
  if(!Array.isArray(value.regions)||!value.regions.every(region))return false;
  if(new Set(value.regions.map(item=>item.id)).size!==value.regions.length)return false;
  const checkedAt=Date.parse(value.checkedAt);
  return value.regions.every(item=>!item.latestObservationAt||Date.parse(item.latestObservationAt)<=checkedAt+86400000);
}
export function validChangeFeatures(value: unknown): value is ChangeFeatures {
  if(!object(value)||value.type!=='FeatureCollection'||!Array.isArray(value.features))return false;
  return value.features.every(feature=>{
    if(!object(feature)||feature.type!=='Feature'||!object(feature.geometry)||feature.geometry.type!=='Point'||!position(feature.geometry.coordinates)||!object(feature.properties))return false;
    const p=feature.properties;
    return text(p.id)&&slug(p.regionId)&&slug(p.eventId)&&p.metric==='NDVI'&&p.reviewStatus==='unreviewed'
      && finite(p.delta,-2,2)&&((p.direction==='decrease'&&p.delta<0)||(p.direction==='increase'&&p.delta>0))
      && finite(p.areaHa,Number.MIN_VALUE,1e8)&&isoDate(p.beforeDate)&&isoDate(p.afterDate)&&Date.parse(p.beforeDate)<Date.parse(p.afterDate)
      && (p.threshold===undefined||finite(p.threshold,0,2));
  });
}

/** Re-evaluate freshness when an old saved status is opened later. This never changes source timestamps. */
export function monitoringState(value: MonitoringRegion, freshnessMaxAgeDays: number, now=Date.now()): MonitoringRegionState {
  if(value.status!=='available')return value.status;
  if(!value.latestObservationAt||now-Date.parse(value.latestObservationAt)>freshnessMaxAgeDays*86400000)return 'stale';
  return 'available';
}
