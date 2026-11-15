"""Safe filesystem and public URL components for independent region outputs."""
import re

SAFE_COMPONENT = re.compile(r'[a-z0-9]+(?:-[a-z0-9]+)*\Z')


def path_component(value, label='id'):
    if not isinstance(value, str) or not SAFE_COMPONENT.fullmatch(value):
        raise ValueError(f'{label}: yalnız küçük Latin harfleri, rakamlar ve aradaki tireler kullanılabilir.')
    return value


def public_slug(config):
    path_component(config['id'])
    return path_component(config.get('publicSlug', 'marmaris'), 'publicSlug')
