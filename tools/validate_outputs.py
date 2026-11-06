"""Verify tracked real outputs offline; does not download or synthesize observations."""
from datetime import datetime
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def validate(root=ROOT):
    directory = root / 'web/public/data/marmaris'
    summary = json.loads((directory / 'summary.json').read_text())
    config_bytes = (root / 'data/regions/mugla-marmaris-2021.json').read_bytes()
    assert summary['configSha256'] == hashlib.sha256(config_bytes).hexdigest(), 'Config changed'
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
    assert 0.5 <= change['commonValidFraction'] <= 1
    assert -2 <= change['dnbrMean'] <= 2 and -2 <= change['ndviDeltaMean'] <= 2
    assert abs(change['ndviDeltaMean'] -
               (change['afterNdviCommonMean'] - change['beforeNdviCommonMean'])) < 1e-6
    before, after = [p['observation']['datetime'] for p in summary['periods']]
    assert datetime.fromisoformat(before) < datetime.fromisoformat(after)
    print(f"Verified real C1 pair: {before[:10]} / {after[:10]}; "
          f"{change['pixelCount']:,} common pixels; {len(summary['assetSha256'])} assets")


if __name__ == '__main__':
    validate()
