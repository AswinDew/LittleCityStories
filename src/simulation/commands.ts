import type { GridCoord } from '@/world/GridMath';
import type { TerrainType } from '@/world/GridSystem';

export interface PlaceBuildingCommand { type: 'placeBuilding'; defId: string; cell: GridCoord; rotation: number }
export type GameCommand = PlaceBuildingCommand |
  { type: 'placeRoad'; cell: GridCoord } |
  { type: 'cancelConstruction' | 'demolishBuilding'; instanceId: string } |
  { type: 'clearEnvironment'; environmentId: string } |
  { type: 'setTerrain'; cell: GridCoord; terrain: TerrainType };
export type CommandFailure = 'invalid_command' | 'invalid_cell' | 'invalid_terrain' | 'unknown_building' |
  'invalid_rotation' | 'out_of_bounds' | 'occupied' | 'environment_blocked' | 'citizen_occupied' |
  'insufficient_resources' | 'entrance_blocked' | 'protected_building' | 'not_found' | 'invalid_state' | 'locked';
export type CommandResult = { ok: true; instanceId?: string } | { ok: false; reason: CommandFailure };
