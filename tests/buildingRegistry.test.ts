import { it, expect } from 'vitest';
import * as THREE from 'three';
import { BuildingRegistry } from '../src/buildings/BuildingRegistry';
import { BuildingFactory } from '../src/assets/BuildingFactory';
import { disposeBuilding } from '../src/assets/procedural/houses';

it('exposes only the eight ancient definitions, exact costs and four categories', () => {
  const registry = new BuildingRegistry();
  expect(registry.getAll().map(def => def.id)).toEqual(['town_center', 'primitive_house', 'farm', 'lumber_camp', 'stone_quarry', 'storage_hut', 'research_hut', 'dirt_road']);
  expect(registry.get('primitive_house')!.cost).toEqual({ wood: 30, stone: 10, food: 0, coins: 0 });
  expect(registry.get('research_hut')!.requiredWorkTicks).toBe(300);
  expect(registry.get('town_center')!.purchasable).toBe(false);
  for (const category of ['housing', 'production', 'infrastructure', 'community'] as const) expect(registry.getByCategory(category).length).toBeGreaterThan(0);
  expect(registry.get('small_house')).toBeUndefined();
  expect(Object.isFrozen(registry.get('farm')!.cost)).toBe(true);
});
it('renders all active ancient models and preview clones without changing shared materials', () => {
  for (const def of new BuildingRegistry().getAll()) {
    const model = BuildingFactory.createBuildingMesh(def.id), ghost = BuildingFactory.createGhostPreviewMesh(def.id);
    expect(model.children.length).toBeGreaterThan(0);
    ghost.traverse(child => { if (child instanceof THREE.Mesh) expect((child.material as THREE.Material).opacity).toBe(0.55); });
    disposeBuilding(model); disposeBuilding(ghost);
  }
});
