import type { CellState } from './GridSystem';
import type { GridCoord } from './GridMath';
export class NavigationGrid {
  constructor(readonly size: number, private readonly readCell: (x: number, z: number) => CellState | null,
    private readonly readRevision = () => 0) {}
  get revision(): number { return this.readRevision(); }
  isWalkable(cell: GridCoord, ownBuildingId?: string): boolean {
    if (!Number.isInteger(cell.x) || !Number.isInteger(cell.z) || cell.x < 0 || cell.z < 0 || cell.x >= this.size || cell.z >= this.size) return false;
    const tile = this.readCell(cell.x, cell.z);
    return !!tile && tile.canBuild && tile.terrain !== 'water' && (!tile.buildingId || tile.isRoad || tile.buildingId === ownBuildingId);
  }
  cost(cell: GridCoord): number { return this.readCell(cell.x, cell.z)?.isRoad ? 1 : 2; }
}
