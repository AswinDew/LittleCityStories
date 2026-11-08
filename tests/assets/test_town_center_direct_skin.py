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

    def test_completion_atlas_is_reproducible_and_uses_real_stitch_face_sources(self):
        module_spec = importlib.util.spec_from_file_location('direct_skin', ROOT / 'tools/assets/export_town_center_direct_skin.py')
        exporter = importlib.util.module_from_spec(module_spec); module_spec.loader.exec_module(exporter)
        with tempfile.TemporaryDirectory(dir=ROOT / 'test-results/direct-skin') as folder:
            output = Path(folder)
            args = (ROOT / '.stitch/exports/town-center-direct-skin/source-spec.json',
                    ROOT / '.stitch/exports/town-center-direct-skin/masks.json', output)
            exporter.export(*args)
            atlas = Image.open(output / 'completion.png')
            self.assertEqual(atlas.size, (512, 512))
            self.assertEqual(atlas.mode, 'RGB')
            atlas.close()
            manifest = json.loads((output / 'manifest.json').read_text())
            self.assertNotIn('completionExport', manifest)
            self.assertIn('screens/a1b269126a7b4781ae5679295150845c', manifest['completion']['screenName'])
            self.assertEqual(manifest['completion']['componentSources']['right-wall']['screenName'],
                             'projects/9572784485551125903/screens/d51f3649e1454b2fbf2243f8a9242312')
            self.assertEqual(set(manifest['completion']['bindings']), {'back-wall', 'right-wall', 'roof-end', 'back-roof', 'floor'})
            first = (output / 'completion.png').read_bytes(); exporter.export(*args)
            self.assertEqual(first, (output / 'completion.png').read_bytes())


if __name__ == '__main__':
    unittest.main()
