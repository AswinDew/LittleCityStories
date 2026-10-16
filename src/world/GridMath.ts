export interface GridMetrics { size: number; cellSize: number }
export interface GridCoord { x: number; z: number }
export interface Footprint { width: number; depth: number }
export const DEFAULT_GRID_METRICS: Readonly<GridMetrics> = Object.freeze({ size: 32, cellSize: 2 });
export const GRID_SIZE = DEFAULT_GRID_METRICS.size;
export const CELL_SIZE = DEFAULT_GRID_METRICS.cellSize;
export const GRID_WORLD_WIDTH = GRID_SIZE * CELL_SIZE;
export const GRID_ORIGIN_X = -GRID_WORLD_WIDTH / 2;
export const GRID_ORIGIN_Z = GRID_ORIGIN_X;

export function validateMetrics(metrics: GridMetrics): void {
  if (!Number.isInteger(metrics.size) || metrics.size < 1 || metrics.size > 128 ||
      !Number.isFinite(metrics.cellSize) || metrics.cellSize <= 0 || metrics.cellSize > 100) {
    throw new RangeError('Invalid grid metrics');
  }
}
export function isWithinBounds(x: number, z: number, size = GRID_SIZE): boolean {
  return Number.isInteger(x) && Number.isInteger(z) && Number.isInteger(size) &&
    x >= 0 && x < size && z >= 0 && z < size;
}
export function isFootprintWithinBounds(x: number, z: number, footprint: Footprint, size = GRID_SIZE): boolean {
  return isWithinBounds(x, z, size) && Number.isInteger(footprint.width) && Number.isInteger(footprint.depth) &&
    footprint.width > 0 && footprint.depth > 0 && x + footprint.width <= size && z + footprint.depth <= size;
}
export function getOccupiedCells(x: number, z: number, footprint: Footprint): GridCoord[] {
  if (!Number.isInteger(x) || !Number.isInteger(z) || !Number.isInteger(footprint.width) ||
      !Number.isInteger(footprint.depth) || footprint.width <= 0 || footprint.depth <= 0 ||
      footprint.width > 128 || footprint.depth > 128) throw new RangeError('Invalid footprint');
  const cells: GridCoord[] = [];
  for (let dx = 0; dx < footprint.width; dx++) for (let dz = 0; dz < footprint.depth; dz++) {
    cells.push({ x: x + dx, z: z + dz });
  }
  return cells;
}
export function gridToPosition(x: number, z: number, footprint: Footprint = { width: 1, depth: 1 },
  metrics: GridMetrics = DEFAULT_GRID_METRICS): GridCoord {
  validateMetrics(metrics);
  if (!Number.isInteger(x) || !Number.isInteger(z) || !Number.isInteger(footprint.width) ||
      !Number.isInteger(footprint.depth) || footprint.width <= 0 || footprint.depth <= 0) {
    throw new RangeError('Invalid grid coordinate or footprint');
  }
  // Preview may extend beyond the map; placement validation rejects it separately.
  const origin = -metrics.size * metrics.cellSize / 2;
  return { x: origin + (x + footprint.width / 2) * metrics.cellSize,
    z: origin + (z + footprint.depth / 2) * metrics.cellSize };
}
export function positionToGrid(position: GridCoord, metrics: GridMetrics = DEFAULT_GRID_METRICS): GridCoord {
  const origin = -metrics.size * metrics.cellSize / 2;
  return { x: Math.floor((position.x - origin) / metrics.cellSize + 1e-8),
    z: Math.floor((position.z - origin) / metrics.cellSize + 1e-8) };
}
