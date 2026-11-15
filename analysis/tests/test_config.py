from doga.config import public_slug


def test_existing_marmaris_config_keeps_original_public_location():
    assert public_slug({'id': 'mugla-marmaris-2021'}) == 'marmaris'


def test_new_region_must_explicitly_choose_its_location():
    assert public_slug({'id': 'mugla-bordubet-2022', 'publicSlug': 'bordubet'}) == 'bordubet'
