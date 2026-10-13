import * as THREE from 'three';
import { MaterialLibrary } from '../MaterialLibrary';
import { CELL_SIZE } from '@/utils/coordinates';

/**
 * Creates a charming 2x2 diorama park with walking paths, bench, flower beds, and an oak tree.
 */
export function createPark(_level = 1, seed = 0): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'NeighborhoodPark';

  const parkWidth = CELL_SIZE * 2 - 0.2; // 3.8
  const parkDepth = CELL_SIZE * 2 - 0.2; // 3.8
  const baseHeight = 0.08;

  // 1. Raised Park Turf Slab
  const turfGeo = new THREE.BoxGeometry(parkWidth, baseHeight, parkDepth);
  const turfMesh = new THREE.Mesh(turfGeo, mats.get('ground_grass'));
  turfMesh.position.y = baseHeight / 2;
  turfMesh.receiveShadow = true;
  group.add(turfMesh);

  // 2. Curving / Crossed Walking Paths
  const pathGeo = new THREE.BoxGeometry(0.65, 0.01, parkDepth * 0.9);
  const pathMesh = new THREE.Mesh(pathGeo, mats.get('park_path'));
  pathMesh.position.set(0.2, baseHeight + 0.005, 0);
  pathMesh.receiveShadow = true;
  group.add(pathMesh);

  // Cross Path
  const crossPathGeo = new THREE.BoxGeometry(parkWidth * 0.65, 0.01, 0.6);
  const crossPathMesh = new THREE.Mesh(crossPathGeo, mats.get('park_path'));
  crossPathMesh.position.set(0, baseHeight + 0.005, -0.3);
  crossPathMesh.receiveShadow = true;
  group.add(crossPathMesh);

  // 3. Centerpiece Oak Tree
  const treeGroup = new THREE.Group();
  treeGroup.name = 'ParkTree';

  // Tree Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.16, 1.1, 7);
  const trunkMesh = new THREE.Mesh(trunkGeo, mats.get('tree_trunk'));
  trunkMesh.position.y = baseHeight + 0.55;
  trunkMesh.castShadow = true;
  treeGroup.add(trunkMesh);

  // Layered Lush Foliage (3 tiered canopies)
  const canopy1Geo = new THREE.DodecahedronGeometry(0.65);
  const canopy1 = new THREE.Mesh(canopy1Geo, mats.get('tree_canopy_round'));
  canopy1.position.y = baseHeight + 1.25;
  canopy1.castShadow = true;
  treeGroup.add(canopy1);

  const canopy2Geo = new THREE.DodecahedronGeometry(0.5);
  const canopy2 = new THREE.Mesh(canopy2Geo, mats.get('tree_canopy_dark'));
  canopy2.position.set(0.2, baseHeight + 1.55, -0.1);
  canopy2.castShadow = true;
  treeGroup.add(canopy2);

  const canopy3Geo = new THREE.DodecahedronGeometry(0.45);
  const canopy3 = new THREE.Mesh(canopy3Geo, mats.get('tree_canopy_light'));
  canopy3.position.set(-0.2, baseHeight + 1.45, 0.15);
  canopy3.castShadow = true;
  treeGroup.add(canopy3);

  // Position tree off-center in park
  treeGroup.position.set(-0.9, 0, 0.7);
  group.add(treeGroup);

  // 4. Wooden Park Bench
  const benchGroup = new THREE.Group();
  benchGroup.name = 'ParkBench';

  const seatGeo = new THREE.BoxGeometry(0.65, 0.05, 0.22);
  const seatMesh = new THREE.Mesh(seatGeo, mats.get('park_bench_wood'));
  seatMesh.position.y = baseHeight + 0.22;
  seatMesh.castShadow = true;
  benchGroup.add(seatMesh);

  const backGeo = new THREE.BoxGeometry(0.65, 0.2, 0.04);
  const backMesh = new THREE.Mesh(backGeo, mats.get('park_bench_wood'));
  backMesh.position.set(0, baseHeight + 0.32, -0.1);
  backMesh.castShadow = true;
  benchGroup.add(backMesh);

  // Bench Metal Legs
  const legGeo = new THREE.BoxGeometry(0.06, 0.22, 0.22);
  const legMat = mats.get('metal_black');
  const legLeft = new THREE.Mesh(legGeo, legMat);
  legLeft.position.set(-0.26, baseHeight + 0.11, 0);
  legLeft.castShadow = true;
  benchGroup.add(legLeft);

  const legRight = new THREE.Mesh(legGeo, legMat);
  legRight.position.set(0.26, baseHeight + 0.11, 0);
  legRight.castShadow = true;
  benchGroup.add(legRight);

  benchGroup.position.set(0.9, 0, -0.3);
  benchGroup.rotation.y = -Math.PI / 2;
  group.add(benchGroup);

  // 5. Flower Beds
  const flowerBedGeo = new THREE.BoxGeometry(0.85, 0.12, 0.35);
  const flowerBed = new THREE.Mesh(flowerBedGeo, mats.get('trim_wood'));
  flowerBed.position.set(0.8, baseHeight + 0.06, 0.9);
  flowerBed.castShadow = true;
  group.add(flowerBed);

  const flowerGeo = new THREE.SphereGeometry(0.07, 5, 5);
  for (let i = -2; i <= 2; i++) {
    const flower = new THREE.Mesh(
      flowerGeo,
      mats.get((Math.abs(seed) + i) % 2 === 0 ? 'flower_yellow' : 'flower_pink')
    );
    flower.position.set(0.8 + i * 0.16, baseHeight + 0.15, 0.9 + (i % 2 === 0 ? 0.04 : -0.04));
    group.add(flower);
  }

  return group;
}
