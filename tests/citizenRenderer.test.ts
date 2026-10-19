import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import manifest from '../public/generated/manifest.json';
import { SpriteAtlas } from '../src/assets/SpriteAtlas';
import { CitizenRenderer } from '../src/citizens/CitizenRenderer';
import { SimulationSession } from '../src/simulation/SimulationSession';
import { gridToWorld } from '../src/utils/coordinates';
import { CitizenSpriteView } from '../src/citizens/CitizenSpriteView';
import { citizenAtlasFixture } from './fixtures/citizenAtlas';

describe.each([32, 64] as const)('%spx citizen plane', size => {
  it('keeps the same world size and foot origin and samples the bottom atlas row', () => {
    const atlas = new SpriteAtlas(citizenAtlasFixture(size)), texture = new THREE.Texture();
    const view = new CitizenSpriteView(atlas, texture, 'builder', 'SW');
    try {
      view.sprite.geometry.computeBoundingBox();
      const bounds = view.sprite.geometry.boundingBox!;
      expect(bounds.min.toArray()).toEqual([-0.5, -1 / 16, 0]);
      expect(bounds.max.toArray()).toEqual([0.5, 15 / 16, 0]);
      expect(view.sprite.scale.toArray()).toEqual([2.2, 2.2, 1]);
      const clip = atlas.getClip('builder', 'SW', 'build');
      view.update('build', 0);
      const frame = view.update('build', clip.frameDurationMs * 5);
      expect(frame.y + frame.height).toBe(atlas.height);
      const map = view.sprite.material.map!;
      expect(map.repeat.toArray()).toEqual([1 / 16, 1 / 20]);
      expect(map.offset.toArray()).toEqual([frame.x / atlas.width, 0]);
      expect(map.magFilter).toBe(THREE.NearestFilter); expect(map.generateMipmaps).toBe(false);
    } finally { view.dispose(); texture.dispose(); }
  });
});

describe('snapshot-driven citizen planes', () => {
  it('hides residents indoors and reveals them at the doorway or when the home is demolished', () => {
    const session = new SimulationSession({ environmentDensity: 0, startingPopulation: 1 }); session.step(100);
    const state = structuredClone(session.getSnapshot()), id = Object.keys(state.citizens)[0];
    const group = new THREE.Group(), texture = new THREE.Texture(), camera = new THREE.PerspectiveCamera();
    const renderer = new CitizenRenderer(group, state.config.metrics, new SpriteAtlas(manifest.atlases.citizens), texture, camera);
    renderer.sync(state, state, 1); expect(group.getObjectByName(id)!.visible).toBe(false);
    state.citizens[id].room!.phase = 'leaving'; state.citizens[id].room!.hidden = false;
    renderer.sync(state, state, 1); expect(group.getObjectByName(id)!.visible).toBe(true);
    state.citizens[id].room!.hidden = true; delete state.buildings[state.citizens[id].room!.buildingId];
    renderer.sync(state, state, 1); expect(group.getObjectByName(id)!.visible).toBe(true);
    renderer.dispose();
  });
  it.each([32, 64].flatMap(size => [1, 2, 3].map(cellSize => ({ size: size as 32 | 64, cellSize }))))(
    'anchors vertical depth-tested planes at frame $size and cell size $cellSize', ({ size, cellSize }) => {
    const session = new SimulationSession({ environmentDensity: 0, metrics: { cellSize } });
    const before = session.getSnapshot(), current = structuredClone(before), id = Object.keys(before.citizens)[0];
    current.citizens[id].position.x += 1; current.citizens[id].direction = 'NW';
    const group = new THREE.Group(), texture = new THREE.Texture(), camera = new THREE.PerspectiveCamera(); camera.position.set(10, 10, 10); camera.lookAt(0, 0, 0);
    const sourceDispose = vi.spyOn(texture, 'dispose');
    const renderer = new CitizenRenderer(group, before.config.metrics, new SpriteAtlas(citizenAtlasFixture(size)), texture, camera);
    renderer.sync(before, current, 0.5);
    expect(group.children).toHaveLength(3);
    const plane = group.getObjectByName(id) as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    expect(plane).toBeInstanceOf(THREE.Mesh); expect(plane.rotation.x).toBe(0);
    expect(plane.material.depthTest).toBe(true); expect(plane.material.depthWrite).toBe(true); expect(plane.material.alphaTest).toBe(0.5);
    expect(plane.renderOrder).toBe(0); expect(plane.material.map!.magFilter).toBe(THREE.NearestFilter);
    const expected = gridToWorld(before.citizens[id].position.x, before.citizens[id].position.z, undefined, before.config.metrics);
    expected.x += cellSize * 0.5;
    expect(plane.position.x).toBeCloseTo(expected.x); expect(plane.position.z).toBeCloseTo(expected.z);
    expect(plane.scale.x).toBeCloseTo(1.1 * cellSize);
    const frame = { ...plane.material.map!.offset };
    renderer.sync(before, current, 0.5); expect({ ...plane.material.map!.offset }).toEqual(frame);
    delete current.citizens[id]; renderer.sync(before, current, 1); expect(group.children).toHaveLength(2);
    renderer.dispose(); renderer.dispose(); expect(group.children).toHaveLength(0); expect(sourceDispose).not.toHaveBeenCalled();
  });
});
