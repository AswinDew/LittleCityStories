import type { GridCoord } from '@/world/GridMath';
import type { TerrainType } from '@/world/GridSystem';

/** Foundation terrain command; economic and construction commands arrive in M3. */
export type GameCommand = { type: 'setTerrain'; cell: GridCoord; terrain: TerrainType };
export type CommandFailure = 'invalid_command' | 'invalid_cell' | 'invalid_terrain';
export type CommandResult = { ok: true } | { ok: false; reason: CommandFailure };
