"""Stage A only: lossless crop/format conversion of frozen Stitch source pixels."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parents[1] / 'designs' / 'town-center-skin'


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def extract():
    selection = json.loads((ROOT / 'selection.json').read_text(encoding='utf-8'))
    materials = []
    ready = []
    for item in selection:
        path = SOURCE / item['sourceFile']
        with Image.open(path) as original:
            original.load()
            assert original.width == original.height and original.width >= 512
            box = item.get('crop') or [0, 0, original.width, original.height]
            assert 0 <= box[0] < box[2] <= original.width
            assert 0 <= box[1] < box[3] <= original.height
            candidate = original.convert('RGB').crop(box)
            assert candidate.width >= 512 and candidate.width == candidate.height
            entry = {
                'id': item['id'], 'source': {
                    'file': '../../designs/town-center-skin/' + path.name,
                    'screen': item['screen'], 'resource': item['resource'],
                    'sha256': sha256(path), 'width': original.width, 'height': original.height,
                },
                'transform': {'crop': box, 'resampling': None, 'colorQuantization': None,
                              'redrawnPixels': False, 'sourceModified': False},
                'candidate': {'file': 'candidates/' + item['id'] + '.png',
                              'width': candidate.width, 'height': candidate.height},
                'fiberDirection': item['direction'],
                'status': 'awaiting_user_material_review', 'seamlessVerified': False,
                'notes': item['notes'],
            }
            ready.append((candidate, entry))
    # Every input is decoded/validated before writing any candidate output.
    for candidate, entry in ready:
        target = ROOT / entry['candidate']['file']
        target.parent.mkdir(parents=True, exist_ok=True)
        candidate.save(target, optimize=False, compress_level=9)
        with Image.open(target) as exported:
            assert exported.convert('RGB').tobytes() == candidate.tobytes()
        entry['candidate']['sha256'] = sha256(target)
        materials.append(entry)
    spec = {
        'version': 1, 'stage': 'A', 'buildingId': 'town_center',
        'projectId': '9572784485551125903',
        'reference': {'file': '../../designs/ancient-sites-master.jpg',
                      'sha256': sha256(SOURCE.parent / 'ancient-sites-master.jpg')},
        'status': 'awaiting_user_material_review', 'runtimeIntegrated': False,
        'atlasCreated': False, 'materials': materials,
    }
    (ROOT / 'source-spec.json').write_text(json.dumps(spec, indent=2) + '\n', encoding='utf-8')
    print(json.dumps([{'id': m['id'], **m['candidate']} for m in materials]))


if __name__ == '__main__':
    extract()
