"""Network-free lifecycle tests; synthetic fixtures never leave pytest temp directories."""
from datetime import datetime, timedelta, timezone
import json
from types import SimpleNamespace

from affine import Affine
import numpy as np
import pytest
import rasterio

from doga import monitor


@pytest.fixture
def region():
    return {'slug':'fixture', 'eventId':'fixture-event', 'title':'Temporary test region',
            'province':'Test', 'bbox':[28.0,36.8,28.1,36.9], 'coordinates':[28.05,36.85],
            'crs':'EPSG:32635', 'tile':'35SNA', 'sources':[]}


def test_unchanged_acquisitions_keep_analysis_time_and_skip_band_processing(tmp_path, monkeypatch, region):
    dates = {'before':'2026-10-20T09:00:00Z', 'after':'2026-11-08T09:00:00Z'}
    monkeypatch.setattr(monitor, 'candidates', lambda config,p:[{
        'id':'TEST_FIXTURE_'+p['id'], 'properties':{'datetime':dates[p['id']]}}])
    monkeypatch.setattr(monitor, 'choose_usable', lambda options,*args:options[0])
    grid = SimpleNamespace(crs='EPSG:32635', width=10, height=10,
        transform=Affine(20,0,600000,0,-20,4100000), mask=np.ones((10,10),dtype=bool))
    monkeypatch.setattr(monitor, 'make_grid', lambda _:grid)
    calls = []
    def analyze(config_path, root, selected_items=None):
        calls.append(True)
        output = root / 'web/public/data/monitor-fixture'
        output.mkdir(parents=True)
        cache = root / 'data/cache/monitor-fixture'
        cache.mkdir(parents=True)
        for phase in ['before','after']:
            values = np.full((10,10),0.5,dtype=np.float32)
            if phase == 'after': values += np.tile(np.linspace(-0.02,0.02,10),(10,1))
            with rasterio.open(cache/f'{phase}-indices.tif','w',driver='GTiff',width=10,height=10,
                count=1,dtype='float32',crs=grid.crs,transform=grid.transform,nodata=-9999) as dst:
                dst.write(values,1)
        summary = {'id':'monitor-fixture','generatedAt':'2026-11-13T09:00:00Z',
            'periods':[{'id':p,'observation':{'datetime':dates[p]}} for p in ['before','after']]}
        (output/'summary.json').write_text(json.dumps(summary))
        return summary
    monkeypatch.setattr(monitor,'analyze',analyze)
    now = datetime(2026,11,13,12,tzinfo=timezone.utc)
    first, _ = monitor.process_region(region,{},tmp_path,now,{})
    original = (tmp_path/'web/public/data/monitor-fixture/summary.json').read_bytes()
    second, _ = monitor.process_region(region,{},tmp_path,now+timedelta(days=1),first)
    assert len(calls) == 1
    assert first['generatedAt'] == second['generatedAt']
    assert first['latestObservationAt'] == second['latestObservationAt']
    assert (tmp_path/'web/public/data/monitor-fixture/summary.json').read_bytes() == original


def test_failed_check_preserves_prior_real_product_and_excludes_current_candidates(tmp_path, monkeypatch, region):
    path = tmp_path/'web/public/data/monitor-fixture/summary.json'
    path.parent.mkdir(parents=True)
    path.write_text('{"existing":"test-only sentinel"}')
    original = path.read_bytes()
    def fail(*args): raise TimeoutError('Simulated catalog timeout')
    monkeypatch.setattr(monitor,'candidates',fail)
    previous = {'summaryUrl':'/data/monitor-fixture/summary.json',
                'latestObservationAt':'2026-11-08T09:00:00Z','generatedAt':'2026-11-13T09:00:00Z'}
    record, features = monitor.process_region(region,{},tmp_path,
        datetime(2026,11,13,12,tzinfo=timezone.utc),previous)
    assert record['status'] == 'error' and record['candidateCount'] == 0
    assert record['summaryUrl'] == previous['summaryUrl']
    assert record['generatedAt'] == previous['generatedAt']
    assert features == [] and path.read_bytes() == original
