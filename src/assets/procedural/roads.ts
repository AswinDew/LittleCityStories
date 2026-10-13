import * as THREE from 'three';
import { MaterialLibrary } from '../MaterialLibrary';
import { CELL_SIZE } from '@/utils/coordinates';

/**
 * Creates a cozy low-poly asphalt road tile with concrete curbs and center lane dashes.
 */
export function createRoadTile(): THREE.Group {
  const mats = MaterialLibrary.getInstance();
  const group = new THREE.Group();
  group.name = 'RoadTile';

  const width = CELL_SIZE; // 2.0
  const depth = CELL_SIZE; // 2.0
  const roadHeight = 0.04;

  // 1. Asphalt Road Surface
  const asphaltGeo = new THREE.BoxGeometry(width * 0.76, roadHeight, depth);
  const asphaltMesh = new THREE.Mesh(asphaltGeo, mats.get('road_asphalt'));
  asphaltMesh.position.y = roadHeight / 2;
  asphaltMesh.receiveShadow = true;
  group.add(asphaltMesh);

  // 2. Concrete Curbs / Sidewalks on Left & Right
  const curbWidth = width * 0.12;
  const curbGeo = new THREE.BoxGeometry(curbWidth, roadHeight + 0.02, depth);
  const curbMat = mats.get('sidewalk_concrete');

  const leftCurb = new THREE.Mesh(curbGeo, curbMat);
  leftCurb.position.set(-width / 2 + curbWidth / 2, (roadHeight + 0.02) / 2, 0);
  leftCurb.receiveShadow = true;
  group.add(leftCurb);

  const rightCurb = new THREE.Mesh(curbGeo, curbMat);
  rightCurb.position.set(width / 2 - curbWidth / 2, (roadHeight + 0.02) / 2, 0);
  rightCurb.receiveShadow = true;
  group.add(rightCurb);

  // 3. Center Painted Dashed Markings
  const dashCount = 2;
  const dashLength = 0.5;
  const dashWidth = 0.08;
  const dashGeo = new THREE.PlaneGeometry(dashWidth, dashLength);
  const markingMat = mats.get('road_marking_white');

  for (let i = 0; i < dashCount; i++) {
    const dash = new THREE.Mesh(dashGeo, markingMat);
    dash.rotation.x = -Math.PI / 2;
    // Position slightly above asphalt to avoid z-fighting
    dash.position.set(0, roadHeight + 0.005, (i - 0.5) * 1.0);
    group.add(dash);
  }

  return group;
}
