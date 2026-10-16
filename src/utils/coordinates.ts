import { Vector3 } from 'three';
import { DEFAULT_GRID_METRICS, gridToPosition, positionToGrid } from '@/world/GridMath';
import type { Footprint, GridCoord, GridMetrics } from '@/world/GridMath';
export * from '@/world/GridMath';

/** Rendering adapter; domain code imports GridMath instead. */
export function gridToWorld(x: number, z: number, footprint?: Footprint,
  metrics: GridMetrics = DEFAULT_GRID_METRICS): Vector3 {
  const point = gridToPosition(x, z, footprint, metrics);
  return new Vector3(point.x, 0, point.z);
}
export function worldToGrid(position: GridCoord, metrics: GridMetrics = DEFAULT_GRID_METRICS): GridCoord {
  return positionToGrid(position, metrics);
}
