"""Preview-only art contract; does not replace the active citizen atlas."""
import sys
import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/assets'))

from citizen_style import draw_citizen
from primitives import palette
from preview_citizens import preview


class CitizenStyleTests(unittest.TestCase):
    def test_eight_idle_poses_are_crisp_padded_and_keep_their_feet_planted(self):
        allowed = {tuple(bytes.fromhex(value[1:])) for value in palette().values()}
        signatures = []
        for direction in ('NE', 'NW', 'SE', 'SW'):
            frames = [draw_citizen('villager', direction, 'idle', frame) for frame in range(2)]
            self.assertNotEqual(frames[0].tobytes(), frames[1].tobytes())
            signatures.append(frames[0].tobytes())
            for image in frames:
                self.assertEqual(image.mode, 'RGBA')
                self.assertEqual(image.size, (64, 64))
                left, top, right, bottom = image.getbbox()
                self.assertGreaterEqual(left, 2)
                self.assertGreaterEqual(top, 2)
                self.assertLessEqual(right, 62)
                self.assertEqual(bottom, 61)
                self.assertTrue(48 <= bottom - top <= 54)
                for pixel in image.get_flattened_data():
                    self.assertIn(pixel[3], (0, 255))
                    if pixel[3]: self.assertIn(pixel[:3], allowed)
            self.assertEqual(frames[0].crop((0, 54, 64, 64)).tobytes(), frames[1].crop((0, 54, 64, 64)).tobytes())
        self.assertEqual(len(set(signatures)), 4)

    def test_directions_are_authored_individually_and_rendering_is_repeatable(self):
        for north, south in [('NE', 'SE'), ('NW', 'SW')]:
            self.assertNotEqual(draw_citizen('villager', north, 'idle', 0).tobytes(), draw_citizen('villager', south, 'idle', 0).tobytes())
        ne = draw_citizen('villager', 'NE', 'idle', 0)
        nw = draw_citizen('villager', 'NW', 'idle', 0)
        self.assertNotEqual(ne.transpose(Image.Transpose.FLIP_LEFT_RIGHT).tobytes(), nw.tobytes())
        self.assertEqual(ne.tobytes(), draw_citizen('villager', 'NE', 'idle', 0).tobytes())

    def test_unimplemented_poses_are_rejected_instead_of_faked(self):
        for args in [('farmer', 'SE', 'idle', 0), ('villager', 'S', 'idle', 0),
                     ('villager', 'SE', 'walk', 0), ('villager', 'SE', 'idle', -1),
                     ('villager', 'SE', 'idle', 2), ('villager', 'SE', 'idle', True),
                     ('villager', 'SE', 'idle', 0.5)]:
            with self.subTest(args=args), self.assertRaises(ValueError): draw_citizen(*args)

    def test_preview_exports_all_eight_original_size_frames_and_metadata(self):
        with tempfile.TemporaryDirectory() as temp:
            output = preview(temp)
            metadata = json.loads((output / 'preview.json').read_text())
            self.assertTrue(metadata['previewOnly'])
            self.assertEqual(metadata['frameSize'], [64, 64])
            self.assertEqual(metadata['anchor'], [32, 60])
            self.assertEqual(len(metadata['poses']), 8)
            for pose in metadata['poses']:
                with Image.open(output / pose['file']) as image:
                    expected = draw_citizen('villager', pose['direction'], 'idle', pose['frame'])
                    self.assertEqual(image.tobytes(), expected.tobytes())
            with Image.open(output / 'idle-preview.gif') as gif:
                self.assertEqual(gif.n_frames, 2)
                self.assertEqual(gif.info['duration'], 500)

    def test_preview_cannot_replace_public_game_assets(self):
        for path in [ROOT / 'public', ROOT / 'public/generated/characters']:
            with self.subTest(path=path), self.assertRaises(ValueError): preview(path)


if __name__ == '__main__':
    unittest.main()
