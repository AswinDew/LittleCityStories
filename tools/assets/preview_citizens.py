"""Render the isolated art study; never writes into the game's generated assets."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw
from citizen_style import DIRECTIONS, FOOT_ANCHOR, FRAME_SIZE, draw_citizen
from characters import character
from primitives import palette


def preview(output):
    output = Path(output).resolve()
    protected = Path(__file__).resolve().parents[2] / 'public'
    if output == protected or protected in output.parents:
        raise ValueError('Preview output must stay outside public/; production art is unchanged')
    c = palette()
    output.mkdir(parents=True, exist_ok=True)

    def board(columns, rows):
        return Image.new('RGBA', (columns * 96, rows * 96), c['linen'])

    def label(image, xy, text):
        pen = ImageDraw.Draw(image)
        pen.fontmode = '1'  # Default bitmap-style labels without partial alpha.
        pen.text(xy, text, fill=c['ink'])

    sheet, silhouettes = board(4, 2), board(4, 2)
    poses = []
    for frame in range(2):
        for column, direction in enumerate(DIRECTIONS):
            image = draw_citizen('villager', direction, 'idle', frame)
            filename = f'villager-{direction}-idle-{frame}.png'
            image.save(output / filename)
            x, y = column * 96 + 16, frame * 96 + 18
            sheet.alpha_composite(image, (x, y))
            silhouette = Image.new('RGBA', image.size, c['ink'])
            silhouette.putalpha(image.getchannel('A'))
            silhouettes.alpha_composite(silhouette, (x, y))
            for target in (sheet, silhouettes):
                label(target, (column * 96 + 16, frame * 96 + 2), f'{direction}  IDLE {frame + 1}')
            poses.append({'file': filename, 'direction': direction, 'frame': frame, 'anchor': list(FOOT_ANCHOR)})
    for name, image in [('contact-sheet', sheet), ('silhouettes', silhouettes)]:
        image.save(output / f'{name}-1x.png')
        image.resize((image.width * 4, image.height * 4), Image.Resampling.NEAREST).save(output / f'{name}-4x.png')

    comparison = board(4, 1)
    for column, direction in enumerate(('SE', 'SW')):
        old = character('villager', direction, 'idle', 0).resize((64, 64), Image.Resampling.NEAREST)
        new = draw_citizen('villager', direction, 'idle', 0)
        for offset, image, text in [(0, old, 'OLD 32px'), (1, new, 'NEW 64px')]:
            x = (column * 2 + offset) * 96
            comparison.alpha_composite(image, (x + 16, 18))
            label(comparison, (x + 10, 2), f'{text} {direction}')
    comparison.resize((comparison.width * 4, comparison.height * 4), Image.Resampling.NEAREST).save(output / 'comparison-4x.png')

    # Same opaque palette for every frame: GIF preview has no alpha/matte conversion artifacts.
    animation = []
    for frame in range(2):
        strip = board(4, 1)
        for column, direction in enumerate(DIRECTIONS):
            strip.alpha_composite(draw_citizen('villager', direction, 'idle', frame), (column * 96 + 16, 18))
            label(strip, (column * 96 + 16, 2), direction)
        animation.append(strip.resize((strip.width * 3, strip.height * 3), Image.Resampling.NEAREST).convert('RGB'))
    animation[0].save(output / 'idle-preview.gif', save_all=True, append_images=animation[1:], duration=500, loop=0, disposal=2)
    metadata = {'previewOnly': True, 'frameSize': [FRAME_SIZE, FRAME_SIZE], 'anchor': list(FOOT_ANCHOR),
                'frameDurationMs': 500, 'poses': poses}
    (output / 'preview.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('test-results/citizen-style-stage-1'))
    args = parser.parse_args()
    print(preview(args.output))
