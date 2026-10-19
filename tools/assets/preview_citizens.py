"""Render the isolated art study; never writes into the game's generated assets."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw
from citizen_style import CLIPS, DIRECTIONS, FOOT_ANCHOR, FRAME_SIZE, draw_citizen
from characters import character
from primitives import palette


def _output_directory(output):
    output = Path(output).resolve()
    protected = Path(__file__).resolve().parents[2] / 'public'
    if output == protected or protected in output.parents:
        raise ValueError('Preview output must stay outside public/; production art is unchanged')
    output.mkdir(parents=True, exist_ok=True)
    return output


def preview(output):
    output = _output_directory(output)
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


def preview_all(output):
    """Export all supported poses, direction sheets and normal/slow loops."""
    output = _output_directory(output)
    c = palette()
    for folder in ('frames', 'sheets', 'loops'):
        (output / folder).mkdir(exist_ok=True)

    def board(columns, rows, cell=(96, 96)):
        return Image.new('RGBA', (columns * cell[0], rows * cell[1]), c['linen'])

    def label(target, xy, text):
        pen = ImageDraw.Draw(target); pen.fontmode = '1'
        pen.text(xy, text, fill=c['ink'])

    def enlarged(image, scale=2):
        return image.resize((image.width * scale, image.height * scale), Image.Resampling.NEAREST)

    overview, walks, work = board(4, 4), board(4, 1), board(4, 1)
    metadata = {'previewOnly': True, 'frameSize': [FRAME_SIZE, FRAME_SIZE],
                'anchor': list(FOOT_ANCHOR), 'poses': [], 'clips': []}
    cards = []
    for row, (role, clips) in enumerate(CLIPS.items()):
        for col, direction in enumerate(DIRECTIONS):
            overview.alpha_composite(draw_citizen(role, direction, 'idle', 0), (col * 96 + 16, row * 96 + 18))
            label(overview, (col * 96 + 3, row * 96 + 2), f'{role} {direction}')
        for state, count, duration in clips:
            sheet = board(count, 4, (80, 88))
            loops = [board(4, 1) for _ in range(count)]
            for col, direction in enumerate(DIRECTIONS):
                for number in range(count):
                    image = draw_citizen(role, direction, state, number)
                    file = f'frames/{role}-{direction}-{state}-{number}.png'
                    image.save(output / file)
                    metadata['poses'].append({'role': role, 'direction': direction, 'state': state,
                                              'frame': number, 'file': file, 'anchor': list(FOOT_ANCHOR)})
                    sheet.alpha_composite(image, (number * 80 + 8, col * 88 + 18))
                    label(sheet, (number * 80 + 8, col * 88 + 2), f'{direction} {number + 1}')
                    loops[number].alpha_composite(image, (col * 96 + 16, 18))
                    label(loops[number], (col * 96 + 16, 2), direction)
            sheet_file = f'sheets/{role}-{state}'
            sheet.save(output / f'{sheet_file}-1x.png')
            enlarged(sheet).save(output / f'{sheet_file}-2x.png')
            for speed, multiplier in [('normal', 1), ('slow', 3)]:
                animation = [enlarged(frame).convert('RGB') for frame in loops]
                animation[0].save(output / f'loops/{role}-{state}-{speed}.gif', save_all=True,
                                  append_images=animation[1:], duration=duration * multiplier, loop=0, disposal=2)
            metadata['clips'].append({'role': role, 'state': state, 'frameCount': count,
                                      'frameDurationMs': duration, 'loop': True,
                                      'sheet': f'{sheet_file}-1x.png',
                                      'normal': f'loops/{role}-{state}-normal.gif',
                                      'slow': f'loops/{role}-{state}-slow.gif'})
            cards.append(f'<article><h2>{role} / {state}</h2><p>{count} frames · {duration} ms/frame</p>'
                         f'<p>Normal</p><img src="loops/{role}-{state}-normal.gif" alt="{role} {state}, four directions">'
                         f'<p>Slow 3×</p><img src="loops/{role}-{state}-slow.gif" alt="Slow motion">'
                         f'<p><a href="{sheet_file}-2x.png">All key poses at 2×</a></p></article>')
        walks.alpha_composite(draw_citizen(role, 'SE', 'walk', 1), (row * 96 + 16, 18))
        label(walks, (row * 96 + 4, 2), role)
        work_clip = clips[2][0]
        work.alpha_composite(draw_citizen(role, 'SE', work_clip, 4), (row * 96 + 16, 18))
        label(work, (row * 96 + 4, 2), f'{role} {work_clip}')
    enlarged(overview, 3).save(output / 'professions-3x.png')
    enlarged(walks, 3).save(output / 'walk-preview-3x.png')
    enlarged(work, 3).save(output / 'work-preview-3x.png')
    (output / 'preview-all.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
    (output / 'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Citizen art preview</title>'
        '<style>body{background:#e7dabc;color:#302c36;font:16px system-ui;margin:24px}'
        'article{border-top:1px solid #96704d;padding:16px 0}img{max-width:100%;image-rendering:pixelated}'
        '</style><h1>Citizen art — stage 3</h1><p>Preview only. Directions: NE / NW / SE / SW. '
        'Boot baseline: y60. All loops keep original clip timing.</p>' + ''.join(cards) + '</html>', encoding='utf-8')
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('test-results/citizen-style-stage-1'))
    parser.add_argument('--all', action='store_true', help='Export all professions and supported clips')
    args = parser.parse_args()
    print((preview_all if args.all else preview)(args.output))
