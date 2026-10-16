"""Layered 32px isometric citizens, hand-drawn poses per direction (no mirroring)."""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw
from primitives import palette, canvas, tool

ROLES = {'villager': ('blue', 'work'), 'farmer': ('green', 'harvest'),
         'lumberjack': ('clay', 'chop'), 'builder': ('purple', 'build')}
DIRECTIONS = ('NE', 'NW', 'SE', 'SW')


def character(role, direction, state, frame):
    c = palette()
    image = canvas(32)
    d = ImageDraw.Draw(image)
    facing = 1 if direction.endswith('E') else -1
    north = direction.startswith('N')
    working = state not in ('idle', 'walk')
    stride = [0, 1, 2, 0, -1, -2][frame] if state == 'walk' else 0
    bob = [0, 0, -1, 0, 0, -1][frame] if state == 'walk' else -(frame % 2)
    bend = [0, 1, 3, 4, 2, 0][frame] if working and role == 'farmer' else 0
    cx, head_y = 16 + facing * bend, 5 + bob + bend
    shirt = c[ROLES[role][0]]
    # Grounded boots and separate legs retain the (16,30) foot anchor.
    for x, offset in [(13, stride), (18, -stride)]:
        d.polygon([(x - 1, 22 + bob), (x + 2, 22 + bob), (x + 2 + offset, 28),
                   (x - 1 + offset, 28)], fill=c['wood_dark'], outline=c['ink'])
        d.rectangle((x - 2 + offset, 28, x + 2 + offset, 30), fill=c['ink'])
    # The far arm is shaded; projected hand position differs in all four views.
    far_x = 16 - facing * 5
    arm_swing = -stride if state == 'walk' else frame % 2
    d.line((far_x, 16 + bob, far_x - facing, 23 + arm_swing), fill=c['ink'], width=4)
    d.line((far_x, 17 + bob, far_x - facing, 22 + arm_swing), fill=c['skin_shadow'], width=2)
    d.polygon([(11 + facing * bend, 15 + bob + bend), (20 + facing * bend, 15 + bob + bend),
               (21, 24 + bob), (11, 24 + bob)], fill=c['ink'])
    d.polygon([(12 + facing * bend, 16 + bob + bend), (19 + facing * bend, 16 + bob + bend),
               (20, 23 + bob), (12, 23 + bob)], fill=shirt)
    d.line((19, 17 + bob + bend, 20, 22 + bob), fill=c['linen'], width=1)
    d.rectangle((12, 23 + bob, 20, 24 + bob), fill=c['wood_dark'])
    # Rounded head, neck and ears are independent layers rather than a colored rectangle.
    d.rectangle((cx - 1, head_y + 8, cx + 1, head_y + 11), fill=c['skin_shadow'])
    d.ellipse((cx - 5, head_y, cx + 5, head_y + 10), fill=c['skin'], outline=c['ink'])
    d.ellipse((cx - 4, head_y, cx + 5, head_y + 4), fill=c['wood_dark'])
    d.line((cx, head_y + 1, cx + 3, head_y + 2), fill=c['wood_light'], width=2)
    d.rectangle((cx - facing * 5, head_y + 5, cx - facing * 5 + 1, head_y + 7), fill=c['skin_shadow'])
    if north:
        d.ellipse((cx - 4, head_y + 2, cx + 3, head_y + 8), fill=c['wood_dark'])
        d.line((cx + 2, head_y + 3, cx + 3, head_y + 5), fill=c['wood_light'], width=1)
    else:
        d.point((cx + facing * 2, head_y + 5), fill=c['ink'])
        d.line((cx + facing * 3, head_y + 7, cx + facing * 4, head_y + 7), fill=c['skin_light'])
        d.point((cx + facing, head_y + 8), fill=c['wood_dark'])
    if role == 'farmer':
        d.polygon([(cx - 5, head_y + 1), (cx - 3, head_y - 2), (cx + 3, head_y - 2),
                   (cx + 5, head_y + 1)], fill=c['straw'], outline=c['ink'])
        d.line((cx - 7, head_y + 2, cx + 7, head_y + 2), fill=c['straw_light'], width=2)
    elif role == 'builder':
        d.line((cx - 4, head_y + 2, cx + 4, head_y + 2), fill=c['linen'], width=2)
    # Tools remain in the character's right hand, projected separately for north/south.
    hand_side = facing if not north else -facing
    hand_x = 16 + hand_side * 5
    hand_y = 22 + stride if not working else [19, 15, 12, 23, 24, 21][frame]
    if working and role == 'farmer': hand_y = 22 + bend
    d.line((16 + hand_side * 4, 17 + bob + bend, hand_x, hand_y), fill=c['ink'], width=4)
    d.line((16 + hand_side * 4, 17 + bob + bend, hand_x, hand_y), fill=c['skin_light'], width=2)
    if role in ('builder', 'lumberjack'):
        tool(d, c, hand_x - hand_side, hand_y - 3, 'axe' if role == 'lumberjack' else 'hammer', hand_side)
    elif role == 'farmer':
        d.line((hand_x, hand_y + 3, hand_x + hand_side * 3, hand_y - 5), fill=c['wood_dark'], width=2)
        d.line((hand_x + hand_side * 3, hand_y - 5, hand_x + hand_side * 6, hand_y - 4), fill=c['stone_light'], width=2)
    elif working:
        d.polygon([(hand_x - 2, hand_y), (hand_x + 2, hand_y - 2), (hand_x + 4, hand_y + 2),
                   (hand_x, hand_y + 4)], fill=c['stone'], outline=c['ink'])
    return image


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--draft', action='store_true')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    preview = Image.new('RGBA', (32 * 4, 32), (0, 0, 0, 0))
    for i, role in enumerate(ROLES): preview.paste(character(role, 'SE', 'idle', 0), (i * 32, 0))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    preview.save(args.output)
