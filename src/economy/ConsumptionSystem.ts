import type { SimulationState } from '@/simulation/types';
import { BuildingRegistry } from '@/buildings/BuildingRegistry';
import { BALANCE } from '@/config/BalanceConfig';
import { ResourceLedger } from './ResourceLedger';
export class ConsumptionSystem {
  constructor(private readonly registry = BuildingRegistry.getInstance()) {}
  step(state: SimulationState): void {
    state.economy.consumptionTicks++;
    if (state.economy.consumptionTicks < BALANCE.mealIntervalTicks) return;
    state.economy.consumptionTicks -= BALANCE.mealIntervalTicks;
    const ledger = new ResourceLedger(state.resources, state.capacity), occupants = new Map<string, number>();
    const citizens = Object.entries(state.citizens).filter(([id, citizen]) => id === citizen.id)
      .map(([, citizen]) => citizen).sort((a, b) => a.id.localeCompare(b.id));
    for (const citizen of citizens) {
      const home = citizen.homeId ? state.buildings[citizen.homeId] : null;
      const slots = home?.status === 'completed' ? this.registry.get(home.defId)!.housing : 0;
      const occupied = home ? occupants.get(home.instanceId) ?? 0 : 0;
      const housed = !!home && occupied < slots;
      if (housed) occupants.set(home.instanceId, occupied + 1);
      citizen.hungry = !ledger.trySpend({ food: BALANCE.foodPerMeal });
      // A full coin store drops this tax; meals never wait for tax capacity.
      if (!citizen.hungry && housed) ledger.tryDeposit({ coins: BALANCE.taxPerFedHousedCitizen });
    }
  }
}
