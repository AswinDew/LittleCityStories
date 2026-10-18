import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import manifest from '../public/generated/manifest.json';
import { SpriteAtlas } from '../src/assets/SpriteAtlas';
import { CitizenRenderer } from '../src/citizens/CitizenRenderer';
import { SimulationSession } from '../src/simulation/SimulationSession';
import { gridToWorld } from '../src/utils/coordinates';

describe('snapshot-driven citizen planes', () => {
  it.each([1, 2, 3])('anchors vertical depth-tested planes and interpolates at cell size %s', cellSize => {
    const session = new SimulationSession({ environmentDensity: 0, metrics: { cellSize } });
    const before = session.getSnapshot(), current = structuredClone(before), id = Object.keys(before.citizens)[0];
    current.citizens[id].position.x += 1; current.citizens[id].direction = 'NW';
    const group = new THREE.Group(), texture = new THREE.Texture(), camera = new THREE.PerspectiveCamera(); camera.position.set(10, 10, 10); camera.lookAt(0, 0, 0);
    const sourceDispose = vi.spyOn(texture, 'dispose');
    const renderer = new CitizenRenderer(group, before.config.metrics, new SpriteAtlas(manifest.atlases.citizens), texture, camera);
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
