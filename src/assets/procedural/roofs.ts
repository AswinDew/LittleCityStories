import * as THREE from 'three';
import { MaterialLibrary } from '../MaterialLibrary';

/**
 * Creates a charming pitched gable roof with overhang along the eaves.
 * @param width Building width along X
 * @param depth Building depth along Z
 * @param height Roof peak height
 * @param overhang Eaves overhang
 * @param roofMat Material name for the roof surface
 */
export function createGableRoof(
  width: number,
  depth: number,
  height: number,
  overhang = 0.15,
  roofMat = 'roof_red_tile'
): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'GableRoof';

  const w = width + overhang * 2;
  const d = depth + overhang * 2;
  const halfW = w / 2;
  const halfD = d / 2;

  // Create triangular prism using custom BufferGeometry with explicit faces
  // Peak runs along Z axis (from -halfD to +halfD), sloping down to -halfW and +halfW
  const vertices = new Float32Array([
    // Slope 1 (Right: from peak (0, height, z) to right edge (halfW, 0, z))
    0, height, -halfD,
    halfW, 0, -halfD,
    halfW, 0, halfD,

    0, height, -halfD,
    halfW, 0, halfD,
    0, height, halfD,

    // Slope 2 (Left: from peak (0, height, z) to left edge (-halfW, 0, z))
    0, height, -halfD,
    0, height, halfD,
    -halfW, 0, halfD,

    0, height, -halfD,
    -halfW, 0, halfD,
    -halfW, 0, -halfD,

    // Front Gable Triangle (Z = halfD)
    0, height, halfD,
    halfW, 0, halfD,
    -halfW, 0, halfD,

    // Back Gable Triangle (Z = -halfD)
    0, height, -halfD,
    -halfW, 0, -halfD,
    halfW, 0, -halfD,
  ]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.computeVertexNormals();

  const roofMesh = new THREE.Mesh(geo, mats.get(roofMat));
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  group.add(roofMesh);

  // Decorative roof ridge beam
  const ridgeGeo = new THREE.BoxGeometry(0.12, 0.1, d);
  const ridgeMesh = new THREE.Mesh(ridgeGeo, mats.get('trim_white'));
  ridgeMesh.position.set(0, height + 0.04, 0);
  ridgeMesh.castShadow = true;
  group.add(ridgeMesh);

  return group;
}

/**
 * Creates a modern flat roof with perimeter parapet edge and gravel/tar center.
 */
export function createFlatRoof(
  width: number,
  depth: number,
  parapetHeight = 0.25,
  roofMat = 'roof_dark_slate'
): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'FlatRoof';

  // Flat roof surface
  const surfaceGeo = new THREE.BoxGeometry(width, 0.08, depth);
  const surfaceMesh = new THREE.Mesh(surfaceGeo, mats.get(roofMat));
  surfaceMesh.position.y = 0.04;
  surfaceMesh.receiveShadow = true;
  group.add(surfaceMesh);

  // Perimeter parapet walls
  const wallThick = 0.1;
  const halfW = width / 2;
  const halfD = depth / 2;

  // Front & Back parapet
  const fbGeo = new THREE.BoxGeometry(width, parapetHeight, wallThick);
  const frontParapet = new THREE.Mesh(fbGeo, mats.get('wall_cream'));
  frontParapet.position.set(0, parapetHeight / 2, halfD - wallThick / 2);
  frontParapet.castShadow = true;
  group.add(frontParapet);

  const backParapet = new THREE.Mesh(fbGeo, mats.get('wall_cream'));
  backParapet.position.set(0, parapetHeight / 2, -halfD + wallThick / 2);
  backParapet.castShadow = true;
  group.add(backParapet);

  // Left & Right parapet
  const lrGeo = new THREE.BoxGeometry(wallThick, parapetHeight, depth - wallThick * 2);
  const leftParapet = new THREE.Mesh(lrGeo, mats.get('wall_cream'));
  leftParapet.position.set(-halfW + wallThick / 2, parapetHeight / 2, 0);
  leftParapet.castShadow = true;
  group.add(leftParapet);

  const rightParapet = new THREE.Mesh(lrGeo, mats.get('wall_cream'));
  rightParapet.position.set(halfW - wallThick / 2, parapetHeight / 2, 0);
  rightParapet.castShadow = true;
  group.add(rightParapet);

  return group;
}
