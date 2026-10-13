import * as THREE from 'three';
import { MaterialLibrary } from '../MaterialLibrary';
import { createBuildingFoundation, createWallBlock } from './walls';
import { createGableRoof, createFlatRoof } from './roofs';
import { createWindow, createDoor, createChimney, createPlanterBox } from './windows';
import { CELL_SIZE } from '@/utils/coordinates';

/**
 * Creates a 2-story Family Suburban House with front porch and attic dormer (1x1 footprint).
 */
export function createFamilyHouse(level = 1, seed = 0): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'FamilyHouse';

  const wallColors = ['wall_pastel_blue', 'wall_cream', 'wall_mint', 'wall_terracotta'];
  const roofColors = ['roof_slate_blue', 'roof_red_tile', 'roof_cedar', 'roof_moss'];

  const wallMat = wallColors[Math.abs(seed) % wallColors.length];
  const roofMat = roofColors[(Math.abs(seed) + 1) % roofColors.length];

  const w = 1.4;
  const d = 1.35;
  const groundFloorH = 0.9;
  const secondFloorH = 0.85 + (level - 1) * 0.15;
  const totalWallH = groundFloorH + secondFloorH;

  // 1. Foundation
  const foundation = createBuildingFoundation(1.6, 1.55, 0.12);
  group.add(foundation);

  // 2. Main 2-Story Wall
  const walls = createWallBlock(w, totalWallH, d, wallMat);
  walls.position.y = 0.12;
  group.add(walls);

  // 3. Mid-floor decorative horizontal belt course
  const trimGeo = new THREE.BoxGeometry(w + 0.06, 0.06, d + 0.06);
  const trimMesh = new THREE.Mesh(trimGeo, mats.get('trim_white'));
  trimMesh.position.y = 0.12 + groundFloorH;
  group.add(trimMesh);

  // 4. Pitched Gable Roof
  const roofH = 0.75;
  const roof = createGableRoof(w, d, roofH, 0.18, roofMat);
  roof.position.y = 0.12 + totalWallH;
  group.add(roof);

  // 5. Front Door & Porch
  const door = createDoor(0.4, 0.7);
  door.position.set(-0.3, 0.12, d / 2 + 0.02);
  group.add(door);

  const porchGeo = new THREE.BoxGeometry(0.65, 0.06, 0.25);
  const porch = new THREE.Mesh(porchGeo, mats.get('sidewalk_concrete'));
  porch.position.set(-0.3, 0.06, d / 2 + 0.14);
  porch.receiveShadow = true;
  group.add(porch);

  // 6. Ground Floor Window
  const win1 = createWindow(0.36, 0.44);
  win1.position.set(0.35, 0.12 + 0.45, d / 2 + 0.02);
  group.add(win1);

  // 7. Second Floor Windows
  const win2 = createWindow(0.32, 0.4);
  win2.position.set(-0.3, 0.12 + groundFloorH + 0.42, d / 2 + 0.02);
  group.add(win2);

  const win3 = createWindow(0.32, 0.4);
  win3.position.set(0.35, 0.12 + groundFloorH + 0.42, d / 2 + 0.02);
  group.add(win3);

  // 8. Chimney
  const chimney = createChimney(0.9);
  chimney.position.set(-0.35, 0.12 + totalWallH * 0.7, -0.2);
  group.add(chimney);

  // 9. Planter Box
  const planter = createPlanterBox(0.45, 0.12, 0.15);
  planter.position.set(0.35, 0.12 + 0.2, d / 2 + 0.08);
  group.add(planter);

  return group;
}

/**
 * Creates a 3-story Multi-Unit Apartment Building with balconies & flat roof (2x2 footprint).
 */
export function createApartment(level = 1, seed = 0): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'ApartmentBuilding';

  const aptWidth = CELL_SIZE * 2 - 0.7; // 3.3
  const aptDepth = CELL_SIZE * 2 - 0.7; // 3.3
  const aptHeight = 2.4 + (level - 1) * 0.3;

  // 1. Foundation Slab
  const foundation = createBuildingFoundation(aptWidth + 0.2, aptDepth + 0.2, 0.14);
  group.add(foundation);

  // 2. Brick Wall Body
  const wallColors = ['wall_brick', 'wall_terracotta', 'wall_cream'];
  const wallMat = wallColors[Math.abs(seed) % wallColors.length];
  const walls = createWallBlock(aptWidth, aptHeight, aptDepth, wallMat);
  walls.position.y = 0.14;
  group.add(walls);

  // 3. Flat Parapet Roof
  const roof = createFlatRoof(aptWidth, aptDepth, 0.25, 'roof_dark_slate');
  roof.position.y = 0.14 + aptHeight;
  group.add(roof);

  // 4. Rooftop Water Tower
  const towerTrunkGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 6);
  for (let i = -1; i <= 1; i += 2) {
    for (let j = -1; j <= 1; j += 2) {
      const leg = new THREE.Mesh(towerTrunkGeo, mats.get('metal_black'));
      leg.position.set(i * 0.25, 0.14 + aptHeight + 0.2, j * 0.25);
      group.add(leg);
    }
  }
  const tankGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.65, 12);
  const tankMesh = new THREE.Mesh(tankGeo, mats.get('wall_wood'));
  tankMesh.position.set(0, 0.14 + aptHeight + 0.72, 0);
  tankMesh.castShadow = true;
  group.add(tankMesh);

  // Tank conical cap
  const capGeo = new THREE.ConeGeometry(0.5, 0.25, 12);
  const capMesh = new THREE.Mesh(capGeo, mats.get('roof_slate_blue'));
  capMesh.position.set(0, 0.14 + aptHeight + 1.15, 0);
  group.add(capMesh);

  // 5. Entrance Double Door
  const doorL = createDoor(0.38, 0.85);
  doorL.position.set(-0.2, 0.14, aptDepth / 2 + 0.02);
  group.add(doorL);

  const doorR = createDoor(0.38, 0.85);
  doorR.position.set(0.2, 0.14, aptDepth / 2 + 0.02);
  group.add(doorR);

  // 6. Grid of Windows across 3 floors
  const floors = 3;
  const cols = 4;
  const colSpacing = aptWidth / (cols + 1);
  const floorSpacing = aptHeight / (floors + 0.2);

  for (let f = 0; f < floors; f++) {
    const yPos = 0.14 + 0.5 + f * floorSpacing;
    for (let c = 0; c < cols; c++) {
      const xPos = -aptWidth / 2 + (c + 1) * colSpacing;
      // Skip doorway on ground floor
      if (f === 0 && Math.abs(xPos) < 0.5) continue;

      const win = createWindow(0.38, 0.48);
      win.position.set(xPos, yPos, aptDepth / 2 + 0.02);
      group.add(win);
    }
  }

  // 7. Metal Balconies on 2nd and 3rd floors
  const balconyGeo = new THREE.BoxGeometry(0.85, 0.06, 0.25);
  const railGeo = new THREE.BoxGeometry(0.85, 0.2, 0.04);

  for (let f = 1; f < floors; f++) {
    const yPos = 0.14 + 0.22 + f * floorSpacing;
    const b1 = new THREE.Mesh(balconyGeo, mats.get('metal_black'));
    b1.position.set(-0.8, yPos, aptDepth / 2 + 0.12);
    group.add(b1);

    const r1 = new THREE.Mesh(railGeo, mats.get('metal_black'));
    r1.position.set(-0.8, yPos + 0.12, aptDepth / 2 + 0.23);
    group.add(r1);

    const b2 = new THREE.Mesh(balconyGeo, mats.get('metal_black'));
    b2.position.set(0.8, yPos, aptDepth / 2 + 0.12);
    group.add(b2);

    const r2 = new THREE.Mesh(railGeo, mats.get('metal_black'));
    r2.position.set(0.8, yPos + 0.12, aptDepth / 2 + 0.23);
    group.add(r2);
  }

  return group;
}
