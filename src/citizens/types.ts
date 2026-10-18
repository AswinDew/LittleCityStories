import type { GridCoord } from '@/world/GridMath';
export type Occupation = 'villager' | 'farmer' | 'lumberjack' | 'builder';
export interface BuildingRoom {
  buildingId: string;
  purpose: 'home' | 'work';
  phase: 'entering' | 'inside' | 'leaving';
  slot: number;
  entrance: GridCoord;
  door: GridCoord;
  route: GridCoord[];
  step: number;
  ticks: number;
  from: GridCoord;
  hidden: boolean;
}
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
  animationState: 'idle' | 'walk' | 'harvest' | 'water' | 'chop' | 'mine' | 'research' | 'build' | 'work';
  pathProgress: number;
  hungry: boolean;
  activityTicks: number;
  path: GridCoord[];
  pathRevision: number;
  moveFrom: GridCoord | null;
  direction: 'NE' | 'NW' | 'SE' | 'SW';
  waitingReason: 'unreachable' | 'no_source' | 'storage_full' | 'no_home' | null;
  room: BuildingRoom | null;
}
/** A moving citizen occupies its whole active segment, not just floor(position). */
export function occupiesCell(citizen: Citizen, cell: GridCoord): boolean {
  const room = citizen.room;
  // Keep the private exit available even between demolition and the next activity tick.
  const corridor = room ? [citizen.position, ...room.route.slice(room.step), room.door, room.entrance] : [];
  const privateRoute = corridor.some((point, index) => {
    const next = corridor[index + 1] ?? point;
    // Conservative bounds reserve every rounded navigation cell along each short segment.
    return cell.x >= Math.round(Math.min(point.x, next.x)) && cell.x <= Math.round(Math.max(point.x, next.x)) &&
      cell.z >= Math.round(Math.min(point.z, next.z)) && cell.z <= Math.round(Math.max(point.z, next.z));
  });
  return (Math.floor(citizen.position.x) === cell.x && Math.floor(citizen.position.z) === cell.z) ||
    (citizen.pathProgress > 0 && [citizen.moveFrom, citizen.path?.[0]].some(point => point?.x === cell.x && point.z === cell.z)) ||
    privateRoute;
}
