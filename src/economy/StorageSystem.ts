import type { SimulationState } from '@/simulation/types';
import { BuildingRegistry } from '@/buildings/BuildingRegistry';
import { RESOURCE_IDS } from './ResourceLedger';
export class StorageSystem {
  constructor(private readonly registry = BuildingRegistry.getInstance()) {}
  /** Called on construction lifecycle changes, never trims owned inventory. */
  step(state: SimulationState): void {
    const amount = Object.values(state.buildings).reduce((total, building) =>
      total + (building.status === 'completed' ? this.registry.get(building.defId)!.storage : 0), 0);
    for (const key of RESOURCE_IDS) state.capacity[key] = amount;
  }
}
