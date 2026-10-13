import { Vector3 } from 'three';

export const GRID_SIZE = 20;
export const CELL_SIZE = 2.0;

// World bounds for the grid
export const GRID_WORLD_WIDTH = GRID_SIZE * CELL_SIZE;
export const GRID_ORIGIN_X = -GRID_WORLD_WIDTH / 2;
export const GRID_ORIGIN_Z = -GRID_WORLD_WIDTH / 2;

export interface GridCoord {
  x: number;
  z: number;
}

export interface Footprint {
  width: number; // grid cells along X
  depth: number; // grid cells along Z
}

/**
 * Converts a grid coordinate (cell index) to the world coordinate of its center.
 * @param gx Grid X coordinate (0 to GRID_SIZE - 1)
 * @param gz Grid Z coordinate (0 to GRID_SIZE - 1)
 * @param footprint Optional building footprint width and depth in grid cells (default 1x1)
 */
export function gridToWorld(gx: number, gz: number, footprint: Footprint = { width: 1, depth: 1 }): Vector3 {
  const worldX = GRID_ORIGIN_X + (gx + footprint.width * 0.5) * CELL_SIZE;
  const worldZ = GRID_ORIGIN_Z + (gz + footprint.depth * 0.5) * CELL_SIZE;
  return new Vector3(worldX, 0, worldZ);
}

/**
 * Converts a 3D world position to the nearest containing grid coordinate (cell index).
 * Uses a minute epsilon tolerance (1e-8) to absorb IEEE 754 floating point rounding near cell boundaries.
 */
const COORD_EPSILON = 1e-8;
export function worldToGrid(position: Vector3 | { x: number; z: number }): GridCoord {
  const gx = Math.floor((position.x - GRID_ORIGIN_X + COORD_EPSILON) / CELL_SIZE);
  const gz = Math.floor((position.z - GRID_ORIGIN_Z + COORD_EPSILON) / CELL_SIZE);
  return { x: gx, z: gz };
}

/**
 * Checks if a grid coordinate is within valid bounds.
 */
export function isWithinBounds(gx: number, gz: number, gridSize: number = GRID_SIZE): boolean {
  return gx >= 0 && gx < gridSize && gz >= 0 && gz < gridSize;
}

/**
 * Checks if an entire footprint starting at (gx, gz) fits completely inside the grid.
 */
export function isFootprintWithinBounds(
  gx: number,
  gz: number,
  footprint: Footprint,
  gridSize: number = GRID_SIZE
): boolean {
  return (
    gx >= 0 &&
    gz >= 0 &&
    gx + footprint.width <= gridSize &&
    gz + footprint.depth <= gridSize
  );
}

/**
 * Returns a list of all grid coordinates occupied by a footprint placed at (gx, gz).
 */
export function getOccupiedCells(gx: number, gz: number, footprint: Footprint): GridCoord[] {
  const cells: GridCoord[] = [];
  for (let dx = 0; dx < footprint.width; dx++) {
    for (let dz = 0; dz < footprint.depth; dz++) {
      cells.push({ x: gx + dx, z: gz + dz });
    }
  }
  return cells;
}
