"""Publish the reviewed Stitch materials as a reproducible Town Center-only atlas."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from PIL import Image

LAYOUT = Path(__file__).with_name('town-center-skin-layout.json')
MATERIALS = {'straw_grain', 'oak_grain', 'limestone_grain', 'plaster_grain', 'linen_weave'}
TONES = ('soil_dark stone_dark wood_dark stone stone_light linen ink wood wood_light straw straw_light blue blue_light').split()
FACES = ('top', 'front', 'side', 'dark')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_layout(layout):
    payload = {k: v for k, v in layout.items() if k != 'layoutHash'}
    calculated = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    if calculated != layout.get('layoutHash'):
        raise ValueError('Skin layout digest mismatch')
    if (layout.get('version'), layout.get('buildingId'), layout.get('width'), layout.get('height'), layout.get('gutter')) != (1, 'town_center', 1024, 1024, 8):
        raise ValueError('Invalid skin layout contract')
    expected = {}
    for tone in TONES:
        for face in FACES:
            i = len(expected); expected[tone + '_' + face] = [8 + i % 8 * 128, 8 + i // 8 * 128, 112, 112]
    if layout.get('regions') != expected or set(layout.get('materials', {})) != set(TONES) or set(layout.get('shades', {})) != set(FACES):
        raise ValueError('Skin layout regions changed without a new contract version')
    for material in layout['materials'].values():
        if ('source' in material) == ('color' in material) or ('source' in material and material['source'] not in MATERIALS):
            raise ValueError('Invalid skin material source')
        if not 0.1 <= material.get('gain', 1) <= 2:
            raise ValueError('Invalid material brightness')
        if 'baseColor' in material and not re.fullmatch(r'#[a-fA-F0-9]{6}', material['baseColor']):
            raise ValueError('Invalid civic reference color')
        if not 0 <= material.get('detailStrength', 1) <= 1:
            raise ValueError('Invalid source detail strength')
        if not 4 <= material.get('texelDensity', 24) <= 96:
            raise ValueError('Invalid material texel density')
    if any(not 0.1 <= value <= 1 for value in layout['shades'].values()):
        raise ValueError('Invalid face light')


def read_sources(source_spec):
    spec = json.loads(source_spec.read_text(encoding='utf-8'))
    entries = spec.get('materials', [])
    if spec.get('version') != 1 or spec.get('buildingId') != 'town_center' or len(entries) != 5 or {m['id'] for m in entries} != MATERIALS:
        raise ValueError('Missing required Town Center skin sources')
    allowed = source_spec.resolve().parents[2]
    result, provenance = {}, {}
    for entry in entries:
        for kind in ('source', 'candidate'):
            info = entry[kind]; path = (source_spec.parent / info['file']).resolve()
            if not path.is_relative_to(allowed):
                raise ValueError('Skin path outside source directory')
            if not path.is_file() or digest(path) != info['sha256']:
                raise ValueError('Skin source hash mismatch: ' + entry['id'])
            with Image.open(path) as image:
                image.load()
                if image.size != (info['width'], info['height']) or image.width < 1 or image.height < 1:
                    raise ValueError('Invalid skin source dimensions')
                if kind == 'candidate': result[entry['id']] = image.convert('RGB')
        provenance[entry['id']] = {kind + 'Sha256': entry[kind]['sha256'] for kind in ('source', 'candidate')}
    return result, provenance


def brightness(image, factor, base_color=None, strength=1):
    # Match Three.js linear-space painted shading; do not darken sRGB channels twice.
    def linear_channel(value):
        v = value / 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    def encoded_channel(linear):
        linear = min(1, max(0, linear))
        encoded = linear * 12.92 if linear <= 0.0031308 else 1.055 * linear ** (1 / 2.4) - 0.055
        return round(encoded * 255)
    linear = [linear_channel(i) for i in range(256)]
    if base_color is None:
        return image.point([encoded_channel(v * factor) for v in linear] * 3)
    reference = tuple(bytes.fromhex(base_color[1:])); histogram = image.histogram()
    lookup = []
    for c in range(3):
        mean = sum(linear[i] * histogram[c * 256 + i] for i in range(256)) / (image.width * image.height)
        target = linear_channel(reference[c])
        lookup.extend(encoded_channel(target * (1 + (v / max(mean, 0.000001) - 1) * strength) * factor) for v in linear)
    return image.point(lookup)


def export_skin(source_spec, output, layout_path=LAYOUT):
    source_spec, output = Path(source_spec), Path(output)
    layout = json.loads(Path(layout_path).read_text(encoding='utf-8')); validate_layout(layout)
    sources, provenance = read_sources(source_spec)
    atlas = Image.new('RGB', (1024, 1024))
    for tone, material in layout['materials'].items():
        if 'source' in material:
            source = sources[material['source']]
            side = min(source.width, source.height, 512)
            left, top = (source.width - side) // 2, (source.height - side) // 2
            patch = source.crop((left, top, left + side, top + side)).resize((112, 112), Image.Resampling.NEAREST)
        else:
            patch = Image.new('RGB', (112, 112), material['color'])
        for face, shade in layout['shades'].items():
            tile = brightness(patch, shade * material.get('gain', 1), material.get('baseColor'), material.get('detailStrength', 1))
            x, y, w, h = layout['regions'][tone + '_' + face]
            # Extend the exact edge texels into all eight gutter pixels, including corners.
            padded = Image.new('RGB', (128, 128))
            padded.paste(tile, (8, 8))
            for offset in range(8):
                padded.paste(tile.crop((0, 0, w, 1)), (8, offset))
                padded.paste(tile.crop((0, h - 1, w, h)), (8, 120 + offset))
                padded.paste(tile.crop((0, 0, 1, h)), (offset, 8))
                padded.paste(tile.crop((w - 1, 0, w, h)), (120 + offset, 8))
            for px, py, sx, sy in ((0, 0, 0, 0), (120, 0, w - 1, 0), (0, 120, 0, h - 1), (120, 120, w - 1, h - 1)):
                padded.paste(tile.getpixel((sx, sy)), (px, py, px + 8, py + 8))
            atlas.paste(padded, (x - 8, y - 8))
    output.mkdir(parents=True, exist_ok=True)
    atlas.save(output / 'atlas.png', optimize=False, compress_level=9)
    manifest = {'schemaVersion': 1, 'buildingId': 'town_center', 'layoutVersion': layout['version'],
                'layoutHash': layout['layoutHash'], 'regions': layout['regions'], 'gutter': 8,
                'atlas': {'file': 'atlas.png', 'width': 1024, 'height': 1024, 'sha256': digest(output / 'atlas.png')},
                'sources': provenance, 'colorSpace': 'srgb'}
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-spec', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = export_skin(args.source_spec, args.output)
    print('Town Center atlas exported:', args.output, result['atlas']['sha256'])
