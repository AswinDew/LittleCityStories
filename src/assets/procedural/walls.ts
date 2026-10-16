import * as THREE from 'three';
import { MaterialLibrary } from '../MaterialLibrary';
import { assetBox } from '../GeometryCache';

export function createAncientWall(width: number, height: number, depth: number, material = 'linen'): THREE.Mesh {
  const mesh = assetBox(width, height, depth, MaterialLibrary.getInstance().get(`ancient_${material}`));
  mesh.position.y = height / 2;
  return mesh;
}

export function createFence(width: number): THREE.Group {
  const fence = new THREE.Group();
  for (const x of [-width / 2, 0, width / 2]) {
    const post = createAncientWall(0.1, 0.5, 0.1, 'wood'); post.position.x = x; fence.add(post);
  }
  for (const y of [0.17, 0.38]) {
    const rail = createAncientWall(width, 0.07, 0.07, 'wood_light'); rail.position.y = y; fence.add(rail);
  }
  return fence;
}

export function createBuildingFoundation(width: number, depth: number, height = 0.15): THREE.Mesh {
  const mats = MaterialLibrary.getInstance();
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geo, mats.get('sidewalk_concrete'));
  mesh.position.y = height / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createWallBlock(
  width: number,
  height: number,
  depth: number,
  materialName: string
): THREE.Mesh {
  const mats = MaterialLibrary.getInstance();
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geo, mats.get(materialName));
  mesh.position.y = height / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
