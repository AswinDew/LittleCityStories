"""Validate generated pixels and metadata; fail nonzero instead of hiding defects."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
from PIL import Image
from primitives import palette, palette_hash
from generate_assets import ICONS, VERSION
from characters import CLIPS, DIRECTIONS


def validate(folder):
    manifest = json.loads((folder / 'manifest.json').read_text())
    if manifest['generatorVersion'] != VERSION or manifest['paletteHash'] != palette_hash():
        raise ValueError('Generator/palette mismatch: regenerate assets')
    if type(manifest['seed']) is not int or not 0 <= manifest['seed'] <= 0xffffffff:
        raise ValueError('Invalid seed')
    expected = {'citizens'} | {'terrain_' + kind for kind in ('grass', 'dirt', 'path')} | {'icon_' + key for key in ICONS}
    if not expected.issubset(manifest['assets']):
        raise ValueError('Required assets missing')
    allowed = {tuple(bytes.fromhex(value[1:])) for value in palette().values()}
    frames = sum(sum(clip[1] for clip in clips) for clips in CLIPS.values()) * len(DIRECTIONS)
    for key, asset in manifest['assets'].items():
        relative = Path(asset['file'])
        if relative.is_absolute() or '..' in relative.parts or '\\' in asset['file'] or ':' in asset['file']:
            raise ValueError(f'{key}: unsafe file path')
        path = folder / relative
        if hashlib.sha256(path.read_bytes()).hexdigest() != asset['sha256']:
            raise ValueError(f'{key}: content hash mismatch')
        with Image.open(path) as source:
            if source.format != 'PNG' or source.size != (asset['width'], asset['height']):
                raise ValueError(f'{key}: invalid dimensions/format')
            required_size = (512, ((frames + 15) // 16) * 32) if key == 'citizens' else ((32, 32) if key.startswith('terrain_') else (24, 24))
            if source.size != required_size:
                raise ValueError(f'{key}: unexpected asset size')
            for pixel in source.convert('RGBA').get_flattened_data():
                if pixel[3] not in (0, 255) or (pixel[3] and pixel[:3] not in allowed):
                    raise ValueError(f'{key}: palette or alpha violation')
    atlas = manifest['atlases']['citizens']
    if atlas['asset'] != 'citizens' or (atlas['width'], atlas['height']) != (512, ((frames + 15) // 16) * 32):
        raise ValueError('Invalid citizen atlas dimensions')
    if atlas['frameSize'] != {'width': 32, 'height': 32}:
        raise ValueError('Invalid sprite frame size')
    occupied = set()
    for role, clips in CLIPS.items():
        for direction in ('NE', 'NW', 'SE', 'SW'):
            for state, count, _ in clips:
                clip = atlas['animations'][role][direction][state]
                if (clip['anchor'] != {'x': 16, 'y': 30} or len(clip['frames']) != count or
                        type(clip['loop']) is not bool or not isinstance(clip['frameDurationMs'], (int, float)) or
                        not 0 < clip['frameDurationMs'] < 10000):
                    raise ValueError(f'{role}/{direction}/{state}: invalid clip metadata')
                for frame in clip['frames']:
                    x, y, w, h = (frame[key] for key in ('x', 'y', 'width', 'height'))
                    if (any(type(value) is not int for value in (x, y, w, h)) or (w, h) != (32, 32) or
                            x % 32 or y % 32 or x < 0 or y < 0 or x + w > atlas['width'] or y + h > atlas['height'] or (x, y) in occupied):
                        raise ValueError('Invalid/overlapping frame rectangle')
                    occupied.add((x, y))
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=Path('public/generated'))
    args = parser.parse_args()
    try:
        data = validate(args.input)
        print(f"Validated {len(data['assets'])} assets")
    except (ValueError, KeyError, OSError, TypeError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
