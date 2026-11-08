import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]


class DirectSkinExportTests(unittest.TestCase):
    def test_native_source_rgb_binary_alpha_and_deterministic_export(self):
        module_spec = importlib.util.spec_from_file_location(
            'direct_skin', ROOT / 'tools/assets/export_town_center_direct_skin.py')
        exporter = importlib.util.module_from_spec(module_spec)
        module_spec.loader.exec_module(exporter)
        spec_path = ROOT / '.stitch/exports/town-center-direct-skin/source-spec.json'
        masks = ROOT / '.stitch/exports/town-center-direct-skin/masks.json'
        (ROOT / 'test-results/direct-skin').mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=ROOT / 'test-results/direct-skin') as folder:
            output = Path(folder)
            exporter.export(spec_path, masks, output)
            first = [(output / name).read_bytes() for name in ['design.png', 'manifest.json']]
            exporter.export(spec_path, masks, output)
            self.assertEqual(first, [(output / name).read_bytes() for name in ['design.png', 'manifest.json']])
            manifest = json.loads(first[1])
            image = Image.open(output / 'design.png')
            self.assertEqual(image.size, (360, 366))
            self.assertEqual(set(image.getchannel('A').tobytes()), {0, 255})
            source = Image.open(ROOT / '.stitch/designs/ancient-sites-master.jpg').convert('RGB').crop((20, 0, 380, 366))
            self.assertEqual(image.convert('RGB').tobytes(), source.tobytes())
            self.assertEqual(image.getpixel((0, 0))[3], 0)
            self.assertEqual(image.getpixel((180, 240))[3], 255)
            self.assertEqual(manifest['image']['file'], 'design.png')
            self.assertEqual(manifest['buildingId'], 'town_center')
            self.assertGreaterEqual(len(manifest['landmarks']), 12)


if __name__ == '__main__':
    unittest.main()
