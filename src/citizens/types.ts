import type { GridCoord } from '@/world/GridMath';
export type Occupation = 'villager' | 'farmer' | 'lumberjack' | 'builder';
export interface Citizen {
  id: string;
  name: string;
  occupation: Occupation;
  homeId: string | null;
  workplaceId: string | null;
  /** M5 navigation owns this signal; arrival alone does not certify a valid route. */
  workplaceAccess: 'unknown' | 'reachable' | 'unreachable';
  activity: 'idle' | 'navigate' | 'work' | 'return';
  position: GridCoord;
  destination: GridCoord | null;
  animationState: 'idle' | 'walk' | 'harvest' | 'chop' | 'build' | 'work';
  pathProgress: number;
  hungry: boolean;
  activityTicks: number;
}
