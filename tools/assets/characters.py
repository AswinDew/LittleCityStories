"""Layered 32px isometric citizens, hand-drawn poses per direction (no mirroring)."""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw
from primitives import palette, canvas, tool

ROLES = {'villager': ('blue', 'work'), 'farmer': ('green', 'harvest'),
         'lumberjack': ('clay', 'chop'), 'builder': ('purple', 'build')}
DIRECTIONS = ('NE', 'NW', 'SE', 'SW')
CLIPS = {
    role: [('idle', 2, 500), ('walk', 6, 100), (work, 6, 120)]
    for role, (_, work) in ROLES.items()
}
CLIPS['villager'] += [('mine', 8, 140), ('research', 8, 180)]
CLIPS['farmer'] += [('water', 6, 160)]


def character(role, direction, state, frame):
    c = palette()
    image = canvas(32)
    d = ImageDraw.Draw(image)
    facing = 1 if direction.endswith('E') else -1
    north = direction.startswith('N')
    working = state not in ('idle', 'walk')
    stride = [0, 1, 2, 0, -1, -2][frame] if state == 'walk' else 0
    bob = [0, 0, -1, 0, 0, -1][frame] if state == 'walk' else -(frame % 2)
    bend = [0, 2, 4, 3, 1, 0][frame] if state == 'harvest' else 0
    if state == 'chop': bend = [0, -1, -2, 1, 2, 0][frame]
    if state == 'mine': bend = [0, 0, -1, -1, 2, 3, 1, 0][frame]
    if state == 'research': bob = [0, 0, 1, 1, 0, 0, 1, 0][frame]
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
    hand_y = 22 + stride if not working else [19, 15, 12, 23, 24, 21][frame % 6]
    if state == 'harvest': hand_y = 22 + bend
    if state == 'build': hand_y = [21, 18, 15, 14, 22, 21][frame]
    if state == 'chop':
        hand_y = [19, 14, 10, 19, 24, 21][frame]
        hand_x += hand_side * [0, -1, -2, 2, 4, 2][frame]
    if state == 'mine':
        hand_y = [20, 16, 12, 10, 18, 25, 24, 21][frame]
        hand_x += hand_side * [0, -1, -2, -2, 1, 2, 1, 0][frame]
    if state == 'research': hand_y = 21 + (frame % 3 == 0)
    if state == 'water': hand_y = [21, 21, 22, 22, 21, 20][frame]
    d.line((16 + hand_side * 4, 17 + bob + bend, hand_x, hand_y), fill=c['ink'], width=4)
    d.line((16 + hand_side * 4, 17 + bob + bend, hand_x, hand_y), fill=c['skin_light'], width=2)
    if role in ('builder', 'lumberjack'):
        tool(d, c, hand_x - hand_side, hand_y - 3, 'axe' if role == 'lumberjack' else 'hammer', hand_side)
    elif state == 'water':
        can_x = hand_x - 2
        d.rectangle((can_x, hand_y, can_x + 5, hand_y + 4), fill=c['blue'], outline=c['ink'])
        d.arc((can_x + 1, hand_y - 3, can_x + 5, hand_y + 2), 180, 360, fill=c['stone_light'])
        tip = min(30, max(1, hand_x + hand_side * 7))
        d.line((hand_x + hand_side * 2, hand_y + 1, tip, hand_y + 3), fill=c['blue_light'], width=2)
        if frame in (2, 3, 4): d.line((tip, hand_y + 3, tip, min(29, hand_y + 6)), fill=c['blue_light'])
    elif role == 'farmer':
        d.line((hand_x, hand_y + 3, hand_x + hand_side * 3, hand_y - 5), fill=c['wood_dark'], width=2)
        d.line((hand_x + hand_side * 3, hand_y - 5, hand_x + hand_side * 6, hand_y - 4), fill=c['stone_light'], width=2)
    elif state == 'mine':
        top_x = max(2, min(29, hand_x + hand_side * 4))
        top_y = max(2, hand_y - 7)
        d.line((hand_x - hand_side, hand_y + 3, top_x, top_y), fill=c['wood_dark'], width=2)
        d.line((max(1, top_x - 4), top_y + 1, min(30, top_x + 4), top_y - 1), fill=c['stone_light'], width=2)
        d.line((16 - hand_side * 3, 19 + bob, hand_x - hand_side, hand_y + 1), fill=c['skin_shadow'], width=2)
    elif state == 'research':
        d.polygon([(11, 21), (16, 19), (21, 21), (21, 26), (16, 24), (11, 26)], fill=c['linen'], outline=c['wood_dark'])
        d.line((16, 20, 16, 24), fill=c['wood'])
        d.line((12, 23, 14, 22), fill=c['purple'])
        pen_x = 19 + [0, 1, 2, 1, 0, -1, 0, 1][frame]
        d.line((pen_x, 22, pen_x + 2, 17 + frame % 2), fill=c['purple'], width=1)
        d.line((20, 18, pen_x, 22), fill=c['skin_light'], width=2)
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
