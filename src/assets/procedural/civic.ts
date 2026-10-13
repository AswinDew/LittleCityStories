import * as THREE from 'three';
import { MaterialLibrary } from '../MaterialLibrary';
import { createBuildingFoundation, createWallBlock } from './walls';
import { createFlatRoof, createGableRoof } from './roofs';
import { createWindow, createDoor } from './windows';
import { CELL_SIZE } from '@/utils/coordinates';

/**
 * Creates a charming 2x2 Municipal School with bell tower cupola and classroom wings.
 */
export function createSchool(_level = 1, _seed = 0): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'School';

  const w = CELL_SIZE * 2 - 0.6; // 3.4
  const d = CELL_SIZE * 2 - 0.8; // 3.2
  const schoolH = 1.6;

  // 1. Foundation Slab
  const foundation = createBuildingFoundation(w + 0.2, d + 0.2, 0.15);
  group.add(foundation);

  // 2. Brick School Walls
  const walls = createWallBlock(w, schoolH, d, 'wall_brick');
  walls.position.y = 0.15;
  group.add(walls);

  // 3. Central Gable Roof with White Trim
  const roof = createGableRoof(w, d, 0.9, 0.18, 'roof_slate_blue');
  roof.position.y = 0.15 + schoolH;
  group.add(roof);

  // 4. Central Bell Tower Cupola
  const cupolaW = 0.7;
  const cupolaH = 0.8;
  const cupolaBaseGeo = new THREE.BoxGeometry(cupolaW, cupolaH, cupolaW);
  const cupolaBase = new THREE.Mesh(cupolaBaseGeo, mats.get('wall_cream'));
  cupolaBase.position.set(0, 0.15 + schoolH + 0.7, 0);
  cupolaBase.castShadow = true;
  group.add(cupolaBase);

  // Cupola Copper Roof / Dome
  const domeGeo = new THREE.ConeGeometry(0.55, 0.5, 8);
  const domeMesh = new THREE.Mesh(domeGeo, mats.get('cupola_copper'));
  domeMesh.position.set(0, 0.15 + schoolH + 0.7 + cupolaH / 2 + 0.25, 0);
  domeMesh.castShadow = true;
  group.add(domeMesh);

  // School Clock Face
  const clockGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 12);
  const clockMesh = new THREE.Mesh(clockGeo, mats.get('trim_white'));
  clockMesh.rotation.x = Math.PI / 2;
  clockMesh.position.set(0, 0.15 + schoolH + 0.7, cupolaW / 2 + 0.03);
  group.add(clockMesh);

  // 5. Entrance Grand Double Door
  const doorL = createDoor(0.42, 0.9);
  doorL.position.set(-0.23, 0.15, d / 2 + 0.02);
  group.add(doorL);

  const doorR = createDoor(0.42, 0.9);
  doorR.position.set(0.23, 0.15, d / 2 + 0.02);
  group.add(doorR);

  // Entrance Staircase Steps
  const step1Geo = new THREE.BoxGeometry(1.2, 0.08, 0.4);
  const step1 = new THREE.Mesh(step1Geo, mats.get('sidewalk_concrete'));
  step1.position.set(0, 0.04, d / 2 + 0.2);
  step1.receiveShadow = true;
  group.add(step1);

  // 6. Symmetrical Classroom Windows (2 wings)
  for (let wing of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const xPos = wing * (0.85 + i * 0.6);
      const win = createWindow(0.38, 0.52);
      win.position.set(xPos, 0.15 + 0.75, d / 2 + 0.02);
      group.add(win);
    }
  }

  return group;
}

/**
 * Creates a clean 2x2 Medical Clinic with ambulance bay and red cross emblem.
 */
export function createClinic(_level = 1, _seed = 0): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'Clinic';

  const w = CELL_SIZE * 2 - 0.7; // 3.3
  const d = CELL_SIZE * 2 - 0.7; // 3.3
  const clinicH = 1.45;

  // 1. Foundation
  const foundation = createBuildingFoundation(w + 0.2, d + 0.2, 0.14);
  group.add(foundation);

  // 2. White Medical Walls
  const walls = createWallBlock(w, clinicH, d, 'wall_white');
  walls.position.y = 0.14;
  group.add(walls);

  // 3. Modern Flat Parapet Roof
  const roof = createFlatRoof(w, d, 0.2, 'roof_slate_blue');
  roof.position.y = 0.14 + clinicH;
  group.add(roof);

  // 4. Red Cross Emblem on Facade
  const crossVGeo = new THREE.BoxGeometry(0.12, 0.45, 0.04);
  const crossHGeo = new THREE.BoxGeometry(0.45, 0.12, 0.04);
  const crossV = new THREE.Mesh(crossVGeo, mats.get('cross_red'));
  const crossH = new THREE.Mesh(crossHGeo, mats.get('cross_red'));
  crossV.position.set(0.65, 0.14 + clinicH - 0.35, d / 2 + 0.03);
  crossH.position.set(0.65, 0.14 + clinicH - 0.35, d / 2 + 0.03);
  group.add(crossV);
  group.add(crossH);

  // 5. Emergency Bay Overhang Canopy
  const canopyGeo = new THREE.BoxGeometry(1.6, 0.08, 0.85);
  const canopy = new THREE.Mesh(canopyGeo, mats.get('wall_cream'));
  canopy.position.set(-0.65, 0.14 + 0.95, d / 2 + 0.42);
  canopy.castShadow = true;
  group.add(canopy);

  // Canopy Support Columns
  const colGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.95, 6);
  const colL = new THREE.Mesh(colGeo, mats.get('metal_black'));
  colL.position.set(-1.35, 0.14 + 0.47, d / 2 + 0.75);
  group.add(colL);

  const colR = new THREE.Mesh(colGeo, mats.get('metal_black'));
  colR.position.set(0.05, 0.14 + 0.47, d / 2 + 0.75);
  group.add(colR);

  // 6. Sliding Glass Entrance Doors
  const doorGeo = new THREE.BoxGeometry(0.75, 0.82, 0.06);
  const doorMesh = new THREE.Mesh(doorGeo, mats.get('window_glass'));
  doorMesh.position.set(-0.65, 0.14 + 0.41, d / 2 + 0.02);
  group.add(doorMesh);

  // 7. Clinical Ribbon Windows
  for (let i = 0; i < 2; i++) {
    const win = createWindow(0.5, 0.45);
    win.position.set(0.4 + i * 0.65, 0.14 + 0.5, d / 2 + 0.02);
    group.add(win);
  }

  return group;
}
