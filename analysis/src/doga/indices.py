"""Pure numerical operations. Tests use synthetic arrays, never published as observations."""
import numpy as np
from scipy.ndimage import binary_dilation


def normalized_difference(a, b):
    a, b = np.asarray(a, dtype=np.float32), np.asarray(b, dtype=np.float32)
    denominator = a + b
    valid = np.isfinite(a) & np.isfinite(b) & (denominator > 1e-6)
    result = np.full(a.shape, np.nan, dtype=np.float32)
    np.divide(a - b, denominator, out=result, where=valid)
    return result


def reflectance(raw, asset):
    """Use the asset's own encoding, not a second hardcoded BOA correction."""
    band = asset['raster:bands'][0]
    scale, offset = band['scale'], band['offset']
    raw = np.asarray(raw)
    valid = np.isfinite(raw) & (raw != band.get('nodata', 0))
    result = raw.astype(np.float32) * scale + offset
    result[~valid] = np.nan
    return result


def buffered_cloud_mask(scl, buffer_pixels=3):
    """A disk buffer around cloud, shadow and snow classes."""
    cloud_or_shadow = np.isin(scl, [3, 8, 9, 10, 11])
    if buffer_pixels > 0:
        dy, dx = np.ogrid[-buffer_pixels:buffer_pixels+1, -buffer_pixels:buffer_pixels+1]
        disk = dx**2 + dy**2 <= buffer_pixels**2
        cloud_or_shadow = binary_dilation(cloud_or_shadow, structure=disk)
    return cloud_or_shadow


def valid_land_mask(scl, buffer_pixels=3):
    """SCL 4/5 only. Buffer clouds, shadows and snow 60 m on a 20 m grid."""
    return np.isin(scl, [4, 5]) & ~buffered_cloud_mask(scl, buffer_pixels)


def comparison(before, after):
    mask = np.logical_and.reduce([np.isfinite(before['ndvi']), np.isfinite(after['ndvi']),
                                  np.isfinite(before['nbr']), np.isfinite(after['nbr'])])
    return {
        'mask': mask,
        'ndvi_delta': np.where(mask, after['ndvi'] - before['ndvi'], np.nan),
        'dnbr': np.where(mask, before['nbr'] - after['nbr'], np.nan),
    }
