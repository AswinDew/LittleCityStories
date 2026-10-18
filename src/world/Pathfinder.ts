import type { GridCoord } from './GridMath';
import type { NavigationGrid } from './NavigationGrid';
export class Pathfinder {
  private readonly caches = new WeakMap<NavigationGrid, { revision: number; routes: Map<string, GridCoord[] | null> }>();
  findPath(grid: NavigationGrid, start: GridCoord, goal: GridCoord): GridCoord[] | null {
    let cache = this.caches.get(grid);
    if (!cache || cache.revision !== grid.revision) {
      cache = { revision: grid.revision, routes: new Map() }; this.caches.set(grid, cache);
    }
    const key = `${start.x},${start.z}:${goal.x},${goal.z}`;
    if (!cache.routes.has(key)) {
      if (cache.routes.size >= 256) cache.routes.clear();
      cache.routes.set(key, this.search(grid, start, goal));
    }
    return cache.routes.get(key)?.map(cell => ({ ...cell })) ?? null;
  }
  private search(grid: NavigationGrid, start: GridCoord, goal: GridCoord): GridCoord[] | null {
    if (!grid.isWalkable(start) || !grid.isWalkable(goal)) return null;
    const index = (cell: GridCoord) => cell.z * grid.size + cell.x;
    const point = (id: number) => ({ x: id % grid.size, z: Math.floor(id / grid.size) });
    const heuristic = (id: number) => { const cell = point(id); return Math.abs(cell.x - goal.x) + Math.abs(cell.z - goal.z); };
    const startId = index(start), goalId = index(goal), open = new Set([startId]);
    const scores = new Map([[startId, 0]]), parent = new Map<number, number>();
    while (open.size) {
      const current = [...open].sort((a, b) => (scores.get(a)! + heuristic(a)) - (scores.get(b)! + heuristic(b)) ||
        heuristic(a) - heuristic(b) || a - b)[0];
      if (current === goalId) {
        const route = [point(current)]; let id = current;
        while (parent.has(id)) { id = parent.get(id)!; route.push(point(id)); }
        return route.reverse();
      }
      open.delete(current);
      const cell = point(current);
      for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const next = { x: cell.x + dx, z: cell.z + dz };
        if (!grid.isWalkable(next)) continue;
        const id = index(next), score = scores.get(current)! + grid.cost(next);
        if (score >= (scores.get(id) ?? Infinity)) continue;
        scores.set(id, score); parent.set(id, current); open.add(id);
      }
    }
    return null;
  }
}
export const findPath = (grid: NavigationGrid, start: GridCoord, goal: GridCoord) => new Pathfinder().findPath(grid, start, goal);
