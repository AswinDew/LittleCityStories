import type { GridCoord } from '@/world/GridMath';
export type Occupation = 'villager' | 'farmer' | 'lumberjack' | 'builder';
export interface Citizen {
  id: string;
  name: string;
  occupation: Occupation;
  homeId: string | null;
  workplaceId: string | null;
  activity: 'idle' | 'navigate' | 'work' | 'return';
  position: GridCoord;
  destination: GridCoord | null;
  animationState: 'idle' | 'walk' | 'harvest' | 'chop' | 'build' | 'work';
  pathProgress: number;
  hungry: boolean;
  activityTicks: number;
}
