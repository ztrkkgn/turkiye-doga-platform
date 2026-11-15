import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {loadMonitoringSnapshot, monitoringAssetUrl, DEFAULT_MONITORING_BASE_URL} from '../lib/monitoring-source.ts';

// Transient synthetic values test loading boundaries; no fixture is written to public/.
function pair(ageDays=1) {
 const now=Date.now();const latest=new Date(now-ageDays*86400000).toISOString();const before=new Date(now-(ageDays+10)*86400000).toISOString();
 const status={schemaVersion:1,checkedAt:new Date(now).toISOString(),generatedAt:new Date(now).toISOString(),mode:'regional',freshnessMaxAgeDays:21,featuresUrl:'/data/monitoring/changes.geojson',method:{name:'Test',version:'test',description:'Transient fixture.',limitations:[]},regions:[{id:'monitor-marmaris',eventId:'mugla-marmaris-2021',title:'Synthetic test area',coordinates:[28.21,36.77],bbox:[28.15,36.74,28.32,36.86],status:'available',latestObservationAt:latest,referenceObservationAt:before,summaryUrl:'/data/monitor-marmaris/summary.json',candidateCount:1}]};
 const changes={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[28.21,36.77]},properties:{id:'candidate-test',regionId:'monitor-marmaris',eventId:'mugla-marmaris-2021',direction:'decrease',metric:'NDVI',delta:-.25,areaHa:2,beforeDate:before,afterDate:latest,reviewStatus:'unreviewed'}}]};
 return {status,changes};
}
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
function setup(t,handler,override) {
 const originalFetch=globalThis.fetch;const originalEnv=process.env.NEXT_PUBLIC_MONITORING_BASE_URL;
 if(override===undefined)delete process.env.NEXT_PUBLIC_MONITORING_BASE_URL;else process.env.NEXT_PUBLIC_MONITORING_BASE_URL=override;
 const calls=[];globalThis.fetch=async(url,options)=>{calls.push(String(url));return handler(String(url),options)};
 t.after(()=>{globalThis.fetch=originalFetch;if(originalEnv===undefined)delete process.env.NEXT_PUBLIC_MONITORING_BASE_URL;else process.env.NEXT_PUBLIC_MONITORING_BASE_URL=originalEnv});
 return calls;
}
test('loads the complete repository snapshot and resolves images from that same root',async t=>{
 const data=pair();const calls=setup(t,url=>response(url.endsWith('status.json')?data.status:data.changes));
 const result=await loadMonitoringSnapshot();assert.equal(result.origin,'repository');assert.equal(result.baseUrl,DEFAULT_MONITORING_BASE_URL);assert.equal(result.changes.features.length,1);
 assert.deepEqual(calls,[`${DEFAULT_MONITORING_BASE_URL}/data/monitoring/status.json`,`${DEFAULT_MONITORING_BASE_URL}/data/monitoring/changes.geojson`]);
 assert.equal(monitoringAssetUrl('/data/monitor-marmaris/latest.png',result.baseUrl),`${DEFAULT_MONITORING_BASE_URL}/data/monitor-marmaris/latest.png`);
});
test('a missing remote file falls back to a complete local pair without combining sources',async t=>{
 const remote=pair();const local=pair();local.status.method.name='Local snapshot';
 const calls=setup(t,url=>url.startsWith('https:')?(url.endsWith('status.json')?response(remote.status):response({},404)):response(url.endsWith('status.json')?local.status:local.changes));
 const result=await loadMonitoringSnapshot();assert.equal(result.origin,'local');assert.equal(result.baseUrl,'');assert.equal(result.status.method.name,'Local snapshot');
 assert.deepEqual(calls.slice(-2),['/data/monitoring/status.json','/data/monitoring/changes.geojson']);assert.equal(monitoringAssetUrl('/data/monitor-marmaris/latest.png',result.baseUrl),'/data/monitor-marmaris/latest.png');
});
test('network failure falls back locally and never fabricates an empty successful snapshot',async t=>{
 const local=pair();setup(t,url=>{if(url.startsWith('https:'))throw new TypeError('Network unavailable');return response(url.endsWith('status.json')?local.status:local.changes)});
 assert.equal((await loadMonitoringSnapshot()).origin,'local');
 globalThis.fetch=async()=>response({},404);await assert.rejects(loadMonitoringSnapshot());
});
test('mismatched candidate region, date or count invalidates the entire remote snapshot',async t=>{
 for(const change of ['region','date','count']){
  const remote=pair();const local=pair();
  if(change==='region')remote.changes.features[0].properties.eventId='another-event';
  if(change==='date')remote.changes.features[0].properties.afterDate=new Date(Date.now()-2*86400000).toISOString();
  if(change==='count')remote.status.regions[0].candidateCount=2;
  const restoreFetch=globalThis.fetch;const restoreEnv=process.env.NEXT_PUBLIC_MONITORING_BASE_URL;
  delete process.env.NEXT_PUBLIC_MONITORING_BASE_URL;
  globalThis.fetch=async url=>{const source=String(url).startsWith('https:')?remote:local;return response(String(url).endsWith('status.json')?source.status:source.changes)};
  try{assert.equal((await loadMonitoringSnapshot()).origin,'local')}finally{globalThis.fetch=restoreFetch;if(restoreEnv===undefined)delete process.env.NEXT_PUBLIC_MONITORING_BASE_URL;else process.env.NEXT_PUBLIC_MONITORING_BASE_URL=restoreEnv}
 }
});
test('old acquisition data cannot produce current map candidates',async t=>{
 const data=pair(40);setup(t,url=>response(url.endsWith('status.json')?data.status:data.changes));
 const result=await loadMonitoringSnapshot();assert.equal(result.origin,'repository');assert.equal(result.changes.features.length,0);assert.equal(result.status.regions[0].latestObservationAt,data.status.regions[0].latestObservationAt);
});
test('HTTPS override is used consistently and arbitrary hosts cannot come from asset data',async t=>{
 const data=pair();const calls=setup(t,url=>response(url.endsWith('status.json')?data.status:data.changes),'https://cdn.example.org/nature/');
 const result=await loadMonitoringSnapshot();assert.equal(result.baseUrl,'https://cdn.example.org/nature');assert.ok(calls.every(url=>url.startsWith(result.baseUrl+'/data/')));
 for(const path of ['https://evil.example/a.png','//evil.example/a.png','/data/monitor-marmaris/../a.png','/data/monitor-marmaris/%2e%2e.png','/data/monitor-marmaris/a.png?redirect=https://evil.example'])assert.throws(()=>monitoringAssetUrl(path,result.baseUrl));
});
test('invalid override can only use local data and cancellation does not start fallback requests',async t=>{
 const data=pair();const calls=setup(t,url=>response(url.endsWith('status.json')?data.status:data.changes),'http://localhost:8000');
 assert.equal((await loadMonitoringSnapshot()).origin,'local');assert.ok(calls.every(url=>url.startsWith('/data/')));
 const controller=new AbortController();controller.abort();const count=calls.length;
 await assert.rejects(loadMonitoringSnapshot(controller.signal));assert.equal(calls.length,count);
});

const actualStatus=new URL('../public/data/monitoring/status.json',import.meta.url);
test('loads the real generated status and candidate files as one consistent local snapshot',{skip:!existsSync(actualStatus)},async t=>{
 setup(t,url=>{
  if(url.startsWith('https:'))return response({},404);
  const file=new URL(`../public${url}`,import.meta.url);
  return existsSync(file)?response(JSON.parse(readFileSync(file,'utf8'))):response({},404);
 });
 const result=await loadMonitoringSnapshot();
 assert.equal(result.origin,'local');
 assert.equal(result.status.mode,'regional');
 assert.ok(result.changes.features.every(feature=>result.status.regions.some(region=>region.id===feature.properties.regionId&&region.eventId===feature.properties.eventId)));
});
