import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {validSummary} from '../lib/data.ts';

const catalog=JSON.parse(readFileSync(new URL('../lib/events-catalog.json',import.meta.url),'utf8'));

test('published event records have unique shareable routes and documented locations',()=>{
  assert.ok(catalog.events.length>1);
  assert.equal(new Set(catalog.events.map(event=>event.id)).size,catalog.events.length);
  assert.equal(new Set(catalog.events.map(event=>event.slug)).size,catalog.events.length);
  for(const event of catalog.events){
    assert.match(event.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(event.coordinates.length,2);
    assert.ok(event.coordinates[0]>=25.5&&event.coordinates[0]<=45);
    assert.ok(event.coordinates[1]>=35.5&&event.coordinates[1]<=42.5);
    assert.equal(Number(event.date.slice(0,4)),event.year);
    assert.match(event.date,/^\d{4}(?:-\d{2}-\d{2})?$/);
    assert.ok(event.coordinateNote.length>10);
    assert.ok(event.sources.length>0&&event.sources.every(source=>source.publisher&&source.title&&source.url.startsWith('https://')));
  }
});

test('an analyzed historical event must resolve to its own real dataset',()=>{
  for(const event of catalog.events){
    if(event.analysis.status!=='available'){
      assert.equal(event.analysis.status,'pending');
      assert.equal(event.analysis.summaryUrl,undefined);
      continue;
    }
    assert.match(event.analysis.summaryUrl,/^\/data\/[a-z0-9-]+\/summary\.json$/);
    const path=new URL(`../public${event.analysis.summaryUrl}`,import.meta.url);
    assert.ok(existsSync(path));
    const summary=JSON.parse(readFileSync(path,'utf8'));
    assert.equal(summary.id,event.id);
    assert.equal(validSummary(summary,event.analysis.summaryUrl.replace('summary.json','')),true);
    assert.ok(summary.periods.every(period=>period.observation?.itemId?.startsWith('S2')));
  }
});

test('current monitoring refers to documented events without upgrading their historical analysis status',()=>{
  const status=JSON.parse(readFileSync(new URL('../public/data/monitoring/status.json',import.meta.url),'utf8'));
  for(const region of status.regions){
    const event=catalog.events.find(event=>event.id===region.eventId);
    assert.ok(event,`Unknown monitored event ${region.eventId}`);
    assert.equal(event.category,'fire','Current NDVI land detector does not claim water-area analysis');
  }
});
