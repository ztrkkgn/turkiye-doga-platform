import { monitoringState, validChangeFeatures, validMonitoringStatus, type ChangeFeatures, type MonitoringStatus } from './monitoring.ts';

export interface MonitoringSnapshot {
  status: MonitoringStatus;
  changes: ChangeFeatures;
  baseUrl: string;
  origin: 'repository' | 'local';
}
export const DEFAULT_MONITORING_BASE_URL='https://raw.githubusercontent.com/ztrkkgn/turkiye-doga-platform/main/web/public';
let snapshotReadSequence=0;

function publicBase(value:string):string {
 const url=new URL(value);
 const host=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!host.includes('.')
   ||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal')
   ||host.includes(':')||/^\[/.test(host)||/^\d+\.\d+\.\d+\.\d+$/.test(host))throw new Error('Invalid monitoring base URL');
 return url.toString().replace(/\/+$/,'');
}

/** Only local data paths can be resolved against the configured public source. */
export function monitoringAssetUrl(path:string,baseUrl:string):string {
 if(!/^\/data\/[a-z0-9]+(?:-[a-z0-9]+)*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(path)
   ||path.split('/').some(part=>part==='.'||part==='..'))throw new Error('Invalid monitoring asset path');
 return baseUrl ? `${publicBase(baseUrl)}${path}` : path;
}

async function readSnapshot(baseUrl:string,origin:MonitoringSnapshot['origin'],signal?:AbortSignal):Promise<MonitoringSnapshot> {
 const controller=new AbortController();
 const cancel=()=>controller.abort(signal?.reason);
 if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
 const timeout=setTimeout(()=>controller.abort(),origin==='repository'?8000:4000);
 const nonce=origin==='repository'?`${Date.now()}-${++snapshotReadSequence}`:undefined;
 async function json(path:string):Promise<unknown> {
  const assetUrl=monitoringAssetUrl(path,baseUrl);
  const response=await fetch(nonce?`${assetUrl}?snapshot=${encodeURIComponent(nonce)}`:assetUrl,{signal:controller.signal,cache:'no-store'});
  if(!response.ok)throw new Error('Monitoring asset unavailable');
  return response.json();
 }
 try {
  const status=await json('/data/monitoring/status.json');
  if(!validMonitoringStatus(status))throw new Error('Invalid monitoring status');
  const changes=await json(status.featuresUrl);
  if(!validChangeFeatures(changes))throw new Error('Invalid monitoring changes');
  const regions=new Map(status.regions.map(region=>[region.id,region]));
  const counts=new Map<string,number>();
  const featureIds=new Set<string>();
  for(const feature of changes.features) {
   const properties=feature.properties;
   const region=regions.get(properties.regionId);
   if(!region||region.eventId!==properties.eventId||!region.referenceObservationAt||!region.latestObservationAt
     ||Date.parse(region.referenceObservationAt)!==Date.parse(properties.beforeDate)
     ||Date.parse(region.latestObservationAt)!==Date.parse(properties.afterDate)
     ||featureIds.has(properties.id))throw new Error('Monitoring records do not match');
   featureIds.add(properties.id);counts.set(region.id,(counts.get(region.id)??0)+1);
  }
  if(status.regions.some(region=>region.candidateCount!==(counts.get(region.id)??0)))throw new Error('Monitoring candidate count does not match');
  const fresh=new Set(status.regions.filter(region=>monitoringState(region,status.freshnessMaxAgeDays)==='available').map(region=>region.id));
  return {status,changes:{...changes,features:changes.features.filter(feature=>fresh.has(feature.properties.regionId))},baseUrl,origin};
 } finally {
  clearTimeout(timeout);signal?.removeEventListener('abort',cancel);
 }
}

/** One complete source is used per snapshot; a failed remote pair is never combined with local data. */
export async function loadMonitoringSnapshot(signal?:AbortSignal):Promise<MonitoringSnapshot> {
 if(signal?.aborted)throw signal.reason??new Error('Monitoring request aborted');
 let remote:string|undefined;
 try {remote=publicBase(process.env.NEXT_PUBLIC_MONITORING_BASE_URL?.trim()||DEFAULT_MONITORING_BASE_URL)}catch {/* Invalid overrides can only fall back to local data. */}
 if(remote) {
  try {return await readSnapshot(remote,'repository',signal)}catch(error){if(signal?.aborted)throw error}
 }
 return readSnapshot('','local',signal);
}
