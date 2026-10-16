import { it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { WorldView } from '../src/game/WorldView';
import { SceneManager } from '../src/game/SceneManager';
import { SimulationSession } from '../src/simulation/SimulationSession';

it('reuses environment meshes, reconciles terrain and releases owned geometry', () => {
  const session = new SimulationSession({ environmentDensity: 0 });
  const snapshot = session.getSnapshot();
  const scene = new SceneManager(snapshot.config.metrics);
  const view = new WorldView(scene, snapshot.config.metrics);
  view.sync(snapshot);
  const first = [...scene.vegetationGroup.children];
  expect(first).toHaveLength(2);
  view.sync(snapshot);
  expect(scene.vegetationGroup.children).toEqual(first);
  session.dispatch({ type: 'setTerrain', cell: { x: 16, z: 16 }, terrain: 'water' });
  view.sync(session.getSnapshot());
  const tile = scene.terrainGroup.children[0] as THREE.Mesh;
  expect(tile.position.x).toBe(1);
  expect(tile.position.z).toBe(1);
  const dispose = vi.spyOn(tile.geometry, 'dispose');
  session.dispatch({ type: 'setTerrain', cell: { x: 16, z: 16 }, terrain: 'grass' });
  view.sync(session.getSnapshot());
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(scene.terrainGroup.children).toHaveLength(0);
  view.dispose();
  expect(scene.vegetationGroup.children).toHaveLength(0);
});
