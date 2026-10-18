import { describe, it, expect } from 'vitest';
import { SimulationSession } from '../src/simulation/SimulationSession';
import { ConstructionSystem } from '../src/construction/ConstructionSystem';
import { GridSystem } from '../src/world/GridSystem';
import { BuildingRegistry } from '../src/buildings/BuildingRegistry';

describe('session demolition and refunds', () => {
  it.each([{ occupation: 'villager' }, { workplaceId: null }, { activity: 'navigate' }, { animationState: 'idle' },
    { workplaceAccess: 'unreachable' }, { pathProgress: 1 }, { destination: { x: 12, z: 14 } }])(
    'does not advance construction for an ineligible worker %o', invalid => {
      const session = new SimulationSession({ environmentDensity: 0 });
      const result = session.dispatch({ type: 'placeBuilding', defId: 'primitive_house', cell: { x: 12, z: 12 }, rotation: 0 });
      if (!result.ok) throw new Error(result.reason);
      const state = structuredClone(session.getSnapshot()), site = state.buildings[result.instanceId!];
      state.citizens.worker = { id: 'worker', name: 'Ari', occupation: 'builder', homeId: null, workplaceId: site.instanceId,
        activity: 'work', position: { ...site.entrance! }, destination: null, animationState: 'build', pathProgress: 0,
        hungry: false, activityTicks: 0, workplaceAccess: 'reachable', path: [], pathRevision: 0, moveFrom: null, direction: 'SE', waitingReason: null, ...invalid } as typeof state.citizens[string];
      const grid = new GridSystem(); grid.deserialize(state.world.grid);
      const system = new ConstructionSystem(grid, BuildingRegistry.getInstance(), () => ({ id: '', seed: 0, placedAt: 0 }));
      system.step(state);
      expect(site.workTicks).toBe(0); expect(site.status).toBe('planned');
    });
  it('cancels a planned multi-cell site with full refund and rejects repeat demolition', () => {
    const session = new SimulationSession({ environmentDensity: 0 });
    const before = session.getSnapshot();
    const placed = session.dispatch({ type: 'placeBuilding', defId: 'farm', cell: { x: 12, z: 12 }, rotation: 1 });
    if (!placed.ok) throw new Error(placed.reason);
    const id = placed.instanceId!;
    expect(session.dispatch({ type: 'cancelConstruction', instanceId: id }).ok).toBe(true);
    expect(session.getSnapshot().resources).toEqual(before.resources);
    for (const x of [12, 13]) for (const z of [12, 13]) expect(session.getSnapshot().world.grid[x][z].buildingId).toBeNull();
    const after = session.getSnapshot();
    expect(session.dispatch({ type: 'demolishBuilding', instanceId: id }).ok).toBe(false);
    expect(session.getSnapshot()).toEqual(after);
  });
  it('completes roads immediately and rounds half-refund down without free stone', () => {
    const session = new SimulationSession({ environmentDensity: 0 });
    const result = session.dispatch({ type: 'placeRoad', cell: { x: 12, z: 12 } });
    if (!result.ok) throw new Error(result.reason);
    expect(session.getSnapshot().buildings[result.instanceId!].status).toBe('completed');
    expect(session.getSnapshot().resources.stone).toBe(99);
    expect(session.dispatch({ type: 'demolishBuilding', instanceId: result.instanceId! }).ok).toBe(true);
    expect(session.getSnapshot().resources.stone).toBe(99);
    expect(session.getSnapshot().world.grid[12][12].isRoad).toBe(false);
  });
  it('progresses only an assigned builder at the entrance, derives capacity from completed storage, and retains overflow', () => {
    const session = new SimulationSession({ environmentDensity: 0 });
    const placed = session.dispatch({ type: 'placeBuilding', defId: 'storage_hut', cell: { x: 12, z: 12 }, rotation: 0 });
    if (!placed.ok) throw new Error(placed.reason);
    const state = structuredClone(session.getSnapshot()), site = state.buildings[placed.instanceId!];
    const grid = new GridSystem(); grid.deserialize(state.world.grid);
    const system = new ConstructionSystem(grid, BuildingRegistry.getInstance(), () => ({ id: '', seed: 0, placedAt: 0 }));
    state.citizens.builder = { id: 'builder', name: 'Raka', occupation: 'builder', homeId: null, workplaceId: site.instanceId,
      activity: 'work', position: { x: 1, z: 1 }, destination: null, animationState: 'build', pathProgress: 0, hungry: false, activityTicks: 0, workplaceAccess: 'reachable', path: [], pathRevision: -1, moveFrom: null, direction: 'SE', waitingReason: null };
    system.step(state); expect(site.workTicks).toBe(0);
    state.citizens.builder.position = { ...site.entrance! };
    system.step(state); expect(site.status).toBe('under_construction');
    expect(state.capacity.wood).toBe(300);
    for (let tick = 1; tick < 250; tick++) system.step(state);
    expect(site.status).toBe('completed'); expect(site.workTicks).toBe(250); expect(state.capacity.wood).toBe(600);
    state.resources.wood = 590;
    expect(system.demolish(site.instanceId, state).ok).toBe(true);
    expect(state.capacity.wood).toBe(300);
    expect(state.resources.wood).toBe(615); // 590 retained + half paid 50
    expect(state.citizens.builder.workplaceId).toBeNull();
  });
  it('refunds half of paid resources for an unfinished site after actual work', () => {
    const session = new SimulationSession({ environmentDensity: 0 });
    session.dispatch({ type: 'placeBuilding', defId: 'lumber_camp', cell: { x: 12, z: 12 }, rotation: 0 });
    const state = structuredClone(session.getSnapshot());
    const building = Object.values(state.buildings).find(entry => entry.defId === 'lumber_camp')!;
    building.status = 'under_construction'; building.workTicks = 1;
    const grid = new GridSystem(); grid.deserialize(state.world.grid);
    const system = new ConstructionSystem(grid, BuildingRegistry.getInstance(), () => ({ id: '', seed: 0, placedAt: 0 }));
    expect(system.cancel(building.instanceId, state).ok).toBe(true);
    expect(state.resources.wood).toBe(142); expect(state.resources.stone).toBe(97);
  });
});
