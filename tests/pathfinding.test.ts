import { describe, expect, it } from 'vitest';
import { GridSystem } from '../src/world/GridSystem';
import { NavigationGrid } from '../src/world/NavigationGrid';
import { findPath, Pathfinder } from '../src/world/Pathfinder';
import { SimulationSession } from '../src/simulation/SimulationSession';

describe('deterministic four-way navigation', () => {
  it.each([0, 1, 2, 3])('routes to a rotated entrance %s without crossing the footprint', rotation => {
    const session = new SimulationSession({ environmentDensity: 0, startingPopulation: 0 });
    const placed = session.dispatch({ type: 'placeBuilding', defId: 'farm', cell: { x: 12, z: 12 }, rotation });
    if (!placed.ok) throw new Error(placed.reason);
    const state = session.getSnapshot(), site = state.buildings[placed.instanceId!];
    const grid = new NavigationGrid(state.config.metrics.size, (x, z) => state.world.grid[x]?.[z] ?? null);
    const path = findPath(grid, state.world.entrance, site.entrance!)!;
    expect(path.at(-1)).toEqual(site.entrance);
    expect(path.some(p => p.x >= 12 && p.x <= 13 && p.z >= 12 && p.z <= 13)).toBe(false);
  });
  it('routes around blockers with stable ties and rejects invalid/unreachable endpoints', () => {
    const cells = new GridSystem(5), grid = new NavigationGrid(5, (x, z) => cells.getCell(x, z));
    cells.setBuilding(2, 2, 'wall');
    const path = findPath(grid, { x: 1, z: 2 }, { x: 3, z: 2 });
    expect(path).toEqual([{ x: 1, z: 2 }, { x: 1, z: 1 }, { x: 2, z: 1 }, { x: 3, z: 1 }, { x: 3, z: 2 }]);
    expect(findPath(grid, { x: 0, z: 0 }, { x: 0, z: 0 })).toEqual([{ x: 0, z: 0 }]);
    expect(findPath(grid, { x: -1, z: 0 }, { x: 0, z: 0 })).toBeNull();
    expect(findPath(grid, { x: 0.5, z: 0 }, { x: 0, z: 0 })).toBeNull();
    for (let z = 0; z < 5; z++) cells.setTerrain(2, z, 'water');
    expect(findPath(grid, { x: 1, z: 2 }, { x: 3, z: 2 })).toBeNull();
  });
  it('chooses a longer road route when its total cost is lower', () => {
    const cells = new GridSystem(7), grid = new NavigationGrid(7, (x, z) => cells.getCell(x, z));
    for (let x = 0; x < 7; x++) cells.setRoad(x, 0, true);
    cells.setRoad(6, 1, true);
    const path = findPath(grid, { x: 0, z: 1 }, { x: 6, z: 1 })!;
    expect(path).toHaveLength(9);
    expect(path.slice(1).reduce((sum, cell) => sum + grid.cost(cell), 0)).toBe(8);
  });
  it('caches by coordinates/grid/revision, returns isolated paths, and invalidates only on changes', () => {
    const cells = new GridSystem(5); let revision = 0, reads = 0;
    const grid = new NavigationGrid(5, (x, z) => { reads++; return cells.getCell(x, z); }, () => revision), finder = new Pathfinder();
    const first = finder.findPath(grid, { x: 0, z: 0 }, { x: 4, z: 0 })!;
    const before = reads; first[0].x = 99;
    expect(finder.findPath(grid, { x: 0, z: 0 }, { x: 4, z: 0 })![0]).toEqual({ x: 0, z: 0 });
    expect(reads).toBe(before);
    cells.setBuilding(2, 0, 'wall'); revision++;
    const after = finder.findPath(grid, { x: 0, z: 0 }, { x: 4, z: 0 })!;
    expect(after.some(cell => cell.x === 2 && cell.z === 0)).toBe(false); expect(reads).toBeGreaterThan(before);
  });
  it('changes session revision only when walkability or movement cost changes', () => {
    const session = new SimulationSession({ environmentDensity: 0 });
    const initial = session.getSnapshot().navigationRevision;
    session.dispatch({ type: 'setTerrain', cell: { x: 1, z: 1 }, terrain: 'dirt' });
    expect(session.getSnapshot().navigationRevision).toBe(initial);
    session.dispatch({ type: 'placeRoad', cell: { x: 1, z: 1 } });
    expect(session.getSnapshot().navigationRevision).toBe(initial + 1);
    session.dispatch({ type: 'placeRoad', cell: { x: 1, z: 1 } });
    expect(session.getSnapshot().navigationRevision).toBe(initial + 1);
    const tree = session.getSnapshot().world.environment.find(object => object.kind === 'tree')!;
    session.dispatch({ type: 'clearEnvironment', environmentId: tree.id });
    expect(session.getSnapshot().navigationRevision).toBe(initial + 2);
  });
});
