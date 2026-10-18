import { describe, expect, it } from 'vitest';
import { SimulationSession } from '../src/simulation/SimulationSession';
import { ActivitySystem } from '../src/citizens/ActivitySystem';
import { NavigationGrid } from '../src/world/NavigationGrid';
import { ProductionSystem } from '../src/economy/ProductionSystem';
import { economyFixture, addWorker } from './helpers/economyFixture';
import { ConstructionSystem } from '../src/construction/ConstructionSystem';
import { GridSystem } from '../src/world/GridSystem';
import { BuildingRegistry } from '../src/buildings/BuildingRegistry';
import { roomLayout } from '../src/citizens/BuildingPresence';

describe('actual navigation and work activity', () => {
  it('clears a demolished workplace during fractional travel and returns continuously to a real home', () => {
    const session = new SimulationSession({ environmentDensity: 0, startingPopulation: 1 });
    const placed = session.dispatch({ type: 'placeBuilding', defId: 'farm', cell: { x: 12, z: 12 }, rotation: 0 });
    if (!placed.ok) throw new Error(placed.reason);
    session.step(400); const id = Object.keys(session.getSnapshot().citizens)[0];
    session.dispatch({ type: 'assignWorker', citizenId: id, buildingId: placed.instanceId! });
    for (let ticks = 0; ticks < 100 && !(session.getSnapshot().citizens[id].pathProgress > 0); ticks++) session.step(1);
    const before = session.getSnapshot().citizens[id]; expect(before.pathProgress).toBeGreaterThan(0);
    expect(session.dispatch({ type: 'demolishBuilding', instanceId: placed.instanceId! }).ok).toBe(true);
    expect(session.getSnapshot().citizens[id].position).toEqual(before.position);
    expect(session.getSnapshot().citizens[id].workplaceId).toBeNull();
    session.step(1); const next = session.getSnapshot().citizens[id].position;
    expect(Math.abs(next.x - before.position.x) + Math.abs(next.z - before.position.z)).toBeLessThanOrEqual(0.101);
    session.step(200); expect(session.getSnapshot().citizens[id].room).toMatchObject({ purpose: 'home', phase: 'inside', hidden: true });
  });
  it('loses a demolished home during the return trip without teleporting or deleting the citizen', () => {
    const session = new SimulationSession({ environmentDensity: 0, startingPopulation: 4 });
    const placed = session.dispatch({ type: 'placeBuilding', defId: 'primitive_house', cell: { x: 12, z: 12 }, rotation: 0 });
    if (!placed.ok) throw new Error(placed.reason);
    session.step(301);
    const citizen = Object.values(session.getSnapshot().citizens).find(c => c.homeId === placed.instanceId)!;
    expect(citizen.activity).toBe('return'); expect(citizen.pathProgress).toBeGreaterThan(0);
    session.dispatch({ type: 'demolishBuilding', instanceId: placed.instanceId! }); session.step(1);
    const after = session.getSnapshot().citizens[citizen.id];
    expect(after.homeId).toBeNull(); expect(after.waitingReason).toBe('no_home');
    expect(after.activity).toBe('idle'); expect(after.position).toEqual(citizen.position);
    expect(Object.keys(session.getSnapshot().citizens)).toHaveLength(4);
  });
  it('does not restore stale reachable access on arrival after the home route closes behind the worker', () => {
    const { state, building } = economyFixture();
    const worker = addWorker(state, building.instanceId, 'c1', { activity: 'navigate', position: { x: 11, z: 14 }, pathRevision: 0 });
    for (let x = 0; x < 32; x++) if (!state.world.grid[x][15].buildingId) state.world.grid[x][15].terrain = 'water';
    state.navigationRevision++;
    const nav = new NavigationGrid(32, (x, z) => state.world.grid[x]?.[z] ?? null, () => state.navigationRevision);
    const activity = new ActivitySystem(nav), production = new ProductionSystem();
    for (let tick = 0; tick < 110; tick++) { activity.step(state); production.step(state); }
    expect(worker.position).toEqual(building.entrance); expect(worker.workplaceAccess).toBe('unreachable');
    expect(worker.animationState).toBe('idle'); expect(state.resources.food).toBe(90);
    state.world.grid[12][15].terrain = 'grass'; state.navigationRevision++; // (11,16) contains the guaranteed starter tree
    for (let tick = 0; tick < 100 && worker.activity !== 'work'; tick++) { activity.step(state); production.step(state); }
    const food = state.resources.food;
    for (let tick = 0; tick < 100; tick++) { activity.step(state); production.step(state); }
    expect(worker.workplaceAccess).toBe('reachable'); expect(worker.animationState).toBe('harvest'); expect(state.resources.food).toBe(food + 3);
  });
  it('invalidates an arrived worker access when a world change closes the home/work route', () => {
    const { state, building } = economyFixture(); const worker = addWorker(state, building.instanceId, 'c1');
    worker.pathRevision = state.navigationRevision;
    const nav = new NavigationGrid(32, (x, z) => state.world.grid[x]?.[z] ?? null, () => state.navigationRevision);
    const activity = new ActivitySystem(nav), production = new ProductionSystem();
    for (const [x, z] of [[11, 14], [13, 14], [12, 15]]) state.world.grid[x][z].terrain = 'water';
    state.navigationRevision++; activity.step(state);
    expect(worker.workplaceAccess).toBe('unreachable'); expect(worker.animationState).toBe('idle');
    for (let tick = 0; tick < 100; tick++) production.step(state);
    expect(state.resources.food).toBe(90);
    state.world.grid[11][14].terrain = 'grass'; state.navigationRevision++; activity.step(state);
    expect(worker.workplaceAccess).toBe('reachable'); expect(worker.animationState).toBe('harvest');
  });
  it('applies hungry builder productivity at half speed without losing fractional work', () => {
    const { state, building } = economyFixture('primitive_house'); building.status = 'planned'; building.workTicks = 0;
    addWorker(state, building.instanceId, 'c1', { occupation: 'builder', animationState: 'build', hungry: true });
    const grid = new GridSystem(); grid.deserialize(state.world.grid);
    const construction = new ConstructionSystem(grid, BuildingRegistry.getInstance(), () => ({ id: '', seed: 0, placedAt: 0 }));
    construction.step(state); expect(building.workTicks).toBe(0);
    construction.step(state); expect(building.workTicks).toBe(1);
  });
  it('changes destination after finishing the current segment when unassigned', () => {
    const session = new SimulationSession({ environmentDensity: 0, startingPopulation: 1 });
    session.dispatch({ type: 'placeBuilding', defId: 'primitive_house', cell: { x: 12, z: 12 }, rotation: 0 });
    session.step(1); const id = Object.keys(session.getSnapshot().citizens)[0];
    session.dispatch({ type: 'unassignWorker', citizenId: id }); session.step(10);
    const citizen = session.getSnapshot().citizens[id];
    expect(citizen.position.x).toBeGreaterThan(15); expect(citizen.position.z).toBe(18);
    expect(citizen.animationState).toBe('walk');
  });
  it('waits without teleporting when no route exists, then retries after a navigation change', () => {
    const { state, building } = economyFixture(); const worker = addWorker(state, building.instanceId, 'c1', { activity: 'navigate', position: { x: 1, z: 1 } });
    for (const [x, z] of [[0, 1], [1, 0], [1, 2], [2, 1]]) state.world.grid[x][z].terrain = 'water';
    const nav = new NavigationGrid(32, (x, z) => state.world.grid[x]?.[z] ?? null, () => state.navigationRevision);
    const activity = new ActivitySystem(nav); activity.step(state);
    expect(worker.position).toEqual({ x: 1, z: 1 }); expect(worker.waitingReason).toBe('unreachable'); expect(worker.animationState).toBe('idle');
    state.world.grid[2][1].terrain = 'grass'; state.navigationRevision++; activity.step(state);
    expect(worker.position).toEqual({ x: 1.1, z: 1 }); expect(worker.animationState).toBe('walk');
  });
  it('reserves both cells of an in-flight segment against construction', () => {
    const session = new SimulationSession({ environmentDensity: 0, startingPopulation: 1 });
    session.dispatch({ type: 'placeBuilding', defId: 'primitive_house', cell: { x: 12, z: 12 }, rotation: 0 });
    session.step(1);
    const citizen = Object.values(session.getSnapshot().citizens)[0];
    expect(citizen.pathProgress).toBe(1);
    const before = session.getSnapshot();
    expect(session.dispatch({ type: 'placeRoad', cell: citizen.moveFrom! }).ok).toBe(false);
    expect(session.getSnapshot()).toEqual(before);
  });
  it('walks before contributing construction, finishes the house, releases the job and returns home', () => {
    const session = new SimulationSession({ environmentDensity: 0, startingPopulation: 1 });
    const result = session.dispatch({ type: 'placeBuilding', defId: 'primitive_house', cell: { x: 12, z: 12 }, rotation: 0 });
    if (!result.ok) throw new Error(result.reason);
    session.step(1);
    const worker = Object.values(session.getSnapshot().citizens)[0];
    expect(worker.activity).toBe('navigate'); expect(worker.animationState).toBe('walk');
    expect(session.getSnapshot().buildings[result.instanceId!].workTicks).toBe(0);
    session.step(40); expect(session.getSnapshot().buildings[result.instanceId!].workTicks).toBe(0);
    session.step(400);
    const after = session.getSnapshot();
    expect(after.buildings[result.instanceId!].status).toBe('completed');
    expect(after.citizens[worker.id].workplaceId).toBeNull();
    expect(after.citizens[worker.id].position).toEqual(roomLayout(after.buildings['building-1'], 'home').station);
    expect(after.citizens[worker.id].room).toMatchObject({ phase: 'inside', hidden: true });
  });
  it('a farmer produces only after arriving, returns after the work shift and rests at home', () => {
    const session = new SimulationSession({ environmentDensity: 0, startingPopulation: 1 });
    const result = session.dispatch({ type: 'placeBuilding', defId: 'farm', cell: { x: 12, z: 12 }, rotation: 0 });
    if (!result.ok) throw new Error(result.reason);
    session.step(300);
    const id = Object.keys(session.getSnapshot().citizens)[0];
    expect(session.dispatch({ type: 'assignWorker', citizenId: id, buildingId: result.instanceId! }).ok).toBe(true);
    session.step(1);
    expect(session.getSnapshot().citizens[id].activity).toBe('navigate');
    expect(session.getSnapshot().buildings[result.instanceId!].productionWork[id] ?? 0).toBe(0);
    for (let ticks = 0; ticks < 200 && session.getSnapshot().citizens[id].activity !== 'work'; ticks++) session.step(1);
    expect(session.getSnapshot().citizens[id].animationState).toBe('harvest');
    const food = session.getSnapshot().resources.food;
    session.step(100); expect(session.getSnapshot().resources.food).toBe(food + 3);
    for (let ticks = 0; ticks < 600 && session.getSnapshot().citizens[id].activity !== 'return'; ticks++) session.step(1);
    expect(session.getSnapshot().citizens[id].activity).toBe('return');
    for (let ticks = 0; ticks < 200 && session.getSnapshot().citizens[id].activity !== 'idle'; ticks++) session.step(1);
    expect(session.getSnapshot().citizens[id].position).toEqual(roomLayout(session.getSnapshot().buildings['building-1'], 'home').station);
    expect(session.getSnapshot().citizens[id].room).toMatchObject({ purpose: 'home', phase: 'inside', hidden: true });
    session.step(99); expect(session.getSnapshot().citizens[id].activity).toBe('idle');
    session.step(1); expect(session.getSnapshot().citizens[id].activity).toBe('navigate');
  });
  it('replans changed routes and never teleports when unassigned between tiles', () => {
    const session = new SimulationSession({ environmentDensity: 0, startingPopulation: 1 });
    session.dispatch({ type: 'placeBuilding', defId: 'primitive_house', cell: { x: 12, z: 12 }, rotation: 0 });
    session.step(1);
    const id = Object.keys(session.getSnapshot().citizens)[0], before = session.getSnapshot().citizens[id];
    const blocked = before.path[2]; expect(blocked).toBeDefined();
    expect(session.dispatch({ type: 'setTerrain', cell: blocked, terrain: 'water' }).ok).toBe(true);
    session.step(10);
    expect(session.getSnapshot().citizens[id].path.some(c => c.x === blocked.x && c.z === blocked.z)).toBe(false);
    const position = session.getSnapshot().citizens[id].position;
    expect(session.dispatch({ type: 'unassignWorker', citizenId: id }).ok).toBe(true);
    expect(session.getSnapshot().citizens[id].position).toEqual(position);
    session.step(1);
    const next = session.getSnapshot().citizens[id].position;
    expect(Math.abs(next.x - position.x) + Math.abs(next.z - position.z)).toBeLessThanOrEqual(0.101);
  });
  it('uses idle animation during blocked production and resumes when a source/storage blocker clears', () => {
    const { state, building } = economyFixture('lumber_camp'); const worker = addWorker(state, building.instanceId);
    state.world.environment = [];
    const nav = new NavigationGrid(state.config.metrics.size, (x, z) => state.world.grid[x]?.[z] ?? null, () => state.navigationRevision);
    const activity = new ActivitySystem(nav), production = new ProductionSystem();
    activity.step(state);
    expect(worker.animationState).toBe('idle'); expect(worker.waitingReason).toBe('no_source');
    state.world.environment = [{ id: 'tree', kind: 'tree', x: 9, z: 12, variation: 0 }];
    activity.step(state); expect(worker.animationState).toBe('chop');
    state.resources.wood = 300; activity.step(state);
    expect(worker.animationState).toBe('idle'); expect(production.getOperatingStatus(building.instanceId, state)).toBe('storage_full');
    state.resources.wood = 298;
    for (let tick = 0; tick < 100; tick++) { activity.step(state); production.step(state); }
    expect(state.resources.wood).toBe(300);
  });
});
