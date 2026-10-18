import type { SimulationState } from '@/simulation/types';
import type { Citizen } from './types';
import type { GridCoord } from '@/world/GridMath';
import { BuildingRegistry } from '@/buildings/BuildingRegistry';

export const travelState = () => ({ path: [] as GridCoord[], pathRevision: -1, moveFrom: null as GridCoord | null,
  direction: 'SE' as Citizen['direction'], waitingReason: null as Citizen['waitingReason'], room: null as Citizen['room'] });
export class CitizenSystem {
  constructor(private readonly allocate: () => { id: string; seed: number },
    private readonly walkable: (cell: GridCoord) => boolean, private readonly registry = BuildingRegistry.getInstance()) {}
  create(state: SimulationState): Citizen | null {
    const occupied = new Set(Object.values(state.citizens).map(c => `${c.position.x},${c.position.z}`));
    const origin = state.world.entrance, candidates: GridCoord[] = [];
    for (let x = 0; x < state.config.metrics.size; x++) for (let z = 0; z < state.config.metrics.size; z++) {
      if (this.walkable({ x, z }) && !occupied.has(`${x},${z}`)) candidates.push({ x, z });
    }
    candidates.sort((a, b) => (Math.abs(a.x - origin.x) + Math.abs(a.z - origin.z)) -
      (Math.abs(b.x - origin.x) + Math.abs(b.z - origin.z)) || a.z - b.z || a.x - b.x);
    if (!candidates.length) return null;
    const { id, seed } = this.allocate();
    const names = ['Ari', 'Bima', 'Citra', 'Dara', 'Eka', 'Fajar', 'Gita', 'Hana'];
    const citizen: Citizen = { id, name: `${names[seed % names.length]} ${id.split('-').at(-1)}`,
      occupation: 'villager', homeId: null, workplaceId: null, workplaceAccess: 'unknown', activity: 'idle',
      position: candidates[0], destination: null, animationState: 'idle', pathProgress: 0, hungry: false,
      activityTicks: 0, ...travelState() };
    state.citizens[id] = citizen; this.step(state); return citizen;
  }
  step(state: SimulationState): void {
    const homes = Object.values(state.buildings).filter(b => b.status === 'completed' && this.registry.get(b.defId)!.housing > 0)
      .sort((a, b) => a.instanceId.localeCompare(b.instanceId));
    const used = new Map<string, number>(), citizens = Object.values(state.citizens).sort((a, b) => a.id.localeCompare(b.id));
    for (const citizen of citizens) {
      const home = homes.find(b => b.instanceId === citizen.homeId);
      if (!home || (used.get(home.instanceId) ?? 0) >= this.registry.get(home.defId)!.housing) citizen.homeId = null;
      else used.set(home.instanceId, (used.get(home.instanceId) ?? 0) + 1);
    }
    for (const citizen of citizens) if (!citizen.homeId) {
      const home = homes.find(b => (used.get(b.instanceId) ?? 0) < this.registry.get(b.defId)!.housing);
      if (home) { citizen.homeId = home.instanceId; used.set(home.instanceId, (used.get(home.instanceId) ?? 0) + 1); }
    }
  }
}
