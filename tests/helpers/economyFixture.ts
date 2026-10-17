import { SimulationSession } from '../../src/simulation/SimulationSession';
import { BuildingRegistry } from '../../src/buildings/BuildingRegistry';
import type { Citizen } from '../../src/citizens/types';
import type { SimulationState } from '../../src/simulation/types';

/** Real domain data from actual placement; worker fixtures never enter the browser game. */
export function economyFixture(defId = 'farm') {
  const session = new SimulationSession({ environmentDensity: 0 });
  const result = session.dispatch({ type: 'placeBuilding', defId, cell: { x: 12, z: 12 }, rotation: 0 });
  if (!result.ok) throw new Error(result.reason);
  const state: SimulationState = structuredClone(session.getSnapshot());
  const building = state.buildings[result.instanceId!];
  building.status = 'completed';
  building.workTicks = BuildingRegistry.getInstance().get(defId)!.requiredWorkTicks;
  return { state, building };
}
export function addWorker(state: SimulationState, buildingId: string, id = 'citizen-1', overrides: Partial<Citizen> = {}): Citizen {
  const building = state.buildings[buildingId];
  const worker: Citizen = { id, name: id, occupation: building.defId === 'farm' ? 'farmer' : building.defId === 'lumber_camp' ? 'lumberjack' : 'villager',
    homeId: 'building-1', workplaceId: buildingId, activity: 'work', position: { ...building.entrance! },
    destination: null, animationState: building.defId === 'farm' ? 'harvest' : building.defId === 'lumber_camp' ? 'chop' : 'work',
    pathProgress: 0, hungry: false, activityTicks: 0, workplaceAccess: 'reachable', ...overrides };
  state.citizens[id] = worker;
  return worker;
}
