"""Reproduce original local assets: no network, fonts, timestamps or machine paths."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import random

from PIL import Image
from primitives import palette, palette_hash, icon
from atlas import citizen_atlas

VERSION = 1
ICONS = ('wood stone food coins population happiness construction technology town_center primitive_house '
         'farm lumber_camp stone_quarry storage_hut research_hut dirt_road agriculture masonry toolmaking').split()


def terrain(kind, seed):
    c = palette()
    rng = random.Random(seed)
    nodes = [[rng.random() for _ in range(4)] for _ in range(4)]
    values = []
    for y in range(32):
        for x in range(32):
            fx, fy = x / 31 * 4, y / 31 * 4
            ix, iy = math.floor(fx), math.floor(fy)
            tx, ty = (1 - math.cos((fx - ix) * math.pi)) / 2, (1 - math.cos((fy - iy) * math.pi)) / 2
            a, b = nodes[iy % 4][ix % 4], nodes[iy % 4][(ix + 1) % 4]
            d, e = nodes[(iy + 1) % 4][ix % 4], nodes[(iy + 1) % 4][(ix + 1) % 4]
            values.append((a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty)
    sorted_values = sorted(values)
    cuts = [sorted_values[int(len(values) * f)] for f in (.15, .85, .95)]
    ramp = ['grass_dark', 'grass', 'grass_light', 'green_light'] if kind == 'grass' else (
        ['soil_dark', 'soil', 'soil_light', 'straw'] if kind == 'dirt' else
        ['soil', 'soil_light', 'straw_light', 'stone_light'])
    image = Image.new('RGB', (32, 32))
    image.putdata([tuple(bytes.fromhex(c[ramp[sum(value > cut for cut in cuts)]][1:])) for value in values])
    return image


def write_asset(output, assets, key, image, filename):
    # Validate every individual asset before export.
    allowed = {tuple(bytes.fromhex(value[1:])) for value in palette().values()}
    for pixel in image.convert('RGBA').get_flattened_data():
        if pixel[3] not in (0, 255) or (pixel[3] and pixel[:3] not in allowed):
            raise ValueError(f'{key}: invalid palette/alpha')
    path = output / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=False, compress_level=9)
    assets[key] = {'file': filename, 'width': image.width, 'height': image.height,
                   'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def generate(seed, output):
    if not 0 <= seed <= 0xffffffff:
        raise ValueError('Seed must be uint32')
    output.mkdir(parents=True, exist_ok=True)
    assets = {}
    for index, kind in enumerate(('grass', 'dirt', 'path')):
        write_asset(output, assets, 'terrain_' + kind, terrain(kind, seed + index), f'terrain/{kind}.png')
    for name in ICONS:
        write_asset(output, assets, 'icon_' + name, icon(name), f'icons/{name}.png')
    sheet, atlas = citizen_atlas()
    write_asset(output, assets, 'citizens', sheet, 'characters/citizens.png')
    manifest = {'generatorVersion': VERSION, 'seed': seed,
                'paletteHash': palette_hash(), 'assets': assets,
                'atlases': {'citizens': atlas}}
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--output', type=Path, default=Path('public/generated'))
    args = parser.parse_args()
    generate(args.seed, args.output)
    print('Generated assets:', args.output)
