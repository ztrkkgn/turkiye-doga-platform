"""Verify tracked real outputs offline; does not download or synthesize observations."""
import argparse
from datetime import datetime
import hashlib
import math
import os
import json
from pathlib import Path

from PIL import Image
from doga.config import public_slug, path_component

ROOT = Path(__file__).resolve().parents[1]


def validate_region(root, config_path):
    config_bytes = config_path.read_bytes()
    config = json.loads(config_bytes)
    slug = public_slug(config)
    directory = root / 'web/public/data' / slug
    summary = json.loads((directory / 'summary.json').read_text())
    assert summary['configSha256'] == hashlib.sha256(config_bytes).hexdigest(), 'Config changed'
    assert summary.get('publicSlug', 'marmaris') == slug
    assert summary['id'] == config['id']
    assert summary['status'] == 'preliminary', 'Pilot must remain preliminary'
    assert summary['quality']['fieldValidated'] is False
    assert summary['quality']['observationType'] == 'single-scene'
    for filename, expected in summary['assetSha256'].items():
        assert Path(filename).name == filename, 'Unsafe asset path'
        path = directory / filename
        assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, filename
        if path.suffix == '.png':
            with Image.open(path) as im:
                assert im.size == (summary['grid']['width'], summary['grid']['height'])
                assert im.mode == 'RGBA'
    provenance = json.loads((directory / 'provenance.json').read_text())
    assert provenance['collection'] == 'sentinel-2-c1-l2a'
    for filename, expected in provenance['sourceSha256'].items():
        actual = hashlib.sha256((root / 'analysis/src/doga' / filename).read_bytes()).hexdigest()
        assert actual == expected, f'Analysis source changed since processing: {filename}'
    for period in summary['periods']:
        obs = period['observation']
        assert period['status'] == 'available'
        for key in ['rgbUrl', 'ndviUrl', 'nbrUrl']:
            assert obs[key].startswith(f'/data/{slug}/')
            assert '..' not in obs[key]
        assert period['start'] <= obs['datetime'][:10] <= period['end']
        assert -1 <= obs['ndviMean'] <= 1 and -1 <= obs['nbrMean'] <= 1
        assert summary['quality']['minValidFraction'] <= obs['validFraction'] <= 1
        item = provenance['selection']['items'][period['id']]
        assert item['id'] == obs['itemId']
        assert item['properties']['s2:product_uri'] == obs['productId']
        assert item['collection'] == provenance['collection']
        for band in ['red', 'nir', 'nir08', 'swir22']:
            assert 'file:checksum' in item['assets'][band], 'Missing upstream integrity metadata'
    change = summary['comparisons']['fire']
    assert summary['quality']['minValidFraction'] <= change['commonValidFraction'] <= 1
    assert -2 <= change['dnbrMean'] <= 2 and -2 <= change['ndviDeltaMean'] <= 2
    assert abs(change['ndviDeltaMean'] -
               (change['afterNdviCommonMean'] - change['beforeNdviCommonMean'])) < 1e-6
    before, after = [p['observation']['datetime'] for p in summary['periods']]
    assert datetime.fromisoformat(before) < datetime.fromisoformat(after)
    print(f"Verified {config['id']} real C1 pair: {before[:10]} / {after[:10]}; "
          f"{change['pixelCount']:,} common pixels; {len(summary['assetSha256'])} assets")


def validate(root=ROOT, region=None):
    root = Path(root)
    configs = sorted((root / 'data/regions').glob('*.json')) + sorted((root / 'data/monitoring/configs').glob('*.json'))
    selected = []
    for config_path in configs:
        config = json.loads(config_path.read_text())
        slug = public_slug(config)
        if region is not None:
            path_component(region, 'region')
            if region not in [config['id'], slug]:
                continue
        elif not (root / 'data/processed' / config['id'] / 'selection.json').exists():
            continue
        selected.append(config_path)
    if not selected:
        raise ValueError('Doğrulanacak işlenmiş bölge bulunamadı.')
    for config_path in selected:
        validate_region(root, config_path)
    validate_monitoring(root)
    return len(selected)


def version_monitor_assets(root=ROOT):
    """Give monitoring PNGs acquisition/source-bound URLs before one Git publication."""
    root = Path(root)
    for path in sorted((root / 'web/public/data').glob('monitor-*/summary.json')):
        summary = json.loads(path.read_text())
        provenance = json.loads(path.with_name('provenance.json').read_text())
        observations = {p['id']: p['observation'] for p in summary['periods']}
        identity = json.dumps({'items': [observations[k]['itemId'] for k in ['before','after']],
                               'source': provenance['sourceSha256']}, sort_keys=True).encode()
        digest = hashlib.sha256(identity).hexdigest()[:12]
        dates = '-'.join(observations[k]['datetime'][:10].replace('-', '') for k in ['before','after'])
        prefix = f'{dates}-{digest}__'
        mapping = {}
        for filename in summary['assetSha256']:
            if not filename.endswith('.png'):
                continue
            assert Path(filename).name == filename, 'Unsafe image filename'
            logical_name = filename.rsplit('__', 1)[-1]
            new_name = prefix + logical_name
            mapping[filename] = new_name
            if filename != new_name:
                os.replace(path.parent / filename, path.parent / new_name)
        for period in summary['periods']:
            obs = period['observation']
            for key in ['rgbUrl', 'ndviUrl', 'nbrUrl']:
                filename = obs[key].rsplit('/', 1)[-1]
                obs[key] = obs[key].rsplit('/', 1)[0] + '/' + mapping.get(filename, filename)
        change = summary['comparisons']['fire']
        for key in ['dnbrUrl', 'ndviDeltaUrl']:
            filename = change[key].rsplit('/', 1)[-1]
            change[key] = change[key].rsplit('/', 1)[0] + '/' + mapping.get(filename, filename)
        summary['assetSha256'] = {mapping.get(name, name): value for name,value in summary['assetSha256'].items()}
        summary['imageFilePrefix'] = prefix
        encoded = json.dumps(summary, ensure_ascii=False, indent=2, allow_nan=False) + '\n'
        path.write_text(encoded)
        (root / 'data/processed' / summary['id'] / 'summary.json').write_text(encoded)
        print(f'Versioned monitoring images: {summary["id"]} {prefix}')


def validate_monitoring(root=ROOT):
    root = Path(root)
    status_path = root / 'web/public/data/monitoring/status.json'
    if not status_path.exists():
        return
    status = json.loads(status_path.read_text())
    collection = json.loads((root / 'web/public/data/monitoring/changes.geojson').read_text())
    assert status['schemaVersion'] == 1 and status['mode'] == 'regional'
    assert collection['type'] == 'FeatureCollection'
    regions = {r['id']:r for r in status['regions']}
    counts = {identifier:0 for identifier in regions}
    for feature in collection['features']:
        props = feature['properties']
        region = regions[props['regionId']]
        assert region['status'] == 'available', 'Unavailable region leaked into current layer'
        assert props['metric'] == 'NDVI' and props['reviewStatus'] == 'unreviewed'
        assert props['direction'] in ['decrease', 'increase']
        assert math.isfinite(props['delta']) and -2 <= props['delta'] <= 2
        assert (props['delta'] < 0) == (props['direction'] == 'decrease')
        assert props['areaHa'] > 0 and props['pixelCount'] > 0
        assert abs(props['areaHa'] - props['pixelCount'] * 0.04) < 1e-7
        assert props['beforeDate'] == region['referenceObservationAt']
        assert props['afterDate'] == region['latestObservationAt']
        assert abs(props['modifiedZ']) > 3.5
        assert feature['geometry']['type'] == 'Point'
        lon, lat = feature['geometry']['coordinates']
        w, s, e, n = region['bbox']
        assert w-1e-5 <= lon <= e+1e-5 and s-1e-5 <= lat <= n+1e-5
        counts[region['id']] += 1
    for identifier, region in regions.items():
        assert counts[identifier] == region['candidateCount']
        if region['status'] == 'available':
            age = (datetime.fromisoformat(status['checkedAt']) -
                   datetime.fromisoformat(region['latestObservationAt'].replace('Z','+00:00'))).total_seconds()/86400
            assert 0 <= age <= status['freshnessMaxAgeDays']
    print(f'Verified monitoring manifest: {len(regions)} regions, {len(collection["features"])} unreviewed candidates')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Gerçek bölge çıktılarının çevrimdışı doğrulaması')
    parser.add_argument('--region', help='Bölge kimliği veya publicSlug; verilmezse tüm işlenmiş bölgeler')
    parser.add_argument('--version-monitor-assets', action='store_true', help='İzleme PNG URL’lerini çekim çiftine göre sürümle')
    args = parser.parse_args()
    if args.version_monitor_assets:
        version_monitor_assets()
    validate(region=args.region)
