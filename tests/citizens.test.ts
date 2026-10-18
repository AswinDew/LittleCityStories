import { describe, expect, it } from 'vitest';
import { SimulationSession } from '../src/simulation/SimulationSession';

describe('real citizen identities, housing and assignment', () => {
  it('bootstraps three deterministic named citizens on distinct walkable tiles with Town Center homes', () => {
    const session = new SimulationSession({ environmentDensity: 0 });
    const state = session.getSnapshot(), citizens = Object.values(state.citizens);
    expect(citizens).toHaveLength(3);
    expect(new Set(citizens.map(c => c.id)).size).toBe(3);
    expect(new Set(citizens.map(c => `${c.position.x},${c.position.z}`)).size).toBe(3);
    for (const citizen of citizens) {
      expect(citizen.name.length).toBeGreaterThan(2); expect(citizen.homeId).toBe('building-1');
      const cell = state.world.grid[citizen.position.x][citizen.position.z];
      expect(cell.buildingId).toBeNull(); expect(cell.canBuild).toBe(true); expect(cell.terrain).not.toBe('water');
    }
    expect(new SimulationSession({ environmentDensity: 0 }).getSnapshot()).toEqual(state);
  });
  it('automatically assigns one builder per site without stealing another citizen job', () => {
    const session = new SimulationSession({ environmentDensity: 0 });
    const placed = session.dispatch({ type: 'placeBuilding', defId: 'primitive_house', cell: { x: 12, z: 12 }, rotation: 0 });
    if (!placed.ok) throw new Error(placed.reason);
    session.step(1);
    const workers = Object.values(session.getSnapshot().citizens).filter(c => c.workplaceId === placed.instanceId);
    expect(workers).toHaveLength(1); expect(workers[0].occupation).toBe('builder');
    const failed = session.dispatch({ type: 'assignWorker', citizenId: workers[0].id, buildingId: 'building-1' });
    expect(failed.ok).toBe(false);
    expect(session.dispatch({ type: 'cancelConstruction', instanceId: placed.instanceId! }).ok).toBe(true);
    const after = session.getSnapshot().citizens[workers[0].id];
    expect(after.workplaceId).toBeNull(); expect(after.occupation).toBe('villager');
  });
  it('validates actual worker IDs, completion, exclusive assignment and slot capacity', () => {
    const session = new SimulationSession({ environmentDensity: 0 });
    const placed = session.dispatch({ type: 'placeBuilding', defId: 'farm', cell: { x: 12, z: 12 }, rotation: 0 });
    if (!placed.ok) throw new Error(placed.reason);
    const ids = Object.keys(session.getSnapshot().citizens);
    expect(session.dispatch({ type: 'assignWorker', citizenId: ids[0], buildingId: placed.instanceId! }).ok).toBe(false);
    session.step(500);
    expect(session.getSnapshot().buildings[placed.instanceId!].status).toBe('completed');
    for (const id of ids.slice(0, 2)) expect(session.dispatch({ type: 'assignWorker', citizenId: id, buildingId: placed.instanceId! }).ok).toBe(true);
    const before = session.getSnapshot();
    expect(session.dispatch({ type: 'assignWorker', citizenId: ids[2], buildingId: placed.instanceId! }).ok).toBe(false);
    expect(session.dispatch({ type: 'assignWorker', citizenId: 'fake', buildingId: placed.instanceId! }).ok).toBe(false);
    expect(session.getSnapshot()).toEqual(before);
    expect(session.dispatch({ type: 'unassignWorker', citizenId: ids[0] }).ok).toBe(true);
    expect(session.dispatch({ type: 'assignWorker', citizenId: ids[2], buildingId: placed.instanceId! }).ok).toBe(true);
    session.dispatch({ type: 'demolishBuilding', instanceId: placed.instanceId! });
    expect(Object.values(session.getSnapshot().citizens).every(c => c.workplaceId === null)).toBe(true);
  });
});
