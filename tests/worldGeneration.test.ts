import { describe, it, expect } from 'vitest';
import { createWorldConfig } from '../src/config/WorldConfig';
import { generateWorld } from '../src/world/WorldGenerator';
import { SeededRandom } from '../src/simulation/Random';
import { GridSystem } from '../src/world/GridSystem';

describe('seeded world foundation', () => {
  it('uses configurable defaults and copies caller-owned settings', () => {
    const overrides = { metrics: { size: 20 }, startingResources: { wood: 42 } };
    const config = createWorldConfig(overrides);
    overrides.metrics.size = 12;
    expect(config.metrics).toEqual({ size: 20, cellSize: 2 });
    expect(config.startingResources.wood).toBe(42);
    expect(createWorldConfig().metrics.size).toBe(32);
    expect(createWorldConfig().startingPopulation).toBe(3);
  });

  it.each([0, -1, 2.5, NaN, Infinity, 10000])('rejects invalid size %s', size => {
    expect(() => createWorldConfig({ metrics: { size } })).toThrow();
  });

  it('rejects invalid cell size, seed, population and resource values', () => {
    expect(() => createWorldConfig({ metrics: { cellSize: 0 } })).toThrow();
    expect(() => createWorldConfig({ seed: NaN })).toThrow();
    expect(() => createWorldConfig({ startingPopulation: -1 })).toThrow();
    expect(() => createWorldConfig({ startingResources: { food: 1.5 } })).toThrow();
  });

  it.each([12, 20, 32])('reproduces %s-tile worlds with clear starter area and accessible sources', size => {
    const config = createWorldConfig({ seed: 42, metrics: { size } });
    const world = generateWorld(config);
    expect(world).toEqual(generateWorld(config));
    expect(world.grid).toHaveLength(size);
    for (const cell of world.starterArea) {
      expect(world.grid[cell.x][cell.z].canBuild).toBe(true);
      expect(world.environment.some(e => e.x === cell.x && e.z === cell.z)).toBe(false);
    }
    const visited = new Set<string>();
    const queue = [world.entrance];
    for (let i = 0; i < queue.length; i++) {
      const cell = queue[i];
      const key = `${cell.x},${cell.z}`;
      if (visited.has(key)) continue;
      visited.add(key);
      for (const [dx, dz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const x = cell.x + dx, z = cell.z + dz;
        if (world.grid[x]?.[z]?.canBuild && !visited.has(`${x},${z}`)) queue.push({ x, z });
      }
    }
    for (const kind of ['tree', 'rock']) {
      expect(world.environment.some(e => e.kind === kind && [[0, 1], [1, 0], [0, -1], [-1, 0]]
        .some(([dx, dz]) => visited.has(`${e.x + dx},${e.z + dz}`)))).toBe(true);
    }
    expect(new Set(world.environment.map(e => e.id)).size).toBe(world.environment.length);
    expect(generateWorld(createWorldConfig({ ...config, seed: 43 })).environment).not.toEqual(world.environment);
  });

  it('continues the PRNG sequence from its saved state', () => {
    const random = new SeededRandom(0);
    random.next();
    const restored = new SeededRandom(random.state);
    expect(restored.next()).toBe(random.next());
    expect(random.next()).toBeGreaterThanOrEqual(0);
    expect(random.next()).toBeLessThan(1);
  });

  it('rejects fractional grid indices and isolates deserialized data', () => {
    const grid = new GridSystem();
    expect(grid.size).toBe(32);
    expect(grid.getCell(1.5, 0)).toBeNull();
    const saved = grid.serialize();
    grid.deserialize(saved);
    saved[0][0].canBuild = false;
    expect(grid.getCell(0, 0)?.canBuild).toBe(true);
  });
});
