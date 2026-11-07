import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]


class TownCenterSkinExportTests(unittest.TestCase):
    def exporter(self):
        path = ROOT / 'tools/assets/export_town_center_skin.py'
        self.assertTrue(path.exists(), 'Town Center skin exporter is not implemented')
        spec = importlib.util.spec_from_file_location('skin_export', path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def fixture(self, root):
        folder = root / 'exports/skin'; folder.mkdir(parents=True)
        sources = root / 'sources'; sources.mkdir()
        materials = []
        for i, name in enumerate(('straw_grain', 'oak_grain', 'limestone_grain', 'plaster_grain', 'linen_weave')):
            path = sources / (name + '.png')
            image = Image.new('RGB', (128, 128), (140 + i * 10, 120, 90))
            image.putpixel((0, 0), (230, 210, 180)); image.save(path)
            entry = {'file': '../../sources/' + path.name, 'width': 128, 'height': 128,
                     'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
            materials.append({'id': name, 'source': entry.copy(), 'candidate': entry.copy()})
        spec = folder / 'source-spec.json'
        spec.write_text(json.dumps({'version': 1, 'buildingId': 'town_center', 'materials': materials}))
        return spec

    def test_reproduces_one_rgb_atlas_with_edge_extrusion_and_shared_layout(self):
        export = self.exporter().export_skin
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); spec = self.fixture(root)
            manifest = export(spec, root / 'out')
            export(spec, root / 'again')
            for name in ('atlas.png', 'manifest.json'):
                self.assertEqual((root / 'out' / name).read_bytes(), (root / 'again' / name).read_bytes())
            layout = json.loads((ROOT / 'tools/assets/town-center-skin-layout.json').read_text())
            self.assertEqual(manifest['layoutHash'], layout['layoutHash'])
            self.assertEqual(manifest['regions'], layout['regions'])
            with Image.open(root / 'out/atlas.png') as atlas:
                self.assertEqual(atlas.size, (1024, 1024)); self.assertEqual(atlas.mode, 'RGB')
                x, y, _, _ = manifest['regions']['stone_front']
                # Uniform source grain should shade around the approved warm civic stone,
                # without importing a green cast or multiplying the old vertex tint.
                self.assertEqual(atlas.getpixel((x + 56, y + 56)), (152, 142, 125))
                for x, y, w, h in manifest['regions'].values():
                    self.assertEqual(atlas.getpixel((x - 8, y - 8)), atlas.getpixel((x, y)))
                    self.assertEqual(atlas.getpixel((x + w + 7, y + h + 7)), atlas.getpixel((x + w - 1, y + h - 1)))

    def test_rejects_changed_source_missing_material_and_outside_path_before_writing(self):
        export = self.exporter().export_skin
        for problem in ('hash', 'missing', 'outside'):
            with self.subTest(problem=problem), tempfile.TemporaryDirectory() as temp:
                root = Path(temp); spec = self.fixture(root); data = json.loads(spec.read_text())
                if problem == 'hash': data['materials'][0]['source']['sha256'] = '0' * 64
                if problem == 'missing': data['materials'].pop()
                if problem == 'outside': data['materials'][0]['candidate']['file'] = '../../../outside.png'
                spec.write_text(json.dumps(data))
                with self.assertRaises(ValueError): export(spec, root / 'out')
                self.assertFalse((root / 'out').exists())

    def test_rejects_invalid_layout_gutter_overlap_bounds_or_contract_before_writing(self):
        export = self.exporter().export_skin
        original = json.loads((ROOT / 'tools/assets/town-center-skin-layout.json').read_text())
        for problem in ('gutter', 'overlap', 'bounds', 'missing', 'digest'):
            with self.subTest(problem=problem), tempfile.TemporaryDirectory() as temp:
                root = Path(temp); spec = self.fixture(root); layout = json.loads(json.dumps(original))
                keys = list(layout['regions'])
                if problem == 'gutter': layout['gutter'] = 0
                if problem == 'overlap': layout['regions'][keys[1]] = layout['regions'][keys[0]]
                if problem == 'bounds': layout['regions'][keys[0]][0] = 1024
                if problem == 'missing': layout['regions'].pop(keys[0])
                if problem == 'digest': layout['layoutHash'] = '0' * 64
                else:
                    payload = {k: v for k, v in layout.items() if k != 'layoutHash'}
                    layout['layoutHash'] = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
                bad = root / 'layout.json'; bad.write_text(json.dumps(layout))
                with self.assertRaises(ValueError): export(spec, root / 'out', bad)
                self.assertFalse((root / 'out').exists())
