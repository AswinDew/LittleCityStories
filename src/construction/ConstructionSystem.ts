import type { SimulationState } from '@/simulation/types';
import type { CommandResult, PlaceBuildingCommand } from '@/simulation/commands';
import { BuildingRegistry } from '@/buildings/BuildingRegistry';
import { GridSystem, CellState } from '@/world/GridSystem';
import { isFootprintWithinBounds, isWithinBounds, GridCoord } from '@/world/GridMath';
import { ResourceLedger, emptyResources, RESOURCE_IDS } from '@/economy/ResourceLedger';
import { buildingLayout } from './BuildingLayout';
import { StorageSystem } from '@/economy/StorageSystem';
import { releaseWorker } from '@/citizens/AssignmentSystem';
import { occupiesCell } from '@/citizens/types';
import { atWorkstation } from '@/citizens/BuildingPresence';

const sameCell = (a: GridCoord, b: GridCoord) => a.x === b.x && a.z === b.z;
export function checkPlacement(command: PlaceBuildingCommand, state: Readonly<SimulationState>,
  registry = BuildingRegistry.getInstance(), readCell = (x: number, z: number): CellState | null => state.world.grid[x]?.[z] ?? null): CommandResult {
  const def = registry.get(command.defId);
  if (!def) return { ok: false, reason: 'unknown_building' };
  if (!def.purchasable) return { ok: false, reason: 'protected_building' };
  if (def.unlockedBy && !state.unlockedTechnologyIds.includes(def.unlockedBy)) return { ok: false, reason: 'locked' };
  if (!Number.isInteger(command.rotation) || command.rotation < 0 || command.rotation > 3) return { ok: false, reason: 'invalid_rotation' };
  if (!command.cell || !Number.isInteger(command.cell.x) || !Number.isInteger(command.cell.z)) return { ok: false, reason: 'invalid_cell' };
  const layout = buildingLayout(def, command.cell, command.rotation);
  if (!isFootprintWithinBounds(command.cell.x, command.cell.z, layout.footprint, state.config.metrics.size)) return { ok: false, reason: 'out_of_bounds' };
  for (const coord of layout.cells) {
    const cell = readCell(coord.x, coord.z);
    if (!cell || cell.terrain === 'water' || !cell.canBuild) return { ok: false, reason: 'environment_blocked' };
    if (cell.buildingId || cell.isRoad) return { ok: false, reason: 'occupied' };
    if (Object.values(state.citizens).some(citizen => occupiesCell(citizen, coord))) {
      return { ok: false, reason: 'citizen_occupied' };
    }
    if (def.id !== 'dirt_road' && Object.values(state.buildings).some(building => building.entrance && sameCell(building.entrance, coord))) {
      return { ok: false, reason: 'entrance_blocked' };
    }
  }
  if (layout.entrance) {
    const point = layout.entrance;
    const cell = readCell(point.x, point.z);
    if (!isWithinBounds(point.x, point.z, state.config.metrics.size) || !cell || !cell.canBuild || cell.terrain === 'water' ||
        (cell.buildingId && !cell.isRoad) || layout.cells.some(coord => sameCell(coord, point))) return { ok: false, reason: 'entrance_blocked' };
  }
  if (!new ResourceLedger(state.resources, state.capacity).canAfford(def.cost)) return { ok: false, reason: 'insufficient_resources' };
  return { ok: true };
}

export class ConstructionSystem {
  constructor(private readonly grid: GridSystem, private readonly registry: BuildingRegistry,
    private readonly allocateIdentity: () => { id: string; seed: number; placedAt: number }) {}
  place(command: PlaceBuildingCommand, state: SimulationState): CommandResult {
    const result = checkPlacement(command, state, this.registry, (x, z) => this.grid.getCell(x, z));
    if (!result.ok) return result;
    const def = this.registry.get(command.defId)!;
    const layout = buildingLayout(def, command.cell, command.rotation);
    const identity = this.allocateIdentity();
    new ResourceLedger(state.resources, state.capacity).trySpend(def.cost);
    state.buildings[identity.id] = { instanceId: identity.id, defId: def.id,
      gridX: command.cell.x, gridZ: command.cell.z, rotation: command.rotation,
      footprint: layout.footprint, entrance: layout.entrance, status: def.requiredWorkTicks ? 'planned' : 'completed',
      workTicks: 0, constructionRemainder: 0, paidResources: { ...def.cost }, level: 1, seed: identity.seed, placedAt: identity.placedAt, productionWork: {} };
    for (const cell of layout.cells) {
      this.grid.setBuilding(cell.x, cell.z, identity.id);
      if (def.id === 'dirt_road') this.grid.setRoad(cell.x, cell.z, true);
    }
    state.world.environment = state.world.environment.filter(object => !layout.cells.some(cell => sameCell(object, cell)));
    this.recalculateCapacity(state);
    return { ok: true, instanceId: identity.id };
  }
  cancel(instanceId: string, state: SimulationState): CommandResult {
    const building = state.buildings[instanceId];
    if (building?.defId === 'town_center') return { ok: false, reason: 'protected_building' };
    if (!building) return { ok: false, reason: 'not_found' };
    if (building.status === 'completed') return { ok: false, reason: 'invalid_state' };
    return this.demolish(instanceId, state);
  }
  demolish(instanceId: string, state: SimulationState): CommandResult {
    const building = state.buildings[instanceId];
    if (!building) return { ok: false, reason: 'not_found' };
    if (building.defId === 'town_center') return { ok: false, reason: 'protected_building' };
    const refund = emptyResources();
    for (const key of RESOURCE_IDS) refund[key] = Math.floor(building.paidResources[key] * (building.status === 'planned' ? 1 : 0.5));
    new ResourceLedger(state.resources, state.capacity).refund(refund);
    for (let x = building.gridX; x < building.gridX + building.footprint.width; x++) {
      for (let z = building.gridZ; z < building.gridZ + building.footprint.depth; z++) this.grid.clearBuilding(x, z);
    }
    delete state.buildings[instanceId];
    for (const citizen of Object.values(state.citizens)) {
      if (citizen.homeId === instanceId) citizen.homeId = null;
      if (citizen.workplaceId === instanceId) {
        releaseWorker(citizen);
      }
    }
    this.recalculateCapacity(state);
    return { ok: true };
  }
  step(state: SimulationState): void {
    for (const building of Object.values(state.buildings).sort((a, b) => a.instanceId.localeCompare(b.instanceId))) {
      if (building.status === 'completed' || !building.entrance) continue;
      const builder = Object.values(state.citizens).sort((a, b) => a.id.localeCompare(b.id)).find(citizen => citizen.occupation === 'builder' &&
        citizen.workplaceId === building.instanceId && citizen.activity === 'work' && citizen.animationState === 'build' &&
        citizen.workplaceAccess === 'reachable' && citizen.pathProgress === 0 && citizen.destination === null &&
        atWorkstation(citizen, building));
      if (!builder) continue;
      building.status = 'under_construction';
      building.constructionRemainder += builder.hungry ? 1 : 2;
      building.workTicks += Math.floor(building.constructionRemainder / 2);
      building.constructionRemainder %= 2;
      if (building.workTicks >= this.registry.get(building.defId)!.requiredWorkTicks) {
        building.status = 'completed'; this.recalculateCapacity(state);
      }
    }
  }
  recalculateCapacity(state: SimulationState): void {
    new StorageSystem(this.registry).step(state);
  }
}
