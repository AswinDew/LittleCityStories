import { it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { createAncientBuilding } from '../src/assets/procedural/ancientBuildings';
import { disposeBuilding } from '../src/assets/procedural/houses';
import { civicSkinUV, mapTownCenterUV, projectCivicBoxUV, TOWN_CENTER_SKIN_LAYOUT } from '../src/assets/TownCenterSkinLayout';

it('adds finite UVs to every civic vertex without changing approved shape or fallback colors', () => {
  const model = createAncientBuilding('town_center', 42);
  try {
    const hash = createHash('sha256');
    const meshes: THREE.Mesh[] = [];
    model.traverse(node => { if (node instanceof THREE.Mesh) meshes.push(node); });
    for (const mesh of meshes) {
      hash.update(mesh.name);
      for (const name of ['position', 'color']) {
        const array = mesh.geometry.getAttribute(name).array;
        hash.update(Buffer.from(array.buffer, array.byteOffset, array.byteLength));
      }
    }
    expect(hash.digest('hex')).toBe('faf118e5058f2026b84c8f2ab57fa339114409493c8e093b7d0cb9408d12acee');
    expect(meshes).toHaveLength(8);
    for (const mesh of meshes) {
      const uv = mesh.geometry.getAttribute('uv');
      expect(uv).toBeDefined();
      expect(uv.count).toBe(mesh.geometry.getAttribute('position').count);
      expect(Array.from(uv.array).every(v => Number.isFinite(v) && v > 0 && v < 1)).toBe(true);
      for (let i = 0; i < uv.count; i += 3) {
        const cell = (j: number) => `${Math.floor(uv.getX(j) * 8)}/${Math.floor((1 - uv.getY(j)) * 8)}`;
        expect(cell(i + 1)).toBe(cell(i)); expect(cell(i + 2)).toBe(cell(i));
      }
    }
  } finally { disposeBuilding(model); }
});

it('maps top-left raster coordinates to interior texel centers with one V flip', () => {
  expect(mapTownCenterUV([8, 8, 112, 112], 0, 0)).toEqual([8.5 / 1024, 1 - 8.5 / 1024]);
  expect(mapTownCenterUV([8, 8, 112, 112], 1, 1)).toEqual([119.5 / 1024, 1 - 119.5 / 1024]);
  expect(() => mapTownCenterUV([8, 8, 112, 112], -1, 0)).toThrow();
  expect(TOWN_CENTER_SKIN_LAYOUT.gutter).toBe(8);
});

it('keeps timber grain along the long local beam axis before rotation', () => {
  const front = { x: 0, y: 0, z: 1 };
  expect(projectCivicBoxUV({ x: 0.5, y: 0, z: 0.5 }, front, { x: 3, y: 0.1, z: 0.1 })[1]).toBe(0);
  expect(projectCivicBoxUV({ x: 0, y: 0.5, z: 0.5 }, front, { x: 0.1, y: 3, z: 0.1 })[1]).toBe(0);
});

it('keeps material texel density proportional to small physical pieces instead of repeating a full image per brick', () => {
  const normal = { x: 0, y: 0, z: 1 };
  const a = civicSkinUV('stone', normal, 0, 0, 42, { u: 0.5, v: 0.2 });
  const b = civicSkinUV('stone', normal, 1, 1, 42, { u: 0.5, v: 0.2 });
  expect((b[0] - a[0]) * 1024).toBeCloseTo(12);
  expect((a[1] - b[1]) * 1024).toBeCloseTo(4.8);
});
