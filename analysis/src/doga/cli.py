import argparse
import json
from pathlib import Path

from .catalog import probe
from .pipeline import run


def main():
    parser = argparse.ArgumentParser(description='Marmaris gerçek Sentinel-2 pilotu')
    parser.add_argument('command', choices=['probe', 'run'])
    parser.add_argument('--config', type=Path, required=True)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[3])
    parser.add_argument('--refresh', action='store_true', help='Kayıtlı ürünler yerine yeniden görüntü seç')
    args = parser.parse_args()
    if args.command == 'probe':
        config = json.loads(args.config.read_text())
        print(json.dumps(probe(config, args.root / 'data/processed' / config['id']), indent=2))
    else:
        run(args.config, args.root, args.refresh)


if __name__ == '__main__':
    main()
