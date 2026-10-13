import { describe, it, expect } from 'vitest';
import { BuildingRegistry } from '../src/buildings/BuildingRegistry';
import { BuildingFactory } from '../src/assets/BuildingFactory';
import * as THREE from 'three';

describe('BuildingRegistry & 12 Procedural Building Models', () => {
  const registry = BuildingRegistry.getInstance();

  const expectedIds = [
    'road',
    'streetlight',
    'small_house',
    'family_house',
    'apartment',
    'shop',
    'bakery',
    'restaurant',
    'school',
    'clinic',
    'park',
    'tree',
  ];

  it('contains exactly all 12 complete building definitions', () => {
    const all = registry.getAll();
    expect(all.length).toBe(12);

    for (const id of expectedIds) {
      const def = registry.get(id);
      expect(def).toBeDefined();
      expect(def?.id).toBe(id);
      expect(def?.cost).toBeGreaterThan(0);
      expect(def?.footprint.width).toBeGreaterThanOrEqual(1);
      expect(def?.footprint.depth).toBeGreaterThanOrEqual(1);
    }
  });

  it('filters by each of the 5 categories accurately', () => {
    expect(registry.getByCategory('residential').length).toBe(3);
    expect(registry.getByCategory('commercial').length).toBe(3);
    expect(registry.getByCategory('municipal').length).toBe(2);
    expect(registry.getByCategory('nature').length).toBe(2);
    expect(registry.getByCategory('transport').length).toBe(2);
  });

  it('generates valid 3D procedural meshes for all 12 building types via BuildingFactory', () => {
    for (const id of expectedIds) {
      const mesh = BuildingFactory.createBuildingMesh(id, 1, 42);
      expect(mesh).toBeInstanceOf(THREE.Group);
      expect(mesh.children.length).toBeGreaterThan(0);
    }
  });

  it('generates semi-transparent ghost preview meshes for placement hovering', () => {
    for (const id of expectedIds) {
      const ghost = BuildingFactory.createGhostPreviewMesh(id);
      expect(ghost).toBeInstanceOf(THREE.Group);
      expect(ghost.name).toBe(`GhostPreview_${id}`);

      // Verify at least one child mesh has cloned semi-transparent material
      let foundTransparent = false;
      ghost.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.Material;
          if (mat && mat.transparent && mat.opacity === 0.55) {
            foundTransparent = true;
          }
        }
      });
      expect(foundTransparent).toBe(true);
    }
  });
});
