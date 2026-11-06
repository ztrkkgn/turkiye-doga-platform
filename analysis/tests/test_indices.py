"""Scientific invariants; these arrays are synthetic unit-test fixtures only."""

import numpy as np
import pytest

from doga.indices import comparison, normalized_difference, reflectance, valid_land_mask


def test_normalized_difference_casts_unsigned_dn_before_subtraction():
    # Sentinel-2 DN files are unsigned. 100 - 300 must not wrap to 65336.
    actual = normalized_difference(
        np.array([100, 300], dtype=np.uint16),
        np.array([300, 100], dtype=np.uint16),
    )
    np.testing.assert_allclose(actual, [-0.5, 0.5])
    assert actual.dtype == np.float32


def test_normalized_difference_does_not_make_results_for_invalid_denominators():
    actual = normalized_difference(
        np.array([0, 1, np.nan, np.inf, -1, 1e-8]),
        np.array([0, -1, 1, 1, -1, 1e-8]),
    )
    assert np.isnan(actual).all()


def test_normalized_difference_matches_known_reflectance():
    actual = normalized_difference(np.array([0.6, 0.2]), np.array([0.2, 0.6]))
    np.testing.assert_allclose(actual, [0.5, -0.5], atol=1e-6)


def test_reflectance_applies_scale_then_offset_and_masks_raw_nodata():
    asset = {"raster:bands": [{"scale": 0.0001, "offset": -0.1, "nodata": 0}]}
    actual = reflectance(np.array([0, 1000, 2500], dtype=np.uint16), asset)
    assert np.isnan(actual[0])
    np.testing.assert_allclose(actual[1:], [0, 0.15], atol=1e-7)


def test_reflectance_preserves_masked_pixels_even_when_nodata_is_not_zero():
    asset = {"raster:bands": [{"scale": 0.0001, "offset": 0, "nodata": 65535}]}
    actual = reflectance(np.array([65535, 1000], dtype=np.uint16), asset)
    assert np.isnan(actual[0])
    np.testing.assert_allclose(actual[1], 0.1, atol=1e-7)


def test_reflectance_does_not_apply_offset_twice_to_harmonized_cog():
    asset = {"raster:bands": [{"scale": 0.0001, "offset": 0, "nodata": 0}]}
    actual = reflectance(np.array([1000, 2500], dtype=np.uint16), asset)
    np.testing.assert_allclose(actual, [0.1, 0.25], atol=1e-7)


@pytest.mark.parametrize(
    "asset",
    [
        {},
        {"raster:bands": []},
        {"raster:bands": [{"offset": 0, "nodata": 0}]},
        {"raster:bands": [{"scale": 0.0001, "nodata": 0}]},
    ],
)
def test_reflectance_refuses_missing_calibration_metadata(asset):
    with pytest.raises((ValueError, KeyError, IndexError)):
        reflectance(np.array([1000], dtype=np.uint16), asset)


def test_land_mask_accepts_only_vegetation_and_bare_soil():
    scl = np.arange(12, dtype=np.uint8).reshape(3, 4)
    actual = valid_land_mask(scl, buffer_pixels=0)
    np.testing.assert_array_equal(actual, np.isin(scl, [4, 5]))
    assert actual.dtype == np.bool_


@pytest.mark.parametrize("cloud_class", [3, 8, 9, 10, 11])
def test_cloud_and_shadow_buffer_excludes_adjacent_land(cloud_class):
    scl = np.full((11, 11), 4, dtype=np.uint8)
    scl[5, 5] = cloud_class
    actual = valid_land_mask(scl, buffer_pixels=3)
    assert not actual[5, 5]
    assert not actual[5, 6]
    assert not actual[5, 8]
    assert actual[0, 0]
    assert actual[5, 9]


def test_default_land_mask_keeps_clear_scene():
    scl = np.full((4, 4), 4, dtype=np.uint8)
    scl[0, 0] = 5
    assert valid_land_mask(scl).all()


def test_cloud_buffer_covers_diagonal_pixels_inside_physical_radius():
    scl = np.full((11, 11), 4, dtype=np.uint8)
    scl[5, 5] = 9
    actual = valid_land_mask(scl, buffer_pixels=3)
    # sqrt(2**2 + 2**2) * 20m is 56.6m, inside the 60m exclusion.
    assert not actual[7, 7]
    # sqrt(3**2 + 1**2) * 20m is 63.2m, outside that radius.
    assert actual[8, 6]


def test_comparison_signs_and_common_observation_support():
    before = {
        "ndvi": np.array([0.7, np.nan, 0.6, 0.5, 0.4]),
        "nbr": np.array([0.6, 0.6, np.nan, 0.6, 0.6]),
    }
    after = {
        "ndvi": np.array([0.2, 0.2, 0.2, np.nan, 0.2]),
        "nbr": np.array([-0.2, -0.2, -0.2, -0.2, np.inf]),
    }
    actual = comparison(before, after)
    np.testing.assert_array_equal(actual["mask"], [True, False, False, False, False])
    np.testing.assert_allclose(actual["ndvi_delta"][0], -0.5, atol=1e-6)
    np.testing.assert_allclose(actual["dnbr"][0], 0.8, atol=1e-6)
    assert np.isnan(actual["ndvi_delta"][1:]).all()
    assert np.isnan(actual["dnbr"][1:]).all()


def test_recovery_has_positive_ndvi_change_and_negative_dnbr():
    before = {"ndvi": np.array([0.2]), "nbr": np.array([-0.2])}
    after = {"ndvi": np.array([0.5]), "nbr": np.array([0.4])}
    actual = comparison(before, after)
    np.testing.assert_allclose(actual["ndvi_delta"], [0.3], atol=1e-6)
    np.testing.assert_allclose(actual["dnbr"], [-0.6], atol=1e-6)


def test_comparison_with_no_common_valid_pixels_cannot_produce_metrics():
    before = {"ndvi": np.array([np.nan]), "nbr": np.array([0.6])}
    after = {"ndvi": np.array([0.2]), "nbr": np.array([-0.2])}
    actual = comparison(before, after)
    assert not actual["mask"].any()
    assert np.isnan(actual["ndvi_delta"]).all()
    assert np.isnan(actual["dnbr"]).all()
