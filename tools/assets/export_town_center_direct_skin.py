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
    (output / 'manifest.json').write_text(json.dumps(spec, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--spec', required=True, type=Path)
    parser.add_argument('--masks', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    export(args.spec, args.masks, args.output)
