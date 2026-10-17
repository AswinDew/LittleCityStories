import type { WorldConfig } from '@/config/WorldConfig';
import type { WorldData } from '@/world/WorldGenerator';
import type { Citizen } from '@/citizens/types';
import type { PlacedBuilding } from '@/buildings/types';
import type { ResourceBundle } from '@/economy/types';

/** Plain authoritative domain state; rendering and UI receive frozen snapshots. */
export interface SimulationState {
  config: WorldConfig;
  world: WorldData;
  tick: number;
  randomState: number;
  nextId: number;
  citizens: Record<string, Citizen>;
  buildings: Record<string, PlacedBuilding>;
  resources: ResourceBundle;
  capacity: ResourceBundle;
  unlockedTechnologyIds: string[];
  economy: {
    consumptionTicks: number;
    /** Integer percentages, initially 100; hunger applies another 50%. */
    productionModifiers: ResourceBundle;
  };
}
