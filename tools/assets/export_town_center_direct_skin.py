"""Technical extraction only: original JPEG RGB + a binary silhouette mask."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def export(spec_path, masks_path, output):
    spec = json.loads(Path(spec_path).read_text(encoding='utf-8'))
    completion = spec.pop('completionExport', None)
    masks = json.loads(Path(masks_path).read_text(encoding='utf-8'))
    source = ROOT / spec.pop('sourceFile')
    if sha(source.read_bytes()) != spec['sourceSha256']:
        raise ValueError('Stitch source changed; review source-spec before export')
    x, y, w, h = spec['crop']
    image = Image.open(source).convert('RGB').crop((x, y, x + w, y + h)).convert('RGBA')
    alpha = Image.new('L', (w, h))
    draw = ImageDraw.Draw(alpha)
    draw.polygon([tuple(p) for p in masks['foreground']], fill=255)
    image.putalpha(alpha)
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    image.save(output / 'design.png', optimize=False)
    spec['image'] = dict(file='design.png', width=w, height=h, sha256=sha((output / 'design.png').read_bytes()))
    if completion:
        extra_source = ROOT / completion['sourceFile']
        if sha(extra_source.read_bytes()) != completion['sourceSha256']:
            raise ValueError('Additional Stitch source changed')
        master = Image.open(extra_source).convert('RGB')
        atlas = Image.new('RGB', (completion['width'], completion['height']))
        gutter = completion['gutter']
        for region in completion['regions'].values():
            panel_source = master
            if 'sourceFile' in region:
                path = ROOT / region['sourceFile']
                if sha(path.read_bytes()) != region['sourceSha256']:
                    raise ValueError('UV component source changed')
                panel_source = Image.open(path).convert('RGB')
            x, y, w, h = region['rect']
            # Pillow QUAD order: top-left, bottom-left, bottom-right, top-right.
            # This rectifies a whole architectural face; it does not repaint it.
            panel = panel_source.transform((w, h), Image.Transform.QUAD,
                                     tuple(v for p in region['quad'] for v in p), Image.Resampling.NEAREST)
            atlas.paste(panel, (x, y))
            for dx in range(-gutter, w + gutter):
                for dy in range(-gutter, h + gutter):
                    if 0 <= dx < w and 0 <= dy < h:
                        continue
                    atlas.putpixel((x + dx, y + dy), panel.getpixel((min(w - 1, max(0, dx)), min(h - 1, max(0, dy)))))
        atlas.save(output / 'completion.png', optimize=False)
        spec['completion'] = dict(
            image=dict(file='completion.png', width=atlas.width, height=atlas.height,
                       sha256=sha((output / 'completion.png').read_bytes())),
            sourceSha256=completion['sourceSha256'], screenName=completion['screenName'],
            gutter=gutter, regions={k: v['rect'] for k, v in completion['regions'].items()},
            bindings=completion['bindings'], cornerUVs=completion.get('cornerUVs', {}),
            componentSources={k: dict(sourceSha256=v.get('sourceSha256', completion['sourceSha256']),
                                     screenName=v.get('screenName', completion['screenName']), quad=v['quad'])
                              for k, v in completion['regions'].items()})
    (output / 'manifest.json').write_text(json.dumps(spec, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--spec', required=True, type=Path)
    parser.add_argument('--masks', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    export(args.spec, args.masks, args.output)
