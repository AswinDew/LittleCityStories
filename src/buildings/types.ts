import { Footprint } from '@/utils/coordinates';

export type BuildingCategory =
  | 'residential'
  | 'commercial'
  | 'municipal'
  | 'transport'
  | 'nature';

export interface BuildingDefinition {
  id: string;
  name: string;
  category: BuildingCategory;
  cost: number;
  footprint: Footprint;
  maintenanceCost: number;
  capacity: number; // e.g. citizens housed or jobs provided
  description: string;
  icon: string;
  unlockedByDefault: boolean;
}

export interface PlacedBuilding {
  instanceId: string;
  defId: string;
  gridX: number;
  gridZ: number;
  rotation?: number; // 0: 0°, 1: 90°, 2: 180°, 3: 270°
  level: number;
  seed: number;
  placedAt: number;
}
