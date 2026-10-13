import * as THREE from 'three';
import { MaterialLibrary } from '../MaterialLibrary';

/**
 * Creates a standalone decorative shade tree with low-poly tiered foliage.
 */
export function createShadeTree(seed = 0): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'ShadeTree';

  // Small circular mulch/grass base
  const baseGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.05, 8);
  const baseMesh = new THREE.Mesh(baseGeo, mats.get('park_path'));
  baseMesh.position.y = 0.025;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Organic Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.2, 7);
  const trunkMesh = new THREE.Mesh(trunkGeo, mats.get('tree_trunk'));
  trunkMesh.position.y = 0.6;
  trunkMesh.castShadow = true;
  group.add(trunkMesh);

  // Canopy Variations (Round vs Pine/Cone based on seed)
  const isRound = seed % 2 === 0;

  if (isRound) {
    const mainCanopyGeo = new THREE.DodecahedronGeometry(0.75);
    const mainCanopy = new THREE.Mesh(mainCanopyGeo, mats.get('tree_canopy_round'));
    mainCanopy.position.y = 1.45;
    mainCanopy.castShadow = true;
    group.add(mainCanopy);

    const topCanopyGeo = new THREE.DodecahedronGeometry(0.55);
    const topCanopy = new THREE.Mesh(topCanopyGeo, mats.get('tree_canopy_light'));
    topCanopy.position.set(0.1, 1.85, -0.05);
    topCanopy.castShadow = true;
    group.add(topCanopy);
  } else {
    // Pine/Fir tiered cones
    const tiers = [
      { r: 0.75, h: 0.7, y: 1.1 },
      { r: 0.6, h: 0.6, y: 1.5 },
      { r: 0.45, h: 0.5, y: 1.85 },
    ];
    for (const t of tiers) {
      const coneGeo = new THREE.ConeGeometry(t.r, t.h, 7);
      const coneMesh = new THREE.Mesh(coneGeo, mats.get('tree_canopy_dark'));
      coneMesh.position.y = t.y;
      coneMesh.castShadow = true;
      group.add(coneMesh);
    }
  }

  return group;
}

/**
 * Creates a vintage Victorian cast-iron streetlight with warm glowing lantern.
 */
export function createStreetlight(): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'Streetlight';

  // Base mount pedestal
  const baseGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.15, 8);
  const baseMesh = new THREE.Mesh(baseGeo, mats.get('metal_black'));
  baseMesh.position.y = 0.075;
  group.add(baseMesh);

  // Slender Cast-Iron Pole
  const poleGeo = new THREE.CylinderGeometry(0.045, 0.06, 1.8, 8);
  const poleMesh = new THREE.Mesh(poleGeo, mats.get('metal_black'));
  poleMesh.position.y = 0.95;
  poleMesh.castShadow = true;
  group.add(poleMesh);

  // Decorative Cross Arm
  const armGeo = new THREE.BoxGeometry(0.5, 0.04, 0.04);
  const armMesh = new THREE.Mesh(armGeo, mats.get('metal_black'));
  armMesh.position.y = 1.65;
  group.add(armMesh);

  // Lantern Housing Cap
  const capGeo = new THREE.ConeGeometry(0.16, 0.14, 6);
  const capMesh = new THREE.Mesh(capGeo, mats.get('metal_black'));
  capMesh.position.y = 1.95;
  group.add(capMesh);

  // Warm Glowing Lantern Bulb
  const bulbGeo = new THREE.BoxGeometry(0.14, 0.18, 0.14);
  const bulbMesh = new THREE.Mesh(bulbGeo, mats.get('lamp_light_warm'));
  bulbMesh.position.y = 1.82;
  group.add(bulbMesh);

  return group;
}
