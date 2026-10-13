import { describe, it, expect, beforeEach } from 'vitest';
import { GridSystem } from '../src/world/GridSystem';

describe('GridSystem', () => {
  let grid: GridSystem;

  beforeEach(() => {
    grid = new GridSystem(20);
  });

  it('initializes grid with 20x20 cells', () => {
    expect(grid.size).toBe(20);
    const cell00 = grid.getCell(0, 0);
    expect(cell00).not.toBeNull();
    expect(cell00?.terrain).toBe('grass');
    expect(cell00?.buildingId).toBeNull();
    expect(cell00?.isRoad).toBe(false);
    expect(cell00?.canBuild).toBe(true);

    const cell1919 = grid.getCell(19, 19);
    expect(cell1919).not.toBeNull();

    expect(grid.getCell(20, 20)).toBeNull();
    expect(grid.getCell(-1, 0)).toBeNull();
  });

  it('sets and clears buildings on cells', () => {
    expect(grid.isCellAvailable(5, 5)).toBe(true);
    grid.setBuilding(5, 5, 'house-1');
    expect(grid.isCellAvailable(5, 5)).toBe(false);
    expect(grid.getCell(5, 5)?.buildingId).toBe('house-1');

    grid.clearBuilding(5, 5);
    expect(grid.isCellAvailable(5, 5)).toBe(true);
    expect(grid.getCell(5, 5)?.buildingId).toBeNull();
  });

  it('handles road status', () => {
    grid.setRoad(3, 4, true);
    expect(grid.getCell(3, 4)?.isRoad).toBe(true);
    expect(grid.isCellAvailable(3, 4)).toBe(false);
  });

  it('queries orthogonal and all neighbors properly', () => {
    const orthogonal = grid.getOrthogonalNeighbors(1, 1);
    expect(orthogonal).toHaveLength(4);
    expect(orthogonal[0]?.z).toBe(0); // North (1, 0)
    expect(orthogonal[1]?.x).toBe(2); // East (2, 1)
    expect(orthogonal[2]?.z).toBe(2); // South (1, 2)
    expect(orthogonal[3]?.x).toBe(0); // West (0, 1)

    const all = grid.getAllNeighbors(0, 0);
    expect(all).toHaveLength(3); // Corner cell has only 3 neighbors
  });

  it('serializes and deserializes cleanly', () => {
    grid.setBuilding(2, 2, 'bldg-99');
    grid.setRoad(2, 3, true);

    const snapshot = grid.serialize();
    const newGrid = new GridSystem(20);
    newGrid.deserialize(snapshot);

    expect(newGrid.getCell(2, 2)?.buildingId).toBe('bldg-99');
    expect(newGrid.getCell(2, 3)?.isRoad).toBe(true);
  });

  it('rejects corrupt deserialization with invalid columns, rows, or cell shape', () => {
    grid.setBuilding(5, 5, 'preserve-me');

    // Wrong row count (10 instead of 20)
    const badRows = Array(10).fill(Array(20).fill({ x: 0, z: 0, terrain: 'grass' }));
    grid.deserialize(badRows as any);
    expect(grid.getCell(5, 5)?.buildingId).toBe('preserve-me');

    // Right row count (20), but column length mismatch (10 cols instead of 20)
    const badCols = Array(20).fill(Array(10).fill({ x: 0, z: 0, terrain: 'grass' }));
    grid.deserialize(badCols as any);
    expect(grid.getCell(5, 5)?.buildingId).toBe('preserve-me');

    // Malformed cell structure
    const malformed = Array(20).fill(Array(20).fill(null));
    grid.deserialize(malformed as any);
    expect(grid.getCell(5, 5)?.buildingId).toBe('preserve-me');
  });

  it('resets grid cleanly via reset()', () => {
    grid.setBuilding(5, 5, 'temp-building');
    grid.setRoad(5, 6, true);
    grid.reset();

    expect(grid.getCell(5, 5)?.buildingId).toBeNull();
    expect(grid.getCell(5, 6)?.isRoad).toBe(false);
  });
});
