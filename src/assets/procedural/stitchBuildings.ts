import * as THREE from 'three';
import type { AncientBuildingId } from './ancientBuildings';
import { createFence } from './walls';
import { createAncientEnvironment } from './ancientEnvironment';
import { beam, crate, pot, roof, roundPart, stage, timberBox } from './settlementKit';
import { createDetailedTownCenter } from './townCenter';

/** Hollow, shared-geometry models translated from the frozen Stitch BLDG-01 sheet. */
export function createStitchBuilding(id: AncientBuildingId, size: number, seed: number): THREE.Group {
  if (id === 'town_center') return createDetailedTownCenter();
  const group = new THREE.Group(); group.name = id; group.userData.artSource = 'Stitch BLDG-01/' + id;
  stage(timberBox(group, id === 'dirt_road' ? 'road' : 'soil', size - 0.08, 0.08, size - 0.08), 'foundation', 0, 0.1);
  if (id === 'dirt_road') return group;
  const detail = new THREE.Group(); stage(detail, 'detail', 0.75, 0.99); group.add(detail);
  const vec = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const hut = (w: number, d: number, h: number, x = 0, z = 0, woodenRoof = false) => {
    const structure = new THREE.Group(); structure.position.set(x, 0.08, z); group.add(structure);
    const portal = 0.66, doorHeight = 1.92;
    const panel = (width: number, height: number, depth: number, px: number, py: number, pz: number, nx: number, nz: number) => {
      const wall = new THREE.Group(); wall.position.set(px, py, pz); stage(wall, 'wall', 0.3, 0.72, true);
      wall.userData.cutawayNormal = { x: nx, z: nz }; structure.add(wall);
      timberBox(wall, id === 'storage_hut' ? 'clay' : 'linen', width, height, depth, 0, 0);
      timberBox(wall, 'wood_dark', width + 0.012, 0.06, depth + 0.012, 0, -height / 2 + 0.03);
      return wall;
    };
    panel(w, h, 0.08, 0, h / 2, -d / 2, 0, -1);
    panel(0.08, h, d, -w / 2, h / 2, 0, -1, 0);
    panel(0.08, h, d, w / 2, h / 2, 0, 1, 0);
    const side = (w - portal) / 2;
    for (const sign of [-1, 1]) {
      const wall = panel(side, h, 0.08, sign * (w + portal) / 4, h / 2, d / 2, 0, 1);
      beam(wall, vec(-side / 2 + 0.05, -h / 2 + 0.12, 0.055), vec(side / 2 - 0.05, h / 2 - 0.1, 0.055), 0.045);
    }
    panel(portal, h - doorHeight, 0.08, 0, doorHeight + (h - doorHeight) / 2, d / 2, 0, 1);
    for (const px of [-w / 2, w / 2]) for (const pz of [-d / 2, d / 2]) {
      stage(timberBox(structure, 'wood_dark', 0.09, h, 0.09, px, h / 2, pz), 'frame', 0.1, 0.32);
    }
    const trim = new THREE.Group(); stage(trim, 'detail', 0.68, 0.9, true);
    trim.userData.cutawayNormal = { x: 0, z: 1 }; structure.add(trim);
    for (const px of [-portal / 2, portal / 2]) timberBox(trim, 'wood', 0.07, doorHeight, 0.12, px, doorHeight / 2, d / 2 + 0.02);
    timberBox(trim, 'wood_dark', portal + 0.14, 0.10, 0.14, 0, doorHeight, d / 2 + 0.02);
    for (const sign of [-1, 1]) {
      const px = sign * (portal / 2 + side / 2);
      timberBox(trim, 'wood_dark', Math.min(0.28, side * 0.65), 0.36, 0.04, px, 1.35, d / 2 + 0.055);
      timberBox(trim, 'wood_light', Math.min(0.31, side * 0.7), 0.04, 0.06, px, 1.18, d / 2 + 0.07);
      timberBox(trim, 'wood', 0.035, 0.36, 0.06, px, 1.35, d / 2 + 0.07);
    }
    const frame = new THREE.Group(); stage(frame, 'frame', 0.2, 0.5); structure.add(frame);
    for (const pz of [-d / 2, d / 2]) timberBox(frame, 'wood_dark', w, 0.09, 0.09, 0, h - 0.05, pz);
    roof(structure, w + 0.22, d + 0.22, 0.78, h, woodenRoof);
  };
  if (id === 'primitive_house') {
    hut(1.4, 1.35, 2.03);
    timberBox(detail, 'wood', 0.48, 0.12, 0.65, -0.3, 0.15, -0.25);
    timberBox(detail, 'straw_light', 0.43, 0.04, 0.58, -0.3, 0.23, -0.25);
    pot(detail, 0.4, -0.3, 0.25);
  } else if (id === 'farm') {
    const fields = new THREE.Group(); stage(fields, 'crops', 0.2, 0.88); group.add(fields);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const x = -1.2 + col * 0.8, z = -1.2 + row * 0.8;
      if (col === 0) timberBox(fields, 'soil_dark', 3.25, 0.05, 0.5, 0, 0.11, z);
      const crop = createAncientEnvironment(row < 2 ? 'crop' : 'bush', seed + row * 4 + col);
      crop.scale.setScalar(row < 2 ? 0.72 : 0.40); crop.position.set(x, 0.14, z); fields.add(crop);
    }
    const fence = createFence(3.3); fence.position.set(0, 0.08, -1.8); stage(fence, 'fence', 0.6, 0.92); group.add(fence);
  } else if (id === 'lumber_camp') {
    const shelter = new THREE.Group(); shelter.position.set(-0.75, 0.08, -0.75); stage(shelter, 'frame', 0.1, 0.7); group.add(shelter);
    for (const x of [-0.8, 0.8]) for (const z of [-0.7, 0.7]) timberBox(shelter, 'wood_dark', 0.10, 1.95, 0.10, x, 0.975, z);
    roof(shelter, 1.85, 1.65, 0.55, 1.95);
    for (let row = 0; row < 2; row++) for (let log = 0; log < 3 - row; log++) {
      roundPart(detail, 'wood_dark', 0.15, 1.15, 0.95, 0.26 + row * 0.27, -1.05 + log * 0.31 + row * 0.15, true);
      roundPart(detail, 'wood_light', 0.13, 0.018, 1.535, 0.26 + row * 0.27, -1.05 + log * 0.31 + row * 0.15, true);
    }
    roundPart(detail, 'wood', 0.28, 0.42, 0.75, 0.29, 0.8);
    roundPart(detail, 'wood_light', 0.25, 0.025, 0.75, 0.51, 0.8);
    beam(detail, vec(0.7, 0.54, 0.8), vec(1.02, 0.86, 0.8), 0.055, 'wood');
    timberBox(detail, 'stone_dark', 0.22, 0.12, 0.06, 0.93, 0.77, 0.8);
  } else if (id === 'stone_quarry') {
    const face = new THREE.Group(); stage(face, 'stone', 0.12, 0.85); group.add(face);
    for (let col = 0; col < 4; col++) for (let row = 0; row < 3; row++) {
      timberBox(face, (col + row) % 3 ? 'stone' : 'stone_light', 0.76, 0.48, 0.65,
        -1.2 + col * 0.79, 0.32 + row * 0.48, -1.25 + row * 0.14);
    }
    for (let i = 0; i < 3; i++) timberBox(detail, 'stone_light', 0.4, 0.30, 0.4, -1.25 + i * 0.48, 0.23, 0.2);
    for (const x of [-1.7, 1.7]) beam(detail, vec(x, 0.08, -0.65), vec(x, 1.65, -1.1), 0.12);
    timberBox(detail, 'wood', 3.5, 0.12, 0.12, 0, 1.72, -1.1);
  } else if (id === 'storage_hut') {
    hut(2.8, 2.1, 2.04, 0, -0.4, true);
    for (let i = 0; i < 5; i++) timberBox(detail, 'wood_light', 0.52, 0.10, 0.6, -1.1 + i * 0.55, 0.13, 1.05);
    crate(detail, -1.1, 1.35, 0.42); crate(detail, 0.8, 1.3, 0.5);
    pot(detail, -0.52, 1.3, 0.52); pot(detail, 1.35, 1.2, 0.38);
  } else {
    hut(2.4, 2.2, 2.04, -0.25, -0.25);
    const porch = new THREE.Group(); porch.position.set(1.15, 0.08, 0.3); stage(porch, 'frame', 0.15, 0.7); group.add(porch);
    for (const z of [-0.8, 0.8]) timberBox(porch, 'wood_dark', 0.09, 1.85, 0.09, 0.56, 0.925, z);
    const top = roof(porch, 2.0, 1.25, 0.52, 1.85); top.rotation.y = Math.PI / 2;
    // Preserve the existing research room's desk and worker coordinates.
    timberBox(detail, 'wood_dark', 0.85, 0.10, 0.65, 0.35, 0.7, 0.05);
    for (const x of [-0.01, 0.71]) for (const z of [-0.2, 0.3]) timberBox(detail, 'wood', 0.06, 0.58, 0.06, x, 0.37, z);
    timberBox(detail, 'linen', 0.55, 0.025, 0.35, 0.35, 0.77, 0.05);
    timberBox(detail, 'wood', 1.0, 0.06, 0.27, -0.65, 0.75, -1.15);
    for (let i = 0; i < 5; i++) timberBox(detail, i % 2 ? 'blue' : 'wood_dark', 0.1, 0.22 + (i % 2) * 0.05, 0.17,
      -1.0 + i * 0.15, 0.9, -1.15);
  }
  // Keep the existing cutaway contract on drawable meshes, including their trim.
  group.traverse(node => {
    if (node instanceof THREE.Mesh || !node.userData.cutawayNormal) return;
    const metadata = { ...node.userData };
    node.traverse(child => { if (child instanceof THREE.Mesh) Object.assign(child.userData, metadata); });
    delete node.userData.cutawayNormal;
  });
  return group;
}
