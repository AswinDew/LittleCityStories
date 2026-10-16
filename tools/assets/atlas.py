"""Pack complete fixed-size frames; rectangles never overlap or trim foot anchors."""
from PIL import Image
from characters import ROLES, DIRECTIONS, character


def citizen_atlas():
    image = Image.new('RGBA', (512, 448), (0, 0, 0, 0))
    animations = {}
    index = 0
    for role, (_, work) in ROLES.items():
        animations[role] = {}
        for direction in DIRECTIONS:
            animations[role][direction] = {}
            for state, count, duration in [('idle', 2, 500), ('walk', 6, 100), (work, 6, 120)]:
                frames = []
                for number in range(count):
                    frame = character(role, direction, state, number)
                    x, y = index % 16 * 32, index // 16 * 32
                    image.paste(frame, (x, y))
                    frames.append({'x': x, 'y': y, 'width': 32, 'height': 32})
                    index += 1
                animations[role][direction][state] = {'frames': frames, 'frameDurationMs': duration,
                                                     'loop': True, 'anchor': {'x': 16, 'y': 30}}
    return image, {'asset': 'citizens', 'width': image.width, 'height': image.height,
                   'frameSize': {'width': 32, 'height': 32}, 'animations': animations}
