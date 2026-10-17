import { describe, expect, it } from 'vitest';
import { ConsumptionSystem } from '../src/economy/ConsumptionSystem';
import { StorageSystem } from '../src/economy/StorageSystem';
import { ProductionSystem } from '../src/economy/ProductionSystem';
import { ConstructionSystem } from '../src/construction/ConstructionSystem';
import { BuildingRegistry } from '../src/buildings/BuildingRegistry';
import { GridSystem } from '../src/world/GridSystem';
import { ResourceLedger } from '../src/economy/ResourceLedger';
import { SimulationClock } from '../src/simulation/SimulationClock';
import { SimulationSession } from '../src/simulation/SimulationSession';
import { economyFixture, addWorker } from './helpers/economyFixture';

describe('meals, housing and tax', () => {
  it('feeds three real citizens only at 600 ticks and taxes fed housed citizens', () => {
    const { state, building } = economyFixture();
    for (const id of ['citizen-3', 'citizen-1', 'citizen-2']) addWorker(state, building.instanceId, id, { hungry: true });
    const system = new ConsumptionSystem();
    for (let tick = 0; tick < 599; tick++) system.step(state);
    expect(state.resources.food).toBe(90); expect(state.resources.coins).toBe(50);
    system.step(state);
    expect(state.resources.food).toBe(87); expect(state.resources.coins).toBe(53);
    expect(Object.values(state.citizens).map(citizen => citizen.hungry)).toEqual([false, false, false]);
    for (let tick = 0; tick < 600; tick++) system.step(state);
    expect(state.resources.food).toBe(84); expect(state.resources.coins).toBe(56);
  });
  it('allocates shortage in stable ID order without negative food, then recovers on the next meal', () => {
    const { state, building } = economyFixture();
    for (const id of ['citizen-3', 'citizen-1', 'citizen-2']) addWorker(state, building.instanceId, id);
    state.resources.food = 2;
    const system = new ConsumptionSystem();
    for (let tick = 0; tick < 600; tick++) system.step(state);
    expect(state.resources.food).toBe(0); expect(state.resources.coins).toBe(52);
    expect(state.citizens['citizen-1'].hungry).toBe(false);
    expect(state.citizens['citizen-2'].hungry).toBe(false);
    expect(state.citizens['citizen-3'].hungry).toBe(true);
    for (let tick = 0; tick < 600; tick++) system.step(state);
    expect(state.resources.food).toBe(0); expect(state.resources.coins).toBe(52);
    expect(Object.values(state.citizens).every(citizen => citizen.hungry)).toBe(true);
    new ResourceLedger(state.resources, state.capacity).tryDeposit({ food: 3 });
    for (let tick = 0; tick < 600; tick++) system.step(state);
    expect(Object.values(state.citizens).some(citizen => citizen.hungry)).toBe(false);
    expect(state.resources.coins).toBe(55);
  });
  it.each(['missing', 'planned', 'under_construction', 'no_housing'] as const)('does not tax an invalid home: %s', home => {
    const { state, building } = economyFixture();
    const citizen = addWorker(state, building.instanceId);
    if (home === 'missing') citizen.homeId = 'absent';
    else { citizen.homeId = building.instanceId; if (home !== 'no_housing') building.status = home; }
    const system = new ConsumptionSystem();
    for (let tick = 0; tick < 600; tick++) system.step(state);
    expect(state.resources.food).toBe(89); expect(citizen.hungry).toBe(false); expect(state.resources.coins).toBe(50);
  });
  it('uses actual housing slots and unique citizens, never taxing a duplicate alias', () => {
    const { state, building } = economyFixture();
    for (const id of ['c4', 'c3', 'c2', 'c1']) addWorker(state, building.instanceId, id);
    state.citizens.alias = state.citizens.c1;
    const system = new ConsumptionSystem();
    for (let tick = 0; tick < 600; tick++) system.step(state);
    expect(state.resources.food).toBe(86); expect(state.resources.coins).toBe(53); // TC has only 3 housing slots
  });
  it('full coin storage never blocks meals or creates a deferred tax windfall', () => {
    const { state, building } = economyFixture(); addWorker(state, building.instanceId);
    state.resources.coins = 300;
    const system = new ConsumptionSystem();
    for (let tick = 0; tick < 600; tick++) system.step(state);
    expect(state.resources.food).toBe(89); expect(state.resources.coins).toBe(300);
    state.resources.coins = 0;
    for (let tick = 0; tick < 600; tick++) system.step(state);
    expect(state.resources.coins).toBe(1);
  });
});

describe('storage and bounded pending batches', () => {
  it('blocks an entire food batch, holds one, and releases it once without stockpiling', () => {
    const { state, building } = economyFixture(); addWorker(state, building.instanceId);
    state.resources.food = 299;
    const production = new ProductionSystem();
    for (let tick = 0; tick < 1000; tick++) production.step(state);
    expect(state.resources.food).toBe(299);
    expect(production.getOperatingStatus(building.instanceId, state)).toBe('storage_full');
    new ResourceLedger(state.resources, state.capacity).trySpend({ food: 2 });
    production.step(state); expect(state.resources.food).toBe(300);
    production.step(state); expect(state.resources.food).toBe(300);
    new ResourceLedger(state.resources, state.capacity).trySpend({ food: 3 });
    for (let tick = 0; tick < 98; tick++) production.step(state);
    expect(state.resources.food).toBe(297);
    production.step(state); expect(state.resources.food).toBe(300);
  });
  it('preserves excess inventory and refunds on storage demolition, then resumes only when there is room', () => {
    const { state, building } = economyFixture('lumber_camp'); addWorker(state, building.instanceId);
    state.world.environment = [{ id: 'source', kind: 'tree', x: 9, z: 12, variation: 0 }];
    const storageSession = new SimulationSession({ environmentDensity: 0 });
    const placed = storageSession.dispatch({ type: 'placeBuilding', defId: 'storage_hut', cell: { x: 19, z: 12 }, rotation: 0 });
    if (!placed.ok) throw new Error(placed.reason);
    const storage = structuredClone(storageSession.getSnapshot().buildings[placed.instanceId!]);
    storage.instanceId = 'storage'; storage.status = 'completed';
    state.buildings.storage = storage;
    const grid = new GridSystem(); grid.deserialize(state.world.grid);
    for (let x = 19; x < 21; x++) for (let z = 12; z < 14; z++) grid.setBuilding(x, z, 'storage');
    const system = new StorageSystem(); system.step(state); expect(state.capacity.wood).toBe(600);
    state.resources.wood = 500;
    const construction = new ConstructionSystem(grid, BuildingRegistry.getInstance(), () => ({ id: '', seed: 0, placedAt: 0 }));
    expect(construction.demolish('storage', state).ok).toBe(true);
    expect(state.capacity.wood).toBe(300); expect(state.resources.wood).toBe(525);
    const production = new ProductionSystem();
    for (let tick = 0; tick < 1000; tick++) production.step(state);
    expect(state.resources.wood).toBe(525);
    new ResourceLedger(state.resources, state.capacity).trySpend({ wood: 227 });
    production.step(state); expect(state.resources.wood).toBe(300);
    production.step(state); expect(state.resources.wood).toBe(300);
  });
  it('counts only completed storage and never erases inventory on recalculation', () => {
    const { state, building } = economyFixture('storage_hut'), system = new StorageSystem();
    building.status = 'planned'; state.resources.wood = 500;
    system.step(state); expect(state.capacity.wood).toBe(300); expect(state.resources.wood).toBe(500);
    building.status = 'completed'; system.step(state); expect(state.capacity.food).toBe(600);
    building.status = 'under_construction'; system.step(state); expect(state.capacity.food).toBe(300);
  });
});

describe('session and timing integration', () => {
  it('never invents production, meals, tax or citizens in the M4 browser session', () => {
    const session = new SimulationSession({ environmentDensity: 0 });
    session.dispatch({ type: 'placeBuilding', defId: 'farm', cell: { x: 12, z: 12 }, rotation: 0 });
    const before = session.getSnapshot(); session.step(1200);
    expect(session.getSnapshot().resources).toEqual(before.resources);
    expect(session.getSnapshot().citizens).toEqual({});
    expect(session.getSnapshot().economy.consumptionTicks).toBe(0);
    session.step(1); expect(session.getSnapshot().economy.consumptionTicks).toBe(1);
  });
  it('same domain ticks at normal/fast speed give equal economy; pause/suspension add none', () => {
    const run = (speed: 1 | 2) => {
      const { state, building } = economyFixture(); addWorker(state, building.instanceId);
      const clock = new SimulationClock(), production = new ProductionSystem(), consumption = new ConsumptionSystem();
      clock.setSpeed(0); expect(clock.advance(60000)).toBe(0);
      clock.setSpeed(speed); clock.suspend(); expect(clock.advance(60000)).toBe(0); clock.resume();
      for (let pump = 0; pump < 600 / speed; pump++) {
        for (let ticks = clock.advance(100); ticks > 0; ticks--) {
          production.step(state); consumption.step(state); state.tick++;
        }
      }
      return state;
    };
    const normal = run(1); expect(normal.tick).toBe(600); expect(normal.resources.food).toBe(107);
    expect(normal.resources.coins).toBe(51); expect(run(2)).toEqual(normal);
  });
});
