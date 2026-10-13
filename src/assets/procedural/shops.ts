import * as THREE from 'three';
import { MaterialLibrary } from '../MaterialLibrary';
import { createBuildingFoundation, createWallBlock } from './walls';
import { createFlatRoof } from './roofs';
import { createDoor } from './windows';

/**
 * Creates a charming storefront shop (e.g. bakery/market) with awning and display window.
 */
export function createShop(level = 1, seed = 0): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'CommercialShop';

  const wallColors = ['wall_brick', 'wall_cream', 'wall_mint', 'wall_terracotta'];
  const wallMat = wallColors[Math.abs(seed) % wallColors.length];

  const shopWidth = 1.4;
  const shopDepth = 1.3;
  const shopHeight = 1.1 + (level - 1) * 0.2;

  // 1. Concrete Foundation
  const foundation = createBuildingFoundation(1.6, 1.5, 0.12);
  group.add(foundation);

  // 2. Main Wall Body
  const walls = createWallBlock(shopWidth, shopHeight, shopDepth, wallMat);
  walls.position.y = 0.12;
  group.add(walls);

  // 3. Flat Parapet Roof
  const roof = createFlatRoof(shopWidth, shopDepth, 0.22, 'roof_slate_blue');
  roof.position.y = 0.12 + shopHeight;
  group.add(roof);

  // 4. Large Storefront Glass Display Window
  const windowWidth = 0.65;
  const windowHeight = 0.55;
  const winGeo = new THREE.BoxGeometry(windowWidth, windowHeight, 0.06);
  const winMesh = new THREE.Mesh(winGeo, mats.get('window_glass'));
  winMesh.position.set(0.3, 0.12 + 0.42, shopDepth / 2 + 0.02);
  group.add(winMesh);

  // Window Frame Border
  const frameGeo = new THREE.BoxGeometry(windowWidth + 0.06, windowHeight + 0.06, 0.04);
  const frameMesh = new THREE.Mesh(frameGeo, mats.get('window_frame'));
  frameMesh.position.set(0.3, 0.12 + 0.42, shopDepth / 2 + 0.01);
  group.add(frameMesh);

  // 5. Entrance Door
  const door = createDoor(0.42, 0.72);
  door.position.set(-0.35, 0.12, shopDepth / 2 + 0.02);
  group.add(door);

  // 6. Slanted Striped Commercial Awning
  const awningGroup = new THREE.Group();
  awningGroup.name = 'Awning';
  const awningWidth = 1.3;
  const awningDepth = 0.35;
  const awningThick = 0.04;
  const stripeCount = 6;
  const stripeWidth = awningWidth / stripeCount;

  for (let i = 0; i < stripeCount; i++) {
    const isRed = i % 2 === 0;
    const stripeGeo = new THREE.BoxGeometry(stripeWidth, awningThick, awningDepth);
    const stripeMat = isRed ? mats.get('awning_red') : mats.get('awning_blue');
    const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
    stripeMesh.position.x = -awningWidth / 2 + stripeWidth / 2 + i * stripeWidth;
    stripeMesh.castShadow = true;
    awningGroup.add(stripeMesh);
  }

  // Tilt awning downwards at 25 degrees
  awningGroup.rotation.x = THREE.MathUtils.degToRad(25);
  awningGroup.position.set(0, 0.12 + 0.78, shopDepth / 2 + 0.14);
  group.add(awningGroup);

  // 7. Store Sign Board
  const signGeo = new THREE.BoxGeometry(0.8, 0.16, 0.04);
  const signMesh = new THREE.Mesh(signGeo, mats.get('trim_wood'));
  signMesh.position.set(0, 0.12 + 0.95, shopDepth / 2 + 0.04);
  signMesh.castShadow = true;
  group.add(signMesh);

  // Level 2+ Upgrades: Rooftop Ventilation & Planter
  if (level >= 2) {
    const acGeo = new THREE.BoxGeometry(0.25, 0.2, 0.25);
    const acMesh = new THREE.Mesh(acGeo, mats.get('metal_black'));
    acMesh.position.set(0.35, 0.12 + shopHeight + 0.1, -0.2);
    acMesh.castShadow = true;
    group.add(acMesh);
  }

  return group;
}
