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
  path: GridCoord[];
  pathRevision: number;
  moveFrom: GridCoord | null;
  direction: 'NE' | 'NW' | 'SE' | 'SW';
  waitingReason: 'unreachable' | 'no_source' | 'storage_full' | 'no_home' | null;
}
/** A moving citizen occupies its whole active segment, not just floor(position). */
export function occupiesCell(citizen: Citizen, cell: GridCoord): boolean {
  return (Math.floor(citizen.position.x) === cell.x && Math.floor(citizen.position.z) === cell.z) ||
    (citizen.pathProgress > 0 && [citizen.moveFrom, citizen.path?.[0]].some(point => point?.x === cell.x && point.z === cell.z));
}
