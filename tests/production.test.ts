import { describe, expect, it } from 'vitest';
import { ProductionSystem } from '../src/economy/ProductionSystem';
import { economyFixture, addWorker } from './helpers/economyFixture';
import { SimulationClock } from '../src/simulation/SimulationClock';

describe('production from actual worker presence', () => {
  it('gives identical production and integer credit at 30/60/144 FPS', () => {
    const run = (fps: number) => {
      const { state, building } = economyFixture(); addWorker(state, building.instanceId, 'citizen-1', { hungry: true });
      const system = new ProductionSystem(), clock = new SimulationClock();
      for (let frame = 0; frame < fps * 23; frame++) {
        const ticks = clock.advance(1000 / fps);
        for (let tick = 0; tick < ticks; tick++) { system.step(state); state.tick++; }
      }
      return state;
    };
    const at30 = run(30);
    expect(at30.tick).toBe(230); expect(at30.resources.food).toBe(93);
    expect(run(60)).toEqual(at30); expect(run(144)).toEqual(at30);
  });
  it.each([0, 1, 2, 3])('honors two worker slots with %i assigned workers', count => {
    const { state, building } = economyFixture();
    for (let index = 0; index < count; index++) addWorker(state, building.instanceId, `citizen-${index}`);
    const system = new ProductionSystem(), before = state.resources.food;
    for (let tick = 0; tick < 99; tick++) system.step(state);
    expect(state.resources.food).toBe(before);
    system.step(state);
    expect(state.resources.food - before).toBe([0, 3, 6, 6][count]);
    expect(system.getOperatingStatus(building.instanceId, state)).toBe(count ? 'working' : 'no_workers');
  });
  it.each(['planned', 'under_construction'] as const)('never produces from %s buildings', status => {
    const { state, building } = economyFixture(); building.status = status;
    addWorker(state, building.instanceId);
    const system = new ProductionSystem();
    for (let tick = 0; tick < 200; tick++) system.step(state);
    expect(state.resources.food).toBe(90);
    expect(system.getOperatingStatus(building.instanceId, state)).toBe('under_construction');
  });
  it.each([
    { workplaceAccess: 'unreachable' as const }, { workplaceAccess: 'unknown' as const },
    { position: { x: 0, z: 0 } }, { activity: 'navigate' as const }, { animationState: 'idle' as const },
    { pathProgress: 0.5 }, { destination: { x: 12, z: 14 } },
  ])('does not produce before valid arrival/work %o', overrides => {
    const { state, building } = economyFixture(); addWorker(state, building.instanceId, 'citizen-1', overrides);
    const system = new ProductionSystem();
    for (let tick = 0; tick < 200; tick++) system.step(state);
    expect(state.resources.food).toBe(90);
    expect(system.getOperatingStatus(building.instanceId, state)).toBe('unreachable');
  });
  it('rejects forged aliases, wrong occupations and assignments to another building', () => {
    const { state, building } = economyFixture();
    const citizen = addWorker(state, building.instanceId);
    state.citizens.alias = citizen;
    const system = new ProductionSystem();
    for (let tick = 0; tick < 100; tick++) system.step(state);
    expect(state.resources.food).toBe(93);
    delete state.citizens.alias; citizen.occupation = 'builder';
    for (let tick = 0; tick < 100; tick++) system.step(state);
    expect(state.resources.food).toBe(93);
    citizen.occupation = 'farmer'; citizen.workplaceId = 'building-1';
    expect(system.getOperatingStatus(building.instanceId, state)).toBe('no_workers');
  });
  it.each([
    ['lumber_camp', 'tree', 'wood', 2], ['stone_quarry', 'rock', 'stone', 1],
  ] as const)('requires the matching source within footprint radius for %s', (defId, kind, resource, output) => {
    const { state, building } = economyFixture(defId); addWorker(state, building.instanceId);
    state.world.environment = [{ id: 'source', x: 9, z: 12, kind, variation: 0 }]; // exactly 3 from footprint
    const system = new ProductionSystem(), before = state.resources[resource];
    for (let tick = 0; tick < 99; tick++) system.step(state);
    state.world.environment[0].x = 8;
    expect(system.getOperatingStatus(building.instanceId, state)).toBe('no_source');
    system.step(state); expect(state.resources[resource]).toBe(before);
    state.world.environment[0].x = 9;
    system.step(state); expect(state.resources[resource]).toBe(before + output);
    state.world.environment = [];
    for (let tick = 0; tick < 200; tick++) system.step(state);
    expect(state.resources[resource]).toBe(before + output);
  });
  it('stops immediately if the entrance becomes blocked even with stale reachable access', () => {
    const { state, building } = economyFixture(); addWorker(state, building.instanceId);
    state.world.grid[12][14].terrain = 'water';
    const system = new ProductionSystem();
    for (let tick = 0; tick < 100; tick++) system.step(state);
    expect(state.resources.food).toBe(90);
    expect(system.getOperatingStatus(building.instanceId, state)).toBe('unreachable');
  });
  it('retains integer remainder with hunger and a 25% productivity modifier', () => {
    const { state, building } = economyFixture();
    addWorker(state, building.instanceId, 'citizen-1', { hungry: true });
    state.economy.productionModifiers.food = 125;
    const system = new ProductionSystem();
    for (let tick = 0; tick < 159; tick++) system.step(state);
    expect(state.resources.food).toBe(90);
    system.step(state); expect(state.resources.food).toBe(93);
    for (let tick = 0; tick < 160; tick++) system.step(state);
    expect(state.resources.food).toBe(96);
  });
  it('preserves non-divisible percentage remainder in plain state across system recreation', () => {
    const { state, building } = economyFixture(); addWorker(state, building.instanceId);
    state.economy.productionModifiers.food = 123;
    for (let tick = 0; tick < 1000; tick++) new ProductionSystem().step(state);
    expect(state.resources.food).toBe(126); // 12 batches of 3; 246000 units total
    expect(building.productionWork['citizen-1']).toBe(6000); // 246000 - 12 * 20000
  });
  it('does not transfer work credit to a replacement worker', () => {
    const { state, building } = economyFixture(); addWorker(state, building.instanceId);
    const system = new ProductionSystem();
    for (let tick = 0; tick < 99; tick++) system.step(state);
    delete state.citizens['citizen-1']; addWorker(state, building.instanceId, 'citizen-2');
    system.step(state); expect(state.resources.food).toBe(90);
    for (let tick = 0; tick < 99; tick++) system.step(state);
    expect(state.resources.food).toBe(93);
  });
});
