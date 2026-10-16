import type { WorldConfig } from '@/config/WorldConfig';
import type { WorldData } from '@/world/WorldGenerator';
import type { Citizen } from '@/citizens/types';

/** M1 intentionally has no second building inventory; legacy store owns it until M3. */
export interface SimulationState {
  config: WorldConfig;
  world: WorldData;
  tick: number;
  randomState: number;
  nextId: number;
  citizens: Record<string, Citizen>;
}
