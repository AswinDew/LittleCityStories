import { it, expect } from 'vitest';
import * as THREE from 'three';
import { SimulationSession } from '../src/simulation/SimulationSession';
import { SceneManager } from '../src/game/SceneManager';
import { ConstructionView } from '../src/construction/ConstructionView';
import { addWorker, economyFixture } from './helpers/economyFixture';

it.each([0, 1, 2, 3])('reveals a research interior through the camera-facing walls at rotation %s and restores it afterward', rotation => {
  const { state, building } = economyFixture('research_hut'); building.rotation = rotation;
  const worker = addWorker(state, building.instanceId);
  const scene = new SceneManager(), view = new ConstructionView(scene, state.config.metrics);
  view.sync(state);
  const model = scene.buildingsGroup.getObjectByName(building.instanceId)!;
  let checked = 0;
  model.traverse(part => {
    if (!part.userData.cutawayNormal) return;
    const { x, z } = part.userData.cutawayNormal, angle = rotation * Math.PI / 2;
    const facing = (x * Math.cos(angle) + z * Math.sin(angle)) + (-x * Math.sin(angle) + z * Math.cos(angle)) > 0.01;
    expect(part.visible).toBe(!facing); checked++;
  });
  expect(checked).toBeGreaterThanOrEqual(6);
  worker.room = null; view.sync(state);
  model.traverse(part => { if (part.userData.cutawayNormal) expect(part.visible).toBe(true); });
  view.dispose(); scene.dispose();
});

it('assembles the actual house continuously while retaining its meshes until completion', () => {
  const session = new SimulationSession({ environmentDensity: 0, startingPopulation: 0 });
  const placed = session.dispatch({ type: 'placeBuilding', defId: 'primitive_house', cell: { x: 12, z: 12 }, rotation: 0 });
  if (!placed.ok) throw new Error(placed.reason);
  const state = structuredClone(session.getSnapshot()), scene = new SceneManager(), view = new ConstructionView(scene, state.config.metrics);
  const site = state.buildings[placed.instanceId!]; site.status = 'under_construction';
  site.workTicks = 55; view.sync(state);
  const model = scene.buildingsGroup.getObjectByName(site.instanceId)!;
  const walls: THREE.Mesh[] = []; model.traverse(node => { if (node instanceof THREE.Mesh && node.userData.assembly === 'wall') walls.push(node); });
  expect(walls.length).toBeGreaterThan(0);
  const wall = walls[0], initialHeight = wall.scale.y;
  site.workTicks = 65; view.sync(state);
  expect(scene.buildingsGroup.getObjectByName(site.instanceId)).toBe(model); expect(wall.scale.y).toBeGreaterThan(initialHeight);
  site.workTicks = 120; view.sync(state);
  const roof: THREE.Object3D[] = []; model.traverse(node => { if (node.userData.assembly === 'roof' && node.visible) roof.push(node); });
  expect(roof.length).toBeGreaterThan(0);
  site.status = 'completed'; site.workTicks = 150; view.sync(state);
  expect(scene.buildingsGroup.getObjectByName(site.instanceId)).toBe(model);
  expect(model.userData.progress).toBe(1); expect(model.getObjectByName('construction-scaffold')!.visible).toBe(false);
  view.dispose(); scene.dispose();
});

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
