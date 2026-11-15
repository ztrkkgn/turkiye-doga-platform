import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {monitoringState, validMonitoringStatus, validChangeFeatures} from '../lib/monitoring.ts';

// Ephemeral synthetic contracts for validation tests; never published in public/data/.
function status() {
 return {schemaVersion:1,checkedAt:'2026-11-13T06:00:00Z',generatedAt:'2026-11-13T06:10:00Z',mode:'regional',freshnessMaxAgeDays:21,featuresUrl:'/data/monitoring/changes.geojson',method:{name:'Synthetic test method',version:'test',description:'Synthetic contract only.',limitations:['Not an observation.']},regions:[{id:'monitor-marmaris',eventId:'mugla-marmaris-2021',title:'Test area',coordinates:[28.21,36.77],bbox:[28.15,36.74,28.32,36.86],status:'available',latestObservationAt:'2026-11-10T09:00:00Z',referenceObservationAt:'2026-10-26T09:00:00Z',summaryUrl:'/data/monitor-marmaris/summary.json',candidateCount:1}]};
}
function points() {
 return {type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[28.21,36.77]},properties:{id:'candidate-test',regionId:'monitor-marmaris',eventId:'mugla-marmaris-2021',direction:'decrease',metric:'NDVI',delta:-.25,areaHa:2.4,beforeDate:'2026-10-26T09:00:00Z',afterDate:'2026-11-10T09:00:00Z',reviewStatus:'unreviewed',threshold:.2}}]};
}
test('available monitoring requires two actual acquisition dates and a matching local summary',()=>{
 assert.equal(validMonitoringStatus(status()),true);
 for(const field of ['latestObservationAt','referenceObservationAt','summaryUrl']){const value=status();delete value.regions[0][field];assert.equal(validMonitoringStatus(value),false)}
 const mixed=status();mixed.regions[0].summaryUrl='/data/monitor-bordubet/summary.json';assert.equal(validMonitoringStatus(mixed),false);
});
test('insufficient data is valid without invented dates, images or change counts',()=>{
 const value=status();value.regions=[{id:'monitor-marmaris',eventId:'mugla-marmaris-2021',title:'Test area',coordinates:[28.21,36.77],bbox:[28.15,36.74,28.32,36.86],status:'insufficient-data',candidateCount:0,reason:'No usable pair.'}];
 assert.equal(validMonitoringStatus(value),true);
 assert.equal(monitoringState(value.regions[0],21,Date.parse('2026-11-13')), 'insufficient-data');
 assert.equal(value.regions[0].summaryUrl,undefined);
});
test('a saved available status becomes stale as the actual acquisition ages',()=>{
 const value=status();const r=value.regions[0];
 assert.equal(monitoringState(r,21,Date.parse('2026-11-13')), 'available');
 assert.equal(monitoringState(r,21,Date.parse('2026-12-03')), 'stale');
 r.status='stale';assert.equal(monitoringState(r,21,Date.parse('2026-11-13')), 'stale');
 assert.equal(r.latestObservationAt,'2026-11-10T09:00:00Z');
});
test('monitoring rejects invalid locations, dates and unsafe asset paths',()=>{
 const invalid=status();invalid.regions[0].coordinates[0]=Infinity;assert.equal(validMonitoringStatus(invalid),false);
 const invalidDate=status();invalidDate.regions[0].referenceObservationAt='bad-date';assert.equal(validMonitoringStatus(invalidDate),false);
 const inverted=status();inverted.regions[0].referenceObservationAt='2026-11-12T09:00:00Z';assert.equal(validMonitoringStatus(inverted),false);
 for(const path of ['/data/monitoring/../private.geojson','https://example.org/changes.geojson','/data/monitoring/%2e%2e.geojson']){const value=status();value.featuresUrl=path;assert.equal(validMonitoringStatus(value),false)}
});
test('change candidates require physical deltas, consistent directions and an unreviewed label',()=>{
 assert.equal(validChangeFeatures(points()),true);
 for(const [field,value] of [['delta',NaN],['delta',-3],['direction','increase'],['reviewStatus','confirmed'],['afterDate','2026-10-20'],['areaHa',0]]){const data=points();data.features[0].properties[field]=value;assert.equal(validChangeFeatures(data),false)}
 assert.equal(validChangeFeatures({type:'FeatureCollection',features:[]}),true);
 const geometry=points();geometry.features[0].geometry.coordinates[1]=100;assert.equal(validChangeFeatures(geometry),false);
});
const actualUrl=new URL('../public/data/monitoring/status.json',import.meta.url);
test('validates the real generated monitoring output when present',{skip:!existsSync(actualUrl)},()=>{
 const actual=JSON.parse(readFileSync(actualUrl,'utf8'));assert.equal(validMonitoringStatus(actual),true);
 const geojson=new URL(`../public${actual.featuresUrl}`,import.meta.url);
 assert.equal(validChangeFeatures(JSON.parse(readFileSync(geojson,'utf8'))),true);
});
