import { describe, it, expect } from 'vitest';
import { SimulationSession } from '../src/simulation/SimulationSession';
import { BuildingRegistry } from '../src/buildings/BuildingRegistry';
import { ConstructionSystem } from '../src/construction/ConstructionSystem';
import type { SimulationState } from '../src/simulation/types';
import { GridSystem } from '../src/world/GridSystem';
import type { GameCommand } from '../src/simulation/commands';

const create = () => new SimulationSession({ environmentDensity: 0 });
const place = (session: SimulationSession, x = 12, z = 12, defId = 'primitive_house', rotation = 0) =>
  session.dispatch({ type: 'placeBuilding', defId, cell: { x, z }, rotation });

describe('authoritative construction commands', () => {
  it('bootstraps one completed Town Center, resources and reserved occupancy', () => {
    const state = create().getSnapshot(), town = Object.values(state.buildings)[0];
    expect(Object.keys(state.buildings)).toHaveLength(1);
    expect(town.defId).toBe('town_center'); expect(town.status).toBe('completed');
    expect(state.resources).toEqual({ wood: 160, stone: 100, food: 90, coins: 50 });
    expect(state.capacity.wood).toBe(300);
    expect(state.world.grid[town.gridX][town.gridZ].buildingId).toBe(town.instanceId);
  });
  it('spends atomically, reserves a planned footprint, and never invents builder work', () => {
    const session = create();
    expect(place(session).ok).toBe(true);
    const snapshot = session.getSnapshot();
    expect(snapshot.resources.wood).toBe(130); expect(snapshot.resources.stone).toBe(90);
    expect(snapshot.world.grid[12][12].buildingId).toBeTruthy();
    session.step(10000);
    const site = Object.values(session.getSnapshot().buildings).find(b => b.defId === 'primitive_house')!;
    expect(site.status).toBe('planned'); expect(site.workTicks).toBe(0);
  });
  it.each([
    { type: 'placeBuilding', defId: 'primitive_house', cell: { x: -1, z: 12 }, rotation: 0 },
    { type: 'placeBuilding', defId: 'farm', cell: { x: 31, z: 31 }, rotation: 0 },
    { type: 'placeBuilding', defId: 'primitive_house', cell: { x: 15, z: 15 }, rotation: 0 },
    { type: 'placeBuilding', defId: 'primitive_house', cell: { x: 11, z: 16 }, rotation: 0 },
    { type: 'placeBuilding', defId: 'primitive_house', cell: { x: 12.5, z: 12 }, rotation: 0 },
    { type: 'placeBuilding', defId: 'primitive_house', cell: { x: 12, z: 12 }, rotation: 5 },
    { type: 'placeBuilding', defId: 'small_house', cell: { x: 12, z: 12 }, rotation: 0 },
    { type: 'placeBuilding', defId: 'town_center', cell: { x: 12, z: 12 }, rotation: 0 },
  ])('rejects invalid placement with no state changes: %o', command => {
    const session = create(), before = session.getSnapshot();
    expect(session.dispatch(command as GameCommand).ok).toBe(false);
    expect(session.getSnapshot()).toEqual(before);
  });
  it('rejects shortage, water, its blocked entrance, and construction over another entrance', () => {
    const poor = new SimulationSession({ environmentDensity: 0, startingResources: { stone: 9 } });
    const before = poor.getSnapshot(); expect(place(poor).ok).toBe(false); expect(poor.getSnapshot()).toEqual(before);
    const session = create();
    session.dispatch({ type: 'setTerrain', cell: { x: 12, z: 13 }, terrain: 'water' });
    const wet = session.getSnapshot(); expect(place(session).ok).toBe(false); expect(session.getSnapshot()).toEqual(wet);
    expect(place(session, 12, 13, 'dirt_road').ok).toBe(false);
    expect(place(session, 16, 18).ok).toBe(false); // Town Center entrance
    expect(place(session, 16, 18, 'dirt_road').ok).toBe(true); // roads keep entrances walkable
  });
  it('clears environment without free resources and protects Town Center from cancel/demolition', () => {
    const session = create(), before = session.getSnapshot(), source = before.world.environment[0];
    expect(session.dispatch({ type: 'clearEnvironment', environmentId: source.id }).ok).toBe(true);
    expect(session.getSnapshot().resources).toEqual(before.resources);
    expect(session.getSnapshot().world.grid[source.x][source.z].canBuild).toBe(true);
    const id = Object.keys(before.buildings)[0];
    expect(session.dispatch({ type: 'demolishBuilding', instanceId: id }).ok).toBe(false);
    expect(session.dispatch({ type: 'cancelConstruction', instanceId: id }).ok).toBe(false);
  });
  it('rejects a locked definition atomically', () => {
    const registry = new BuildingRegistry();
    registry.register({ ...registry.get('primitive_house')!, unlockedBy: 'masonry' });
    const session = new SimulationSession({ environmentDensity: 0 }, registry), before = session.getSnapshot();
    expect(place(session)).toEqual({ ok: false, reason: 'locked' });
    expect(session.getSnapshot()).toEqual(before);
  });
  it('rotates a rectangular footprint and entrance and rejects occupied citizen cells', () => {
    const registry = new BuildingRegistry();
    registry.register({ ...registry.get('primitive_house')!, id: 'test_shed', footprint: { width: 2, depth: 1 }, entrance: { x: 0, z: 1 } });
    const session = new SimulationSession({ environmentDensity: 0 }, registry);
    expect(place(session, 12, 12, 'test_shed', 1).ok).toBe(true);
    const building = Object.values(session.getSnapshot().buildings).find(b => b.defId === 'test_shed')!;
    expect(building.footprint).toEqual({ width: 1, depth: 2 });
    expect(building.entrance).toEqual({ x: 13, z: 13 });
    const state = structuredClone(create().getSnapshot()) as SimulationState;
    state.citizens.c1 = { id: 'c1', name: 'Ari', occupation: 'villager', homeId: null, workplaceId: null,
      activity: 'idle', position: { x: 12, z: 12 }, destination: null, animationState: 'idle',
      pathProgress: 0, hungry: false, activityTicks: 0 };
    const grid = new GridSystem(32); grid.deserialize(state.world.grid);
    const system = new ConstructionSystem(grid, BuildingRegistry.getInstance(), () => ({ id: 'b-test', seed: 1, placedAt: 0 }));
    const before = structuredClone(state);
    expect(system.place({ type: 'placeBuilding', defId: 'primitive_house', cell: { x: 12, z: 12 }, rotation: 0 }, state)).toEqual({ ok: false, reason: 'citizen_occupied' });
    expect(state).toEqual(before);
  });
});
