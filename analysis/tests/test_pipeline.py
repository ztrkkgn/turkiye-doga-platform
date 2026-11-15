"""Publication safety with synthetic scenes confined to pytest's temp directory."""

import json
import hashlib
from types import SimpleNamespace

import numpy as np
import pytest
from affine import Affine

from doga import pipeline


@pytest.fixture
def configured_run(tmp_path, monkeypatch):
    config = {
        "id": "test-only-window",
        "bbox": [28.20, 36.85, 28.32, 36.95],
        "name": "Synthetic test fixture",
        "province": "Test",
        "description": "Never published outside pytest temporary directory",
        "resolutionM": 20,
        "sources": [],
        "periods": [
            {"id": "before", "start": "2021-07-28", "end": "2021-07-28"},
            {"id": "after", "start": "2021-08-17", "end": "2021-08-17"},
        ],
        "minValidFraction": 0.5,
    }
    config_path = tmp_path / "test-config.json"
    config_path.write_text(json.dumps(config))
    existing = tmp_path / "web/public/data/marmaris"
    existing.mkdir(parents=True)
    marker = existing / "summary.json"
    marker.write_text('{"existingPublishedResult": true}\n')
    monkeypatch.setattr(pipeline, "make_grid", lambda config: SimpleNamespace(
        mask=np.ones((2, 5), dtype=bool), crs="EPSG:32635", width=5, height=2,
        transform=Affine(20, 0, 600000, 0, -20, 4100000),
    ))

    def candidates(config, period):
        return [{
            "id": period["id"],
            "collection": "sentinel-2-c1-l2a",
            "properties": {
                "datetime": period["start"] + "T09:00:00Z",
                "s2:product_uri": "SYNTHETIC_TEST_FIXTURE_NOT_AN_OBSERVATION",
                "eo:cloud_cover": 0,
            },
        }]

    monkeypatch.setattr(pipeline, "candidates", candidates)
    # These tests exercise quality gates, never image generation or live data.
    for name in ("write_rgb", "write_index", "write_geotiff"):
        monkeypatch.setattr(pipeline, name, lambda *args, **kwargs: None)
    return config_path, tmp_path, marker


def scene(valid):
    valid = np.asarray(valid, dtype=bool).reshape(2, 5)
    return {
        "valid": valid,
        "ndvi": np.where(valid, 0.7, np.nan),
        "nbr": np.where(valid, 0.6, np.nan),
        "rgb": np.zeros((3, 2, 5)),
    }


def test_insufficient_single_date_does_not_replace_published_data(configured_run, monkeypatch):
    config_path, root, marker = configured_run
    original = marker.read_bytes()
    monkeypatch.setattr(pipeline, "read_scene", lambda item, grid: scene([False] * 10))
    with pytest.raises(RuntimeError, match="yeterli gerçek veri yok"):
        pipeline.run(config_path, root)
    assert marker.read_bytes() == original
    assert not (root / "data/processed/test-only-window/selection.json").exists()
    assert not (root / "data/cache/test-only-window/selection.json").exists()


def test_individual_coverage_cannot_bypass_common_coverage_gate(configured_run, monkeypatch):
    config_path, root, marker = configured_run
    original = marker.read_bytes()
    observations = {
        "before": scene([True] * 6 + [False] * 4),
        "after": scene([False] * 4 + [True] * 6),
    }
    # Each scene has 60% coverage, while their common support is only 20%.
    monkeypatch.setattr(pipeline, "read_scene", lambda item, grid: observations[item["id"]])
    with pytest.raises(RuntimeError, match="Ortak geçerli kapsama yetersiz"):
        pipeline.run(config_path, root)
    assert marker.read_bytes() == original
    assert not (root / "data/processed/test-only-window/selection.json").exists()
    assert not (root / "data/cache/test-only-window/selection.json").exists()


def test_out_of_physical_range_indices_cannot_be_published(configured_run, monkeypatch):
    config_path, root, marker = configured_run
    original = marker.read_bytes()
    invalid = scene([True] * 10)
    invalid["ndvi"][:] = 1.9
    monkeypatch.setattr(pipeline, "read_scene", lambda item, grid: invalid)
    with pytest.raises((RuntimeError, ValueError)):
        pipeline.run(config_path, root)
    assert marker.read_bytes() == original
    assert not (root / "data/processed/test-only-window/selection.json").exists()
    assert not (root / "data/cache/test-only-window/selection.json").exists()


def test_old_pinned_collection_is_rejected_before_any_pixel_read(configured_run, monkeypatch):
    config_path, root, marker = configured_run
    original = marker.read_bytes()
    cached = root / "data/cache/test-only-window/selection.json"
    cached.parent.mkdir(parents=True)
    cached.write_text(json.dumps({
        "configSha256": hashlib.sha256(config_path.read_bytes()).hexdigest(),
        "items": {
            period: {"id": "legacy-test-fixture", "collection": "sentinel-2-l2a"}
            for period in ("before", "after")
        },
    }))
    pinned_bytes = cached.read_bytes()

    def reject_read(item, grid):
        pytest.fail("Legacy pinned item reached pixel reader")

    monkeypatch.setattr(pipeline, "read_scene", reject_read)
    with pytest.raises((RuntimeError, ValueError)):
        pipeline.run(config_path, root)
    assert marker.read_bytes() == original
    assert cached.read_bytes() == pinned_bytes


def test_second_region_is_published_without_replacing_first_region(configured_run, monkeypatch):
    config_path, root, first_marker = configured_run
    config = json.loads(config_path.read_text())
    config['publicSlug'] = 'second-pilot'
    config_path.write_text(json.dumps(config))
    original = first_marker.read_bytes()
    monkeypatch.setattr(pipeline, 'read_scene', lambda item, grid: scene([True] * 10))
    summary = pipeline.run(config_path, root)
    assert first_marker.read_bytes() == original
    second = root / 'web/public/data/second-pilot/summary.json'
    assert second.exists()
    assert json.loads(second.read_text())['id'] == config['id']
    assert summary['publicSlug'] == 'second-pilot'
    for period in summary['periods']:
        for key in ['rgbUrl', 'ndviUrl', 'nbrUrl']:
            assert period['observation'][key].startswith('/data/second-pilot/')
    assert summary['comparisons']['fire']['dnbrUrl'] == '/data/second-pilot/dnbr.png'
    assert summary['assets']['aoiUrl'] == '/data/second-pilot/aoi.geojson'
    assert summary['assets']['provenanceUrl'] == '/data/second-pilot/provenance.json'
    assert not (root / 'web/public/data/.second-pilot-incoming').exists()
    assert not (root / 'web/public/data/.second-pilot-previous').exists()


@pytest.mark.parametrize('field,value', [
    ('publicSlug', '../other'), ('publicSlug', '/tmp/other'),
    ('publicSlug', ''), ('publicSlug', 'Other'), ('publicSlug', 'a/b'),
    ('publicSlug', 'a%2fb'), ('publicSlug', None), ('id', '../cache-escape')
])
def test_unsafe_region_paths_fail_before_reading_or_writing(configured_run, monkeypatch, field, value):
    config_path, root, marker = configured_run
    config = json.loads(config_path.read_text())
    config[field] = value
    config_path.write_text(json.dumps(config))
    original = marker.read_bytes()
    monkeypatch.setattr(pipeline, 'make_grid', lambda _: pytest.fail('Unsafe path reached raster work'))
    with pytest.raises(ValueError):
        pipeline.run(config_path, root)
    assert marker.read_bytes() == original
