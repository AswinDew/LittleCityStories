import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools/assets'))
from publish_stitch_assets import publish
from generate_assets import generate


class StitchPublishTests(unittest.TestCase):
    def test_runtime_generation_rejects_incomplete_stitch_pack_before_writing(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); source = root / 'pack'; source.mkdir()
            (source / 'static-manifest.json').write_text(json.dumps({'staticOnly': True, 'assets': {}}))
            with self.assertRaisesRegex(ValueError, 'Missing required Stitch assets'):
                generate(42, root / 'published', source)
            self.assertFalse((root / 'published').exists())

    def test_exports_only_verified_static_icons_and_terrain(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); source = root / 'pack'; source.mkdir()
            Image.new('RGBA', (24, 24), '#59845A').save(source / 'sample.png')
            Image.new('RGB', (32, 32), '#93AF75').save(source / 'ground.png')
            original = (source / 'sample.png').read_bytes()
            entry = {'file': 'sample.png', 'width': 24, 'height': 24,
                     'sha256': hashlib.sha256(original).hexdigest()}
            terrain = {'file': 'ground.png', 'width': 32, 'height': 32,
                       'sha256': hashlib.sha256((source / 'ground.png').read_bytes()).hexdigest()}
            (source / 'static-manifest.json').write_text(json.dumps({'staticOnly': True, 'assets': {
                'icons/wood': entry, 'terrain/grass': terrain, 'characters/villager_NE': entry}}))
            result = publish(source, root / 'published')
            self.assertEqual(set(result['assets']), {'icon_wood', 'terrain_grass'})
            self.assertEqual((root / 'published/icons/wood.png').read_bytes(), original)
            self.assertFalse((root / 'published/characters').exists())
            self.assertEqual(result['atlases'], {})
            (source / 'sample.png').write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError, 'hash'):
                publish(source, root / 'rejected')
            self.assertFalse((root / 'rejected').exists())
