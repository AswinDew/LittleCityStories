import * as THREE from 'three';
import { MaterialLibrary } from '../MaterialLibrary';
import { createBuildingFoundation, createWallBlock } from './walls';
import { createGableRoof } from './roofs';
import { createWindow, createDoor, createChimney, createPlanterBox } from './windows';

export function createSmallHouse(level = 1, seed = 0): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'SmallHouse';

  // Seed-based color variation (offset roof index to avoid lockstep pairing)
  const wallColors = ['wall_cream', 'wall_pastel_blue', 'wall_mint', 'wall_terracotta'];
  const roofColors = ['roof_red_tile', 'roof_slate_blue', 'roof_cedar', 'roof_moss'];

  const wallMat = wallColors[Math.abs(seed) % wallColors.length];
  const roofMat = roofColors[(Math.abs(seed) + 1) % roofColors.length];

  // Base dimensions (fits well inside 1x1 cell of 2.0x2.0)
  const houseWidth = 1.3;
  const houseDepth = 1.2;
  const houseHeight = 0.95 + (level - 1) * 0.15;

  // 1. Foundation
  const foundation = createBuildingFoundation(1.5, 1.4, 0.12);
  group.add(foundation);

  // 2. Main Wall Body
  const walls = createWallBlock(houseWidth, houseHeight, houseDepth, wallMat);
  walls.position.y = 0.12;
  group.add(walls);

  // 3. Gable Roof
  const roofHeight = 0.65 + (level >= 3 ? 0.1 : 0);
  const roof = createGableRoof(houseWidth, houseDepth, roofHeight, 0.16, roofMat);
  roof.position.y = 0.12 + houseHeight;
  group.add(roof);

  // 4. Front Door (Z positive is front)
  const door = createDoor(0.38, 0.65);
  door.position.set(-0.25, 0.12, houseDepth / 2 + 0.02);
  group.add(door);

  // Front Porch Step
  const stepGeo = new THREE.BoxGeometry(0.44, 0.06, 0.16);
  const stepMesh = new THREE.Mesh(stepGeo, mats.get('sidewalk_concrete'));
  stepMesh.position.set(-0.25, 0.06, houseDepth / 2 + 0.1);
  group.add(stepMesh);

  // 5. Front Window
  const frontWindow = createWindow(0.34, 0.42);
  frontWindow.position.set(0.32, 0.12 + 0.45, houseDepth / 2 + 0.02);
  group.add(frontWindow);

  // 6. Side Window
  const sideWindow = createWindow(0.32, 0.38);
  sideWindow.rotation.y = Math.PI / 2;
  sideWindow.position.set(houseWidth / 2 + 0.02, 0.12 + 0.45, 0);
  group.add(sideWindow);

  // 7. Chimney
  const chimney = createChimney(0.75);
  chimney.position.set(0.35, 0.12 + houseHeight * 0.7, -0.2);
  group.add(chimney);

  // Level 2+ Upgrades: Planter box, second window, enhanced details
  if (level >= 2) {
    const planter = createPlanterBox(0.4, 0.12, 0.14);
    planter.position.set(0.32, 0.12 + 0.18, houseDepth / 2 + 0.08);
    group.add(planter);

    // Small lantern by door
    const lanternGeo = new THREE.BoxGeometry(0.08, 0.12, 0.08);
    const lantern = new THREE.Mesh(lanternGeo, mats.get('lamp_light_warm'));
    lantern.position.set(-0.02, 0.12 + 0.55, houseDepth / 2 + 0.05);
    group.add(lantern);
  }

  // Level 3+ Upgrades: Attic dormer window, garden shrub
  if (level >= 3) {
    // Attic window on front gable
    const atticWindow = createWindow(0.24, 0.24);
    atticWindow.position.set(0, 0.12 + houseHeight + 0.24, houseDepth / 2 + 0.08);
    group.add(atticWindow);

    // Front yard decorative bush
    const bushGeo = new THREE.DodecahedronGeometry(0.16);
    const bush = new THREE.Mesh(bushGeo, mats.get('tree_canopy_light'));
    bush.position.set(0.55, 0.16, houseDepth / 2 + 0.12);
    bush.castShadow = true;
    group.add(bush);
  }

  return group;
}
