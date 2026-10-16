import { describe, it, expect } from 'vitest';
import { gridToWorld, worldToGrid, isWithinBounds, isFootprintWithinBounds } from '../src/utils/coordinates';
import { GridRenderer } from '../src/world/GridRenderer';
import { GameLighting } from '../src/game/Lighting';

describe('configurable world metrics', () => {
  it.each([20, 32])('round-trips a %s grid independently of defaults', size => {
    const metrics = { size, cellSize: 2 };
    expect(gridToWorld(0, 0, undefined, metrics).x).toBe(-size + 1);
    expect(gridToWorld(size - 1, size - 1, undefined, metrics).z).toBe(size - 1);
    for (let x = 0; x < size; x++) for (let z = 0; z < size; z++) {
      expect(worldToGrid(gridToWorld(x, z, undefined, metrics), metrics)).toEqual({ x, z });
    }
  });

  it('rejects non-integer and non-finite bounds/footprints', () => {
    expect(isWithinBounds(1.5, 0)).toBe(false);
    expect(isWithinBounds(NaN, 0)).toBe(false);
    expect(isFootprintWithinBounds(0, 0, { width: 0, depth: 1 })).toBe(false);
    expect(isFootprintWithinBounds(0, 0, { width: 1.5, depth: 1 })).toBe(false);
  });

  it('scales ground and shadows to the configured world', () => {
    const grid = new GridRenderer({ size: 32, cellSize: 3 });
    expect(grid.groundPlane.geometry.boundingSphere).toBeNull();
    grid.groundPlane.geometry.computeBoundingBox();
    expect(grid.groundPlane.geometry.boundingBox?.max.x).toBe(48);
    const lighting = new GameLighting({ size: 32, cellSize: 3 });
    expect(lighting.sunLight.shadow.camera.right).toBeCloseTo(86.4);
    grid.dispose();
    lighting.dispose();
  });
});
