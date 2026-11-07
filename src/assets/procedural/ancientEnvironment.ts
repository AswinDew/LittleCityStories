import * as THREE from 'three';
import { MaterialLibrary } from '../MaterialLibrary';
import { cachedMesh, assetBox } from '../GeometryCache';
import { SeededRandom } from '@/simulation/Random';
import { beam, roundPart } from './settlementKit';

export type EnvironmentKind = 'tree' | 'bush' | 'rock' | 'grass' | 'crop';
export function createAncientEnvironment(kind: EnvironmentKind, seed = 0): THREE.Group {
  const group = new THREE.Group(); group.name = kind;
  group.userData.artSource = `Stitch ENV-01/${kind}`;
  const material = (key: string) => MaterialLibrary.getInstance().get(`ancient_${key}`);
  const random = new SeededRandom(seed);
  const clump = (x: number, y: number, z: number, radius: number, color: string) => {
    const mesh = cachedMesh('ancient/clump', () => new THREE.DodecahedronGeometry(1, 0), material(color));
    mesh.scale.setScalar(radius); mesh.position.set(x, y, z); group.add(mesh); return mesh;
  };
  if (kind === 'tree') {
    roundPart(group, 'wood_dark', 0.16, 1.9, 0, 0.95, 0);
    for (const sign of [-1, 1]) {
      beam(group, new THREE.Vector3(0, 1.15, 0), new THREE.Vector3(sign * 0.56, 1.88, 0.1), 0.12, 'wood');
      beam(group, new THREE.Vector3(0, 0.27, 0), new THREE.Vector3(sign * 0.43, 0.055, 0.24), 0.10, 'wood_dark');
    }
    const variation = (random.next() - 0.5) * 0.16;
    clump(-0.36, 1.74, 0.1, 0.62, 'green_dark');
    clump(0.28, 2.02, 0, 0.67, 'green');
    clump(0.02, 2.57, -0.08, 0.51, 'green');
    clump(-0.65, 2.0, 0.1, 0.44, 'green');
    clump(0.58, 1.77, 0.25, 0.48, 'green_dark');
    clump(0.38, 2.24 + variation, -0.15, 0.39, 'green_light');
    clump(-0.33, 2.35, -0.12, 0.36, 'green_light');
  } else if (kind === 'rock') {
    const rock = clump(0, 0.46, 0, 0.65, 'stone'); rock.scale.y *= 0.7;
    rock.rotation.y = random.next() * Math.PI;
    clump(0.38, 0.28, 0.26, 0.28, 'stone_light');
    clump(-0.25, 0.64, -0.15, 0.19, 'grass_dark').scale.y *= 0.3;
  } else if (kind === 'bush') {
    clump(-0.15, 0.35, 0.03, 0.35, 'green_dark'); clump(0.18, 0.4, 0, 0.4, 'green');
    clump(0.18, 0.54, -0.02, 0.22, 'green_light');
    clump(-0.25, 0.33, 0.18, 0.21, 'green');
    for (let i = 0; i < 3; i++) clump((i - 1) * 0.17, 0.46, 0.29, 0.055, 'clay');
  } else {
    for (let i = 0; i < 5; i++) {
      const height = 0.2 + random.next() * (kind === 'crop' ? 0.55 : 0.15);
      const x = (i - 2) * 0.1, z = (random.next() - 0.5) * 0.25;
      const stem = assetBox(0.035, height, 0.035, material('green_dark'));
      stem.position.set(x, height / 2, z); stem.rotation.z = (i - 2) * 0.12; group.add(stem);
      if (kind === 'crop') clump(x, height, z, 0.09, 'coin');
    }
  }
  return group;
}
