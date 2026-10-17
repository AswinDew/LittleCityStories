import type { Footprint, GridCoord } from '@/world/GridMath';
import type { ResourceBundle, ResourceId } from '@/economy/types';

export type BuildingCategory = 'housing' | 'production' | 'infrastructure' | 'community';
export interface BuildingDefinition {
  id: string;
  name: string;
  category: BuildingCategory;
  cost: ResourceBundle;
  footprint: Footprint;
  entrance: GridCoord | null;
  requiredWorkTicks: number;
  workerSlots: number;
  housing: number;
  storage: number;
  production?: { resource: ResourceId; amount: number; intervalTicks: number };
  unlockedBy: string | null;
  purchasable: boolean;
  description: string;
}
export interface PlacedBuilding {
  instanceId: string;
  defId: string;
  gridX: number;
  gridZ: number;
  rotation: number;
  footprint: Footprint;
  entrance: GridCoord | null;
  status: 'planned' | 'under_construction' | 'completed';
  workTicks: number;
  paidResources: ResourceBundle;
  level: number;
  seed: number;
  placedAt: number;
}
