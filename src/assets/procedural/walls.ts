import * as THREE from 'three';
import { MaterialLibrary } from '../MaterialLibrary';

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
