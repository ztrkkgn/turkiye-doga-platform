"""Bounded public C1 monitoring with cheap metadata checks and explicit freshness."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import os

import numpy as np
import rasterio
from affine import Affine

from .catalog import candidates
from .config import path_component, public_slug
from .detection import detect_changes
from .indices import valid_land_mask
from .pipeline import run as analyze, dump
from .raster import Grid, make_grid, read_band

METHOD = {
    'name': 'NDVI farkında bölgesel aykırılık taraması', 'version': '1.0.0',
    'description': 'İki gerçek, kalite kontrolünden geçmiş tekil gözlem karşılaştırılır. '
        'Ortak geçerli piksellerde NDVI farkının medyanına göre NIST değiştirilmiş Z puanı '
        'hesaplanır. |M| > 3.5 ve gerçek farkın aynı yönde olması, en az 1 ha dört-komşu '
        'piksel desteğiyle yalnız incelenecek değişim adayı olarak işaretlenir.',
    'source': 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm',
    'limitations': [
        'İşaretler doğrulanmamış spektral değişim adaylarıdır; yangın, hasar veya yasa dışı faaliyet teşhisi değildir.',
        'Yakın tarihler arasındaki mevsim, yağış, tarım ve topografik gölge değişimleri de aday oluşturabilir.',
        'İlk sürüm dönem medyan kompoziti yerine iki tekil gözlem kullanır; ülke genelini taramaz.',
        'Tüm çalışma penceresinin medyanı ve MAD değeri kullanılır; yaygın bir değişimin tamamını bulması garanti değildir.',
        'SCL4/5 ve ortak geçerli destek dışındaki alanlar ölçülmez; duman ve SCL hataları kalabilir.',
        '3.5 puan, 1 ha destek ve 50 aday sınırı operasyonel tarama ayarlarıdır; yerel ekolojik doğrulukla kalibre edilmedi.',
        'MAD sıfır veya 0.000001 altında ise aday puanlaması yapılmaz. 21 günden eski görüntü güncel katmanda gösterilmez.'
    ]}


class InsufficientData(ValueError):
    pass


def read_json(path, default):
    try:
        return json.loads(Path(path).read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def atomic_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    dump(temp, value)
    os.replace(temp, path)


def fresh_status(observed_at, now, max_age_days=21):
    age = (now - datetime.fromisoformat(observed_at.replace('Z', '+00:00'))).total_seconds() / 86400
    return 'available' if 0 <= age <= max_age_days else 'stale'


def choose_usable(options, config, root):
    """Only SCL is read until one candidate passes the local coverage gate."""
    grid = make_grid(config)
    halo = 3
    expanded = Grid(grid.crs, grid.transform * Affine.translation(-halo, -halo),
                    grid.width + 2*halo, grid.height + 2*halo, grid.mask)
    cache_path = root / 'data/cache' / config['id'] / 'scl-checks.json'
    cache = read_json(cache_path, {})
    grid_key = hashlib.sha256(json.dumps([config['bbox'], config['crs'], config['resolutionM']]).encode()).hexdigest()
    env = dict(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',
               GDAL_HTTP_TIMEOUT='35', GDAL_HTTP_MAX_RETRY='2', AWS_NO_SIGN_REQUEST='YES')
    with rasterio.Env(**env):
        for item in options[:12]:
            key = f'{grid_key}:{item["id"]}'
            fraction = cache.get(key)
            if fraction is None:
                print(f'SCL quality check {config["id"]}: {item["id"]}', flush=True)
                scl = read_band(item['assets']['scl'], expanded, categorical=True)
                valid = grid.mask & valid_land_mask(scl, halo)[halo:-halo, halo:-halo]
                fraction = float(valid.sum() / grid.mask.sum())
                cache[key] = fraction
                atomic_json(cache_path, cache)
            if fraction >= config['minValidFraction']:
                return item
    raise InsufficientData('Tarih penceresinde yerel bulut/gölge ve kara kapsamı kontrolünü geçen gözlem bulunamadı.')


def process_region(region, settings, root, now, previous):
    slug = path_component(region['slug'], 'slug')
    identifier = f'monitor-{slug}'
    base = {'id': identifier, 'eventId': region['eventId'], 'title': region['title'],
            'coordinates': region['coordinates'], 'bbox': region['bbox'], 'candidateCount': 0}
    output = root / 'web/public/data' / identifier
    summary_path = output / 'summary.json'
    features_path = output / 'candidates.geojson'
    try:
        end = now.date()
        config = {'id': identifier, 'publicSlug': identifier, 'name': region['title'],
            'province': region['province'], 'bbox': region['bbox'], 'crs': region['crs'],
            'tile': region['tile'], 'resolutionM': 20, 'description': 'Seçili bölgede güncel spektral değişim taraması; tarihsel olayın yeni etkisi veya doğrulanmış hasar olarak yorumlanamaz.',
            'maxSceneCloudCover': 100, 'minValidFraction': settings.get('minValidFraction', 0.5),
            'sources': region['sources'], 'periods': [
                {'id': 'before', 'label': 'Referans gözlem', 'start': str(end-timedelta(days=42)),
                 'end': str(end-timedelta(days=15)), 'target': str(end-timedelta(days=15))},
                {'id': 'after', 'label': 'Güncel gözlem', 'start': str(end-timedelta(days=14)),
                 'end': str(end), 'target': str(end)}]}
        # Actual acquisitions, not today's analysis timestamp, determine freshness.
        options = {p['id']: candidates(config, p) for p in config['periods']}
        if not options['before'] or not options['after']:
            raise InsufficientData('Referans veya güncel tarih penceresinde C1 katalog kaydı bulunamadı.')
        base['latestSceneAt'] = options['after'][0]['properties']['datetime']
        selected = {p['id']: choose_usable(options[p['id']], config, root) for p in config['periods']}
        detection_settings = settings.get('detector', {})
        source_files = [Path(__file__), Path(__file__).with_name('detection.py'), Path(__file__).with_name('pipeline.py')]
        fingerprint = hashlib.sha256(json.dumps({'items': [selected[k]['id'] for k in ['before','after']],
            'bbox': config['bbox'], 'detector': detection_settings,
            'source': [hashlib.sha256(p.read_bytes()).hexdigest() for p in source_files]}, sort_keys=True).encode()).hexdigest()
        if previous.get('fingerprint') == fingerprint and summary_path.exists() and features_path.exists():
            summary = read_json(summary_path, {})
            features = read_json(features_path, {'features': []})['features']
            detector = previous.get('detector', {})
            print(f'Unchanged usable acquisitions: {identifier}; no band reprocessing', flush=True)
        else:
            config_path = root / 'data/monitoring/configs' / f'{identifier}.json'
            config_path.parent.mkdir(parents=True, exist_ok=True)
            dump(config_path, config)
            print(f'New usable pair: {identifier}', flush=True)
            summary = analyze(config_path, root, selected_items=selected)
            grid = make_grid(config)
            indices = []
            for period_id in ['before', 'after']:
                path = root / 'data/cache' / identifier / f'{period_id}-indices.tif'
                with rasterio.open(path) as src:
                    indices.append(src.read(1, masked=True).filled(np.nan))
            observations = {p['id']: p['observation'] for p in summary['periods']}
            features, detector = detect_changes(*indices, grid, region_id=identifier,
                event_id=region['eventId'], before_date=observations['before']['datetime'],
                after_date=observations['after']['datetime'], **detection_settings)
            atomic_json(features_path, {'type': 'FeatureCollection', 'features': features})
        observations = {p['id']: p['observation'] for p in summary['periods']}
        latest = observations['after']['datetime']
        state = fresh_status(latest, now, settings.get('freshnessMaxAgeDays', 21))
        if detector.get('status') != 'available' and state == 'available':
            state = 'insufficient-data'
        record = {**base, 'status': state, 'latestObservationAt': latest,
            'referenceObservationAt': observations['before']['datetime'],
            'summaryUrl': f'/data/{identifier}/summary.json', 'generatedAt': summary['generatedAt'],
            'candidateCount': len(features) if state == 'available' else 0,
            'fingerprint': fingerprint, 'detector': detector}
        if state == 'stale': record['reason'] = 'Kullanılabilir son gözlem 21 günden eski; güncel katmana alınmadı.'
        elif state == 'insufficient-data': record['reason'] = detector.get('reason', 'Aday puanlaması için veri yetersiz.')
        return record, features if state == 'available' else []
    except Exception as error:
        # A failed check does not replace or remove an earlier valid regional analysis.
        record = {**previous, **base, 'status': 'insufficient-data' if isinstance(error, InsufficientData) else 'error',
                  'reason': str(error), 'candidateCount': 0}
        return record, []


def run(config_path, root, as_of=None):
    root = Path(root)
    settings = json.loads(Path(config_path).read_text())
    slugs = [public_slug({'id': f'monitor-{r["slug"]}', 'publicSlug': r['slug']}) for r in settings['regions']]
    if len(slugs) != len(set(slugs)):
        raise ValueError('İzleme bölgesi slug değerleri benzersiz olmalı.')
    now = datetime.fromisoformat(as_of).replace(tzinfo=timezone.utc) if as_of else datetime.now(timezone.utc)
    directory = root / 'web/public/data/monitoring'
    old = read_json(directory / 'status.json', {})
    previous = {r['id']: r for r in old.get('regions', [])}
    workers = max(1, min(2, settings.get('workers', 2)))
    def process(region):
        return process_region(region, settings, root, now, previous.get(f'monitor-{region["slug"]}', {}))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        results = list(pool.map(process, settings['regions']))
    features = [f for _, candidates_for_region in results for f in candidates_for_region]
    records = [r for r, _ in results]
    generation_times = [r.get('generatedAt') for r in records if r.get('generatedAt')]
    status = {'schemaVersion': 1, 'checkedAt': now.isoformat(),
        'generatedAt': max(generation_times) if generation_times else old.get('generatedAt', now.isoformat()),
        'mode': 'regional', 'freshnessMaxAgeDays': settings.get('freshnessMaxAgeDays', 21),
        'featuresUrl': '/data/monitoring/changes.geojson', 'method': METHOD, 'regions': records}
    atomic_json(directory / 'changes.geojson', {'type': 'FeatureCollection', 'features': features})
    atomic_json(directory / 'status.json', status)
    print(json.dumps({'checkedAt': status['checkedAt'], 'regions': [
        {'id': r['id'], 'status': r['status'], 'latestObservationAt': r.get('latestObservationAt'),
         'candidateCount': r['candidateCount'], 'reason': r.get('reason')} for r in records]}, ensure_ascii=False, indent=2), flush=True)
    return status
