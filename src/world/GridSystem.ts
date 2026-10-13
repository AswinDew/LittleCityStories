import { GRID_SIZE, isWithinBounds } from '@/utils/coordinates';

export type TerrainType = 'grass' | 'dirt' | 'concrete' | 'water';

export interface CellState {
  x: number;
  z: number;
  terrain: TerrainType;
  buildingId: string | null;
  isRoad: boolean;
  canBuild: boolean;
}

export class GridSystem {
  public readonly size: number;
  private cells: CellState[][];

  constructor(size: number = GRID_SIZE) {
    this.size = size;
    this.cells = [];
    this.init();
  }

  private init(): void {
    this.cells = [];
    for (let x = 0; x < this.size; x++) {
      this.cells[x] = [];
      for (let z = 0; z < this.size; z++) {
        this.cells[x][z] = {
          x,
          z,
          terrain: 'grass',
          buildingId: null,
          isRoad: false,
          canBuild: true,
        };
      }
    }
  }

  /**
   * Clears and resets the entire grid back to default empty grass state.
   */
  public reset(): void {
    this.init();
  }

  public getCell(x: number, z: number): CellState | null {
    if (!isWithinBounds(x, z, this.size)) return null;
    return this.cells[x][z];
  }

  public isCellAvailable(x: number, z: number): boolean {
    const cell = this.getCell(x, z);
    if (!cell) return false;
    return cell.canBuild && cell.buildingId === null && !cell.isRoad;
  }

  public setBuilding(x: number, z: number, buildingId: string): boolean {
    const cell = this.getCell(x, z);
    if (!cell) return false;
    cell.buildingId = buildingId;
    return true;
  }

  public clearBuilding(x: number, z: number): boolean {
    const cell = this.getCell(x, z);
    if (!cell) return false;
    cell.buildingId = null;
    return true;
  }

  public setRoad(x: number, z: number, isRoad: boolean): boolean {
    const cell = this.getCell(x, z);
    if (!cell) return false;
    cell.isRoad = isRoad;
    return true;
  }

  public setTerrain(x: number, z: number, terrain: TerrainType): boolean {
    const cell = this.getCell(x, z);
    if (!cell) return false;
    cell.terrain = terrain;
    return true;
  }

  /**
   * Returns adjacent cells (North, East, South, West)
   */
  public getOrthogonalNeighbors(x: number, z: number): (CellState | null)[] {
    return [
      this.getCell(x, z - 1), // North
      this.getCell(x + 1, z), // East
      this.getCell(x, z + 1), // South
      this.getCell(x - 1, z), // West
    ];
  }

  /**
   * Returns all 8 surrounding neighbors
   */
  public getAllNeighbors(x: number, z: number): CellState[] {
    const neighbors: CellState[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        const cell = this.getCell(x + dx, z + dz);
        if (cell) neighbors.push(cell);
      }
    }
    return neighbors;
  }

  public serialize(): CellState[][] {
    return JSON.parse(JSON.stringify(this.cells));
  }

  public deserialize(savedCells: CellState[][]): void {
    if (
      !savedCells ||
      !Array.isArray(savedCells) ||
      savedCells.length !== this.size ||
      !savedCells.every(
        (row) =>
          Array.isArray(row) &&
          row.length === this.size &&
          row.every(
            (cell) =>
              cell &&
              typeof cell.x === 'number' &&
              typeof cell.z === 'number' &&
              typeof cell.terrain === 'string' &&
              typeof cell.isRoad === 'boolean' &&
              typeof cell.canBuild === 'boolean' &&
              (cell.buildingId === null || typeof cell.buildingId === 'string')
          )
      )
    ) {
      console.warn('[GridSystem] Corrupt save data — keeping fresh grid.');
      return;
    }
    this.cells = savedCells;
  }
}
