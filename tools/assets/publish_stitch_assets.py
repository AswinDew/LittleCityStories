"""Verify frozen Stitch PNGs for local runtime export; never invent animation clips."""
import hashlib
import json
from pathlib import Path
from PIL import Image
from primitives import palette


def load_stitch_images(source):
    source = Path(source).resolve()
    manifest = json.loads((source / 'static-manifest.json').read_text(encoding='utf-8'))
    if manifest.get('staticOnly') is not True:
        raise ValueError('Expected static Stitch sources')
    allowed = {tuple(bytes.fromhex(value[1:])) for value in palette().values()}
    result = {}
    for key, asset in manifest['assets'].items():
        group, name = key.split('/', 1)
        if group not in ('icons', 'terrain') or (group == 'terrain' and name not in ('grass', 'dirt', 'path')):
            continue
        if not name.replace('_', '').isalnum() or not name.islower():
            raise ValueError('Invalid static asset ID')
        path = (source / asset['file']).resolve()
        if not path.is_relative_to(source) or hashlib.sha256(path.read_bytes()).hexdigest() != asset['sha256']:
            raise ValueError(f'Stitch source hash mismatch: {key}')
        image = Image.open(path).convert('RGBA')
        size = 24 if group == 'icons' else 32
        if image.size != (size, size) or image.size != (asset['width'], asset['height']):
            raise ValueError(f'Invalid static asset size: {key}')
        if any(p[3] not in (0, 255) or (p[3] and p[:3] not in allowed) for p in image.get_flattened_data()):
            raise ValueError(f'Invalid static asset colors: {key}')
        result[f'{"icon" if group == "icons" else "terrain"}_{name}'] = (image, path)
    return result


def publish(source, output):
    # Verify the whole selected input set before creating/writing output files.
    selected = load_stitch_images(source)
    output = Path(output)
    assets = {}
    for key, (image, path) in selected.items():
        group, name = key.split('_', 1)
        file = f'{"icons" if group == "icon" else "terrain"}/{name}.png'
        target = output / file
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(path.read_bytes())
        assets[key] = {'file': file, 'width': image.width, 'height': image.height,
                       'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}
    return {'assets': assets, 'atlases': {}}
