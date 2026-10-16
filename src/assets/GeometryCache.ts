import * as THREE from 'three';

const geometries = new Map<string, { geometry: THREE.BufferGeometry; refs: number }>();
const released = new WeakSet<THREE.Mesh>();

/** Each mesh acquires one reference; its owner must release it exactly once. */
export function cachedMesh(key: string, create: () => THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  let entry = geometries.get(key);
  if (!entry) { entry = { geometry: create(), refs: 0 }; geometries.set(key, entry); }
  entry.refs++;
  const mesh = new THREE.Mesh(entry.geometry, material);
  mesh.userData.geometryKey = key;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export function releaseMesh(mesh: THREE.Mesh): void {
  if (released.has(mesh)) return;
  released.add(mesh);
  const key = mesh.userData.geometryKey as string | undefined;
  const entry = key ? geometries.get(key) : undefined;
  if (entry) {
    if (--entry.refs === 0) { entry.geometry.dispose(); geometries.delete(key!); }
  } else mesh.geometry.dispose();
  if (mesh.userData.ownsMaterial) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach(material => material.dispose());
  }
}

export function assetBox(width: number, height: number, depth: number, material: THREE.Material): THREE.Mesh {
  const mesh = cachedMesh('ancient/unit-box', () => new THREE.BoxGeometry(1, 1, 1), material);
  mesh.scale.set(width, height, depth);
  return mesh;
}
