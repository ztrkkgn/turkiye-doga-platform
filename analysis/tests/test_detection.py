from types import SimpleNamespace
from datetime import datetime, timezone
import numpy as np
from affine import Affine

from doga.detection import detect_changes
from doga.monitor import fresh_status


def detect(delta, mask=None):
    grid = SimpleNamespace(crs='EPSG:32635', transform=Affine(20,0,600000,0,-20,4100000),
                           mask=np.ones(delta.shape, dtype=bool) if mask is None else mask)
    return detect_changes(np.full(delta.shape, 0.5), 0.5+delta, grid,
        region_id='test-monitor', event_id='test-event', before_date='2026-10-20T09:00:00Z',
        after_date='2026-11-08T09:00:00Z')


def background():
    return np.tile(np.linspace(-0.025, 0.025, 30), (30,1))


def test_connected_ndvi_outliers_keep_sign_real_delta_area_and_review_state():
    delta = background()
    delta[2:7,2:7] = -0.4
    delta[20:25,20:25] = 0.4
    features, stats = detect(delta)
    assert stats['status'] == 'available'
    assert len(features) == 2
    by_direction = {f['properties']['direction']:f['properties'] for f in features}
    for direction, expected in [('decrease',-0.4),('increase',0.4)]:
        props = by_direction[direction]
        assert np.isclose(props['delta'], expected)
        assert props['areaHa'] == 1.0
        assert props['pixelCount'] == 25
        assert props['reviewStatus'] == 'unreviewed'
        assert props['threshold'] > 0
        assert abs(props['modifiedZ']) > 3.5


def test_zero_mad_produces_no_fake_outlier_scores():
    delta = np.zeros((30,30))
    delta[2:7,2:7] = -0.4
    features, stats = detect(delta)
    assert features == []
    assert stats['status'] == 'insufficient-data'
    assert stats['mad'] == 0


def test_sub_hectare_noise_and_masked_changes_are_excluded():
    delta = background()
    delta[2:6,2:8] = -0.4  # 24 pixels, below 1 ha.
    delta[20:25,20:25] = 0.4
    mask = np.ones(delta.shape, dtype=bool)
    mask[20:25,20:25] = False
    features, _ = detect(delta, mask)
    assert features == []


def test_spatial_relative_outliers_do_not_reverse_actual_change_direction():
    delta = background() + 0.3
    delta[2:7,2:7] = 0.03  # Strong negative residual, actual NDVI still increases.
    features, _ = detect(delta)
    assert features == []


def test_freshness_uses_actual_acquisition_instead_of_check_time():
    now = datetime(2026,11,13,12,tzinfo=timezone.utc)
    assert fresh_status('2026-11-08T09:00:00Z', now) == 'available'
    assert fresh_status('2026-10-10T09:00:00Z', now) == 'stale'
    assert fresh_status('2026-11-14T09:00:00Z', now) == 'stale'
