import { it, expect } from 'vitest';
import * as THREE from 'three';
import { SimulationSession } from '../src/simulation/SimulationSession';
import { SceneManager } from '../src/game/SceneManager';
import { ConstructionView } from '../src/construction/ConstructionView';

it.each([1, 2, 3])('projects session-owned buildings and roads at cell size %s and removes canceled scaffolds', cellSize => {
  const session = new SimulationSession({ environmentDensity: 0, metrics: { cellSize } });
  const scene = new SceneManager(), view = new ConstructionView(scene, session.getSnapshot().config.metrics);
  const placed = session.dispatch({ type: 'placeBuilding', defId: 'farm', cell: { x: 12, z: 12 }, rotation: 1 });
  const road = session.dispatch({ type: 'placeRoad', cell: { x: 12, z: 14 } });
  if (!placed.ok || !road.ok) throw new Error('Fixture placement failed');
  view.sync(session.getSnapshot());
  expect(scene.buildingsGroup.children).toHaveLength(2);
  expect(scene.roadsGroup.children).toHaveLength(1);
  const scaffold = scene.buildingsGroup.getObjectByName(placed.instanceId!)!;
  expect(scaffold.userData.stage).toBe('planned');
  const bounds = new THREE.Box3().setFromObject(scene.roadsGroup.children[0]);
  expect(bounds.max.z - bounds.min.z).toBeCloseTo(cellSize - 0.04 * cellSize);
  view.sync(session.getSnapshot()); expect(scene.buildingsGroup.children).toHaveLength(2);
  session.dispatch({ type: 'cancelConstruction', instanceId: placed.instanceId! });
  view.sync(session.getSnapshot()); expect(scene.buildingsGroup.children).toHaveLength(1);
  view.dispose(); expect(scene.buildingsGroup.children).toHaveLength(0); expect(scene.roadsGroup.children).toHaveLength(0);
});
