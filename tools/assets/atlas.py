"""Pack complete fixed-size frames; rectangles never overlap or trim foot anchors."""
from PIL import Image
from characters import ROLES, DIRECTIONS, CLIPS, character


def citizen_atlas():
    count = sum(sum(clip[1] for clip in clips) for clips in CLIPS.values()) * len(DIRECTIONS)
    image = Image.new('RGBA', (512, ((count + 15) // 16) * 32), (0, 0, 0, 0))
    animations = {}
    index = 0
    for role, (_, work) in ROLES.items():
        animations[role] = {}
        for direction in DIRECTIONS:
            animations[role][direction] = {}
            for state, count, duration in CLIPS[role]:
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
