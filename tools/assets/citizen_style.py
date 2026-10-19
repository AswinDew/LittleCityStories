"""Authored 64px citizens. Preview only; not used by the production atlas."""
from PIL import Image, ImageDraw, ImageFilter
from math import hypot, sqrt
from primitives import palette

FRAME_SIZE = 64
FOOT_ANCHOR = (32, 60)
DIRECTIONS = ('NE', 'NW', 'SE', 'SW')
ROLES = ('villager', 'farmer', 'lumberjack', 'builder')
CLIPS = {role: [('idle', 2, 500), ('walk', 6, 100)] for role in ROLES}
for _role, _work in [('villager', 'work'), ('farmer', 'harvest'), ('lumberjack', 'chop'), ('builder', 'build')]:
    CLIPS[_role].append((_work, 6, 120))
CLIPS['villager'] += [('mine', 8, 140), ('research', 8, 180)]
CLIPS['farmer'] += [('water', 6, 160)]

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


def _villager_idle(role, direction, state, frame):
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

    _draw_head(direction, poly, line)
    return image


def _draw_head(direction, poly, line):
    """Approved head views; reusable geometry, never mirrored or resampled."""
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


def draw_citizen(role, direction, state, frame):
    """Return one full 64px pose, rejecting unsupported clips and frame indices."""
    counts = {name: count for name, count, _ in CLIPS.get(role, ())}
    if direction not in DIRECTIONS or state not in counts or type(frame) is not int or not 0 <= frame < counts[state]:
        raise ValueError(f'Unsupported citizen pose: {role}/{direction}/{state}/{frame}')
    if role == 'villager' and state == 'idle':
        return _villager_idle(role, direction, state, frame)
    return _draw_pose(role, direction, state, frame)


def _draw_pose(role, direction, state, frame):
    c = palette()  # Lock canvas, palette and integer geometry independently per frame.
    image = Image.new('RGBA', (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(image)
    east, north = direction.endswith('E'), direction.startswith('N')
    facing = 1 if east else -1
    walking = state == 'walk'
    working = state not in ('idle', 'walk')
    motion = _work_motion(state, frame, facing, direction) if working else None
    bob = motion['drop'] if working else (0, -1, 0, 0, -1, 0)[frame] if walking else -frame
    lean = motion['lean'] if working else 0
    shirt, dark, light = {
        'villager': ('blue', 'stone_dark', 'blue_light'),
        'farmer': ('green', 'green_dark', 'green_light'),
        'lumberjack': ('clay', 'wood_dark', 'clay_light'),
        'builder': ('linen', 'wood', 'stone_light'),
    }[role]
    worker = role != 'villager'
    front_work = worker and state in ('harvest', 'chop', 'build')
    body_center = 33 if east else 31
    knee_bend = (0, 0, 1, 2, 1, 0)[frame] if state == 'harvest' else 0

    def body_point(point):
        x, y = point
        if front_work:
            # Bend above the waist; the hem/pelvis must not slide over the knees.
            drop = round(bob * min(1, max(0, (49 - y) / 16)))
            drop += round((knee_bend // 2) * min(1, max(0, (y - 33) / 12)))
        else:
            drop = round(bob * min(1, max(0, (56 - y) / 12))) if working else bob
        return x + round(lean * max(0, 48 - y) / 20), y + drop

    def poly(points, color, outline=False, move=True):
        d.polygon([body_point(point) if move else point for point in points],
                  fill=c[color], outline=c['ink'] if outline else None)

    def line(points, color, width=1):
        d.line([body_point(point) for point in points], fill=c[color], width=width)

    # Heads and hats translate as a rigid unit; torso bending must not shear faces.
    head_x = round(lean * 28 / 20)

    def head_poly(points, color, outline=False):
        d.polygon([(x + head_x, y + bob) for x, y in points], fill=c[color], outline=c['ink'] if outline else None)

    def head_line(points, color, width=1):
        d.line([(x + head_x, y + bob) for x, y in points], fill=c[color], width=width)

    # Alternating contact / passing / push-off: one foot always supports y60.
    if front_work:
        poly([(24, 45), (40, 45), (40, 50), (37, 52), (32, 50),
              (27, 52), (24, 50)], 'wood_dark', False, False)
    for leg, hip in enumerate((27, 37)):
        phase = (frame + leg * 3) % 6 if walking else 0
        stride = (3, 0, -3, -3, 0, 3)[phase] * facing if walking else 0
        lift = (0, 0, 0, 0, 3, 1)[phase] if walking else 0
        foot_x, foot_y = hip + stride, 60 - lift
        knee = (hip + stride // 2 + facing * knee_bend, 52 - lift + knee_bend // 2)
        cuff_y = foot_y - (5 if state == 'harvest' else 2)
        poly([(hip - 3, 45), (hip + 3, 45), (knee[0] + 3, knee[1]),
              (foot_x + 2, cuff_y), (foot_x - 3, cuff_y), (knee[0] - 3, knee[1])], 'wood_dark', True, False)
        boot = ([(foot_x - 3, foot_y - 5), (foot_x + 2, foot_y - 5),
                 (foot_x + 2, foot_y - 3), (foot_x + 5, foot_y - 2),
                 (foot_x + 5, foot_y), (foot_x - 3, foot_y)] if east else
                [(foot_x + 2, foot_y - 5), (foot_x - 3, foot_y - 5),
                 (foot_x - 3, foot_y - 3), (foot_x - 6, foot_y - 2),
                 (foot_x - 6, foot_y), (foot_x + 2, foot_y)])
        poly(boot, 'wood' if leg == 0 else 'wood_light', True, False)
        poly([(knee[0] - 1, knee[1] - 1), (knee[0] + 1, knee[1] - 1),
              (foot_x, foot_y - 5), (foot_x - 2, foot_y - 5)], dark, False, False)

    # Relaxed far arms sit behind the torso; working arms can reach across it.
    swing = (-4, 0, 4, 4, 0, -4)[frame] * facing if walking else 0
    near = 1 if direction in ('SE', 'NW') else -1
    arm_center = body_center if worker else 32
    shoulder_span = {'villager': 10, 'farmer': 6, 'lumberjack': 7, 'builder': 6}[role]
    if worker:
        upper_body = Image.new('RGBA', image.size, (0, 0, 0, 0))
        upper_pen = ImageDraw.Draw(upper_body)

        def torso_poly(points, color, outline=False):
            # One outer outline is applied after both sleeves join the torso.
            upper_pen.polygon([body_point(point) for point in points], fill=c[color])

        def torso_line(points, color, width=1):
            upper_pen.line([body_point(point) for point in points], fill=c[color], width=width)

    def arm(side, far=False, sleeve_only=False, hand_only=False, sleeve_front=False):
        shoulder = body_point((arm_center + side * shoulder_span, 33))
        elbow = (arm_center + side * (11 if worker else 13), 39 + bob + side * swing // 2)
        hand = (arm_center + side * (11 if worker else 12) - side * swing // 2, 46 + bob + side * swing // 2)
        if working:
            hand = motion['far'] if far else motion['near']
            # Bent elbows carry the load instead of stretching one straight arm.
            elbow = ((shoulder[0] + hand[0]) // 2 + side * (1 if worker else 2),
                     (shoulder[1] + hand[1]) // 2 + 3)
        if worker:
            elbow = motion['far_elbow' if far else 'near_elbow'] if front_work else _arm_elbow(shoulder, hand, side)

            def segment(pen, start, end, top_width, bottom_width, color, outline=True):
                dx, dy = end[0] - start[0], end[1] - start[1]
                length = max(1, hypot(dx, dy))
                nx, ny = -dy / length, dx / length
                corners = [(round(p[0] + nx * width * sign), round(p[1] + ny * width * sign))
                           for p, width, sign in [(start, top_width, 1), (end, bottom_width, 1),
                                                   (end, bottom_width, -1), (start, top_width, -1)]]
                pen.polygon(corners, fill=c[color], outline=c['ink'] if outline else None)
            if not hand_only:
                sleeve_color = ('stone_light' if role == 'builder' else shirt if front_work else dark) if far else shirt
                sleeve_pen = d if sleeve_front else upper_pen
                segment(sleeve_pen, shoulder, elbow, 2, 2, sleeve_color, False)
                sleeve_pen.ellipse((shoulder[0] - 2, shoulder[1] - 2, shoulder[0] + 2, shoulder[1] + 2), fill=c[sleeve_color])
                # Fill the joint into the chest, erasing any separate sleeve cap.
                inward = (shoulder[0] - side * 3, shoulder[1] + 1)
                sleeve_pen.line([inward, shoulder], fill=c[sleeve_color], width=5)
            if not sleeve_only:
                segment(d, elbow, hand, 2, 1, 'skin_shadow' if far else 'skin')
                d.ellipse((elbow[0] - 1, elbow[1] - 1, elbow[0] + 1, elbow[1] + 1), fill=c['skin_shadow' if far else 'skin'])
                _draw_worker_hand(d, c, hand, far)
        else:
            d.line([shoulder, elbow, hand], fill=c['ink'], width=7)
            d.line([shoulder, elbow], fill=c[dark if far else shirt], width=5)
            d.line([elbow, hand], fill=c['skin_shadow' if far else 'skin'], width=4)
            d.rectangle((hand[0] - 2, hand[1] - 2, hand[0] + 2, hand[1] + 1), fill=c['ink'])
            d.rectangle((hand[0] - 1, hand[1] - 1, hand[0] + 1, hand[1]), fill=c['skin' if far else 'skin_light'])
        return hand

    arm(-near, True, sleeve_only=front_work)
    if worker:
        _draw_worker_torso(role, direction, torso_poly, torso_line)
        arm(near, sleeve_only=True)
        outline = Image.new('RGBA', image.size, c['ink'])
        outline.putalpha(upper_body.getchannel('A').filter(ImageFilter.MaxFilter(3)))
        image.alpha_composite(outline)
        image.alpha_composite(upper_body)
        d = ImageDraw.Draw(image)
        if front_work:
            # A far arm reaching across the chest belongs in front of the shirt.
            arm(-near, True, sleeve_only=True, sleeve_front=True)
    else:
        poly([(27, 29), (37, 29), (43, 32), (43, 37),
              (41, 41), (43, 47), (37, 49), (32, 48), (26, 49), (22, 46),
              (24, 40), (21, 35), (23, 32)], shirt, True)
        poly([(23, 34), (28, 33), (28, 40), (30, 46), (26, 47), (24, 45)], dark)
        poly([(36, 32), (41, 33), (41, 39), (38, 42), (35, 40)], light)
        poly([(29, 27), (35, 27), (36, 32), (32, 35), (28, 31)], 'skin_shadow', True)
        line([(27, 30), (32, 35), (37, 30)], 'linen', 2)
        strap_right = direction in ('SE', 'NW')
        strap = [(38 if strap_right else 27, 32), (27 if strap_right else 38, 45)]
        line(strap, 'wood_dark', 3)
        line(strap, 'wood_light')
        if not north:
            if east:
                poly([(24, 43), (29, 42), (31, 46), (29, 50), (23, 49)], 'wood', True)
            else:
                poly([(38, 42), (43, 43), (44, 47), (41, 50), (36, 48), (36, 44)], 'wood', True)

        line([(25, 45), (32, 46), (40, 45)], 'wood_dark', 2)
    if working:
        _work_object(d, c, state, frame, facing, motion)
    _draw_head(direction, head_poly, head_line)
    if role == 'farmer':
        # Domed crown and wide asymmetric brim, screen-right straw highlight.
        head_poly([(22, 12), (25, 7), (29, 5), (36, 5), (40, 8), (42, 13)], 'straw', True)
        head_poly([(32, 6), (36, 6), (39, 9), (40, 12), (34, 11)], 'straw_light')
        head_poly([(19, 13), (24, 11), (39, 11), (45, 14), (44, 16),
              (38, 17), (24, 16), (19, 15)], 'straw', True)
        head_line([(22, 14), (29, 14), (36, 15), (42, 14)], 'straw_light')
        head_line([(25, 11), (32, 12), (39, 12)], 'wood')
    elif role == 'builder':
        head_poly([(24, 14), (29, 13), (36, 14), (42, 15), (42, 17), (35, 16), (28, 15), (24, 16)], 'linen', True)
        head_line([(26, 14), (30, 14), (35, 15), (40, 15)], 'stone_light')
        side = -1 if east else 1
        head_poly([(32 + side * 10, 16), (32 + side * 14, 17), (32 + side * 15, 22),
              (32 + side * 12, 20), (32 + side * 10, 18)], 'linen', True)
    elif role == 'lumberjack' and not north:
        head_poly([(29, 24), (32, 26), (36, 26), (40, 24), (39, 28),
              (35, 31), (31, 30), (29, 27)], 'wood_dark', True)
        head_line([(33, 28), (36, 28), (38, 26)], 'wood')
    if front_work:
        arm(-near, True, hand_only=True)
    hand = arm(near, hand_only=worker)
    if front_work:
        # Tool shafts, timber and the opposite forearm must not erase a palm.
        _draw_worker_hand(d, c, motion['far'], True)
        _draw_worker_hand(d, c, motion['near'], False)
    if not working and role in ('lumberjack', 'builder', 'farmer'):
        kind = {'lumberjack': 'axe', 'builder': 'hammer', 'farmer': 'hoe'}[role]
        _draw_tool(d, c, kind, (hand[0], hand[1] + 4), (hand[0] + near * 4, hand[1] - 9), facing)
        d.rectangle((hand[0] - 1, hand[1] - 1, hand[0] + 1, hand[1] + 1), fill=c['skin_light'])
    if state == 'research':
        # Writing hand and pen stay above the open page.
        d.line([hand, (hand[0] + facing * 3, hand[1] - 6)], fill=c['ink'], width=2)
        d.line([(hand[0] + facing, hand[1] - 1), (hand[0] + facing * 3, hand[1] - 5)], fill=c['wood_light'])
    return image


def _draw_worker_hand(d, c, hand, far=False):
    d.polygon([(hand[0] - 2, hand[1] - 1), (hand[0], hand[1] - 2),
               (hand[0] + 2, hand[1]), (hand[0] + 1, hand[1] + 2),
               (hand[0] - 2, hand[1] + 1)], fill=c['skin' if far else 'skin_light'], outline=c['ink'])
    d.line([(hand[0], hand[1] - 1), (hand[0] + 1, hand[1])], fill=c['skin' if far else 'skin_light'])


def _arm_elbow(shoulder, hand, side):
    """Two-link arm with a stable bent elbow, including tightly folded poses."""
    dx, dy = hand[0] - shoulder[0], hand[1] - shoulder[1]
    distance = hypot(dx, dy)
    if distance == 0:
        return shoulder[0] + side * 7, shoulder[1] + 1
    upper, lower = 7.0, 8.0
    if distance > upper + lower:
        # Far hands can reach across the chest; allow a small bend at full reach.
        upper, lower = distance / 2 + 1, distance / 2 + 2
    along = (upper * upper - lower * lower + distance * distance) / (2 * distance)
    height = sqrt(max(0, upper * upper - along * along))
    ux, uy = dx / distance, dy / distance
    candidates = [(shoulder[0] + ux * along - uy * height * sign,
                   shoulder[1] + uy * along + ux * height * sign) for sign in (-1, 1)]
    target = (shoulder[0] + side * 7, shoulder[1] + 4)
    elbow = min(candidates, key=lambda point: (point[0] - target[0]) ** 2 + (point[1] - target[1]) ** 2)
    return tuple(round(value) for value in elbow)


def _draw_worker_torso(role, direction, poly, line):
    """Compact shoulder cage, continuous waist, and clothes drawn on that volume."""
    north = direction.startswith('N')
    shift = 1 if direction.endswith('E') else -1

    def p(points, color, outline=False):
        poly([(x + shift, y) for x, y in points], color, outline)

    def l(points, color, width=1):
        line([(x + shift, y) for x, y in points], color, width)

    shirt, shade, highlight = {
        'farmer': ('green', 'green_dark', 'green_light'),
        'lumberjack': ('clay', 'wood_dark', 'clay_light'),
        'builder': ('linen', 'stone_dark', 'stone_light'),
    }[role]
    # One clean contour: rounded shoulders taper to a pelvis over both legs.
    wide = role == 'lumberjack'
    p([(28, 29), (35, 29), (39 if not wide else 40, 31), (41 if not wide else 42, 34),
       (40 if not wide else 41, 38), (39 if not wide else 40, 42), (40 if not wide else 41, 47),
       (37, 49), (28, 49), (25 if not wide else 24, 47), (26 if not wide else 25, 41),
       (24 if not wide else 23, 37), (24, 33), (26, 31)], shirt, True)
    p([(25, 34), (28, 33), (28, 40), (29, 46), (26, 46), (27, 40)], shade)
    p([(35, 32), (38, 33), (39, 36), (37, 40), (35, 39)], highlight)
    l([(28, 46), (32, 47), (37, 46)], 'wood_dark')
    # A back nape has a short curved collar, not a front V-neck.
    p([(29, 27), (35, 27), (35, 30), (32, 32), (29, 30)], 'skin_shadow')
    if north:
        l([(27, 31), (31, 33), (36, 31)], highlight)
    else:
        l([(28, 30), (32, 34), (36, 30)], 'linen')

    if role == 'lumberjack':
        if north:
            p([(26, 32), (29, 33), (35, 33), (39, 32), (39, 39),
               (40, 46), (37, 48), (28, 48), (25, 46), (26, 40)], 'wood')
            p([(26, 34), (28, 35), (28, 45), (26, 46)], 'wood_dark')
            l([(36, 35), (37, 40), (37, 45)], 'wood_light')
        else:
            p([(26, 31), (29, 31), (30, 36), (29, 46), (26, 47), (26, 40)], 'wood_dark')
            p([(36, 31), (39, 32), (39, 39), (40, 46), (36, 47), (35, 36)], 'wood')
            l([(37, 34), (37, 39), (38, 44)], 'wood_light')
            l([(31, 36), (31, 42)], 'clay_light')
    else:
        if north:
            # Narrow apron ties sit on the back surface without cutting it in half.
            l([(28, 32), (29, 39), (30, 43)], 'linen')
            l([(36, 32), (35, 39), (34, 43)], 'wood_light' if role == 'builder' else 'linen')
            l([(27, 43), (33, 44), (38, 43)], 'wood' if role == 'builder' else 'linen')
        else:
            apron = 'linen' if role == 'farmer' else 'wood'
            edge = 'wood' if role == 'farmer' else 'wood_dark'
            p([(29, 35), (35, 35), (35, 41), (38, 47), (35, 49),
               (28, 49), (26, 47), (29, 41)], apron)
            l([(29, 35), (29, 41), (26, 47), (28, 49), (35, 49), (38, 47), (35, 41), (35, 35)], edge)
            l([(34, 36), (34, 41), (36, 46)], 'stone_light' if role == 'farmer' else 'wood_light')
            l([(30, 40), (33, 40), (33, 42), (30, 42)], edge)
        if role == 'builder':
            x = 39 if direction in ('NE', 'SW') else 24
            p([(x, 43), (x + 4, 43), (x + 4, 48), (x + 1, 49), (x, 47)], 'wood_dark', True)
            l([(x + 1, 44), (x + 3, 44)], 'wood_light')


def _work_motion(state, frame, facing, direction=None):
    """Authored preparation/contact/recovery keys in screen-space per clip."""
    if state in ('harvest', 'chop', 'build'):
        return _working_pose(state, frame, facing, direction)
    drops = {
        'work': (0, 1, 3, 4, 2, 0),
        'mine': (0, -1, -1, -2, 0, 4, 3, 1),
        'research': (0, 0, 1, 1, 2, 1, 0, 0), 'water': (0, 0, 1, 2, 1, 0),
    }
    leans = {
        'work': (0, 1, 2, 2, 1, 0),
        'mine': (0, -1, -1, -2, 0, 2, 2, 1),
        'research': (0, 0, 1, 1, 1, 0, 0, 0), 'water': (0, 1, 1, 2, 1, 0),
    }
    # Hand and tool-tip tracks are drawn in local front-facing coordinates.
    tracks = {
        'work': ([(8, 45), (9, 44), (10, 42), (11, 40), (10, 41), (9, 44)], None),
        'mine': ([(10, 40), (9, 34), (8, 28), (7, 25), (12, 34), (15, 45), (14, 43), (12, 40)],
                 [(16, 31), (14, 22), (12, 15), (10, 11), (20, 28), (20, 49), (18, 46), (16, 38)]),
        'research': ([(7, 38), (8, 39), (9, 40), (8, 41), (6, 40), (5, 39), (6, 38), (7, 37)], None),
        'water': ([(10, 38), (11, 39), (12, 40), (13, 41), (12, 40), (11, 39)], None),
    }
    hands, tips = tracks[state]
    project = lambda point: (32 + facing * point[0], point[1])
    hand = project(hands[frame])
    far = (hand[0] - facing * 5, hand[1] + 4)
    tip = project(tips[frame]) if tips else None
    if state == 'mine':
        far = _handle_end(hand, tip, 6)
    if state == 'research': far = project((-3, 46))
    if state == 'water': far = project((8, 47))
    return {'drop': drops[state][frame], 'lean': leans[state][frame] * facing,
            'near': hand, 'far': far, 'tip': tip}


def _working_pose(state, frame, facing, direction):
    """Deliberate projected elbow/wrist keys, including anatomical depth per view."""
    poses = {
        'harvest': {
            'drop': (0, 1, 3, 5, 3, 1), 'lean': (0, 1, 2, 3, 2, 1),
            'aim': [(10, 42), (11, 37), (13, 34), (13, 44), (12, 46), (10, 43)],
            'tip': [(18, 38), (17, 29), (16, 28), (21, 53), (18, 51), (16, 45)],
            'leading_elbow': [(14, 37), (15, 32), (16, 33), (16, 38), (16, 41), (14, 38)],
            'support_elbow': [(0, 41), (1, 40), (2, 40), (3, 44), (3, 45), (1, 42)],
        },
        'chop': {
            'drop': (0, -1, -2, 0, 3, 1), 'lean': (-1, -1, -2, 0, 2, 1),
            'aim': [(11, 39), (12, 34), (12, 28), (14, 34), (14, 43), (12, 41)],
            'tip': [(16, 26), (15, 19), (14, 12), (20, 25), (20, 47), (17, 37)],
            'leading_elbow': [(15, 36), (15, 31), (14, 33), (17, 32), (14, 35), (13, 39)],
            'support_elbow': [(0, 42), (1, 40), (2, 38), (2, 41), (-1, 42), (-1, 43)],
        },
        'build': {
            'drop': (0, -1, -1, 0, 2, 1), 'lean': (0, -1, -1, 0, 1, 1),
            'aim': [(10, 40), (11, 35), (12, 31), (12, 30), (11, 42), (10, 40)],
            'tip': [(15, 34), (15, 28), (16, 23), (16, 21), (15, 44), (15, 38)],
            'leading_elbow': [(14, 36), (15, 32), (16, 32), (16, 31), (15, 37), (14, 36)],
            'support_elbow': [(0, 40), (0, 40), (0, 40), (0, 40), (1, 41), (0, 40)],
        },
    }[state]
    project = lambda point: (32 + facing * point[0], point[1])
    aim, tip = project(poses['aim'][frame]), project(poses['tip'][frame])
    # A rigid prop determines both grips; independently moving endpoints telescope.
    grip_distance, shaft_length = {'harvest': (10, 22), 'chop': (14, 24), 'build': (9, 17)}[state]
    leading = _shaft_point(tip, aim, grip_distance)
    support = project((6, 46)) if state == 'build' else _shaft_point(tip, aim, grip_distance + 6)
    leading_elbow, support_elbow = project(poses['leading_elbow'][frame]), project(poses['support_elbow'][frame])
    north = direction is not None and direction.startswith('N')
    return {'drop': poses['drop'][frame], 'lean': poses['lean'][frame] * facing,
            'near': support if north else leading, 'far': leading if north else support,
            'near_elbow': support_elbow if north else leading_elbow,
            'far_elbow': leading_elbow if north else support_elbow,
            'tool_hand': leading, 'tip': tip, 'shaft_bottom': _shaft_point(tip, aim, shaft_length),
            'block': project((10, 48))}


def _shaft_point(tip, aim, distance):
    dx, dy = aim[0] - tip[0], aim[1] - tip[1]
    length = hypot(dx, dy)
    return tip[0] + round(dx / length * distance), tip[1] + round(dy / length * distance)


def _handle_end(hand, tip, extension):
    dx, dy = hand[0] - tip[0], hand[1] - tip[1]
    length = hypot(dx, dy)
    return hand[0] + round(dx / length * extension), hand[1] + round(dy / length * extension)


def _work_object(d, c, state, frame, facing, motion):
    hand = motion.get('tool_hand', motion['near'])
    if state in ('harvest', 'chop', 'build', 'mine'):
        kind = {'harvest': 'hoe', 'chop': 'axe', 'build': 'hammer', 'mine': 'pick'}[state]
        bottom = motion['shaft_bottom'] if state in ('harvest', 'chop', 'build') else _handle_end(hand, motion['tip'], 9)
        _draw_tool(d, c, kind, bottom, motion['tip'], facing)
        if state == 'build':
            x, y = motion['block']
            d.polygon([(x - 5, y), (x + 4, y - 2), (x + 6, y + 1), (x + 4, y + 4), (x - 5, y + 4)], fill=c['wood'], outline=c['ink'])
            d.line([(x - 3, y + 1), (x + 3, y)], fill=c['wood_light'], width=2)
    elif state == 'work':
        # Lift/inspect/place a rounded stone with two hands and a crouching torso.
        x, y = hand[0] - facing * 3, hand[1] + 1
        d.polygon([(x - 6, y - 2), (x - 3, y - 6), (x + 3, y - 5),
                   (x + 6, y - 1), (x + 5, y + 3), (x - 3, y + 4), (x - 6, y + 1)], fill=c['stone_dark'], outline=c['ink'])
        d.polygon([(x - 2, y - 4), (x + 2, y - 4), (x + 4, y - 1), (x, y + 1), (x - 3, y)], fill=c['stone_light'])
    elif state == 'research':
        d.polygon([(23, 39), (32, 37), (43, 39), (44, 48), (33, 46),
                   (23, 49)], fill=c['wood_dark'], outline=c['ink'])
        d.polygon([(24, 40), (31, 39), (32, 45), (24, 47)], fill=c['linen'])
        d.polygon([(33, 39), (41, 40), (42, 46), (34, 45)], fill=c['stone_light'])
        d.line([(32, 39), (33, 45)], fill=c['wood'])
        d.line([(25, 42), (29, 41)], fill=c['wood'], width=1)
        d.line([(25, 44), (29, 43)], fill=c['wood'], width=1)
    elif state == 'water':
        # The can tips toward the spout; the connected stream begins at contact.
        x, y = 32 + facing * 14, 44
        tilt = (0, 1, 3, 4, 2, 1)[frame]
        p = lambda dx, dy: (x + facing * dx, y + dy + (tilt if dx > 0 else 0))
        d.polygon([p(-5, -2), p(3, -2), p(5, 5), p(-5, 5)], fill=c['blue'], outline=c['ink'])
        d.line([p(-3, -1), p(1, -1), p(2, 3)], fill=c['blue_light'], width=2)
        d.line([p(-4, -2), p(-7, -6), p(-3, -8), p(1, -4)], fill=c['ink'], width=3)
        d.line([p(-4, -2), p(-6, -6), p(-3, -7), p(1, -4)], fill=c['stone_light'])
        d.line([p(3, 1), p(9, -2), p(11, -1)], fill=c['ink'], width=4)
        d.line([p(3, 1), p(9, -2), p(11, -1)], fill=c['blue_light'], width=2)
        if frame in (2, 3, 4):
            spout = p(11, -1)
            d.line([spout, (spout[0] + facing, spout[1] + 3),
                    (spout[0] + facing * 2, spout[1] + 7 + frame % 2)], fill=c['blue_light'], width=2)


def _draw_tool(d, c, kind, bottom, tip, facing):
    """A wood handle and a shaped metal head, attached to the grip in every pose."""
    d.line([bottom, tip], fill=c['ink'], width=4)
    d.line([bottom, tip], fill=c['wood'], width=2)
    # Rotate geometry around its handle, then snap vertices. Never rotate a raster.
    dx, dy = tip[0] - bottom[0], tip[1] - bottom[1]
    length = hypot(dx, dy)
    ux, uy = dx / length, dy / length
    shape = {
        'axe': [(-2, -3), (3, -5), (7, -3), (7, 3), (4, 5), (0, 2)],
        'hammer': [(-4, -3), (4, -3), (5, 0), (3, 3), (-4, 2)],
        'hoe': [(-2, -1), (7, 0), (7, 4), (3, 3), (0, 1)],
        'pick': [(-7, 2), (-4, -2), (2, -3), (7, -1), (8, 2), (3, 0), (-2, 0), (-6, 3)],
    }[kind]
    points = [(tip[0] + round(-uy * facing * x - ux * y),
               tip[1] + round(ux * facing * x - uy * y)) for x, y in shape]
    d.polygon(points, fill=c['stone_dark'], outline=c['ink'])
    # Highlight the screen-upper-right edge, even when the worker faces west.
    edges = list(zip(points, points[1:] + points[:1]))
    edge = min(edges, key=lambda pair: sum(y - x for x, y in pair))
    center = (sum(x for x, _ in points) / len(points), sum(y for _, y in points) / len(points))
    inset = [(round(x * .7 + center[0] * .3), round(y * .7 + center[1] * .3)) for x, y in edge]
    d.line(inset, fill=c['stone_light'], width=2)
