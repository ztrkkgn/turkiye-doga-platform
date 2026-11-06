"""Geospatial invariants using only small synthetic GeoTIFFs in tmp_path."""

import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin

from doga.indices import reflectance
from doga.raster import Grid, read_band, read_scene


ORIGIN_X = 600000
ORIGIN_Y = 4100000
CRS = "EPSG:32635"


def write_fixture(tmp_path, name, data, resolution=20, crs=CRS, nodata=0):
    """These local fixtures are never put into the published observation set."""
    data = np.asarray(data)
    path = tmp_path / f"{name}.tif"
    with rasterio.open(
        path, "w", driver="GTiff", width=data.shape[1], height=data.shape[0],
        count=1, dtype=data.dtype, crs=crs, nodata=nodata,
        transform=from_origin(ORIGIN_X, ORIGIN_Y, resolution, resolution),
    ) as destination:
        destination.write(data, 1)
    return {
        "href": str(path),
        "raster:bands": [{"scale": 0.0001, "offset": 0, "nodata": nodata}],
    }


def grid(width, height, x=ORIGIN_X, y=ORIGIN_Y):
    return Grid(CRS, from_origin(x, y, 20, 20), width, height,
                np.ones((height, width), dtype=bool))


def test_10m_reflectance_averages_into_exact_20m_grid(tmp_path):
    data = np.array([
        [1000, 2000, 5000, 6000],
        [3000, 4000, 7000, 8000],
        [1500, 2500, 5500, 6500],
        [3500, 4500, 7500, 8500],
    ], dtype=np.uint16)
    asset = write_fixture(tmp_path, "reflectance-10m", data, resolution=10)
    actual = reflectance(read_band(asset, grid(2, 2)), asset)
    assert actual.shape == (2, 2)
    np.testing.assert_allclose(actual, [[0.25, 0.65], [0.30, 0.70]], atol=1e-7)


def test_scl_nearest_resampling_preserves_categories(tmp_path):
    # Averaging each 2x2 source block would invent category values 6, 8, ...
    data = np.array([
        [4, 8, 5, 11],
        [4, 8, 5, 11],
        [6, 9, 7, 10],
        [6, 9, 7, 10],
    ], dtype=np.uint8)
    asset = write_fixture(tmp_path, "scl-10m", data, resolution=10)
    actual = read_band(asset, grid(2, 2), categorical=True)
    np.testing.assert_array_equal(actual, [[8, 11], [9, 10]])
    assert actual.dtype == np.uint8
    assert set(np.unique(actual)).issubset(set(np.unique(data)))


def test_nodata_and_outside_footprint_cannot_become_reflectance(tmp_path):
    data = np.array([
        [0, 0, 2000, 2000],
        [0, 0, 2000, 2000],
        [0, 4000, 6000, 6000],
        [0, 4000, 6000, 6000],
    ], dtype=np.uint16)
    asset = write_fixture(tmp_path, "nodata-10m", data, resolution=10)
    actual = reflectance(read_band(asset, grid(3, 2)), asset)
    # Eastmost column is outside the source footprint. Bottom-left ignores
    # source NoData, so its valid mean is 0.4 rather than a zero-biased 0.2.
    np.testing.assert_allclose(actual, [[np.nan, 0.2, np.nan], [0.4, 0.6, np.nan]], atol=1e-7)


@pytest.mark.parametrize("missing", ["crs", "nodata"])
def test_missing_geospatial_metadata_fails_closed(tmp_path, missing):
    options = {missing: None}
    asset = write_fixture(tmp_path, f"missing-{missing}",
                          np.full((2, 2), 2000, dtype=np.uint16), **options)
    with pytest.raises(ValueError, match="CRS veya NoData eksik"):
        read_band(asset, grid(2, 2))


def scene_fixture(tmp_path, scl):
    scl = np.asarray(scl, dtype=np.uint8)
    assets = {"scl": write_fixture(tmp_path, "scene-scl", scl)}
    values = {"red": 2000, "green": 3000, "blue": 1000,
              "nir": 6000, "nir08": 6000, "swir22": 2000}
    for key, value in values.items():
        assets[key] = write_fixture(tmp_path, f"scene-{key}",
                                    np.full(scl.shape, value, dtype=np.uint16))
    return {"id": "SYNTHETIC_LOCAL_TEST_SCENE", "assets": assets}


def test_cloud_outside_aoi_still_masks_its_60m_halo(tmp_path):
    scl = np.full((10, 10), 4, dtype=np.uint8)
    scl[4, 2] = 9  # One source pixel west of the target footprint.
    item = scene_fixture(tmp_path, scl)
    actual = read_scene(item, grid(4, 4, ORIGIN_X + 60, ORIGIN_Y - 60))
    assert not actual["valid"][1, 0]
    assert not actual["valid"][1, 2]  # 60m away from cloud center.
    assert actual["valid"][1, 3]      # 80m away, clear land.
    assert np.isnan(actual["rgb"][:, 1, 2]).all()
    assert np.isfinite(actual["rgb"][:, 1, 3]).all()


def test_rgb_context_does_not_expand_analytical_support(tmp_path):
    scl = np.array([[2, 4, 5, 6, 7, 0, 1]], dtype=np.uint8)
    item = scene_fixture(tmp_path, scl)
    actual = read_scene(item, grid(7, 1))
    np.testing.assert_array_equal(actual["valid"], [[False, True, True, False, False, False, False]])
    np.testing.assert_array_equal(np.isfinite(actual["ndvi"]), actual["valid"])
    np.testing.assert_array_equal(np.isfinite(actual["nbr"]), actual["valid"])
    # Dark, water and unclassified pixels retain real measured RGB values;
    # NoData/defective pixels stay transparent rather than being fabricated.
    assert np.isfinite(actual["rgb"][:, 0, :5]).all()
    assert np.isnan(actual["rgb"][:, 0, 5:]).all()
