import * as THREE from 'three';
import { MaterialLibrary } from '../MaterialLibrary';
import { cachedMesh, assetBox } from '../GeometryCache';
import { SeededRandom } from '@/simulation/Random';

export type EnvironmentKind = 'tree' | 'bush' | 'rock' | 'grass' | 'crop';
export function createAncientEnvironment(kind: EnvironmentKind, seed = 0): THREE.Group {
  const group = new THREE.Group(); group.name = kind;
  const material = (key: string) => MaterialLibrary.getInstance().get(`ancient_${key}`);
  const random = new SeededRandom(seed);
  const clump = (x: number, y: number, z: number, radius: number, color: string) => {
    const mesh = cachedMesh('ancient/clump', () => new THREE.DodecahedronGeometry(1, 0), material(color));
    mesh.scale.setScalar(radius); mesh.position.set(x, y, z); group.add(mesh); return mesh;
  };
  if (kind === 'tree') {
    const trunk = assetBox(0.24, 1.6, 0.24, material('wood_dark')); trunk.position.y = 0.8; group.add(trunk);
    clump(-0.3, 1.75, 0.06, 0.62, 'green_dark');
    clump(0.22, 1.95, 0, 0.72, 'green');
    clump(0.3, 2.35, -0.1, 0.5, 'green_light');
  } else if (kind === 'rock') {
    const rock = clump(0, 0.46, 0, 0.65, 'stone'); rock.scale.y *= 0.7;
    rock.rotation.y = random.next() * Math.PI;
    clump(0.38, 0.28, 0.26, 0.28, 'stone_light');
  } else if (kind === 'bush') {
    clump(-0.15, 0.35, 0.03, 0.35, 'green_dark'); clump(0.18, 0.4, 0, 0.4, 'green');
    clump(0.18, 0.54, -0.02, 0.22, 'green_light');
  } else {
    for (let i = 0; i < 5; i++) {
      const height = 0.2 + random.next() * (kind === 'crop' ? 0.45 : 0.15);
      const x = (i - 2) * 0.1, z = (random.next() - 0.5) * 0.25;
      const stem = assetBox(0.035, height, 0.035, material('green_dark'));
      stem.position.set(x, height / 2, z); stem.rotation.z = (i - 2) * 0.12; group.add(stem);
      if (kind === 'crop') clump(x, height, z, 0.09, 'coin');
    }
  }
  return group;
}
