import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createAncientBuilding } from '../src/assets/procedural/ancientBuildings';
import { disposeBuilding } from '../src/assets/procedural/houses';

describe('Stitch architecture adaptation', () => {
  it('keeps the civic entry open across its usable width and shares detailed geometry safely', () => {
    const hall = createAncientBuilding('town_center', 42);
    const second = createAncientBuilding('town_center', 42);
    hall.updateMatrixWorld(true);
    try {
      for (const x of [-0.4, 0, 0.4]) {
        const ray = new THREE.Raycaster(new THREE.Vector3(x, 1.2, 2.1), new THREE.Vector3(0, 0, -1), 0, 1.15);
        expect(ray.intersectObject(hall, true)).toHaveLength(0);
      }
      const meshes: THREE.Mesh[] = [];
      hall.traverse(node => { if (node instanceof THREE.Mesh) meshes.push(node); });
      // Rich static detailing must remain batched, rather than hundreds of draw calls.
      expect(meshes.length).toBeLessThanOrEqual(24);
      const peer = second.getObjectByName(meshes[0].name) as THREE.Mesh;
      expect(peer.geometry).toBe(meshes[0].geometry);
      const released = vi.spyOn(meshes[0].geometry, 'dispose');
      disposeBuilding(hall);
      expect(released).not.toHaveBeenCalled();
      disposeBuilding(second);
      expect(released).toHaveBeenCalledTimes(1);
    } finally { disposeBuilding(hall); disposeBuilding(second); }
  });
  it('has citizen-scale open doorways and distinct timber/stone civic massing', () => {
    const house = createAncientBuilding('primitive_house', 42);
    const hall = createAncientBuilding('town_center', 42);
    expect(new THREE.Box3().setFromObject(house).max.y).toBeGreaterThan(2.6);
    expect(new THREE.Box3().setFromObject(hall).max.y).toBeGreaterThan(3.5);
    // The front portal must actually remain open at torso height.
    house.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 1.1, 1.3), new THREE.Vector3(0, 0, -1), 0, 0.8);
    expect(ray.intersectObject(house, true)).toHaveLength(0);
    disposeBuilding(house); disposeBuilding(hall);
  });
  it('keeps the lumber work area open beneath a post-supported shelter', () => {
    const camp = createAncientBuilding('lumber_camp', 42);
    camp.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(-0.7, 1, 1.3), new THREE.Vector3(0, 0, -1), 0, 2);
    expect(ray.intersectObject(camp, true)).toHaveLength(0);
    disposeBuilding(camp);
  });
});
