"""A bounded first-pair analysis, not an annual monitoring system."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import tempfile
import platform

import numpy as np
import rasterio

from . import __version__
from .catalog import candidates, EARTH_SEARCH, COLLECTION
from .indices import comparison
from .config import public_slug
from .raster import (aoi_geometry, make_grid, read_scene, write_geotiff, write_index, write_rgb)

LIMITATIONS = [
    'Çalışma penceresi resmî yangın sınırı değildir; karma arazi örtüsü içerir ve bütün bölgeyi temsil etmez.',
    'İlk çıktı iki tekil gözleme dayanır; medyan kompozit ve yıllık toparlanma serisi henüz üretilmedi.',
    'NDVI bitki örtüsünün spektral göstergesidir; ağaç sayısı, hayatta kalma oranı veya biyolojik çeşitlilik değildir.',
    'dNBR sürekli değişimi gösterir; yerel saha kalibrasyonu olmadan hasar sınıfı veya yanan alan toplamı verilmez.',
    'SCL maskesi ve 60 m tampon tüm dumanı, ince bulutları ve topografik gölgeyi gideremeyebilir.',
    'Tarihler yakın mevsimlerden seçildi; kuraklık, fenoloji ve atmosfer değişimleri yangın etkisinden tam ayrılamaz.',
    'Değişim tek başına nedenini veya herhangi bir faaliyetin yasallığını kanıtlamaz. Bağımsız piksel düzeyinde saha doğrulaması yapılmadı.',
    'Yalnızca iki tarihte de geçerli ortak kara pikselleri fark hesabına katılır; maskelenen alanlarda yorum yapılmaz.',
    'SCL 2 karanlık piksel ve SCL 7 belirsiz sınıf dışlanır; koyu yanık yüzeylerin bir kısmı da dışlanabilir. Sonuç, kabul edilen piksellerle sınırlıdır.',
    'İndeks bantlarında negatif yüzey yansıtımı bulunan pikseller hesaplamadan çıkarılır.'
]


def dump(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n')


def validate_scene(scene):
    for key in ['ndvi', 'nbr']:
        values = scene[key][np.isfinite(scene[key])]
        if not len(values) or np.any(np.abs(values) > 1.00001):
            raise ValueError(f'{key}: fiziksel aralık kontrolü başarısız; kalibrasyonu inceleyin.')


def run(config_path, root, refresh=False, selected_items=None):
    config_path, root = Path(config_path), Path(root)
    config_bytes = config_path.read_bytes()
    config = json.loads(config_bytes)
    slug = public_slug(config)
    public_base = f'/data/{slug}'
    if [p['id'] for p in config['periods']] != ['before', 'after']:
        raise ValueError('İlk sürüm yalnız before/after çifti destekler.')
    config_hash = hashlib.sha256(config_bytes).hexdigest()
    cache = root / 'data/cache' / config['id']
    cache.mkdir(parents=True, exist_ok=True)
    grid = make_grid(config)
    area_pixels = int(grid.mask.sum())
    selected = {}
    scenes = {}
    observations = []
    pinned_path = cache / 'selection.json'
    published_pin = root / 'data/processed' / config['id'] / 'selection.json'
    pinned = {'configSha256': config_hash, 'items': selected_items} if selected_items is not None else None
    if pinned is None and not refresh:
        for path in [pinned_path, published_pin]:
            if path.exists():
                pinned = json.loads(path.read_text())
                if pinned['configSha256'] != config_hash:
                    raise ValueError('Yapılandırma değişti. Yeni veri seçimi için --refresh kullanın.')
                if any(item.get('collection') != COLLECTION for item in pinned['items'].values()):
                    raise ValueError('Desteklenmeyen eski koleksiyon. C1 seçimi için --refresh kullanın.')
                break
    env = dict(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',
               GDAL_HTTP_TIMEOUT='45', GDAL_HTTP_MAX_RETRY='3', GDAL_HTTP_RETRY_DELAY='1',
               AWS_NO_SIGN_REQUEST='YES', GDAL_NUM_THREADS='2')
    with tempfile.TemporaryDirectory(prefix='run-', dir=cache) as directory, rasterio.Env(**env):
        stage = Path(directory)
        for period in config['periods']:
            options = [pinned['items'][period['id']]] if pinned else candidates(config, period)
            failures = []
            for item in options:
                print(f"Reading {period['id']}: {item['id']}", flush=True)
                try:
                    if item.get('collection') != COLLECTION:
                        raise ValueError('Yalnız Sentinel-2 Collection 1 L2A desteklenir.')
                    scene = read_scene(item, grid)
                    validate_scene(scene)
                    fraction = float(scene['valid'].sum() / area_pixels)
                    if fraction < config['minValidFraction']:
                        raise ValueError(f'Geçerli AOI payı {fraction:.1%}; kalite alt sınırı sağlanmadı.')
                    break
                except (ValueError, KeyError, rasterio.errors.RasterioError) as error:
                    failures.append({'itemId': item['id'], 'error': str(error)})
                    print(f"  Rejected: {error}", flush=True)
            else:
                dump(cache / 'last-failure.json', {'period': period['id'], 'failures': failures})
                raise RuntimeError(f"{period['id']}: yeterli gerçek veri yok. Eski yayımlanan sonuç değiştirilmedi.")
            identifier = period['id']
            selected[identifier], scenes[identifier] = item, scene
            p = item['properties']
            observation = {
                'datetime': p['datetime'], 'itemId': item['id'], 'productId': p['s2:product_uri'],
                'cloudCover': p['eo:cloud_cover'], 'baseline': p.get('s2:processing_baseline'),
                'boaOffsetApplied': p.get('earthsearch:boa_offset_applied'),
                'validFraction': fraction, 'validPixelCount': int(scene['valid'].sum()),
                'ndviMean': float(np.nanmean(scene['ndvi'])), 'nbrMean': float(np.nanmean(scene['nbr'])),
                'rgbUrl': f'{public_base}/{identifier}-rgb.png',
                'ndviUrl': f'{public_base}/{identifier}-ndvi.png',
                'nbrUrl': f'{public_base}/{identifier}-nbr.png',
                'stacUrl': f'{EARTH_SEARCH}/collections/{COLLECTION}/items/{item["id"]}',
            }
            observations.append({**period, 'status': 'available', 'observation': observation,
                                 'rejectedCandidates': failures})
            write_rgb(stage / f'{identifier}-rgb.png', scene['rgb'], grid, config['bbox'])
            for kind in ['ndvi', 'nbr']:
                write_index(stage / f'{identifier}-{kind}.png', scene[kind], grid, config['bbox'], kind)
            write_geotiff(cache / f'{identifier}-indices.tif', [scene['ndvi'], scene['nbr']], grid, ['NDVI', 'NBR'])

        changes = comparison(scenes['before'], scenes['after'])
        common_pixels = int(changes['mask'].sum())
        if common_pixels / area_pixels < config['minValidFraction']:
            raise RuntimeError('Ortak geçerli kapsama yetersiz; sonuç yayımlanmadı.')
        for key, kind in [('dnbr', 'dnbr'), ('ndvi_delta', 'delta')]:
            write_index(stage / f'{key}.png', changes[key], grid, config['bbox'], kind)
        write_geotiff(cache / 'change-indices.tif', [changes['dnbr'], changes['ndvi_delta']], grid, ['dNBR', 'delta_NDVI'])
        w, s, e, n = config['bbox']
        summary = {
            'schemaVersion': 1, 'id': config['id'], 'name': config['name'], 'province': config['province'],
            'status': 'preliminary', 'publicSlug': slug,
            'description': config['description'], 'bbox': config['bbox'],
            'areaKm2': area_pixels * config['resolutionM']**2 / 1_000_000,
            'generatedAt': datetime.now(timezone.utc).isoformat(), 'methodVersion': __version__,
            'configSha256': config_hash,
            'grid': {'crs': grid.crs, 'resolutionM': config['resolutionM'], 'width': grid.width, 'height': grid.height,
                     'transform': list(grid.transform)[:6], 'displayCrs': 'EPSG:3857'},
            'periods': observations,
            'comparisons': {'fire': {
                'before': 'before', 'after': 'after', 'pixelCount': common_pixels,
                'commonValidFraction': common_pixels / area_pixels,
                'commonAreaKm2': common_pixels * config['resolutionM']**2 / 1_000_000,
                'ndviDeltaMean': float(np.nanmean(changes['ndvi_delta'])),
                'dnbrMean': float(np.nanmean(changes['dnbr'])),
                'dnbrMedian': float(np.nanmedian(changes['dnbr'])),
                'beforeNdviCommonMean': float(np.mean(scenes['before']['ndvi'][changes['mask']])),
                'afterNdviCommonMean': float(np.mean(scenes['after']['ndvi'][changes['mask']])),
                'dnbrUrl': f'{public_base}/dnbr.png', 'ndviDeltaUrl': f'{public_base}/ndvi_delta.png',
                'displayRange': [-0.5, 1.0], 'displayClippingOnly': True}},
            'sources': config['sources'], 'limitations': LIMITATIONS,
            'assets': {'aoiUrl': f'{public_base}/aoi.geojson',
                       'imageCoordinates': [[w,n], [e,n], [e,s], [w,s]],
                       'provenanceUrl': f'{public_base}/provenance.json'},
            'quality': {'minValidFraction': config['minValidFraction'], 'acceptedSclClasses': [4,5],
                        'cloudBufferM': 60, 'observationType': 'single-scene', 'fieldValidated': False}
        }
        dump(stage / 'aoi.geojson', {'type': 'FeatureCollection', 'features': [{
            'type': 'Feature', 'properties': {'id': config['id'], 'name': config['name'],
                'boundaryType': 'study-window-not-fire-perimeter'}, 'geometry': aoi_geometry(config['bbox'])}]})
        selection = {'configSha256': config_hash, 'items': selected}
        dump(stage / 'provenance.json', {'catalog': EARTH_SEARCH, 'collection': COLLECTION,
            'selection': selection, 'methodVersion': __version__,
            'software': {'python': platform.python_version(), 'numpy': np.__version__,
                         'rasterio': rasterio.__version__, 'gdal': rasterio.__gdal_version__},
            'sourceSha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                             for p in sorted(Path(__file__).parent.glob('*.py'))},
            'indexFormulas': {'NDVI': '(B08-B04)/(B08+B04)', 'NBR': '(B8A-B12)/(B8A+B12)',
                              'dNBR': 'NBR_before-NBR_after', 'deltaNDVI': 'NDVI_after-NDVI_before'},
            'sourceResolutionsM': {'B02':10,'B03':10,'B04':10,'B08':10,'B8A':20,'B12':20,'SCL':20},
            'reflectanceResampling': 'average', 'sclResampling': 'nearest',
            'reflectanceEncoding': 'asset raster:bands scale and offset; mask raw nodata first',
            'rgbStretch': {'reflectanceRange': [0,0.3], 'gamma': 1.8},
            'rgbSclClasses': [2,4,5,6,7], 'analysisSclClasses': [4,5],
            'generatedAt': summary['generatedAt']})
        summary['assetSha256'] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                                  for p in stage.iterdir() if p.is_file()}
        dump(stage / 'summary.json', summary)
        # Only a complete pair passes the publishing gate. Stage and rename on same filesystem.
        destination = root / 'web/public/data' / slug
        destination.parent.mkdir(parents=True, exist_ok=True)
        incoming = destination.with_name(f'.{slug}-incoming')
        backup = destination.with_name(f'.{slug}-previous')
        if incoming.exists(): shutil.rmtree(incoming)
        if backup.exists(): shutil.rmtree(backup)
        shutil.copytree(stage, incoming)
        if destination.exists(): destination.rename(backup)
        try:
            incoming.rename(destination)
        except BaseException:
            if backup.exists(): backup.rename(destination)
            raise
        if backup.exists(): shutil.rmtree(backup)
        processed = root / 'data/processed' / config['id']
        processed.mkdir(parents=True, exist_ok=True)
        dump(processed / 'summary.json', summary)
        dump(processed / 'selection.json', selection)
        dump(pinned_path, selection)
        print(json.dumps(summary['comparisons'], indent=2), flush=True)
        return summary
