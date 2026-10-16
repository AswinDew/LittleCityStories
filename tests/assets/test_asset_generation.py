import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/assets'))


class AssetGenerationTests(unittest.TestCase):
    def test_palette_hash_ignores_checkout_line_endings_and_formatting(self):
        import primitives
        self.assertTrue(hasattr(primitives, 'palette_hash'))
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'palette.json'
            data = json.loads((ROOT / 'tools/assets/palette.json').read_text())
            path.write_text(json.dumps(data, indent=2), newline='\n')
            with patch.object(primitives, 'PALETTE_PATH', path):
                first = primitives.palette_hash()
                path.write_text(json.dumps(data, indent=4), newline='\r\n')
                self.assertEqual(first, primitives.palette_hash())

    def generate(self, destination, seed=42):
        result = subprocess.run([sys.executable, str(ROOT / 'tools/assets/generate_assets.py'),
                                 '--seed', str(seed), '--output', str(destination)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads((destination / 'manifest.json').read_text())

    def test_reproducible_files_and_portable_manifest(self):
        with tempfile.TemporaryDirectory() as temp:
            a, b = Path(temp) / 'a', Path(temp) / 'b'
            manifest = self.generate(a)
            self.generate(b)
            hashes = lambda folder: {str(p.relative_to(folder)): hashlib.sha256(p.read_bytes()).hexdigest()
                                     for p in folder.rglob('*') if p.is_file()}
            self.assertEqual(hashes(a), hashes(b))
            self.assertEqual(manifest['seed'], 42)
            self.assertNotIn(str(ROOT), json.dumps(manifest))

    def test_required_icons_textures_palette_alpha_dimensions_and_seams(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            manifest = self.generate(output)
            required = ['wood', 'stone', 'food', 'coins', 'population', 'happiness', 'construction', 'technology',
                        'town_center', 'primitive_house', 'farm', 'lumber_camp', 'stone_quarry', 'storage_hut',
                        'research_hut', 'dirt_road', 'agriculture', 'masonry', 'toolmaking']
            self.assertTrue(all('icon_' + key in manifest['assets'] for key in required))
            palette = json.loads((ROOT / 'tools/assets/palette.json').read_text())['colors']
            allowed = {tuple(bytes.fromhex(value.lstrip('#'))) for value in palette.values()}
            for key, asset in manifest['assets'].items():
                with Image.open(output / asset['file']) as image:
                    self.assertEqual(image.size, (asset['width'], asset['height']))
                    pixels = list(image.convert('RGBA').get_flattened_data())
                    self.assertTrue(all(p[3] in (0, 255) for p in pixels), key)
                    self.assertTrue(all(p[:3] in allowed for p in pixels if p[3]), key)
                    if key.startswith('terrain_'):
                        self.assertTrue(all(p[3] == 255 for p in pixels))
                        rgba = image.convert('RGBA')
                        self.assertEqual(list(rgba.crop((0, 0, 1, 32)).get_flattened_data()),
                                         list(rgba.crop((31, 0, 32, 32)).get_flattened_data()))
                        self.assertEqual(list(rgba.crop((0, 0, 32, 1)).get_flattened_data()),
                                         list(rgba.crop((0, 31, 32, 32)).get_flattened_data()))

    def test_different_seed_changes_terrain(self):
        with tempfile.TemporaryDirectory() as temp:
            a, b = Path(temp) / 'a', Path(temp) / 'b'
            self.generate(a, 42)
            self.generate(b, 43)
            self.assertNotEqual((a / 'terrain/grass.png').read_bytes(), (b / 'terrain/grass.png').read_bytes())

    def test_validator_detects_tampering_and_bad_metadata(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            self.generate(output)
            command = [sys.executable, str(ROOT / 'tools/assets/validate_assets.py'), '--input', str(output)]
            self.assertEqual(subprocess.run(command, capture_output=True).returncode, 0)
            original = (output / 'icons/wood.png').read_bytes()
            image = Image.open(output / 'icons/wood.png').convert('RGBA')
            image.putpixel((0, 0), (255, 0, 255, 128))
            image.save(output / 'icons/wood.png')
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('icon_wood', result.stderr)
            # Also bypass the content hash to prove the pixel rules themselves are checked.
            data = json.loads((output / 'manifest.json').read_text())
            data['assets']['icon_wood']['sha256'] = hashlib.sha256((output / 'icons/wood.png').read_bytes()).hexdigest()
            (output / 'manifest.json').write_text(json.dumps(data))
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertIn('alpha violation', result.stderr)
            (output / 'icons/wood.png').write_bytes(original)
            data['assets']['icon_wood']['sha256'] = hashlib.sha256(original).hexdigest()
            data['atlases']['citizens']['animations']['farmer']['SE']['walk']['frames'][0]['x'] = 512
            (output / 'manifest.json').write_text(json.dumps(data))
            self.assertNotEqual(subprocess.run(command, capture_output=True).returncode, 0)

    def test_validator_rejects_missing_atlas_asset(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            data = self.generate(output)
            del data['assets']['citizens']
            (output / 'manifest.json').write_text(json.dumps(data))
            result = subprocess.run([sys.executable, str(ROOT / 'tools/assets/validate_assets.py'),
                                     '--input', str(output)], capture_output=True)
            self.assertNotEqual(result.returncode, 0)


if __name__ == '__main__':
    unittest.main()
