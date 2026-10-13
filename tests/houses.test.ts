import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSmallHouse, disposeBuilding } from '../src/assets/procedural/houses';
import { MaterialLibrary } from '../src/assets/MaterialLibrary';
import * as THREE from 'three';

describe('Procedural House Engine', () => {
  beforeEach(() => {
    MaterialLibrary.getInstance().dispose();
  });

  afterEach(() => {
    MaterialLibrary.getInstance().dispose();
  });

  it('creates Level 1 small house with standard architectural elements', () => {
    const house = createSmallHouse(1, 42);
    expect(house).toBeInstanceOf(THREE.Group);
    expect(house.name).toBe('SmallHouse');

    const childrenNames = house.children.map((c) => c.name);
    expect(childrenNames).toContain('GableRoof');
    expect(childrenNames).toContain('Door');
    expect(childrenNames).toContain('Chimney');
  });

  it('adds Level 2 upgrades (planter box)', () => {
    const houseL1 = createSmallHouse(1, 0);
    const houseL2 = createSmallHouse(2, 0);

    const l1Names = houseL1.children.map((c) => c.name);
    const l2Names = houseL2.children.map((c) => c.name);

    expect(l1Names).not.toContain('PlanterBox');
    expect(l2Names).toContain('PlanterBox');
  });

  it('adds Level 3 upgrades (attic window & garden shrub)', () => {
    const houseL3 = createSmallHouse(3, 0);
    // Level 3 should have more child meshes than Level 1
    const houseL1 = createSmallHouse(1, 0);
    expect(houseL3.children.length).toBeGreaterThan(houseL1.children.length);
  });

  it('disposes building geometries cleanly via disposeBuilding()', () => {
    const house = createSmallHouse(2, 10);
    const disposedGeometries: THREE.BufferGeometry[] = [];

    house.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const origDispose = child.geometry.dispose.bind(child.geometry);
        child.geometry.dispose = () => {
          disposedGeometries.push(child.geometry);
          origDispose();
        };
      }
    });

    expect(disposedGeometries.length).toBe(0);
    disposeBuilding(house);
    expect(disposedGeometries.length).toBeGreaterThan(5);

    // Verify MaterialLibrary is untouched
    const mats = MaterialLibrary.getInstance();
    expect(mats.get('wall_cream')).toBeDefined();
  });
});
