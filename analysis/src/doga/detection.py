"""Exploratory spatial outliers, never validated damage or causal classifications."""
import numpy as np
from scipy import ndimage
from rasterio.warp import transform


def detect_changes(before, after, grid, *, region_id, event_id, before_date, after_date,
                   modified_z_threshold=3.5, min_area_ha=1.0, max_candidates=50,
                   mad_tolerance=1e-6):
    """NIST modified Z on common-support NDVI deltas with explicit spatial filtering."""
    before, after = np.asarray(before), np.asarray(after)
    valid = np.isfinite(before) & np.isfinite(after) & grid.mask
    delta = after - before
    values = delta[valid]
    if not len(values):
        return [], {'status': 'insufficient-data', 'reason': 'Ortak geçerli NDVI pikseli yok.'}
    center = float(np.median(values))
    mad = float(np.median(np.abs(values - center)))
    stats = {'medianDelta': center, 'mad': mad, 'modifiedZThreshold': modified_z_threshold,
             'madTolerance': mad_tolerance, 'minimumAreaHa': min_area_ha,
             'formula': '0.6745 * (deltaNDVI - median(deltaNDVI)) / MAD'}
    if not np.isfinite(mad) or mad <= mad_tolerance:
        return [], {**stats, 'status': 'insufficient-data',
                    'reason': 'MAD sıfır veya sayısal toleransın altında; güvenilir aykırılık puanı üretilemedi.'}
    score = np.where(valid, 0.6745 * (delta - center) / mad, np.nan)
    pixel_area_ha = abs(grid.transform.a * grid.transform.e) / 10000
    features = []
    for direction, selection in [
        ('decrease', valid & (score < -modified_z_threshold) & (delta < 0)),
        ('increase', valid & (score > modified_z_threshold) & (delta > 0))
    ]:
        labels, count = ndimage.label(selection)  # Four-connected support.
        sizes = np.bincount(labels.ravel())
        for label in range(1, count + 1):
            area = int(sizes[label]) * pixel_area_ha
            if area < min_area_ha:
                continue
            rows, cols = np.where(labels == label)
            x, y = grid.transform * (float(np.mean(cols)) + 0.5, float(np.mean(rows)) + 0.5)
            lon, lat = transform(grid.crs, 'EPSG:4326', [x], [y])
            patch_delta = float(np.mean(delta[labels == label]))
            cutoff = center + (1 if direction == 'increase' else -1) * modified_z_threshold * mad / 0.6745
            features.append({'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [lon[0], lat[0]]},
                'properties': {'id': f'{region_id}-{direction}-{label}', 'regionId': region_id,
                    'eventId': event_id, 'direction': direction, 'metric': 'NDVI', 'delta': patch_delta,
                    'areaHa': area, 'pixelCount': int(sizes[label]), 'beforeDate': before_date,
                    'afterDate': after_date, 'reviewStatus': 'unreviewed', 'threshold': abs(cutoff), 'thresholdSigned': cutoff,
                    'modifiedZ': float(0.6745 * (patch_delta - center) / mad)}})
    features.sort(key=lambda f: f['properties']['areaHa'], reverse=True)
    return features[:max_candidates], {**stats, 'status': 'available',
        'totalCandidates': len(features), 'publishedCandidates': min(len(features), max_candidates),
        'maximumPublishedCandidates': max_candidates}
