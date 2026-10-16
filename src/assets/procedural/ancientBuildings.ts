import * as THREE from 'three';
import { createAncientWall, createFence } from './walls';
import { createThatchRoof } from './roofs';
import { createAncientOpening } from './windows';
import { createAncientEnvironment } from './ancientEnvironment';
import { assetBox } from '../GeometryCache';
import { MaterialLibrary } from '../MaterialLibrary';
import { SeededRandom } from '@/simulation/Random';

export const ANCIENT_FOOTPRINTS = { town_center: 3, primitive_house: 1, farm: 2, lumber_camp: 2,
  stone_quarry: 2, storage_hut: 2, research_hut: 2, dirt_road: 1 } as const;
export type AncientBuildingId = keyof typeof ANCIENT_FOOTPRINTS;

export function createAncientBuilding(id: AncientBuildingId, seed = 0): THREE.Group {
  const group = new THREE.Group(); group.name = id;
  const size = ANCIENT_FOOTPRINTS[id] * 2;
  const random = new SeededRandom(seed);
  const box = (w: number, h: number, d: number, color: string, x = 0, y = h / 2, z = 0) => {
    const mesh = assetBox(w, h, d, MaterialLibrary.getInstance().get(`ancient_${color}`));
    mesh.position.set(x, y, z); group.add(mesh); return mesh;
  };
  box(size - 0.08, 0.08, size - 0.08, id === 'dirt_road' ? 'road' : 'soil');
  if (id === 'dirt_road') return group;
  const hut = (w: number, d: number, height: number, x = 0, z = 0) => {
    const structure = new THREE.Group(); structure.position.set(x, 0.08, z);
    const wall = createAncientWall(w, height, d, id === 'storage_hut' ? 'wood_light' : 'linen');
    structure.add(wall);
    for (const px of [-w / 2, w / 2]) for (const pz of [-d / 2, d / 2]) {
      const beam = createAncientWall(0.09, height, 0.09, 'wood_dark'); beam.position.set(px, height / 2, pz); structure.add(beam);
    }
    const roof = createThatchRoof(w + 0.22, d + 0.22, 0.65); roof.position.y = height; structure.add(roof);
    const door = createAncientOpening('door'); door.position.set(0, 0.325, d / 2 + 0.025); structure.add(door);
    const window = createAncientOpening('window'); window.position.set(w * 0.3, height * 0.65, d / 2 + 0.026); structure.add(window);
    group.add(structure);
  };
  if (id === 'primitive_house') hut(1.4, 1.35, 1.1);
  else if (id === 'town_center') {
    hut(3.3, 2.9, 2.1, 0, -0.5);
    box(4.2, 0.2, 0.65, 'stone', 0, 0.18, 1.4);
    box(0.12, 1.3, 0.12, 'wood_dark', 1.9, 2.9, -0.5);
    box(0.8, 0.4, 0.035, 'blue', 2.25, 3.25, -0.5);
  } else if (id === 'farm') {
    for (const z of [-1.2, -0.4, 0.4, 1.2]) {
      box(3.3, 0.06, 0.5, 'soil_dark', 0, 0.11, z);
      for (const x of [-1.2, -0.4, 0.4, 1.2]) {
        const crop = createAncientEnvironment('crop', Math.floor(random.next() * 10000));
        crop.position.set(x, 0.14, z); group.add(crop);
      }
    }
    const fence = createFence(3.3); fence.position.set(0, 0.08, -1.8); group.add(fence);
  } else if (id === 'lumber_camp') {
    hut(1.6, 1.5, 1.1, -0.7, -0.7);
    for (let i = 0; i < 4; i++) box(1.4, 0.25, 0.27, i % 2 ? 'wood_light' : 'wood', 0.65, 0.22 + (i % 2) * 0.25, 0.65 + Math.floor(i / 2) * 0.35);
    box(0.08, 0.9, 0.08, 'wood_dark', 1.25, 0.53, -0.4);
    box(0.5, 0.25, 0.12, 'stone', 1.35, 0.9, -0.4);
  } else if (id === 'stone_quarry') {
    for (let i = 0; i < 5; i++) {
      const rock = createAncientEnvironment('rock', seed + i); rock.scale.setScalar(0.8 + random.next() * 0.25);
      rock.position.set((i % 3 - 1) * 0.95, 0.08, (Math.floor(i / 3) - 0.5) * 1.4); group.add(rock);
    }
    box(0.12, 1.7, 0.12, 'wood_dark', -1.6, 0.93, -1.4);
    box(3.1, 0.12, 0.12, 'wood', 0, 1.75, -1.4);
  } else if (id === 'storage_hut') {
    hut(2.8, 2.1, 1.5, 0, -0.4);
    for (const x of [-1.1, -0.3, 0.5]) box(0.65, 0.6, 0.65, 'wood', x, 0.38, 1.2);
  } else {
    hut(2.4, 2.2, 1.6, -0.25, -0.25);
    box(0.85, 0.12, 0.65, 'wood_dark', 1.2, 0.7, 1.05);
    box(0.6, 0.04, 0.4, 'linen', 1.2, 0.79, 1.05);
    box(0.035, 0.035, 0.28, 'purple', 1.2, 0.82, 1.05);
  }
  return group;
}
