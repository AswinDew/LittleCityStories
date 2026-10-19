"""Authored 64px villager study. Preview only; not used by the production atlas."""
from PIL import Image, ImageDraw
from primitives import palette

FRAME_SIZE = 64
FOOT_ANCHOR = (32, 60)
DIRECTIONS = ('NE', 'NW', 'SE', 'SW')

# Explicit silhouettes retain the same right-side lighting, never image-mirrored.
HEADS = {
    'SE': [(24, 15), (25, 12), (29, 10), (32, 8), (36, 9), (39, 10), (42, 13),
           (43, 17), (43, 22), (42, 25), (39, 28), (35, 30), (30, 29), (27, 27), (25, 24)],
    'SW': [(22, 15), (24, 12), (27, 10), (31, 8), (35, 9), (39, 10), (42, 13),
           (43, 18), (42, 23), (40, 26), (37, 29), (32, 30), (28, 28), (25, 25), (23, 22)],
    'NE': [(22, 15), (25, 11), (30, 8), (35, 9), (39, 8), (42, 12), (44, 18),
           (43, 23), (40, 28), (31, 30), (25, 27), (23, 22)],
    'NW': [(21, 16), (23, 12), (28, 10), (31, 8), (36, 9), (40, 11), (43, 16),
           (42, 23), (39, 28), (30, 30), (24, 27), (22, 22)],
}


def draw_citizen(role, direction, state, frame):
    """Return one untouched-size RGBA pose; reject unfinished art explicitly."""
    if role != 'villager' or direction not in DIRECTIONS or state != 'idle' or type(frame) is not int or frame not in (0, 1):
        raise ValueError('Preview supports villager / NE,NW,SE,SW / idle / frames 0,1 only')
    c = palette()  # Re-read the palette for every frame.
    image = Image.new('RGBA', (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(image)
    bob = -frame

    def poly(points, color, outline=False, move=True):
        points = [(x, y + (bob if move else 0)) for x, y in points]
        d.polygon(points, fill=c[color], outline=c['ink'] if outline else None)

    def line(points, color, width=1):
        d.line([(x, y + bob) for x, y in points], fill=c[color], width=width)

    # Feet stay anchored while the chest/shoulders breathe. Boots have distinct toes.
    if direction in ('SE', 'NE'):
        poly([(25, 45), (33, 45), (32, 55), (31, 58), (24, 58), (24, 53)], 'wood_dark', True, False)
        poly([(34, 45), (41, 46), (40, 54), (43, 57), (42, 60), (34, 60), (33, 57)], 'wood_dark', True, False)
        poly([(25, 54), (31, 54), (31, 57), (33, 58), (32, 60), (23, 60), (23, 58)], 'wood', True, False)
        poly([(35, 54), (39, 54), (40, 57), (42, 58), (41, 59), (35, 59)], 'wood_light', False, False)
        poly([(26, 48), (29, 49), (28, 54), (25, 54)], 'stone_dark', False, False)
    else:
        poly([(25, 45), (32, 45), (32, 54), (30, 58), (24, 58), (23, 55)], 'wood_dark', True, False)
        poly([(34, 45), (41, 46), (41, 54), (42, 58), (40, 60), (33, 60), (32, 57)], 'wood_dark', True, False)
        poly([(24, 54), (30, 54), (30, 58), (31, 60), (21, 60), (21, 58)], 'wood', True, False)
        poly([(35, 54), (40, 54), (40, 58), (39, 59), (34, 59)], 'wood_light', False, False)
        poly([(36, 48), (39, 48), (39, 54), (36, 54)], 'stone_dark', False, False)

    # Rear sleeve/hand precedes the torso, creating actual overlap at the armpit.
    far_left = direction in ('SE', 'NW')
    if far_left:
        poly([(24, 31), (21, 33), (19, 39), (20, 44), (23, 45), (25, 42), (26, 35)], 'stone_dark', True)
        poly([(20, 41), (23, 40), (24, 44), (22, 47), (19, 45)], 'skin_shadow', True)
        line([(20, 43), (21, 45)], 'skin')
    else:
        poly([(40, 31), (44, 33), (46, 40), (44, 45), (41, 44), (39, 37)], 'stone_dark', True)
        poly([(42, 41), (45, 41), (46, 45), (43, 47), (41, 45)], 'skin_shadow', True)
        line([(44, 43), (44, 45)], 'skin')

    # A soft, tapered tunic; broad shade patches rather than noisy fabric pixels.
    poly([(28, 28), (35, 28), (39, 30), (43, 33), (42, 40), (43, 47),
          (38, 49), (32, 48), (28, 49), (23, 47), (24, 40), (22, 34), (25, 31)], 'blue', True)
    poly([(24, 34), (28, 33), (28, 40), (30, 46), (27, 47), (24, 46), (25, 39)], 'stone_dark')
    poly([(35, 32), (39, 32), (41, 34), (40, 40), (39, 44), (36, 43)], 'blue_light')
    line([(37, 43), (39, 45), (40, 46)], 'stone_light')
    poly([(25, 43), (33, 44), (41, 42), (41, 45), (33, 47), (25, 46)], 'wood_dark', True)
    line([(27, 44), (32, 45), (38, 44)], 'wood_light')

    if direction in ('SE', 'SW'):
        poly([(28, 27), (36, 27), (38, 30), (33, 35), (28, 32)], 'skin_shadow', True)
        poly([(27, 29), (31, 32), (33, 34), (37, 29), (39, 31), (34, 38), (30, 35), (26, 31)], 'linen', True)
        line([(29, 32), (33, 36), (37, 31)], 'stone_light')
        line([(33, 37), (33, 41)], 'wood_dark')
        # Diagonal woven strap and small pouch give this original villager an identity.
        if direction == 'SE':
            poly([(38, 31), (40, 33), (29, 44), (27, 43)], 'wood_dark', True)
            line([(39, 33), (28, 43)], 'wood_light')
            poly([(24, 41), (29, 40), (31, 43), (30, 48), (24, 49), (22, 46)], 'wood', True)
            line([(24, 42), (28, 42), (29, 43)], 'wood_light')
        else:
            poly([(27, 31), (29, 32), (39, 43), (37, 44)], 'wood_dark', True)
            line([(28, 33), (38, 43)], 'wood_light')
            poly([(38, 41), (43, 42), (44, 46), (41, 49), (36, 47), (36, 43)], 'wood', True)
            line([(39, 42), (42, 43), (42, 44)], 'wood_light')
    else:
        poly([(27, 29), (34, 28), (39, 30), (37, 32), (30, 33), (26, 32)], 'linen', True)
        if direction == 'NE':
            poly([(27, 32), (29, 32), (39, 43), (37, 44)], 'wood_dark', True)
            line([(28, 33), (38, 43)], 'wood_light')
        else:
            poly([(38, 32), (40, 33), (29, 44), (27, 43)], 'wood_dark', True)
            line([(39, 33), (28, 43)], 'wood_light')
        line([(31, 35), (30, 39), (31, 42)], 'stone_dark')

    # Near arm, with a visible cuff, thumb and rounded knuckles.
    if far_left:
        poly([(40, 32), (44, 34), (46, 40), (44, 43), (40, 41), (39, 36)], 'blue', True)
        poly([(42, 33), (44, 35), (45, 39), (42, 39)], 'blue_light')
        line([(41, 41), (44, 42)], 'linen', 2)
        poly([(42, 43), (45, 43), (46, 46), (44, 48), (41, 47), (40, 44)], 'skin', True)
        line([(43, 44), (44, 46)], 'skin_light')
        line([(41, 45), (42, 46)], 'skin_shadow')
    else:
        poly([(25, 32), (22, 34), (20, 40), (22, 43), (26, 41), (27, 36)], 'blue', True)
        poly([(24, 33), (26, 34), (25, 39), (22, 40)], 'blue_light')
        line([(22, 41), (25, 40)], 'linen', 2)
        poly([(21, 43), (24, 42), (26, 45), (24, 48), (21, 48), (20, 45)], 'skin', True)
        line([(23, 43), (24, 45)], 'skin_light')
        line([(21, 45), (22, 46)], 'skin_shadow')

    # Head silhouette and skin planes are explicitly different for each direction.
    poly(HEADS[direction], 'skin_shadow', True)
    if direction == 'SE':
        # A continuous cheek/jaw, with the nose inside the face contour.
        poly([(29, 15), (38, 14), (41, 16), (42, 19), (42, 23), (40, 26),
              (37, 28), (33, 28), (29, 26), (28, 22)], 'skin')
        poly([(35, 15), (39, 15), (41, 17), (41, 23), (39, 25),
              (36, 24), (35, 21)], 'skin_light')
        poly([(25, 20), (27, 19), (29, 21), (28, 24), (26, 24), (25, 22)], 'skin', True)
        line([(27, 21), (27, 22)], 'skin_shadow')
        # Compact pupils share an eye line; no oversized white blocks.
        line([(31, 18), (33, 18)], 'wood_dark')
        line([(38, 18), (40, 18)], 'wood_dark')
        line([(32, 20), (32, 21)], 'ink')
        line([(39, 20), (39, 21)], 'ink')
        line([(37, 22), (38, 23), (37, 24)], 'skin_shadow')
        line([(34, 26), (37, 26)], 'wood_dark')
        poly([(24, 17), (25, 13), (29, 11), (32, 8), (36, 9), (39, 10),
              (42, 13), (42, 16), (39, 15), (37, 13), (35, 15),
              (31, 14), (29, 17), (28, 20), (26, 20), (26, 17)], 'wood_dark', True)
        line([(29, 12), (32, 11), (34, 12)], 'wood')
        line([(37, 11), (39, 12), (40, 14)], 'wood_light')
    elif direction == 'SW':
        poly([(27, 15), (35, 14), (39, 17), (39, 23), (37, 27),
              (34, 28), (31, 28), (27, 26), (25, 23), (25, 18)], 'skin')
        poly([(33, 16), (36, 15), (38, 17), (38, 24),
              (35, 26), (32, 24), (33, 21)], 'skin_light')
        poly([(39, 20), (41, 19), (42, 21), (41, 24), (39, 24), (38, 22)], 'skin', True)
        line([(40, 21), (40, 22)], 'skin_shadow')
        line([(26, 18), (28, 18)], 'wood_dark')
        line([(33, 18), (35, 18)], 'wood_dark')
        line([(27, 20), (27, 21)], 'ink')
        line([(34, 20), (34, 21)], 'ink')
        line([(29, 22), (28, 23), (29, 24)], 'skin_shadow')
        line([(30, 26), (33, 26)], 'wood_dark')
        poly([(22, 17), (24, 13), (27, 11), (31, 8), (35, 9), (39, 10),
              (42, 13), (43, 17), (41, 19), (39, 19), (38, 16),
              (35, 14), (32, 15), (29, 14), (27, 16), (24, 17)], 'wood_dark', True)
        line([(27, 12), (30, 11), (32, 12)], 'wood')
        line([(36, 11), (39, 12), (41, 15)], 'wood_light')
    elif direction == 'NE':
        poly([(38, 16), (42, 17), (43, 21), (42, 25), (38, 28), (36, 25)], 'skin')
        poly([(40, 18), (42, 19), (42, 22), (39, 23)], 'skin_light')
        poly([(24, 15), (26, 12), (30, 8), (34, 10), (39, 8), (42, 12), (43, 17), (40, 20), (39, 26), (35, 29), (28, 28), (24, 24)], 'wood_dark', True)
        poly([(31, 12), (37, 11), (40, 14), (39, 19), (36, 21), (32, 18)], 'wood')
        line([(35, 12), (38, 13), (40, 16)], 'wood_light')
        line([(27, 22), (29, 25), (32, 26)], 'ink')
        poly([(38, 21), (40, 20), (41, 23), (39, 25), (37, 24)], 'skin', True)
        line([(39, 22), (39, 23)], 'skin_shadow')
    else:
        poly([(22, 17), (26, 16), (28, 24), (25, 27), (22, 24)], 'skin')
        poly([(23, 18), (25, 18), (26, 22), (24, 23)], 'skin_light')
        poly([(23, 13), (28, 11), (31, 8), (36, 9), (40, 11), (43, 16), (42, 23), (38, 28), (31, 29), (26, 27), (25, 22), (23, 19)], 'wood_dark', True)
        poly([(32, 12), (37, 12), (41, 16), (39, 20), (35, 22), (31, 19)], 'wood')
        line([(35, 12), (38, 14), (40, 17)], 'wood_light')
        line([(28, 23), (30, 26), (34, 27)], 'ink')
        poly([(24, 21), (26, 20), (28, 23), (26, 25), (24, 24)], 'skin', True)
        line([(25, 22), (26, 23)], 'skin_shadow')
    return image
