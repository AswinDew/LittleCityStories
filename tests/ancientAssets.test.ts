import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { BuildingFactory } from '../src/assets/BuildingFactory';
import { disposeBuilding } from '../src/assets/procedural/houses';
import { createAncientEnvironment } from '../src/assets/procedural/ancientEnvironment';
import { GeneratedAssetLoader } from '../src/assets/GeneratedAssetLoader';
import manifest from '../public/generated/manifest.json';

const footprints: Record<string, number> = { town_center: 3, primitive_house: 1, farm: 2, lumber_camp: 2,
  stone_quarry: 2, storage_hut: 2, research_hut: 2, dirt_road: 1 };

describe('ancient procedural asset catalog', () => {
  it.each(Object.entries(footprints))('%s has a distinct finite model inside its footprint', (id, tiles) => {
    const model = BuildingFactory.createBuildingMesh(id, 1, 42);
    expect(model.name).toBe(id);
    const meshes: THREE.Mesh[] = [];
    model.traverse(child => { if (child instanceof THREE.Mesh) meshes.push(child); });
    expect(meshes.length).toBeGreaterThan(0);
    for (const mesh of meshes) {
      expect(Array.from(mesh.geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true);
    }
    const box = new THREE.Box3().setFromObject(model);
    expect(box.min.y).toBeGreaterThanOrEqual(-0.001);
    expect(box.max.y).toBeGreaterThan(0);
    // Roof eaves remain within the logical footprint; no visual overhang exception needed.
    expect(Math.max(Math.abs(box.min.x), Math.abs(box.max.x))).toBeLessThanOrEqual(tiles + 0.001);
    expect(Math.max(Math.abs(box.min.z), Math.abs(box.max.z))).toBeLessThanOrEqual(tiles + 0.001);
    disposeBuilding(model);
  });

  it.each(['tree', 'bush', 'rock', 'grass', 'crop'] as const)('%s environment is finite and seeded', kind => {
    const a = createAncientEnvironment(kind, 42), b = createAncientEnvironment(kind, 42);
    expect(new THREE.Box3().setFromObject(a)).toEqual(new THREE.Box3().setFromObject(b));
    expect(a.children.length).toBeGreaterThan(0);
    disposeBuilding(a); disposeBuilding(b);
  });

  it('retains shared geometry until the last owner is released; preview owns material clones', () => {
    const a = BuildingFactory.createBuildingMesh('primitive_house');
    const b = BuildingFactory.createBuildingMesh('primitive_house');
    const first = a.children[0] as THREE.Mesh, second = b.children[0] as THREE.Mesh;
    expect(first.geometry).toBe(second.geometry);
    const dispose = vi.spyOn(first.geometry, 'dispose');
    const sharedMaterial = first.material as THREE.Material;
    const materialDispose = vi.spyOn(sharedMaterial, 'dispose');
    const ghost = BuildingFactory.createGhostPreviewMesh('primitive_house');
    const ghostMaterial = (ghost.children[0] as THREE.Mesh).material as THREE.Material;
    const ghostDispose = vi.spyOn(ghostMaterial, 'dispose');
    expect(ghostMaterial).not.toBe(sharedMaterial);
    disposeBuilding(a);
    expect(dispose).not.toHaveBeenCalled();
    disposeBuilding(b);
    expect(dispose).not.toHaveBeenCalled();
    disposeBuilding(ghost);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(ghostDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).not.toHaveBeenCalled();
    disposeBuilding(ghost);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});

describe('generated texture cache', () => {
  it('loads once, sets crisp color texture parameters and disposes owned textures', async () => {
    const texture = new THREE.Texture();
    const load = vi.fn(async () => texture);
    const loader = new GeneratedAssetLoader(load, async () => manifest);
    const [a, b] = await Promise.all([loader.load('terrain_grass'), loader.load('terrain_grass')]);
    expect(a).toBe(b); expect(load).toHaveBeenCalledTimes(1);
    expect(a.magFilter).toBe(THREE.NearestFilter);
    expect(a.minFilter).toBe(THREE.NearestFilter);
    expect(a.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(a.generateMipmaps).toBe(false);
    await expect(loader.load('missing')).rejects.toThrow();
    const dispose = vi.spyOn(texture, 'dispose');
    loader.dispose(); loader.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
  it('retries failed loads and disposes a texture that finishes after teardown', async () => {
    const texture = new THREE.Texture();
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(texture);
    const loader = new GeneratedAssetLoader(load, async () => manifest);
    await expect(loader.load('terrain_grass')).rejects.toThrow('offline');
    expect(await loader.load('terrain_grass')).toBe(texture);
    loader.dispose();
    const lateTexture = new THREE.Texture();
    let finish!: (value: THREE.Texture) => void;
    const lateLoader = new GeneratedAssetLoader(() => new Promise(resolve => { finish = resolve; }), async () => manifest);
    const pending = lateLoader.load('citizens');
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    const dispose = vi.spyOn(lateTexture, 'dispose');
    lateLoader.dispose(); finish(lateTexture);
    await expect(pending).rejects.toThrow('disposed');
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
