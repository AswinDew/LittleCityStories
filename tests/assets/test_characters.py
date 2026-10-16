import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]


class CharacterAtlasTests(unittest.TestCase):
    def test_required_animations_frames_anchor_and_directional_art(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            result = subprocess.run([sys.executable, str(ROOT / 'tools/assets/generate_assets.py'),
                                     '--output', str(output)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            manifest = json.loads((output / 'manifest.json').read_text())
            self.assertIn('citizens', manifest['atlases'])
            atlas = manifest['atlases']['citizens']
            image = Image.open(output / manifest['assets']['citizens']['file']).convert('RGBA')
            seen = set()
            works = {'villager': 'work', 'farmer': 'harvest', 'lumberjack': 'chop', 'builder': 'build'}
            for role, work in works.items():
                direction_frames = []
                for direction in ['NE', 'NW', 'SE', 'SW']:
                    for state, count in [('idle', 2), ('walk', 6), (work, 6)]:
                        clip = atlas['animations'][role][direction][state]
                        self.assertEqual(clip['anchor'], {'x': 16, 'y': 30})
                        self.assertGreater(clip['frameDurationMs'], 0)
                        self.assertEqual(len(clip['frames']), count)
                        art = []
                        for rect in clip['frames']:
                            x, y, w, h = (rect[key] for key in ('x', 'y', 'width', 'height'))
                            self.assertEqual((w, h), (32, 32))
                            self.assertTrue(0 <= x <= image.width - w and 0 <= y <= image.height - h)
                            self.assertNotIn((x, y), seen)
                            seen.add((x, y))
                            frame = image.crop((x, y, x + w, y + h))
                            bbox = frame.getbbox()
                            self.assertIsNotNone(bbox)
                            self.assertLessEqual(bbox[3], 31)
                            self.assertGreater(bbox[3], 27)
                            art.append(frame.tobytes())
                        self.assertGreater(len(set(art)), 1, (role, direction, state))
                        if state == work: direction_frames.append(art[0])
                self.assertEqual(len(set(direction_frames)), 4, role)
            self.assertEqual(len(seen), 224)


if __name__ == '__main__':
    unittest.main()
