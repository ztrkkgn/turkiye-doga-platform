"""Read bounded COG windows, align bands, and export correctly georeferenced displays."""
from dataclasses import dataclass
from math import floor, ceil

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.features import geometry_mask
from rasterio.transform import from_origin, from_bounds
from rasterio.vrt import WarpedVRT
from rasterio.warp import transform_bounds, transform_geom, reproject
from PIL import Image
from affine import Affine

from .indices import reflectance, valid_land_mask, normalized_difference, buffered_cloud_mask


@dataclass
class Grid:
    crs: str
    transform: object
    width: int
    height: int
    mask: np.ndarray


def aoi_geometry(bbox):
    w, s, e, n = bbox
    # Densify before transforming the geographic rectangle to projected CRS.
    points = ([[x, s] for x in np.linspace(w, e, 21)] +
              [[e, y] for y in np.linspace(s, n, 21)[1:]] +
              [[x, n] for x in np.linspace(e, w, 21)[1:]] +
              [[w, y] for y in np.linspace(n, s, 21)[1:]])
    return {'type': 'Polygon', 'coordinates': [points]}


def make_grid(config):
    res = config['resolutionM']
    left, bottom, right, top = transform_bounds('EPSG:4326', config['crs'], *config['bbox'])
    left, bottom, right, top = floor(left/res)*res, floor(bottom/res)*res, ceil(right/res)*res, ceil(top/res)*res
    width, height = round((right-left)/res), round((top-bottom)/res)
    transform = from_origin(left, top, res, res)
    polygon = transform_geom('EPSG:4326', config['crs'], aoi_geometry(config['bbox']))
    mask = geometry_mask([polygon], (height, width), transform, invert=True)
    return Grid(config['crs'], transform, width, height, mask)


def read_band(asset, grid, categorical=False):
    with rasterio.open(asset['href']) as src:
        if src.crs is None or src.nodata is None:
            raise ValueError('CRS veya NoData eksik: güvenli analiz durduruldu.')
        # Every band/date gets the exact same destination affine and shape.
        with WarpedVRT(src, crs=grid.crs, transform=grid.transform, width=grid.width,
                       height=grid.height, resampling=Resampling.nearest if categorical else Resampling.average,
                       nodata=0, src_nodata=src.nodata, dtype='uint8' if categorical else 'float32') as vrt:
            return vrt.read(1)


def read_scene(item, grid):
    assets = item['assets']
    halo = 3
    expanded = Grid(grid.crs, grid.transform * Affine.translation(-halo, -halo),
                    grid.width + 2*halo, grid.height + 2*halo, grid.mask)
    scl = read_band(assets['scl'], expanded, categorical=True)
    valid = grid.mask & valid_land_mask(scl, halo)[halo:-halo, halo:-halo]
    bands = {}
    for key in ['red', 'green', 'blue', 'nir', 'nir08', 'swir22']:
        print(f"  {item['id']} / {key}", flush=True)
        bands[key] = reflectance(read_band(assets[key], grid), assets[key])
        valid &= np.isfinite(bands[key])
        if key in ['red', 'nir', 'nir08', 'swir22']:
            valid &= bands[key] >= 0
    ndvi = normalized_difference(bands['nir'], bands['red'])
    nbr = normalized_difference(bands['nir08'], bands['swir22'])
    valid &= np.isfinite(ndvi) & np.isfinite(nbr)
    ndvi[~valid], nbr[~valid] = np.nan, np.nan
    rgb = np.stack([bands[k] for k in ['red', 'green', 'blue']])
    # RGB retains water, dark and unclassified surfaces as observational context.
    # Analysis statistics remain restricted to SCL 4/5 on both dates.
    rgb_valid = grid.mask & np.isin(scl[halo:-halo, halo:-halo], [2,4,5,6,7])
    rgb_valid &= ~buffered_cloud_mask(scl, halo)[halo:-halo, halo:-halo]
    rgb_valid &= np.all(np.isfinite(rgb), axis=0)
    rgb[:, ~rgb_valid] = np.nan
    return {'ndvi': ndvi, 'nbr': nbr, 'rgb': rgb, 'valid': valid}


def write_geotiff(path, arrays, grid, descriptions):
    arrays = np.asarray(arrays, dtype=np.float32)
    with rasterio.open(path, 'w', driver='GTiff', width=grid.width, height=grid.height,
        count=len(arrays), crs=grid.crs, transform=grid.transform, dtype='float32',
        nodata=-9999, compress='deflate', tiled=True) as dst:
        dst.write(np.where(np.isfinite(arrays), arrays, -9999))
        for band, description in enumerate(descriptions, 1):
            dst.set_band_description(band, description)


def display_array(array, grid, bbox):
    """Shared Web Mercator grid; image-source geographic corners match the map."""
    display_bounds = transform_bounds('EPSG:4326', 'EPSG:3857', *bbox)
    height, width = grid.height, grid.width
    transform = from_bounds(*display_bounds, width, height)
    output = np.full((height, width), np.nan, dtype=np.float32)
    reproject(array, output, src_transform=grid.transform, src_crs=grid.crs,
              dst_transform=transform, dst_crs='EPSG:3857', src_nodata=np.nan,
              dst_nodata=np.nan, resampling=Resampling.nearest)
    return output


def write_rgb(path, array, grid, bbox):
    display = np.stack([display_array(a, grid, bbox) for a in array])
    valid = np.all(np.isfinite(display), axis=0)
    # Identical fixed 0–0.30 reflectance stretch and gamma for both dates.
    rgb = np.nan_to_num(np.clip(display / 0.30, 0, 1)) ** (1/1.8)
    rgba = np.dstack([(rgb.transpose(1, 2, 0) * 255).astype('uint8'), valid.astype('uint8')*255])
    Image.fromarray(rgba).save(path)


def write_index(path, array, grid, bbox, kind):
    a = display_array(array, grid, bbox)
    if kind == 'dnbr':
        positions = [-0.5, 0, 1]
        colors = [[40,100,150], [242,235,215], [183,71,37]]
    elif kind == 'delta':
        positions = [-1, 0, 1]
        colors = [[183,71,37], [242,235,215], [30,113,92]]
    else:
        positions = [-1, 0, 1]
        colors = [[162,142,117], [239,234,210], [24,92,57]]
    channels = [np.interp(np.nan_to_num(a), positions, np.array(colors)[:,i]).astype('uint8') for i in range(3)]
    Image.fromarray(np.dstack(channels + [(np.isfinite(a)*255).astype('uint8')])).save(path)
