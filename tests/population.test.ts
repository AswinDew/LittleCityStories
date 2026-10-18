import { describe, expect, it } from 'vitest';
import { SimulationSession } from '../src/simulation/SimulationSession';
import { PopulationSystem } from '../src/citizens/PopulationSystem';
import { CitizenSystem } from '../src/citizens/CitizenSystem';
import { economyFixture, addWorker } from './helpers/economyFixture';
import { BuildingRegistry } from '../src/buildings/BuildingRegistry';
import { ConstructionSystem } from '../src/construction/ConstructionSystem';
import { GridSystem } from '../src/world/GridSystem';

describe('housing, hunger and settlement growth', () => {
  it('waits safely if there is no free walkable spawn cell', () => {
    const { state, building } = economyFixture('primitive_house');
    addWorker(state, building.instanceId, 'c1', { workplaceId: null });
    const citizens = new CitizenSystem(() => { throw new Error('Must not allocate without a spawn'); }, () => false);
    const system = new PopulationSystem(citizens);
    for (let tick = 0; tick < 1200; tick++) expect(() => system.step(state)).not.toThrow();
    expect(Object.keys(state.citizens)).toHaveLength(1);
  });
  it('grows exactly one citizen at 1200 eligible ticks with real housing and enough reserve food', () => {
    const { state, building } = economyFixture('primitive_house');
    for (const id of ['c1', 'c2', 'c3']) addWorker(state, building.instanceId, id, { workplaceId: null, occupation: 'villager' });
    const citizens = new CitizenSystem(() => ({ id: `new-${state.nextId++}`, seed: 42 }), cell => {
      const tile = state.world.grid[cell.x]?.[cell.z]; return !!tile && tile.canBuild && !tile.buildingId && tile.terrain !== 'water';
    });
    const system = new PopulationSystem(citizens);
    for (let tick = 0; tick < 1199; tick++) system.step(state);
    expect(Object.keys(state.citizens)).toHaveLength(3);
    system.step(state); expect(Object.keys(state.citizens)).toHaveLength(4);
    expect(state.citizens['new-3'].homeId).toBe(building.instanceId);
    expect(state.population.housingCapacity).toBe(7); expect(state.population.happiness).toBe(70);
    system.step(state); expect(Object.keys(state.citizens)).toHaveLength(4);
  });
  it.each(['no_food', 'no_capacity', 'hungry'] as const)('blocks growth for %s and resets consecutive progress', condition => {
    const { state, building } = economyFixture('primitive_house');
    for (const id of ['c1', 'c2', 'c3']) addWorker(state, building.instanceId, id, { workplaceId: null, occupation: 'villager' });
    const citizens = new CitizenSystem(() => ({ id: `new-${state.nextId++}`, seed: 42 }), () => true);
    const system = new PopulationSystem(citizens);
    for (let tick = 0; tick < 1199; tick++) system.step(state);
    if (condition === 'no_food') state.resources.food = 0;
    if (condition === 'no_capacity') building.status = 'planned';
    if (condition === 'hungry') for (const citizen of Object.values(state.citizens)) citizen.hungry = true;
    for (let tick = 0; tick < 1201; tick++) system.step(state);
    expect(Object.keys(state.citizens)).toHaveLength(3); expect(state.population.growthTicks).toBe(0);
  });
  it('demolishing a completed house keeps citizens alive, reallocates homes and lowers happiness', () => {
    const { state, building } = economyFixture('primitive_house');
    for (const id of ['c1', 'c2', 'c3', 'c4']) addWorker(state, building.instanceId, id, { workplaceId: null, occupation: 'villager' });
    const citizens = new CitizenSystem(() => ({ id: '', seed: 0 }), () => true);
    citizens.step(state);
    const population = new PopulationSystem(citizens); population.step(state); expect(state.population.happiness).toBe(70);
    const grid = new GridSystem(); grid.deserialize(state.world.grid);
    const construction = new ConstructionSystem(grid, BuildingRegistry.getInstance(), () => ({ id: '', seed: 0, placedAt: 0 }));
    construction.demolish(building.instanceId, state); citizens.step(state); population.step(state);
    expect(Object.keys(state.citizens)).toHaveLength(4);
    expect(Object.values(state.citizens).filter(c => c.homeId === null)).toHaveLength(1);
    expect(state.population.happiness).toBe(65); expect(state.population.housingCapacity).toBe(3);
  });
  it('same seeded session and commands give equal population/activity at equal domain ticks', () => {
    const first = new SimulationSession({ environmentDensity: 0 }), second = new SimulationSession({ environmentDensity: 0 });
    for (const session of [first, second]) session.dispatch({ type: 'placeBuilding', defId: 'primitive_house', cell: { x: 12, z: 12 }, rotation: 0 });
    first.step(1500); for (let index = 0; index < 150; index++) second.step(10);
    expect(first.getSnapshot()).toEqual(second.getSnapshot());
    expect(Object.values(first.getSnapshot().citizens)).toHaveLength(4);
  });
});
