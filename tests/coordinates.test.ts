import { describe, it, expect } from 'vitest';
import {
  GRID_SIZE,
  CELL_SIZE,
  GRID_ORIGIN_X,
  GRID_ORIGIN_Z,
  gridToWorld,
  worldToGrid,
  isWithinBounds,
  isFootprintWithinBounds,
  getOccupiedCells,
} from '../src/utils/coordinates';

describe('Coordinates and Grid Utilities', () => {
  it('converts grid coordinate to world position correctly', () => {
    // Cell (0, 0) center should be origin + 0.5 * CELL_SIZE
    const world00 = gridToWorld(0, 0);
    expect(world00.x).toBeCloseTo(GRID_ORIGIN_X + 0.5 * CELL_SIZE);
    expect(world00.z).toBeCloseTo(GRID_ORIGIN_Z + 0.5 * CELL_SIZE);
    expect(world00.y).toBe(0);

    // Center cell of the default grid.
    const world1010 = gridToWorld(GRID_SIZE / 2, GRID_SIZE / 2);
    expect(world1010.x).toBeCloseTo(0 + 0.5 * CELL_SIZE);
    expect(world1010.z).toBeCloseTo(0 + 0.5 * CELL_SIZE);
  });

  it('performs accurate round-trip between grid and world coordinates', () => {
    for (let x = 0; x < GRID_SIZE; x += 5) {
      for (let z = 0; z < GRID_SIZE; z += 5) {
        const worldPos = gridToWorld(x, z);
        const gridPos = worldToGrid(worldPos);
        expect(gridPos.x).toBe(x);
        expect(gridPos.z).toBe(z);
      }
    }
  });

  it('handles multi-cell footprints centered properly', () => {
    const footprint = { width: 2, depth: 2 };
    const worldPos = gridToWorld(0, 0, footprint);
    expect(worldPos.x).toBeCloseTo(GRID_ORIGIN_X + 1.0 * CELL_SIZE);
    expect(worldPos.z).toBeCloseTo(GRID_ORIGIN_Z + 1.0 * CELL_SIZE);

    const cells = getOccupiedCells(2, 3, footprint);
    expect(cells).toHaveLength(4);
    expect(cells).toEqual([
      { x: 2, z: 3 },
      { x: 2, z: 4 },
      { x: 3, z: 3 },
      { x: 3, z: 4 },
    ]);
  });

  it('validates cell bounds correctly', () => {
    expect(isWithinBounds(0, 0)).toBe(true);
    expect(isWithinBounds(GRID_SIZE - 1, GRID_SIZE - 1)).toBe(true);
    expect(isWithinBounds(-1, 0)).toBe(false);
    expect(isWithinBounds(0, -1)).toBe(false);
    expect(isWithinBounds(GRID_SIZE, 0)).toBe(false);
    expect(isWithinBounds(0, GRID_SIZE)).toBe(false);
  });

  it('validates multi-cell footprints within grid bounds', () => {
    const fp2x2 = { width: 2, depth: 2 };
    expect(isFootprintWithinBounds(0, 0, fp2x2)).toBe(true);
    expect(isFootprintWithinBounds(GRID_SIZE - 2, GRID_SIZE - 2, fp2x2)).toBe(true);
    expect(isFootprintWithinBounds(GRID_SIZE - 1, GRID_SIZE - 1, fp2x2)).toBe(false);
    expect(isFootprintWithinBounds(-1, 0, fp2x2)).toBe(false);
  });
});
