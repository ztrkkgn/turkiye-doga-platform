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
    monkeypatch.setattr(monitor, 'choose_usable', lambda options,*args,**kwargs:options[0])
    grid = SimpleNamespace(crs='EPSG:32635', width=10, height=10,
        transform=Affine(20,0,600000,0,-20,4100000), mask=np.ones((10,10),dtype=bool))
    monkeypatch.setattr(monitor, 'make_grid', lambda _:grid)
    calls = []
    def analyze(config_path, root, selected_items=None):
        calls.append(True)
        output = root / 'web/public/data/monitor-fixture'
        output.mkdir(parents=True, exist_ok=True)
        cache = root / 'data/cache/monitor-fixture'
        cache.mkdir(parents=True, exist_ok=True)
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
    changed, _ = monitor.process_region(region, {'minValidFraction':0.6}, tmp_path, now+timedelta(days=1), second)
    assert len(calls) == 2
    assert changed['fingerprint'] != second['fingerprint']


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


@pytest.mark.parametrize('existing', [False, True])
@pytest.mark.parametrize('failure_phase', ['analysis', 'detection'])
def test_failed_update_restores_config_public_assets_and_processed_pins(tmp_path, monkeypatch, region, existing, failure_phase):
    dates = {'before':'2026-10-20T09:00:00Z', 'after':'2026-11-08T09:00:00Z'}
    monkeypatch.setattr(monitor, 'candidates', lambda config,p:[{
        'id':'TEST_FIXTURE_'+p['id'], 'properties':{'datetime':dates[p['id']]}}])
    monkeypatch.setattr(monitor, 'choose_usable', lambda options,*args,**kwargs:options[0])
    grid = SimpleNamespace(crs='EPSG:32635', width=10, height=10,
        transform=Affine(20,0,600000,0,-20,4100000), mask=np.ones((10,10),dtype=bool))
    monkeypatch.setattr(monitor, 'make_grid', lambda _:grid)
    config = tmp_path/'data/monitoring/configs/monitor-fixture.json'
    output = tmp_path/'web/public/data/monitor-fixture'
    processed = tmp_path/'data/processed/monitor-fixture'
    if existing:
        for path, content in [(config,b'{"old-config":true}'),
            (output/'summary.json',b'{"old-summary":true}'),
            (output/'candidates.geojson',b'{"old-candidates":true}'),
            (output/'previous-rgb.png',b'old-image-fixture'),
            (processed/'selection.json',b'{"old-pin":true}'),
            (processed/'summary.json',b'{"old-summary":true}')]:
            path.parent.mkdir(parents=True,exist_ok=True)
            path.write_bytes(content)
    def snapshot():
        paths = [config] + list(output.rglob('*')) + list(processed.rglob('*'))
        return {str(path.relative_to(tmp_path)):path.read_bytes() for path in paths if path.is_file()}
    original = snapshot()
    def analyze(config_path, root, selected_items=None):
        assert json.loads(config_path.read_text())['periods'][1]['end'] == '2026-11-13'
        for path, content in [(output/'summary.json','partial-new-summary'),
            (output/'new-rgb.png','partial-new-image'),
            (processed/'summary.json','partial-new-summary'),
            (processed/'selection.json','partial-new-pin')]:
            path.parent.mkdir(parents=True,exist_ok=True)
            path.write_text(content)
        if failure_phase == 'analysis':
            raise RuntimeError('Simulated common-support rejection after config write')
        cache = root/'data/cache/monitor-fixture'
        cache.mkdir(parents=True,exist_ok=True)
        for period in ['before','after']:
            with rasterio.open(cache/f'{period}-indices.tif','w',driver='GTiff',width=10,height=10,
                count=1,dtype='float32',crs=grid.crs,transform=grid.transform,nodata=-9999) as dst:
                dst.write(np.full((10,10),0.5,dtype=np.float32),1)
        return {'generatedAt':'2026-11-13T09:00:00Z',
            'periods':[{'id':p,'observation':{'datetime':dates[p]}} for p in ['before','after']]}
    monkeypatch.setattr(monitor,'analyze',analyze)
    def fail_detection(*args,**kwargs):
        raise RuntimeError('Simulated detection failure after pair publication')
    monkeypatch.setattr(monitor,'detect_changes',fail_detection)
    previous = {'generatedAt':'2026-11-10T09:00:00Z'} if existing else {}
    record, features = monitor.process_region(region,{},tmp_path,
        datetime(2026,11,13,12,tzinfo=timezone.utc),previous)
    assert record['status'] == 'error' and features == []
    assert snapshot() == original
    assert config.exists() == existing and output.exists() == existing and processed.exists() == existing
    if existing:
        assert record['generatedAt'] == previous['generatedAt']


@pytest.mark.parametrize('compatible_reference', [False, True])
def test_reference_selection_requires_common_scl_support_and_reuses_masks(tmp_path, monkeypatch, compatible_reference):
    grid = SimpleNamespace(crs='EPSG:32635', width=10, height=10,
        transform=Affine(20,0,600000,0,-20,4100000), mask=np.ones((10,10),dtype=bool))
    monkeypatch.setattr(monitor,'make_grid',lambda _:grid)
    monkeypatch.setattr(monitor,'valid_land_mask',lambda scl,halo:scl.astype(bool))
    masks = {}
    for name, rows in [('latest',slice(0,6)), ('newer-reference',slice(4,10)), ('older-reference',slice(0,6))]:
        mask = np.zeros((16,16),dtype=np.uint8)
        mask[3:13,3:13][rows,:] = 1
        masks[name] = mask
    reads = []
    def read_band(asset,*args,**kwargs):
        reads.append(asset['name'])
        return masks[asset['name']]
    monkeypatch.setattr(monitor,'read_band',read_band)
    items = {name:{'id':name,'assets':{'scl':{'name':name}}} for name in masks}
    config = {'id':'monitor-fixture','bbox':[28.0,36.8,28.1,36.9], 'crs':'EPSG:32635',
              'resolutionM':20, 'minValidFraction':0.5}
    latest = monitor.choose_usable([items['latest']],config,tmp_path)
    options = [items['newer-reference']] + ([items['older-reference']] if compatible_reference else [])
    if compatible_reference:
        chosen = monitor.choose_usable(options,config,tmp_path,common_with=latest)
        assert chosen['id'] == 'older-reference'
        assert reads == ['latest','newer-reference','older-reference']
        monitor.choose_usable(options,config,tmp_path,common_with=latest)
        assert len(reads) == 3
    else:
        with pytest.raises(monitor.InsufficientData, match='ortak'):
            monitor.choose_usable(options,config,tmp_path,common_with=latest)
