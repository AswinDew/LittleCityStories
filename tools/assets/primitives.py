"""Integer-coordinate drawing helpers shared by icons and layered characters."""
import json
import hashlib
from pathlib import Path
from PIL import Image, ImageDraw

PALETTE_PATH = Path(__file__).with_name('palette.json')


def palette():
    # Re-read the locked palette for each asset, not from remembered color literals.
    return json.loads(PALETTE_PATH.read_text())['colors']


def palette_hash():
    # Hash semantic JSON, independent of Git CRLF/LF conversion and formatting.
    canonical = json.dumps(json.loads(PALETTE_PATH.read_text()), sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(canonical.encode('utf-8')).hexdigest()


def canvas(size=24):
    return Image.new('RGBA', (size, size), (0, 0, 0, 0))


def house(draw, colors, x=4, y=5, width=16, height=15):
    draw.rectangle((x + 2, y + 6, x + width - 2, y + height), fill=colors['linen'], outline=colors['ink'])
    draw.polygon([(x, y + 6), (x + width // 2, y), (x + width, y + 6)],
                 fill=colors['clay'], outline=colors['ink'])
    draw.line((x + width // 2, y + 1, x + width - 2, y + 5), fill=colors['clay_light'], width=2)
    draw.rectangle((x + 7, y + 10, x + 10, y + height), fill=colors['wood_dark'])


def tool(draw, colors, x, y, kind='axe', facing=1):
    draw.line((x - 2 * facing, y + 6, x + 2 * facing, y - 2), fill=colors['ink'], width=3)
    draw.line((x - 2 * facing, y + 5, x + 2 * facing, y - 2), fill=colors['wood_light'], width=1)
    if kind == 'axe':
        draw.polygon([(x + facing, y - 3), (x + 6 * facing, y - 2),
                      (x + 5 * facing, y + 2), (x, y)], fill=colors['stone_light'], outline=colors['ink'])
    else:
        draw.rectangle((min(x - 3, x + 3), y - 3, max(x - 3, x + 3), y),
                       fill=colors['stone'], outline=colors['ink'])


def icon(name):
    c = palette()
    image = canvas()
    d = ImageDraw.Draw(image)
    if name == 'wood':
        for x, y in [(4, 11), (9, 7), (11, 14)]:
            d.rectangle((x, y, x + 8, y + 5), fill=c['wood'], outline=c['ink'])
            d.ellipse((x + 5, y, x + 10, y + 5), fill=c['wood_light'], outline=c['wood_dark'])
            d.point((x + 8, y + 2), fill=c['wood_dark'])
    elif name in ('stone', 'masonry', 'stone_quarry'):
        for points in [[(3, 18), (4, 12), (10, 10), (14, 16), (11, 21)],
                       [(11, 16), (13, 5), (19, 4), (22, 14), (19, 20)]]:
            d.polygon(points, fill=c['stone'], outline=c['ink'])
        d.line((14, 7, 18, 6, 20, 11), fill=c['stone_light'], width=2)
        if name == 'masonry': tool(d, c, 7, 8, 'hammer')
    elif name in ('food', 'agriculture', 'farm'):
        d.polygon([(3, 17), (20, 17), (17, 22), (6, 22)], fill=c['wood'], outline=c['ink'])
        for x, y in [(7, 7), (12, 3), (17, 8)]:
            d.line((x, y, x, 17), fill=c['green_dark'], width=2)
            for dy in (0, 3, 6):
                d.line((x - 3, y + dy, x, y + dy + 2, x + 3, y + dy), fill=c['coin'], width=2)
    elif name == 'coins':
        for x, y in [(3, 12), (10, 7)]:
            d.ellipse((x, y, x + 10, y + 10), fill=c['coin'], outline=c['ink'])
            d.arc((x + 2, y + 2, x + 8, y + 8), 200, 330, fill=c['straw_light'], width=2)
            d.line((x + 5, y + 3, x + 5, y + 7), fill=c['wood'], width=1)
    elif name == 'population':
        for x, y in [(6, 7), (16, 6)]:
            d.ellipse((x - 3, y, x + 3, y + 6), fill=c['skin'], outline=c['ink'])
            d.polygon([(x - 3, y + 7), (x + 3, y + 7), (x + 5, y + 15), (x - 5, y + 15)],
                      fill=c['blue'] if x == 6 else c['green'], outline=c['ink'])
    elif name == 'happiness':
        d.ellipse((3, 3, 21, 21), fill=c['coin'], outline=c['ink'])
        d.rectangle((8, 8, 9, 10), fill=c['ink'])
        d.rectangle((15, 8, 16, 10), fill=c['ink'])
        d.line((7, 14, 10, 17, 14, 17, 17, 14), fill=c['wood_dark'], width=2)
    elif name in ('construction', 'toolmaking', 'lumber_camp'):
        tool(d, c, 11, 9, 'axe' if name != 'construction' else 'hammer')
        if name == 'lumber_camp':
            d.rectangle((3, 18, 20, 21), fill=c['wood'], outline=c['ink'])
    elif name in ('technology', 'research_hut'):
        d.polygon([(3, 6), (11, 8), (12, 21), (3, 18)], fill=c['linen'], outline=c['ink'])
        d.polygon([(12, 8), (21, 5), (21, 18), (12, 21)], fill=c['straw_light'], outline=c['ink'])
        d.line((6, 10, 9, 11, 9, 15), fill=c['purple'], width=2)
        d.line((15, 10, 18, 9, 18, 14), fill=c['purple'], width=2)
    elif name == 'dirt_road':
        d.polygon([(3, 21), (9, 3), (17, 3), (21, 21)], fill=c['soil'], outline=c['soil_dark'])
        d.line((12, 6, 9, 18), fill=c['soil_light'], width=2)
        d.rectangle((16, 16, 18, 17), fill=c['stone'])
    else:
        house(d, c)
        if name == 'town_center':
            d.line((12, 1, 12, 8), fill=c['wood_dark'], width=2)
            d.polygon([(13, 1), (20, 3), (13, 5)], fill=c['blue'])
        elif name == 'storage_hut':
            d.rectangle((3, 15, 10, 22), fill=c['wood'], outline=c['ink'])
            d.line((4, 16, 9, 21), fill=c['wood_light'])
    return image
