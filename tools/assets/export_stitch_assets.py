"""Extract approved Stitch masters; no drawing or procedural replacement art.

Writes an isolated static pack, never the active public manifest or animations.
Crop coordinates and source hashes live in .stitch/export-spec.json.
"""
import argparse
from collections import deque
import hashlib
import json
from pathlib import Path
from statistics import median

from PIL import Image, ImageDraw
from primitives import palette, palette_hash

PROJECT = Path(__file__).resolve().parents[2]


def cutout(image, tolerance=22, seeds=(), largest=False, background=None, clear_enclosed=False):
    """Flood the backing surface, preserving enclosed matching-color fabric."""
    image = image.convert('RGB')
    width, height = image.size
    pixels = image.load()
    samples = [pixels[x, y] for x0, y0 in ((0, 0), (width - 3, 0), (0, height - 3), (width - 3, height - 3))
               for x in range(x0, x0 + 3) for y in range(y0, y0 + 3)]
    background = background or tuple(round(median(p[k] for p in samples)) for k in range(3))
    backing = bytearray(max(abs(p[k] - background[k]) for k in range(3)) <= tolerance
                        for p in image.get_flattened_data())
    transparent = bytearray(width * height)
    pending = deque([(x, 0) for x in range(width)] + [(x, height - 1) for x in range(width)] +
                    [(0, y) for y in range(height)] + [(width - 1, y) for y in range(height)] + list(seeds))
    while pending:
        x, y = pending.popleft()
        if not (0 <= x < width and 0 <= y < height):
            continue
        index = y * width + x
        if transparent[index] or not backing[index]:
            continue
        transparent[index] = 1
        pending.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
    if clear_enclosed:
        transparent = backing
    result = image.convert('RGBA')
    alpha = Image.frombytes('L', image.size, bytes(0 if p else 255 for p in transparent))
    result.putalpha(alpha)
    if largest:
        # Interior scale figures / captions are separate from the structure.
        result = _components(result, keep_largest=True)
    return result


def _components(image, keep_largest=False):
    width, height = image.size
    alpha = image.getchannel('A').tobytes()
    seen = bytearray(len(alpha))
    groups = []
    for index, opaque in enumerate(alpha):
        if not opaque or seen[index]:
            continue
        group, pending = [], [index]
        seen[index] = 1
        while pending:
            current = pending.pop()
            group.append(current)
            x, y = current % width, current // width
            for dx, dy in ((-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)):
                nx, ny = x + dx, y + dy
                other = ny * width + nx
                if 0 <= nx < width and 0 <= ny < height and alpha[other] and not seen[other]:
                    seen[other] = 1
                    pending.append(other)
        groups.append(group)
    if not groups:
        return image
    keep = [max(groups, key=len)] if keep_largest else [g for g in groups if len(g) > 1]
    mask = bytearray(width * height)
    for group in keep:
        for index in group:
            mask[index] = 255
    result = image.copy()
    result.putalpha(Image.frombytes('L', image.size, bytes(mask)))
    return result


def _quantize(image, colors):
    ramp = Image.new('P', (1, 1))
    entries = list(colors) + [colors[0]] * (256 - len(colors))
    ramp.putpalette([channel for color in entries for channel in color])
    result = image.convert('RGB').quantize(palette=ramp, dither=Image.Dither.NONE).convert('RGBA')
    result.putalpha(image.convert('RGBA').getchannel('A'))
    return result


def normalize(image, size, anchor, max_height, colors, feet=False):
    bounds = image.getbbox()
    if not bounds:
        raise ValueError('Empty asset')
    image = image.crop(bounds)
    scale = min(max_height / image.height, (size[0] - 6) / image.width)
    resized = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.NEAREST)
    center = resized.width // 2
    if feet:
        alpha = resized.getchannel('A')
        foot = alpha.crop((0, max(0, resized.height - 3), resized.width, resized.height)).getbbox()
        if foot:
            center = (foot[0] + foot[2]) // 2
    offset = (anchor[0] - center, anchor[1] - resized.height + 1)
    if offset[0] < 2 or offset[0] + resized.width > size[0] - 2 or offset[1] < 2 or offset[1] + resized.height > size[1] - 2:
        raise ValueError('Asset does not fit padded canvas')
    canvas = Image.new('RGBA', size)
    canvas.alpha_composite(resized, offset)
    return _components(_quantize(canvas, colors))


def periodic_tile(image, colors):
    """Join opposite border pixels; retain every interior source pixel."""
    result = image.convert('RGB').copy()
    width, height = result.size
    def closest(samples):
        average = tuple(sum(p[k] for p in samples) / len(samples) for k in range(3))
        return min(colors, key=lambda c: sum((c[k] - average[k]) ** 2 for k in range(3)))
    for y in range(1, height - 1):
        color = closest([image.getpixel((0, y)), image.getpixel((width - 1, y))])
        result.putpixel((0, y), color)
        result.putpixel((width - 1, y), color)
    for x in range(1, width - 1):
        color = closest([image.getpixel((x, 0)), image.getpixel((x, height - 1))])
        result.putpixel((x, 0), color)
        result.putpixel((x, height - 1), color)
    corners = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
    color = closest([image.getpixel(p) for p in corners])
    for point in corners:
        result.putpixel(point, color)
    return result


def export_all(source, output, spec):
    source, output = Path(source).resolve(), Path(output).resolve()
    if output.is_relative_to(PROJECT / 'public'):
        raise ValueError('Static review exports cannot replace public assets')
    for filename, expected in spec['sources'].items():
        path = (source / filename).resolve()
        if not path.is_relative_to(source) or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError(f'Source hash mismatch: {filename}')
    images = {name: Image.open(source / name).convert('RGB') for name in spec['sources']}
    entries = {}
    for asset in spec['assets']:
        key, group = asset['id'], asset['group']
        if not all(part.replace('_', '').isalnum() for part in (key, group)):
            raise ValueError('Invalid asset ID')
        master = images[asset['source']]
        box = asset['crop']
        if not (0 <= box[0] < box[2] <= master.width and 0 <= box[1] < box[3] <= master.height):
            raise ValueError(f'Invalid crop: {key}')
        crop = master.crop(box)
        palette_colors = palette()
        names = asset.get('palette', list(palette_colors))
        colors = [tuple(bytes.fromhex(palette_colors[name][1:])) for name in names]
        size = tuple(asset['size'])
        if group == 'terrain':
            raw = crop.convert('RGBA')
            quantized = _quantize(crop.resize(size, Image.Resampling.NEAREST).convert('RGBA'), colors).convert('RGB')
            result = periodic_tile(quantized, colors)
            anchor = None
        else:
            raw = cutout(crop, asset.get('tolerance', 22), asset.get('backgroundSeeds', ()),
                         asset.get('largest', False), asset.get('background'), asset.get('clearEnclosed', False))
            anchor = asset.get('anchor', [size[0] // 2, size[1] - 3])
            result = normalize(raw, size, anchor, asset.get('height', size[1] - 6), colors, group == 'characters')
        # Validate before exporting; sources may remain JPEG, native art may not.
        allowed = set(colors)
        if any(p[3] not in (0, 255) or (p[3] and p[:3] not in allowed) for p in result.convert('RGBA').get_flattened_data()):
            raise ValueError(f'Invalid native palette/alpha: {key}')
        file = f'native/{group}/{key}.png'
        raw_file = f'cutouts/{group}/{key}.png'
        for path, image in ((output / file, result), (output / raw_file, raw)):
            path.parent.mkdir(parents=True, exist_ok=True)
            image.save(path)
        entries[f'{group}/{key}'] = {'file': file, 'cutout': raw_file, 'width': size[0], 'height': size[1],
            'anchor': anchor, 'source': asset['source'], 'sourceSha256': spec['sources'][asset['source']],
            'crop': box, 'usage': asset.get('usage', 'static_runtime_candidate'),
            'sha256': hashlib.sha256((output / file).read_bytes()).hexdigest()}
    manifest = {'version': 1, 'source': 'Stitch', 'staticOnly': True, 'activeGameManifest': False,
                'paletteHash': palette_hash(), 'assets': entries}
    output.mkdir(parents=True, exist_ok=True)
    for name in spec['sources']:
        path = output / 'sources' / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes((source / name).read_bytes())
    (output / 'export-spec.json').write_text(json.dumps(spec, indent=2) + '\n', encoding='utf-8')
    (output / 'static-manifest.json').write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    _preview(output, entries)
    return manifest


def _preview(output, entries):
    sections = []
    native_count = sum(not key.split('/')[0].endswith('_references') for key in entries)
    reference_count = len(entries) - native_count
    for group in dict.fromkeys(key.split('/')[0] for key in entries):
        selected = [(key, value) for key, value in entries.items() if key.startswith(group + '/')]
        side = max(value['width'] for _, value in selected)
        cell_w, cell_h = max(110, side + 16), side + 34
        cols = 4 if group == 'characters' else 5
        board = Image.new('RGB', (cell_w * cols, cell_h * ((len(selected) + cols - 1) // cols)), '#BCC5BB')
        pen = ImageDraw.Draw(board)
        for index, (key, value) in enumerate(selected):
            x, y = index % cols * cell_w, index // cols * cell_h
            sprite = Image.open(output / value['file']).convert('RGBA')
            board.paste(sprite, (x + (cell_w - sprite.width) // 2, y + 24), sprite)
            pen.text((x + 5, y + 4), key.split('/')[1], fill='#302C36')
        board.save(output / f'{group}-1x.png')
        board.resize((board.width * 3, board.height * 3), Image.Resampling.NEAREST).save(output / f'{group}-3x.png')
        cards = []
        for key, value in selected:
            size = value['width']
            zoom = min(size * 4, 256)
            repeat = (f'<div class="repeat" style="background-image:url({value["file"]})"></div>'
                      if group == 'terrain' else '')
            cards.append(f'<article><h3>{key.split("/")[1]}</h3>'
                f'<p>{size} x {size}px | {value["usage"]}</p>'
                f'<div class="matte"><img src="{value["file"]}" width="{size}" height="{size}" alt="{key}, native"></div>'
                f'<div class="matte zoom"><img src="{value["file"]}" width="{zoom}" height="{zoom}" alt="{key}, enlarged"></div>'
                f'{repeat}<p><a href="{value["file"]}">PNG</a> | <a href="{value["cutout"]}">Cutout</a> | '
                f'<a href="sources/{value["source"]}">Stitch source</a></p></article>')
        section = (f'<h2>{group} ({len(selected)})</h2><p><a href="{group}-1x.png">Native sheet</a> | '
                   f'<a href="{group}-3x.png">3x sheet</a></p><div class="grid">{"".join(cards)}</div>')
        sections.append(f'<details><summary>{group}: reference images, not meshes</summary>{section}</details>'
                        if group.endswith('_references') else f'<section id="{group}">{section}</section>')
    (output / 'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Stitch static exports</title>'
        '<style>*{box-sizing:border-box}body{background:#e7dabc;color:#302c36;font:15px/1.5 system-ui;margin:24px}'
        'main{max-width:1280px;margin:auto}h1{font:600 36px Georgia}h2{margin-top:36px}h3{margin:0;font-size:16px}'
        'a{color:#385c46}article{padding:16px;border:1px solid #96704d;background:#f4ebd9;min-width:0}'
        'article p{font-size:12px;overflow-wrap:anywhere}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}'
        '.matte{background:conic-gradient(#abb6b9 25%,#d2d9d5 0 50%,#abb6b9 0 75%,#d2d9d5 0) 0 0/16px 16px;'
        'display:flex;align-items:end;justify-content:center;padding:8px;margin:8px 0;overflow:auto}'
        'img{image-rendering:pixelated;max-width:none;object-fit:contain}.zoom{min-height:132px}'
        '.repeat{width:192px;height:192px;background-repeat:repeat;background-size:64px 64px;image-rendering:pixelated}'
        'details{border-top:1px solid #96704d;padding:20px 0;margin-top:24px}summary{cursor:pointer;font-weight:600}'
        '.note{padding:16px;background:#d4d8b7;border-left:4px solid #59845a}</style>'
        '<main><h1>Stitch static exports</h1><p>Original Stitch artwork; technical extraction and native-size adaptation.</p>'
        f'<p class="note">{native_count} native 2D candidates and {reference_count} reference rasters. '
        'Neutral citizens only; no animation or active-game replacement. Reference rasters are not 3D meshes. '
        'Transparent checkerboards exist only in this review page, not in PNG pixels.</p>'
        '<p><a href="static-manifest.json">Manifest</a> | <a href="export-spec.json">Source crops</a> | '
        '<a href="audit.json">Audit</a> | <a href="stitch-static-pack.zip">Download pack</a></p>'
        '<p>Characters: 64px, foot anchor (32,60). Icons: 24px. Props: 32px. Terrain: 32px; '
        'repeat samples use the same native tile. Equal border pixels do not replace visual seam review.</p>'
        + ''.join(sections) + '</main></html>', encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--spec', type=Path, default=PROJECT / '.stitch/export-spec.json')
    parser.add_argument('--source', type=Path, default=PROJECT / '.stitch/designs')
    parser.add_argument('--output', type=Path, default=PROJECT / '.stitch/exports')
    args = parser.parse_args()
    result = export_all(args.source, args.output, json.loads(args.spec.read_text(encoding='utf-8')))
    print(f"Exported {len(result['assets'])} static assets to {args.output}")
