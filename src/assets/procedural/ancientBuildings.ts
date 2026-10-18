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
function assembly<T extends THREE.Object3D>(node: T, stage: string, start: number, end: number, cutaway = false): T {
  node.userData.assembly = stage; node.userData.assemblyStart = start; node.userData.assemblyEnd = end;
  node.userData.cutaway = cutaway; return node;
}

export function createAncientBuilding(id: AncientBuildingId, seed = 0): THREE.Group {
  const group = new THREE.Group(); group.name = id;
  const size = ANCIENT_FOOTPRINTS[id] * 2;
  const random = new SeededRandom(seed);
  const box = (w: number, h: number, d: number, color: string, x = 0, y = h / 2, z = 0) => {
    const mesh = assetBox(w, h, d, MaterialLibrary.getInstance().get(`ancient_${color}`));
    mesh.position.set(x, y, z); group.add(mesh); return mesh;
  };
  assembly(box(size - 0.08, 0.08, size - 0.08, id === 'dirt_road' ? 'road' : 'soil'), 'foundation', 0, 0.1);
  if (id === 'dirt_road') return group;
  const hut = (w: number, d: number, height: number, x = 0, z = 0) => {
    const structure = new THREE.Group(); structure.position.set(x, 0.08, z);
    const color = id === 'storage_hut' ? 'wood_light' : 'linen';
    // Hollow shells provide real doorways and a usable research interior.
    const wall = (width: number, h: number, depth: number, px: number, py: number, pz: number) => {
      const part = createAncientWall(width, h, depth, color); part.position.set(px, py, pz);
      part.userData.cutawayNormal = width === 0.08 ? { x: Math.sign(px), z: 0 } : { x: 0, z: Math.sign(pz) };
      assembly(part, 'wall', 0.3, 0.72, true); structure.add(part);
    };
    wall(w, height, 0.08, 0, height / 2, -d / 2);
    wall(0.08, height, d, -w / 2, height / 2, 0);
    wall(0.08, height, d, w / 2, height / 2, 0);
    const side = (w - 0.42) / 2;
    wall(side, height, 0.08, -(w + 0.42) / 4, height / 2, d / 2);
    wall(side, height, 0.08, (w + 0.42) / 4, height / 2, d / 2);
    wall(0.42, Math.max(0.1, height - 0.7), 0.08, 0, 0.7 + Math.max(0.1, height - 0.7) / 2, d / 2);
    for (const px of [-w / 2, w / 2]) for (const pz of [-d / 2, d / 2]) {
      const beam = createAncientWall(0.09, height, 0.09, 'wood_dark'); beam.position.set(px, height / 2, pz);
      assembly(beam, 'frame', 0.1, 0.32); structure.add(beam);
    }
    const roof = createThatchRoof(w + 0.22, d + 0.22, 0.65); roof.position.y = height;
    assembly(roof, 'roof', 0.72, 0.96, true); structure.add(roof);
    const door = createAncientOpening('door'); door.position.set(0, 0.325, d / 2 + 0.025);
    door.userData.cutawayNormal = { x: 0, z: 1 };
    assembly(door, 'detail', 0.68, 0.9, true); structure.add(door);
    const window = createAncientOpening('window'); window.position.set(w * 0.3, height * 0.65, d / 2 + 0.026);
    window.userData.cutawayNormal = { x: 0, z: 1 };
    assembly(window, 'detail', 0.72, 0.94, true); structure.add(window);
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
      assembly(box(3.3, 0.06, 0.5, 'soil_dark', 0, 0.11, z), 'beds', 0.1, 0.3);
      for (const x of [-1.2, -0.4, 0.4, 1.2]) {
        const crop = createAncientEnvironment('crop', Math.floor(random.next() * 10000));
        crop.position.set(x, 0.14, z); assembly(crop, 'crops', 0.3 + (z + 1.2) * 0.12, 0.6 + (z + 1.2) * 0.15); group.add(crop);
      }
    }
    const fence = createFence(3.3); fence.position.set(0, 0.08, -1.8); assembly(fence, 'fence', 0.55, 0.92); group.add(fence);
  } else if (id === 'lumber_camp') {
    hut(1.6, 1.5, 1.1, -0.7, -0.7);
    for (let i = 0; i < 4; i++) box(1.4, 0.25, 0.27, i % 2 ? 'wood_light' : 'wood', 0.65, 0.22 + (i % 2) * 0.25, 0.65 + Math.floor(i / 2) * 0.35);
    box(0.08, 0.9, 0.08, 'wood_dark', 1.25, 0.53, -0.4);
    box(0.5, 0.25, 0.12, 'stone', 1.35, 0.9, -0.4);
  } else if (id === 'stone_quarry') {
    for (let i = 0; i < 5; i++) {
      const rock = createAncientEnvironment('rock', seed + i); rock.scale.setScalar(0.8 + random.next() * 0.25);
      rock.position.set((i % 3 - 1) * 0.95, 0.08, (Math.floor(i / 3) - 0.5) * 1.4);
      assembly(rock, 'stone', 0.12 + i * 0.1, 0.4 + i * 0.1); group.add(rock);
    }
    box(0.12, 1.7, 0.12, 'wood_dark', -1.6, 0.93, -1.4);
    box(3.1, 0.12, 0.12, 'wood', 0, 1.75, -1.4);
  } else if (id === 'storage_hut') {
    hut(2.8, 2.1, 1.5, 0, -0.4);
    for (const x of [-1.1, -0.3, 0.5]) box(0.65, 0.6, 0.65, 'wood', x, 0.38, 1.2);
  } else {
    hut(2.4, 2.2, 1.6, -0.25, -0.25);
    box(0.85, 0.12, 0.65, 'wood_dark', 0.35, 0.7, 0.05);
    box(0.6, 0.04, 0.4, 'linen', 0.35, 0.79, 0.05);
    box(0.035, 0.035, 0.28, 'purple', 0.35, 0.82, 0.05);
  }
  return group;
}
