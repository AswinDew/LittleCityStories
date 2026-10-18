import type { SimulationState } from '@/simulation/types';
import type { Citizen } from '@/citizens/types';
import type { PlacedBuilding } from '@/buildings/types';
import type { CellState } from '@/world/GridSystem';
import { BuildingRegistry } from '@/buildings/BuildingRegistry';
import { BALANCE } from '@/config/BalanceConfig';
import { ResourceLedger } from './ResourceLedger';
import { atWorkstation, jobAnimation } from '@/citizens/BuildingPresence';

export type OperatingStatus = 'under_construction' | 'no_workers' | 'unreachable' | 'no_source' | 'storage_full' | 'working';
type CellReader = (x: number, z: number) => CellState | null;
export class ProductionSystem {
  constructor(private readonly registry = BuildingRegistry.getInstance(), private readonly readCell?: CellReader) {}

  private assigned(building: PlacedBuilding, state: Readonly<SimulationState>): Citizen[] {
    const occupation = building.defId === 'farm' ? 'farmer' : building.defId === 'lumber_camp' ? 'lumberjack' : 'villager';
    return Object.entries(state.citizens).filter(([id, citizen]) => id === citizen.id &&
      citizen.workplaceId === building.instanceId && citizen.occupation === occupation)
      .map(([, citizen]) => citizen).sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, this.registry.get(building.defId)!.workerSlots);
  }
  private present(citizen: Citizen, building: PlacedBuilding, requireAnimation = true): boolean {
    const animation = jobAnimation(building.defId, citizen.activityTicks);
    const animated = citizen.animationState === animation || (building.defId === 'farm' && ['harvest', 'water'].includes(citizen.animationState));
    return citizen.workplaceAccess === 'reachable' && citizen.activity === 'work' && (!requireAnimation || animated) &&
      citizen.destination === null && citizen.pathProgress === 0 && !!building.entrance &&
      atWorkstation(citizen, building);
  }
  private entranceOpen(building: PlacedBuilding, state: Readonly<SimulationState>): boolean {
    if (!building.entrance) return false;
    const { x, z } = building.entrance;
    const cell = this.readCell ? this.readCell(x, z) : state.world.grid[x]?.[z];
    return !!cell && cell.terrain !== 'water' && cell.canBuild && (!cell.buildingId || cell.isRoad);
  }
  private sourceAvailable(building: PlacedBuilding, state: Readonly<SimulationState>): boolean {
    const kind = building.defId === 'lumber_camp' ? 'tree' : building.defId === 'stone_quarry' ? 'rock' : null;
    if (!kind) return true;
    return state.world.environment.some(source => {
      if (source.kind !== kind) return false;
      const dx = Math.max(building.gridX - source.x, 0, source.x - (building.gridX + building.footprint.width - 1));
      const dz = Math.max(building.gridZ - source.z, 0, source.z - (building.gridZ + building.footprint.depth - 1));
      return dx * dx + dz * dz <= BALANCE.sourceRadius * BALANCE.sourceRadius;
    });
  }
  getOperatingStatus(buildingId: string, state: Readonly<SimulationState>): OperatingStatus {
    const building = state.buildings[buildingId];
    if (!building || building.status !== 'completed') return 'under_construction';
    const production = this.registry.get(building.defId)?.production;
    const workers = this.assigned(building, state);
    if (!production || !workers.length) return 'no_workers';
    if (!this.entranceOpen(building, state) || !workers.some(worker => this.present(worker, building, false))) return 'unreachable';
    const blocked = this.getWorkBlocker(buildingId, state);
    if (blocked) return blocked;
    if (!workers.some(worker => this.present(worker, building))) return 'unreachable';
    return 'working';
  }
  /** Evaluated before choosing the work animation, so blocked citizens can resume. */
  getWorkBlocker(buildingId: string, state: Readonly<SimulationState>): 'no_source' | 'storage_full' | null {
    const building = state.buildings[buildingId], production = this.registry.get(building.defId)?.production;
    if (!production) return null;
    if (!this.sourceAvailable(building, state)) return 'no_source';
    return state.resources[production.resource] + production.amount > state.capacity[production.resource] ? 'storage_full' : null;
  }
  step(state: SimulationState): void {
    const ledger = new ResourceLedger(state.resources, state.capacity);
    for (const building of Object.values(state.buildings).sort((a, b) => a.instanceId.localeCompare(b.instanceId))) {
      const production = this.registry.get(building.defId)?.production;
      if (!production) continue;
      const workers = this.assigned(building, state), assignedIds = new Set(workers.map(worker => worker.id));
      for (const id of Object.keys(building.productionWork)) if (!assignedIds.has(id)) delete building.productionWork[id];
      const status = this.getOperatingStatus(building.instanceId, state);
      if (status !== 'working' && status !== 'storage_full') continue;
      const threshold = production.intervalTicks * 200;
      for (const worker of workers) {
        if (!this.present(worker, building)) continue;
        let credit = building.productionWork[worker.id] ?? 0;
        // A full batch waits without accruing more output. Retry only after all work gates pass again.
        if (credit < threshold) credit += state.economy.productionModifiers[production.resource] * (worker.hungry ? 1 : 2);
        if (credit >= threshold) {
          credit = ledger.tryDeposit({ [production.resource]: production.amount }) ? credit - threshold : threshold;
        }
        building.productionWork[worker.id] = credit;
      }
    }
  }
}
