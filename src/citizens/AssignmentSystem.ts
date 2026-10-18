import type { SimulationState } from '@/simulation/types';
import type { Citizen } from './types';
import type { CommandResult } from '@/simulation/commands';
import { BuildingRegistry } from '@/buildings/BuildingRegistry';
import { leaveRoom } from './BuildingPresence';

export function releaseWorker(citizen: Citizen): void {
  citizen.workplaceId = null; citizen.occupation = 'villager'; citizen.workplaceAccess = 'unknown';
  citizen.activity = 'return'; citizen.activityTicks = 0; citizen.destination = null; citizen.animationState = 'idle';
  citizen.waitingReason = null;
  // Finish an in-flight safe segment before routing home; never snap fractional positions.
  if (citizen.pathProgress === 0) { citizen.path = []; citizen.moveFrom = null; }
}
export class AssignmentSystem {
  constructor(private readonly registry = BuildingRegistry.getInstance()) {}
  assign(citizenId: string, buildingId: string, state: SimulationState): CommandResult {
    const citizen = Object.hasOwn(state.citizens, citizenId) ? state.citizens[citizenId] : null;
    const building = Object.hasOwn(state.buildings, buildingId) ? state.buildings[buildingId] : null;
    if (!citizen || !building) return { ok: false, reason: 'not_found' };
    if (citizen.workplaceId) return { ok: false, reason: 'already_assigned' };
    const def = this.registry.get(building.defId)!;
    const slots = building.status === 'completed' ? def.workerSlots : 1;
    if (!building.entrance || !slots) return { ok: false, reason: 'invalid_state' };
    if (Object.values(state.citizens).filter(c => c.workplaceId === buildingId).length >= slots) return { ok: false, reason: 'no_worker_slot' };
    // Manual assignments target completed workplaces; unfinished sites are exclusively auto-builders.
    if (building.status !== 'completed') return { ok: false, reason: 'invalid_state' };
    this.bind(citizen, buildingId, building.defId); return { ok: true };
  }
  private bind(citizen: Citizen, buildingId: string, defId: string, builder = false): void {
    if (citizen.room?.purpose === 'work') leaveRoom(citizen);
    citizen.workplaceId = buildingId;
    citizen.occupation = builder ? 'builder' : defId === 'farm' ? 'farmer' : defId === 'lumber_camp' ? 'lumberjack' : 'villager';
    citizen.activity = 'navigate'; citizen.animationState = 'idle'; citizen.workplaceAccess = 'unknown';
    citizen.destination = null; citizen.activityTicks = 0; citizen.waitingReason = null;
  }
  unassign(citizenId: string, state: SimulationState): CommandResult {
    const citizen = Object.hasOwn(state.citizens, citizenId) ? state.citizens[citizenId] : null;
    if (!citizen) return { ok: false, reason: 'not_found' };
    if (!citizen.workplaceId) return { ok: false, reason: 'invalid_state' };
    const building = state.buildings[citizen.workplaceId];
    if (building) delete building.productionWork[citizen.id];
    releaseWorker(citizen); return { ok: true };
  }
  step(state: SimulationState): void {
    const citizens = Object.values(state.citizens).sort((a, b) => a.id.localeCompare(b.id));
    for (const citizen of citizens) if (citizen.workplaceId) {
      const building = state.buildings[citizen.workplaceId];
      if (!building || (citizen.occupation === 'builder' && building.status === 'completed')) releaseWorker(citizen);
    }
    for (const building of Object.values(state.buildings).sort((a, b) => a.instanceId.localeCompare(b.instanceId))) {
      if (building.status === 'completed' || citizens.some(c => c.workplaceId === building.instanceId)) continue;
      const free = citizens.find(c => !c.workplaceId && c.activity === 'idle');
      if (free) this.bind(free, building.instanceId, building.defId, true);
    }
  }
}
