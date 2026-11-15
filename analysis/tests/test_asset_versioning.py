import hashlib
import json
from PIL import Image

from tools.validate_outputs import version_monitor_assets


def test_monitor_images_have_date_bound_urls_and_idempotent_packaging(tmp_path):
    directory = tmp_path/'web/public/data/monitor-fixture'
    directory.mkdir(parents=True)
    processed = tmp_path/'data/processed/monitor-fixture'
    processed.mkdir(parents=True)
    hashes = {}
    for phase in ['before','after']:
        for kind in ['rgb','ndvi','nbr']:
            name = f'{phase}-{kind}.png'
            Image.new('RGBA',(4,3),(23,50,40,255)).save(directory/name)
            hashes[name] = hashlib.sha256((directory/name).read_bytes()).hexdigest()
    for name in ['dnbr.png','ndvi_delta.png']:
        Image.new('RGBA',(4,3),(12,20,40,255)).save(directory/name)
        hashes[name] = hashlib.sha256((directory/name).read_bytes()).hexdigest()
    provenance = {'sourceSha256':{'fixture.py':'test-source-hash'}}
    (directory/'provenance.json').write_text(json.dumps(provenance))
    summary = {'id':'monitor-fixture','periods':[
        {'id':p,'observation':{'itemId':'TEST_FIXTURE_'+p,
          'datetime':('2026-10-20' if p=='before' else '2026-11-08')+'T09:00:00Z',
          **{k+'Url':f'/data/monitor-fixture/{p}-{k}.png' for k in ['rgb','ndvi','nbr']}}}
        for p in ['before','after']], 'comparisons':{'fire':{
            'dnbrUrl':'/data/monitor-fixture/dnbr.png','ndviDeltaUrl':'/data/monitor-fixture/ndvi_delta.png'}},
        'assetSha256':hashes}
    path = directory/'summary.json'
    path.write_text(json.dumps(summary))
    version_monitor_assets(tmp_path)
    first = json.loads(path.read_text())
    assert first['imageFilePrefix'].startswith('20261020-20261108-')
    assert not (directory/'before-rgb.png').exists()
    for period in first['periods']:
        for key in ['rgbUrl','ndviUrl','nbrUrl']:
            assert first['imageFilePrefix'] in period['observation'][key]
    for name,digest in first['assetSha256'].items():
        assert hashlib.sha256((directory/name).read_bytes()).hexdigest() == digest
    original = path.read_bytes()
    version_monitor_assets(tmp_path)
    assert path.read_bytes() == original
    assert (processed/'summary.json').read_bytes() == original
