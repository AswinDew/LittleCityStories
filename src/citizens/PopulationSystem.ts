import type { SimulationState } from '@/simulation/types';
import type { CitizenSystem } from './CitizenSystem';
import { BuildingRegistry } from '@/buildings/BuildingRegistry';
import { BALANCE } from '@/config/BalanceConfig';
export class PopulationSystem {
  constructor(private readonly citizens: CitizenSystem, private readonly registry = BuildingRegistry.getInstance()) {}
  refresh(state: SimulationState): void {
    const citizens = Object.values(state.citizens), count = citizens.length;
    state.population.housingCapacity = Object.values(state.buildings).reduce((sum, building) =>
      sum + (building.status === 'completed' ? this.registry.get(building.defId)!.housing : 0), 0);
    const hungry = citizens.filter(c => c.hungry).length, homeless = citizens.filter(c => !c.homeId).length;
    const employed = citizens.filter(c => c.workplaceId && state.buildings[c.workplaceId]).length;
    state.population.happiness = count ? Math.max(0, Math.min(100, 70 - 40 * hungry / count - 20 * homeless / count + 10 * employed / count)) : 70;
  }
  step(state: SimulationState): void {
    this.refresh(state);
    const count = Object.keys(state.citizens).length;
    const eligible = count < state.population.housingCapacity && state.population.happiness >= 60 && state.resources.food >= 2 * (count + 1);
    state.population.growthTicks = eligible ? state.population.growthTicks + 1 : 0;
    if (state.population.growthTicks >= BALANCE.growthIntervalTicks) {
      this.citizens.create(state); state.population.growthTicks = 0; this.refresh(state);
    }
  }
}
