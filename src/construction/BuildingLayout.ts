import type { BuildingDefinition } from '@/buildings/types';
import { getOccupiedCells, GridCoord } from '@/world/GridMath';

export function buildingLayout(definition: BuildingDefinition, cell: GridCoord, rotation: number) {
  const { width: w, depth: d } = definition.footprint;
  const footprint = rotation % 2 ? { width: d, depth: w } : { width: w, depth: d };
  let entrance: GridCoord | null = null;
  if (definition.entrance) {
    const { x, z } = definition.entrance;
    const local = rotation === 0 ? { x, z } : rotation === 1 ? { x: z, z: w - 1 - x } :
      rotation === 2 ? { x: w - 1 - x, z: d - 1 - z } : { x: d - 1 - z, z: x };
    entrance = { x: cell.x + local.x, z: cell.z + local.z };
  }
  return { footprint, entrance, cells: getOccupiedCells(cell.x, cell.z, footprint) };
}
