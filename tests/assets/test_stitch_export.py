"""Technical extraction must not destroy painted interiors or publish draft art."""
import sys
import hashlib
import tempfile
import unittest
from pathlib import Path
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools' / 'assets'))

from export_stitch_assets import cutout, normalize, periodic_tile, export_all


class StitchExportTests(unittest.TestCase):
    def test_background_is_removed_without_punching_holes_in_linen(self):
        image = Image.new('RGB', (30, 30), '#E7DABC')
        pen = ImageDraw.Draw(image)
        pen.rectangle((8, 5, 22, 26), fill='#E7DABC', outline='#302C36', width=2)
        result = cutout(image, tolerance=22)
        self.assertEqual(result.getpixel((0, 0))[3], 0)
        self.assertEqual(result.getpixel((14, 15)), (231, 218, 188, 255))
        self.assertEqual(set(result.getchannel('A').get_flattened_data()), {0, 255})

    def test_normalized_character_keeps_a_fixed_foot_anchor_and_padding(self):
        image = Image.new('RGBA', (30, 50))
        ImageDraw.Draw(image).rectangle((5, 2, 24, 47), fill='#302C36')
        result = normalize(image, (64, 64), (32, 60), 54, [(48, 44, 54)])
        self.assertEqual(result.size, (64, 64))
        left, top, right, bottom = result.getbbox()
        self.assertEqual(bottom, 61)
        self.assertGreaterEqual(min(left, top, 64 - right, 64 - bottom), 2)
        self.assertEqual((left + right) // 2, 32)

    def test_foliage_can_remove_enclosed_backing_without_changing_fabric_default(self):
        image = Image.new('RGB', (30, 30), '#E7DABC')
        pen = ImageDraw.Draw(image)
        pen.rectangle((5, 5, 24, 24), fill='#59845A')
        pen.rectangle((10, 10, 19, 19), fill='#E7DABC')
        result = cutout(image, background=(231, 218, 188), clear_enclosed=True)
        self.assertEqual(result.getpixel((14, 14))[3], 0)
        self.assertEqual(result.getpixel((7, 7)), (89, 132, 90, 255))

    def test_tile_edges_join_while_the_interior_stays_from_the_source(self):
        image = Image.new('RGB', (32, 32), '#78965C')
        pen = ImageDraw.Draw(image)
        pen.rectangle((8, 8, 22, 22), fill='#93AF75')
        pen.line((0, 0, 0, 31), fill='#59845A')
        colors = [(120, 150, 92), (147, 175, 117), (89, 132, 90)]
        result = periodic_tile(image, colors)
        self.assertEqual(result.crop((8, 8, 23, 23)).tobytes(), image.crop((8, 8, 23, 23)).tobytes())
        self.assertEqual([result.getpixel((0, y)) for y in range(32)], [result.getpixel((31, y)) for y in range(32)])
        self.assertEqual([result.getpixel((x, 0)) for x in range(32)], [result.getpixel((x, 31)) for x in range(32)])
        self.assertGreater(len(set(result.get_flattened_data())), 1)

    def test_source_hash_mismatch_is_rejected_before_writing_assets(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            Image.new('RGB', (4, 4), '#E7DABC').save(root / 'source.png')
            spec = {'sources': {'source.png': 'wrong'}, 'assets': []}
            with self.assertRaisesRegex(ValueError, 'hash'):
                export_all(root, root / 'output', spec)
            self.assertFalse((root / 'output').exists())

    def test_preview_cannot_overwrite_the_active_generated_assets(self):
        root = Path(__file__).resolve().parents[2]
        with self.assertRaisesRegex(ValueError, 'public'):
            export_all(root / '.stitch' / 'designs', root / 'public' / 'generated', {'sources': {}, 'assets': []})

    def test_export_is_repeatable_and_neutral_frames_are_not_fake_animations(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            image = Image.new('RGB', (32, 40), '#E7DABC')
            ImageDraw.Draw(image).rectangle((10, 5, 21, 35), fill='#527B8C', outline='#302C36')
            image.save(root / 'source.png')
            spec = {'sources': {'source.png': hashlib.sha256((root / 'source.png').read_bytes()).hexdigest()},
                    'assets': [{'id': 'villager_NE', 'group': 'characters', 'source': 'source.png',
                                'crop': [0, 0, 32, 40], 'size': [64, 64], 'anchor': [32, 60], 'height': 54}]}
            first = export_all(root, root / 'one', spec)
            second = export_all(root, root / 'two', spec)
            self.assertEqual(first, second)
            self.assertTrue(first['staticOnly'])
            self.assertFalse(first['activeGameManifest'])
            self.assertNotIn('animations', first)
            a = Image.open(root / 'one/native/characters/villager_NE.png')
            b = Image.open(root / 'two/native/characters/villager_NE.png')
            self.assertEqual(a.tobytes(), b.tobytes())
            self.assertEqual(a.getbbox()[3], 61)


if __name__ == '__main__':
    unittest.main()
