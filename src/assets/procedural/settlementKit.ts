/** Geometry translation of the Stitch BLDG-01 / ENV-01 material and shape sheets. */
import * as THREE from 'three';
import { assetBox, cachedMesh } from '../GeometryCache';
import { MaterialLibrary } from '../MaterialLibrary';
import { createThatchRoof } from './roofs';

export function stage<T extends THREE.Object3D>(node: T, name: string, start: number, end: number, cutaway = false): T {
  Object.assign(node.userData, { assembly: name, assemblyStart: start, assemblyEnd: end, cutaway });
  return node;
}
export function timberBox(parent: THREE.Object3D, color: string, w: number, h: number, d: number,
  x = 0, y = h / 2, z = 0): THREE.Mesh {
  const mesh = assetBox(w, h, d, MaterialLibrary.getInstance().get(`ancient_${color}`));
  mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}
export function beam(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, width = 0.07, color = 'wood_dark') {
  const mesh = timberBox(parent, color, width, a.distanceTo(b), width);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}
export function roundPart(parent: THREE.Object3D, color: string, radius: number, height: number,
  x: number, y: number, z: number, horizontal = false) {
  const mesh = cachedMesh('stitch/octagonal-cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 8),
    MaterialLibrary.getInstance().get(`ancient_${color}`));
  mesh.scale.set(radius, height, radius); mesh.position.set(x, y, z);
  if (horizontal) mesh.rotation.z = Math.PI / 2;
  parent.add(mesh); return mesh;
}
export function roof(parent: THREE.Object3D, width: number, depth: number, rise: number, y: number, wood = false) {
  const group = createThatchRoof(width, depth, rise, wood ? 'wood' : 'straw');
  group.position.y = y; stage(group, 'roof', 0.72, 0.96, true); parent.add(group);
  const slope = Math.atan2(rise, width / 2);
  for (const sign of [-1, 1]) for (let row = 0; row < 4; row++) {
    const distance = (row + 0.5) / 4;
    const band = timberBox(group, wood ? (row % 2 ? 'wood_light' : 'wood') : (row % 2 ? 'straw_light' : 'straw'),
      Math.hypot(width / 2, rise) / 4 + 0.015, 0.035, depth, sign * width / 2 * distance, rise * (1 - distance) + 0.025, 0);
    band.rotation.z = -sign * slope;
  }
  for (const z of [-depth / 2, depth / 2]) for (const sign of [-1, 1]) {
    beam(group, new THREE.Vector3(sign * width / 2, 0, z), new THREE.Vector3(0, rise, z), 0.055);
  }
  timberBox(group, 'wood_dark', 0.09, 0.09, depth, 0, rise + 0.035);
  return group;
}
export function crate(parent: THREE.Object3D, x: number, z: number, size = 0.48, y = size / 2 + 0.08) {
  const group = new THREE.Group(); group.position.set(x, y, z); parent.add(group);
  timberBox(group, 'wood', size, size, size, 0, 0);
  for (const px of [-size / 2 + 0.035, size / 2 - 0.035]) {
    timberBox(group, 'wood_dark', 0.055, size, size + 0.01, px, 0);
  }
  beam(group, new THREE.Vector3(-size / 2 + 0.02, -size / 2 + 0.02, size / 2 + 0.012),
    new THREE.Vector3(size / 2 - 0.02, size / 2 - 0.02, size / 2 + 0.012), 0.04, 'wood_light');
  return group;
}
export function pot(parent: THREE.Object3D, x: number, z: number, height = 0.45, y = 0.08) {
  roundPart(parent, 'clay', height * 0.31, height * 0.7, x, y + height * 0.35, z);
  roundPart(parent, 'clay_light', height * 0.19, height * 0.3, x, y + height * 0.85, z);
  roundPart(parent, 'wood_dark', height * 0.13, 0.018, x, y + height + 0.01, z);
}
