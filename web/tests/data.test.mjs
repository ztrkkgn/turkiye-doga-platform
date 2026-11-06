import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validSummary } from '../lib/data.ts';

// Synthetic contract fixture: not satellite data and never copied into public/.
function record() {
 const observation={datetime:'2021-07-28T09:00:00Z',itemId:'synthetic-test',productId:'synthetic-test',cloudCover:0,baseline:'03.01',boaOffsetApplied:false,validFraction:.9,ndviMean:.6,nbrMean:.4,rgbUrl:'/data/marmaris/before-rgb.png',ndviUrl:'/data/marmaris/before-ndvi.png',nbrUrl:'/data/marmaris/before-nbr.png'};
 return {schemaVersion:1,bbox:[28.2,36.8,28.3,36.9],areaKm2:100,generatedAt:'2026-11-06T00:00:00Z',methodVersion:'test',grid:{crs:'EPSG:32635',resolutionM:20,width:500,height:500},periods:[{id:'before',label:'Test observation',start:'2021-07-15',end:'2021-07-28',status:'available',observation}],comparisons:{fire:{commonValidFraction:.8,ndviDeltaMean:-.3,dnbrMean:.5,dnbrUrl:'/data/marmaris/dnbr.png',ndviDeltaUrl:'/data/marmaris/delta.png',pixelCount:200000}},assets:{aoiUrl:'/data/marmaris/aoi.geojson'},sources:[],limitations:[]};
}
test('accepts a finite physical-range analysis contract',()=>assert.equal(validSummary(record()),true));
test('rejects physically invalid NDVI instead of rendering it',()=>{const r=record();r.periods[0].observation.ndviMean=1.1;assert.equal(validSummary(r),false);r.periods[0].observation.ndviMean=NaN;assert.equal(validSummary(r),false)});
test('rejects impossible common-area fractions and invalid delta',()=>{const r=record();r.comparisons.fire.commonValidFraction=1.01;assert.equal(validSummary(r),false);r.comparisons.fire.commonValidFraction=.8;r.comparisons.fire.dnbrMean=Infinity;assert.equal(validSummary(r),false)});
test('requires an observation for an available period',()=>{const r=record();delete r.periods[0].observation;assert.equal(validSummary(r),false)});
test('does not load analytical assets outside the published data directory',()=>{const r=record();r.assets.aoiUrl='/data/marmaris/../../private.json';assert.equal(validSummary(r),false)});

test('loads the generated real Sentinel-2 Collection 1 pilot record',()=>{const actual=JSON.parse(readFileSync(new URL('../public/data/marmaris/summary.json',import.meta.url),'utf8'));assert.equal(validSummary(actual),true);assert.equal(actual.id,'mugla-marmaris-2021');assert.ok(actual.periods.every(p=>p.status!=='available'||p.observation.itemId.startsWith('S2')))});
test('accepts an explicitly unknown offset flag but rejects a made-up string',()=>{const r=record();r.periods[0].observation.boaOffsetApplied=null;assert.equal(validSummary(r),true);r.periods[0].observation.boaOffsetApplied='unknown';assert.equal(validSummary(r),false)});
