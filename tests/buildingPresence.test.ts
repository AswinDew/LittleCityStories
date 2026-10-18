import { describe, expect, it } from 'vitest';
import { SimulationSession } from '../src/simulation/SimulationSession';
import { roomLayout } from '../src/citizens/BuildingPresence';

describe('doorway, home and workplace presence', () => {
  it('can reassign a worker immediately to the same building after construction or unassignment', () => {
    const session = new SimulationSession({ environmentDensity: 0, startingPopulation: 1 });
    const placed = session.dispatch({ type: 'placeBuilding', defId: 'farm', cell: { x: 18, z: 12 }, rotation: 0 });
    if (!placed.ok) throw new Error(placed.reason);
    for (let tick = 0; tick < 500 && session.getSnapshot().buildings[placed.instanceId!].status !== 'completed'; tick++) session.step(1);
    session.step(1); const id = Object.keys(session.getSnapshot().citizens)[0];
    expect(session.dispatch({ type: 'assignWorker', citizenId: id, buildingId: placed.instanceId! }).ok).toBe(true);
    session.step(100);
    expect(session.getSnapshot().citizens[id].room?.phase).toBe('inside');
    expect(session.getSnapshot().citizens[id].animationState).toBe('harvest');
    session.dispatch({ type: 'unassignWorker', citizenId: id });
    expect(session.dispatch({ type: 'assignWorker', citizenId: id, buildingId: placed.instanceId! }).ok).toBe(true);
    session.step(100);
    expect(session.getSnapshot().citizens[id].room?.phase).toBe('inside');
    expect(['harvest', 'water']).toContain(session.getSnapshot().citizens[id].animationState);
  });
  it.each([0, 1, 2, 3])('uses distinct private work slots at rotation %s and repositions continuously after unassignment', rotation => {
    const session = new SimulationSession({ environmentDensity: 0, startingPopulation: 2 });
    const placed = session.dispatch({ type: 'placeBuilding', defId: 'farm', cell: { x: 18, z: 12 }, rotation });
    if (!placed.ok) throw new Error(placed.reason);
    session.step(650);
    const ids = Object.keys(session.getSnapshot().citizens).sort();
    for (const id of ids) expect(session.dispatch({ type: 'assignWorker', citizenId: id, buildingId: placed.instanceId! }).ok).toBe(true);
    session.step(220);
    const state = session.getSnapshot(), farm = state.buildings[placed.instanceId!];
    for (const [slot, id] of ids.entries()) {
      expect(state.citizens[id].room).toMatchObject({ phase: 'inside', slot });
      expect(state.citizens[id].position).toEqual(roomLayout(farm, 'work', slot).station);
    }
    session.dispatch({ type: 'unassignWorker', citizenId: ids[0] });
    let previous = state.citizens[ids[1]].position;
    for (let tick = 0; tick < 25; tick++) {
      session.step(1); const current = session.getSnapshot().citizens[ids[1]].position;
      expect(Math.abs(current.x - previous.x) + Math.abs(current.z - previous.z)).toBeLessThanOrEqual(0.101);
      previous = current;
    }
    expect(session.getSnapshot().citizens[ids[1]].position).toEqual(roomLayout(farm, 'work', 0).station);
  });
  it('evacuates a demolished home continuously and allows a later workplace assignment', () => {
    const session = new SimulationSession({ environmentDensity: 0, startingPopulation: 4 });
    const placed = session.dispatch({ type: 'placeBuilding', defId: 'primitive_house', cell: { x: 12, z: 12 }, rotation: 1 });
    if (!placed.ok) throw new Error(placed.reason);
    session.step(650);
    const resident = Object.values(session.getSnapshot().citizens).find(c => c.homeId === placed.instanceId)!;
    expect(resident.room).toMatchObject({ phase: 'inside', hidden: true });
    expect(session.dispatch({ type: 'demolishBuilding', instanceId: placed.instanceId! }).ok).toBe(true);
    let previous = resident.position;
    for (let tick = 0; tick < 30; tick++) {
      session.step(1); const current = session.getSnapshot().citizens[resident.id].position;
      expect(Math.abs(current.x - previous.x) + Math.abs(current.z - previous.z)).toBeLessThanOrEqual(0.101);
      previous = current;
    }
    expect(session.getSnapshot().citizens[resident.id].room).toBeNull();
    expect(session.getSnapshot().citizens[resident.id].waitingReason).toBe('no_home');
    const farm = session.dispatch({ type: 'placeBuilding', defId: 'farm', cell: { x: 18, z: 12 }, rotation: 0 });
    if (!farm.ok) throw new Error(farm.reason); session.step(650);
    expect(session.dispatch({ type: 'assignWorker', citizenId: resident.id, buildingId: farm.instanceId! }).ok).toBe(true);
    session.step(220);
    expect(session.getSnapshot().citizens[resident.id].room).toMatchObject({ purpose: 'work', phase: 'inside' });
  });
  it('reserves the doorway evacuation corridor immediately after an occupied workplace is demolished', () => {
    const session = new SimulationSession({ environmentDensity: 0, startingPopulation: 1 });
    const placed = session.dispatch({ type: 'placeBuilding', defId: 'research_hut', cell: { x: 18, z: 12 }, rotation: 0 });
    if (!placed.ok) throw new Error(placed.reason);
    session.step(650); const id = Object.keys(session.getSnapshot().citizens)[0];
    session.dispatch({ type: 'assignWorker', citizenId: id, buildingId: placed.instanceId! }); session.step(220);
    expect(session.getSnapshot().citizens[id].room?.phase).toBe('inside');
    session.dispatch({ type: 'demolishBuilding', instanceId: placed.instanceId! });
    expect(session.dispatch({ type: 'placeBuilding', defId: 'primitive_house', cell: { x: 18, z: 13 }, rotation: 0 })).toEqual({ ok: false, reason: 'citizen_occupied' });
    session.step(200);
    expect(session.getSnapshot().citizens[id].room).toMatchObject({ purpose: 'home', phase: 'inside' });
  });
  it('walks through the home door and rests indoors, then exits before a new job', () => {
    const session = new SimulationSession({ environmentDensity: 0, startingPopulation: 1 });
    const id = Object.keys(session.getSnapshot().citizens)[0];
    session.step(100);
    const resting = session.getSnapshot().citizens[id];
    expect(resting.room?.purpose).toBe('home'); expect(resting.room?.phase).toBe('inside'); expect(resting.room?.hidden).toBe(true);
    expect(resting.position).not.toEqual(session.getSnapshot().world.entrance);
    session.dispatch({ type: 'placeBuilding', defId: 'primitive_house', cell: { x: 12, z: 12 }, rotation: 0 });
    session.step(1);
    const exiting = session.getSnapshot().citizens[id];
    expect(exiting.room?.phase).toBe('leaving'); expect(exiting.animationState).toBe('walk');
    expect(Math.abs(exiting.position.x - resting.position.x) + Math.abs(exiting.position.z - resting.position.z)).toBeLessThanOrEqual(0.101);
  });
  it.each([
    ['farm', 18, 12, 'harvest'], ['lumber_camp', 12, 14, 'chop'],
    ['stone_quarry', 19, 14, 'mine'], ['research_hut', 18, 12, 'research'],
  ] as const)('%s workers enter their own work area and use a specific animation', (defId, x, z, animation) => {
    const session = new SimulationSession({ environmentDensity: 0, startingPopulation: 1 });
    const result = session.dispatch({ type: 'placeBuilding', defId, cell: { x, z }, rotation: 0 });
    if (!result.ok) throw new Error(result.reason);
    session.step(650);
    const id = Object.keys(session.getSnapshot().citizens)[0], building = session.getSnapshot().buildings[result.instanceId!];
    expect(building.status).toBe('completed');
    expect(session.dispatch({ type: 'assignWorker', citizenId: id, buildingId: building.instanceId }).ok).toBe(true);
    for (let ticks = 0; ticks < 400 && session.getSnapshot().citizens[id].activity !== 'work'; ticks++) session.step(1);
    const citizen = session.getSnapshot().citizens[id];
    expect(citizen.room?.buildingId).toBe(building.instanceId); expect(citizen.room?.phase).toBe('inside');
    expect(citizen.animationState).toBe(animation); expect(citizen.position).not.toEqual(building.entrance);
    expect(citizen.position.x).toBeGreaterThanOrEqual(building.gridX - 0.5);
    expect(citizen.position.x).toBeLessThan(building.gridX + building.footprint.width - 0.5);
    expect(citizen.position.z).toBeLessThan(building.gridZ + building.footprint.depth - 0.5);
    session.dispatch({ type: 'unassignWorker', citizenId: id }); session.step(1);
    expect(session.getSnapshot().citizens[id].room?.phase).toBe('leaving');
    expect(session.getSnapshot().citizens[id].animationState).toBe('walk');
    session.step(300); expect(session.getSnapshot().citizens[id].room?.purpose).toBe('home');
    expect(session.getSnapshot().citizens[id].room?.hidden).toBe(true);
  });
});
