import type { PlacedBuilding } from '@/buildings/types';
import type { GridCoord } from '@/world/GridMath';
import type { SimulationState } from '@/simulation/types';
import type { Citizen, BuildingRoom } from './types';

/** Model-local tile coordinates; the same quarter turn as the building mesh/entrance. */
export function buildingPoint(building: PlacedBuilding, point: GridCoord): GridCoord {
  const w = building.rotation % 2 ? building.footprint.depth : building.footprint.width;
  const d = building.rotation % 2 ? building.footprint.width : building.footprint.depth;
  const { x, z } = point, r = building.rotation;
  const local = r === 0 ? { x, z } : r === 1 ? { x: z, z: w - 1 - x } :
    r === 2 ? { x: w - 1 - x, z: d - 1 - z } : { x: d - 1 - z, z: x };
  return { x: building.gridX + local.x, z: building.gridZ + local.z };
}
export function roomLayout(building: PlacedBuilding, purpose: 'home' | 'work', slot = 0, builder = false) {
  const w = building.rotation % 2 ? building.footprint.depth : building.footprint.width;
  const d = building.rotation % 2 ? building.footprint.width : building.footprint.depth;
  let door = { x: (w - 1) / 2, z: d - 0.65 }, station = { x: (w - 1) / 2, z: (d - 1) / 2 };
  if (purpose === 'home') {
    if (building.defId === 'town_center') { door = { x: 1, z: 1.5 }; station = { x: 1, z: 0.75 }; }
    else { door = { x: (w - 1) / 2, z: d === 1 ? 0.35 : d - 0.9 }; station.z -= 0.05; }
  } else if (builder) {
    door.z = d - 0.5; station = { x: (w - 1) / 2, z: d - 0.65 };
  } else if (building.defId === 'farm') station = slot % 2 ? { x: 0.95, z: 0.25 } : { x: 0.1, z: 0.9 };
  else if (building.defId === 'lumber_camp') station = slot % 2 ? { x: 1.18, z: 0.75 } : { x: 0.9, z: 1.12 };
  else if (building.defId === 'stone_quarry') station = slot % 2 ? { x: 1.15, z: 0.85 } : { x: 0.2, z: 1.1 };
  else if (building.defId === 'research_hut') { door = { x: 0.375, z: 0.95 }; station = { x: 0.675, z: 0.78 }; }
  return { door: buildingPoint(building, door), station: buildingPoint(building, station) };
}
export function workerSlot(citizen: Citizen, state: Readonly<SimulationState>): number {
  return Math.max(0, Object.entries(state.citizens).filter(([id, c]) => id === c.id && c.workplaceId === citizen.workplaceId)
    .map(([, c]) => c.id).sort((a, b) => a.localeCompare(b)).indexOf(citizen.id));
}
export function atWorkstation(citizen: Citizen, building: PlacedBuilding): boolean {
  const room = citizen.room;
  if (!room || room.buildingId !== building.instanceId || room.purpose !== 'work' || room.phase !== 'inside') return false;
  const target = roomLayout(building, 'work', room.slot, citizen.occupation === 'builder').station;
  return Math.abs(citizen.position.x - target.x) < 1e-8 && Math.abs(citizen.position.z - target.z) < 1e-8;
}
export function jobAnimation(defId: string, workTicks = 0): Citizen['animationState'] {
  return defId === 'farm' ? (Math.floor(workTicks / 75) % 3 === 2 ? 'water' : 'harvest') :
    defId === 'lumber_camp' ? 'chop' : defId === 'stone_quarry' ? 'mine' : defId === 'research_hut' ? 'research' : 'work';
}
export function enterRoom(citizen: Citizen, building: PlacedBuilding, purpose: 'home' | 'work', slot = 0): BuildingRoom {
  const layout = roomLayout(building, purpose, slot, citizen.occupation === 'builder');
  return { buildingId: building.instanceId, purpose, phase: 'entering', slot, entrance: { ...building.entrance! },
    door: layout.door, route: [layout.door, layout.station], step: 0, ticks: 0, from: { ...citizen.position }, hidden: false };
}
/** Preserve a continuous exit when a job is released or replaced inside a building. */
export function leaveRoom(citizen: Citizen): void {
  const room = citizen.room!;
  if (room.phase === 'leaving') return;
  const outsideDoor = room.phase === 'entering' && room.step === 0 && !room.hidden;
  room.phase = 'leaving'; room.route = outsideDoor ? [{ ...room.entrance }] : [{ ...room.door }, { ...room.entrance }];
  room.step = 0; room.ticks = 0; room.from = { ...citizen.position };
  citizen.path = []; citizen.pathProgress = 0; citizen.moveFrom = null; citizen.destination = null;
  citizen.workplaceAccess = 'unknown';
}
