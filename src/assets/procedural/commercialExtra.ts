import * as THREE from 'three';
import { MaterialLibrary } from '../MaterialLibrary';
import { createBuildingFoundation, createWallBlock } from './walls';
import { createGableRoof, createFlatRoof } from './roofs';
import { createWindow, createDoor, createChimney } from './windows';
import { CELL_SIZE } from '@/utils/coordinates';

/**
 * Creates a cozy 1x1 Artisan Bakery with bread chimney and pastry display.
 */
export function createBakery(_level = 1, seed = 0): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'Bakery';

  const w = 1.35;
  const d = 1.3;
  const h = 1.05;

  // 1. Foundation
  const foundation = createBuildingFoundation(1.55, 1.5, 0.12);
  group.add(foundation);

  // 2. Terracotta or Cream Walls
  const wallMat = seed % 2 === 0 ? 'wall_terracotta' : 'wall_cream';
  const walls = createWallBlock(w, h, d, wallMat);
  walls.position.y = 0.12;
  group.add(walls);

  // 3. Tile Gable Roof
  const roof = createGableRoof(w, d, 0.7, 0.16, 'roof_red_tile');
  roof.position.y = 0.12 + h;
  group.add(roof);

  // 4. Wood Bakery Door & Display Window
  const door = createDoor(0.4, 0.7);
  door.position.set(-0.3, 0.12, d / 2 + 0.02);
  group.add(door);

  const win = createWindow(0.45, 0.5);
  win.position.set(0.32, 0.12 + 0.45, d / 2 + 0.02);
  group.add(win);

  // 5. Oven Stone Chimney
  const chimney = createChimney(0.9, 0.35, 0.35);
  chimney.position.set(-0.35, 0.12 + h * 0.7, -0.25);
  group.add(chimney);

  // 6. Bakery Sign
  const signGeo = new THREE.BoxGeometry(0.7, 0.15, 0.04);
  const signMesh = new THREE.Mesh(signGeo, mats.get('trim_wood'));
  signMesh.position.set(0, 0.12 + 0.9, d / 2 + 0.03);
  group.add(signMesh);

  return group;
}

/**
 * Creates an attractive 2x2 Bistro Restaurant with outdoor dining patio and umbrellas.
 */
export function createRestaurant(_level = 1, _seed = 0): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'Restaurant';

  const w = CELL_SIZE * 2 - 0.7; // 3.3
  const d = CELL_SIZE * 2 - 0.7; // 3.3
  const buildingW = 2.1;
  const buildingD = 2.4;
  const buildingH = 1.35;

  // 1. Full 2x2 Patio Foundation Deck
  const deckGeo = new THREE.BoxGeometry(w, 0.1, d);
  const deckMesh = new THREE.Mesh(deckGeo, mats.get('wall_wood'));
  deckMesh.position.y = 0.05;
  deckMesh.receiveShadow = true;
  group.add(deckMesh);

  // 2. Main Restaurant Building (positioned back-left)
  const walls = createWallBlock(buildingW, buildingH, buildingD, 'wall_cream');
  walls.position.set(-w / 2 + buildingW / 2 + 0.1, 0.1 + buildingH / 2, -d / 2 + buildingD / 2 + 0.1);
  group.add(walls);

  // Flat Roof
  const roof = createFlatRoof(buildingW, buildingD, 0.22, 'roof_slate_blue');
  roof.position.set(-w / 2 + buildingW / 2 + 0.1, 0.1 + buildingH, -d / 2 + buildingD / 2 + 0.1);
  group.add(roof);

  // Entrance Door
  const door = createDoor(0.42, 0.75);
  door.position.set(-0.3, 0.1, -d / 2 + buildingD + 0.12);
  group.add(door);

  // 3. Outdoor Dining Terrace (front and right area)
  // Add 2 Bistro Tables with Umbrellas
  const tablePositions = [
    { x: 0.8, z: -0.4 },
    { x: 0.6, z: 0.7 },
  ];

  for (const pos of tablePositions) {
    // Table Pole & Top
    const tableTopGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.04, 10);
    const tableTop = new THREE.Mesh(tableTopGeo, mats.get('trim_white'));
    tableTop.position.set(pos.x, 0.1 + 0.35, pos.z);
    tableTop.castShadow = true;
    group.add(tableTop);

    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6);
    const leg = new THREE.Mesh(legGeo, mats.get('metal_black'));
    leg.position.set(pos.x, 0.1 + 0.175, pos.z);
    group.add(leg);

    // Large Patio Umbrella
    const umbrellaPoleGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.3, 6);
    const umbrellaPole = new THREE.Mesh(umbrellaPoleGeo, mats.get('metal_black'));
    umbrellaPole.position.set(pos.x, 0.1 + 0.65, pos.z);
    group.add(umbrellaPole);

    const canopyGeo = new THREE.ConeGeometry(0.65, 0.32, 8);
    const canopy = new THREE.Mesh(canopyGeo, mats.get('umbrella_yellow'));
    canopy.position.set(pos.x, 0.1 + 1.25, pos.z);
    canopy.castShadow = true;
    group.add(canopy);
  }

  // 4. Perimeter Terrace Railing
  const railGeo = new THREE.BoxGeometry(0.04, 0.32, d * 0.5);
  const rail = new THREE.Mesh(railGeo, mats.get('metal_black'));
  rail.position.set(w / 2 - 0.05, 0.1 + 0.16, 0.4);
  group.add(rail);

  return group;
}
