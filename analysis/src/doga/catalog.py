"""Bounded public catalog search and provenance; no credentials required."""
from datetime import datetime
import json
from pathlib import Path

from pystac_client import Client
from pystac_client.stac_api_io import StacApiIO
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

EARTH_SEARCH = 'https://earth-search.aws.element84.com/v1'
COPERNICUS = 'https://stac.dataspace.copernicus.eu/v1'
COLLECTION = 'sentinel-2-c1-l2a'


def http_session():
    session = requests.Session()
    session.mount('https://', HTTPAdapter(max_retries=Retry(total=3, backoff_factor=1,
                  status_forcelist=[429, 500, 502, 503, 504])))
    return session


def candidates(config, period):
    catalog = Client.open(EARTH_SEARCH, stac_io=StacApiIO(timeout=45, max_retries=3))
    items = catalog.search(collections=[COLLECTION], bbox=config['bbox'],
        datetime=f"{period['start']}T00:00:00Z/{period['end']}T23:59:59Z",
        query={'eo:cloud_cover': {'lte': config['maxSceneCloudCover']}},
        max_items=200, method='GET').item_collection()
    items = [item.to_dict() for item in items if config['tile'] in item.id]
    # Deduplicate acquisitions. Prefer the latest processing baseline/sequence.
    by_date = {}
    for item in items:
        p = item['properties']
        key = (p['datetime'][:10], p.get('platform'))
        ranking = (float(p.get('s2:processing_baseline', 0)), int(p.get('s2:sequence', 0)))
        old = by_date.get(key)
        if old is None or ranking > old[0]:
            by_date[key] = ranking, item
    target = datetime.fromisoformat(period['target'])
    return sorted([v[1] for v in by_date.values()], key=lambda item: (
        abs((datetime.fromisoformat(item['properties']['datetime'][:10]) - target).days),
        item['properties'].get('eo:cloud_cover', 100), item['id']))


def probe(config, destination):
    """Probe BOTH catalogs, recording metadata access separately from pixel access."""
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    report = {'catalogs': [], 'note': 'Katalog erişimi piksel okuması değildir.'}
    with http_session() as session:
        for endpoint in [COPERNICUS, EARTH_SEARCH]:
            try:
                response = session.get(endpoint + '/search', params={
                    'collections': 'sentinel-2-l2a' if endpoint == COPERNICUS else COLLECTION,
                    'bbox': ','.join(map(str, config['bbox'])),
                    'datetime': f"{min(p['start'] for p in config['periods'])}T00:00:00Z/{max(p['end'] for p in config['periods'])}T23:59:59Z", 'limit': 5}, timeout=45)
                response.raise_for_status()
                data = response.json()
                report['catalogs'].append({'endpoint': endpoint, 'httpStatus': response.status_code,
                    'returnedItems': len(data.get('features', [])),
                    'sampleIds': [f['id'] for f in data.get('features', [])]})
            except requests.RequestException as error:
                report['catalogs'].append({'endpoint': endpoint, 'error': str(error)})
    report['checkedAt'] = datetime.now().astimezone().isoformat()
    (destination / 'access-report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False))
    return report
