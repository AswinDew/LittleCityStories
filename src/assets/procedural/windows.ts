import * as THREE from 'three';
import { MaterialLibrary } from '../MaterialLibrary';

export function createWindow(
  width = 0.4,
  height = 0.5,
  depth = 0.04
): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'Window';

  // White window frame
  const frameGeo = new THREE.BoxGeometry(width, height, depth);
  const frameMesh = new THREE.Mesh(frameGeo, mats.get('window_frame'));
  group.add(frameMesh);

  // Reflective glass pane
  const glassGeo = new THREE.BoxGeometry(width * 0.8, height * 0.8, depth + 0.01);
  const glassMesh = new THREE.Mesh(glassGeo, mats.get('window_glass'));
  group.add(glassMesh);

  // Horizontal window divider
  const barGeo = new THREE.BoxGeometry(width * 0.8, 0.04, depth + 0.02);
  const barMesh = new THREE.Mesh(barGeo, mats.get('window_frame'));
  group.add(barMesh);

  return group;
}

export function createDoor(
  width = 0.45,
  height = 0.8,
  depth = 0.05
): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'Door';

  // Door leaf
  const leafGeo = new THREE.BoxGeometry(width, height, depth);
  const leafMesh = new THREE.Mesh(leafGeo, mats.get('door_wood'));
  leafMesh.position.y = height / 2;
  leafMesh.castShadow = true;
  group.add(leafMesh);

  // Outer frame trim
  const trimGeo = new THREE.BoxGeometry(width + 0.08, height + 0.04, depth - 0.01);
  const trimMesh = new THREE.Mesh(trimGeo, mats.get('trim_white'));
  trimMesh.position.y = (height + 0.04) / 2;
  group.add(trimMesh);

  // Door handle knob
  const knobGeo = new THREE.SphereGeometry(0.035, 6, 6);
  const knobMesh = new THREE.Mesh(knobGeo, mats.get('metal_black'));
  knobMesh.position.set(width * 0.32, height * 0.48, depth / 2 + 0.03);
  group.add(knobMesh);

  return group;
}

export function createChimney(
  height = 0.9,
  width = 0.28,
  depth = 0.28
): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'Chimney';

  const brickGeo = new THREE.BoxGeometry(width, height, depth);
  const brickMesh = new THREE.Mesh(brickGeo, mats.get('chimney_brick'));
  brickMesh.position.y = height / 2;
  brickMesh.castShadow = true;
  group.add(brickMesh);

  // Chimney cap rim
  const capGeo = new THREE.BoxGeometry(width + 0.08, 0.08, depth + 0.08);
  const capMesh = new THREE.Mesh(capGeo, mats.get('sidewalk_concrete'));
  capMesh.position.y = height + 0.04;
  capMesh.castShadow = true;
  group.add(capMesh);

  return group;
}

export function createPlanterBox(
  width = 0.5,
  height = 0.15,
  depth = 0.18
): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'PlanterBox';

  const boxGeo = new THREE.BoxGeometry(width, height, depth);
  const boxMesh = new THREE.Mesh(boxGeo, mats.get('trim_wood'));
  boxMesh.position.y = height / 2;
  group.add(boxMesh);

  // Flowers inside
  const flowerGeo = new THREE.SphereGeometry(0.06, 5, 5);
  for (let i = -1; i <= 1; i++) {
    const flower = new THREE.Mesh(flowerGeo, mats.get(i === 0 ? 'flower_yellow' : 'flower_pink'));
    flower.position.set(i * (width * 0.3), height + 0.04, 0);
    group.add(flower);
  }

  return group;
}
