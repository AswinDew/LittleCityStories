import { createWorldConfig } from '@/config/WorldConfig';
import type { WorldOverrides } from '@/config/WorldConfig';
import { GridSystem } from '@/world/GridSystem';
import { generateWorld } from '@/world/WorldGenerator';
import { SeededRandom } from './Random';
import type { SimulationState } from './types';
import type { GameCommand, CommandResult } from './commands';
import { BuildingRegistry } from '@/buildings/BuildingRegistry';
import { ConstructionSystem } from '@/construction/ConstructionSystem';
import { buildingLayout } from '@/construction/BuildingLayout';
import { emptyResources } from '@/economy/ResourceLedger';
import { ProductionSystem } from '@/economy/ProductionSystem';
import { ConsumptionSystem } from '@/economy/ConsumptionSystem';
import { CitizenSystem } from '@/citizens/CitizenSystem';
import { AssignmentSystem } from '@/citizens/AssignmentSystem';
import { NavigationGrid } from '@/world/NavigationGrid';
import { ActivitySystem } from '@/citizens/ActivitySystem';
import { PopulationSystem } from '@/citizens/PopulationSystem';
import { occupiesCell } from '@/citizens/types';

function freezeData<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeData(child);
    Object.freeze(value);
  }
  return value;
}

export class SimulationSession {
  /** The session's single live grid; gameplay mutations enter through dispatch. */
  public readonly gridSystem: GridSystem;
  private readonly state: SimulationState;
  private readonly random: SeededRandom;
  private readonly construction: ConstructionSystem;
  private readonly production: ProductionSystem;
  private readonly consumption: ConsumptionSystem;
  private readonly citizens: CitizenSystem;
  private readonly assignments: AssignmentSystem;
  private readonly activity: ActivitySystem;
  private readonly population: PopulationSystem;

  constructor(overrides: WorldOverrides = {}, registry = BuildingRegistry.getInstance()) {
    const config = createWorldConfig(overrides);
    const world = generateWorld(config);
    this.random = new SeededRandom(world.randomState);
    this.gridSystem = new GridSystem(config.metrics.size);
    this.gridSystem.deserialize(world.grid);
    // Live grid is owned by GridSystem. Snapshots capture it; don't retain another mutable copy.
    this.state = { config, world: { ...world, grid: [] }, tick: 0,
      randomState: this.random.state, nextId: 1, navigationRevision: 0,
      population: { happiness: 70, housingCapacity: 0, growthTicks: 0 }, citizens: {}, buildings: {},
      resources: { ...config.startingResources }, capacity: emptyResources(), unlockedTechnologyIds: [],
      economy: { consumptionTicks: 0, productionModifiers: { wood: 100, stone: 100, food: 100, coins: 100 } } };
    this.construction = new ConstructionSystem(this.gridSystem, registry, () => this.allocateIdentity('building'));
    this.production = new ProductionSystem(registry, (x, z) => this.gridSystem.getCell(x, z));
    this.consumption = new ConsumptionSystem(registry);
    this.assignments = new AssignmentSystem(registry);
    this.activity = new ActivitySystem(new NavigationGrid(config.metrics.size,
      (x, z) => this.gridSystem.getCell(x, z), () => this.state.navigationRevision), registry);
    this.citizens = new CitizenSystem(() => this.allocateIdentity('citizen'), cell => {
      const tile = this.gridSystem.getCell(cell.x, cell.z);
      return !!tile && tile.canBuild && tile.terrain !== 'water' && (!tile.buildingId || tile.isRoad);
    }, registry);
    this.population = new PopulationSystem(this.citizens, registry);
    const town = registry.get('town_center')!;
    const layout = buildingLayout(town, world.townCenter, 0);
    const identity = this.allocateIdentity('building');
    this.state.buildings[identity.id] = { instanceId: identity.id, defId: town.id,
      gridX: world.townCenter.x, gridZ: world.townCenter.z, rotation: 0, footprint: layout.footprint,
      entrance: layout.entrance, status: 'completed', workTicks: town.requiredWorkTicks, constructionRemainder: 0,
      paidResources: emptyResources(), level: 1, seed: identity.seed, placedAt: 0, productionWork: {} };
    for (const cell of layout.cells) this.gridSystem.setBuilding(cell.x, cell.z, identity.id);
    this.construction.recalculateCapacity(this.state);
    for (let index = 0; index < config.startingPopulation; index++) {
      if (!this.citizens.create(this.state)) throw new RangeError('Starting population exceeds walkable spawn space');
    }
    this.population.refresh(this.state);
  }

  step(ticks: number): void {
    if (!Number.isSafeInteger(ticks) || ticks < 0 || !Number.isSafeInteger(this.state.tick + ticks)) {
      throw new RangeError('Invalid simulation tick count');
    }
    for (let index = 0; index < ticks; index++) {
      this.citizens.step(this.state);
      this.assignments.step(this.state);
      this.activity.step(this.state);
      this.construction.step(this.state);
      this.production.step(this.state);
      this.consumption.step(this.state);
      this.population.step(this.state);
      this.state.tick++;
    }
  }

  allocateIdentity(prefix: string): { id: string; seed: number; placedAt: number } {
    if (!/^[a-z][a-z0-9_-]{0,31}$/i.test(prefix)) throw new RangeError('Invalid identity prefix');
    const id = `${prefix}-${this.state.nextId++}`;
    const seed = Math.floor(this.random.next() * 1000);
    this.state.randomState = this.random.state;
    return { id, seed, placedAt: this.state.tick * 100 };
  }

  dispatch(command: GameCommand): CommandResult {
    const source = command?.type === 'clearEnvironment' ? this.state.world.environment.find(e => e.id === command.environmentId) : null;
    const cell = command?.type === 'setTerrain' && command.cell ? this.gridSystem.getCell(command.cell.x, command.cell.z) : null;
    const wasWater = cell?.terrain === 'water';
    const result = this.execute(command);
    if (result.ok && (command.type === 'placeBuilding' || command.type === 'placeRoad' ||
        command.type === 'cancelConstruction' || command.type === 'demolishBuilding' ||
        (source && source.kind !== 'bush') || (cell && wasWater !== (cell.terrain === 'water')))) this.state.navigationRevision++;
    if (result.ok) { this.citizens.step(this.state); this.population.refresh(this.state); }
    return result;
  }
  private execute(command: GameCommand): CommandResult {
    if (!command || typeof command !== 'object') return { ok: false, reason: 'invalid_command' };
    if (command.type === 'assignWorker') return this.assignments.assign(command.citizenId, command.buildingId, this.state);
    if (command.type === 'unassignWorker') return this.assignments.unassign(command.citizenId, this.state);
    if (command.type === 'placeBuilding') return this.construction.place(command, this.state);
    if (command.type === 'placeRoad') return this.construction.place({ ...command, type: 'placeBuilding', defId: 'dirt_road', rotation: 0 }, this.state);
    if (command.type === 'cancelConstruction' || command.type === 'demolishBuilding') {
      if (typeof command.instanceId !== 'string' || !Object.hasOwn(this.state.buildings, command.instanceId)) return { ok: false, reason: 'not_found' };
      return command.type === 'cancelConstruction' ? this.construction.cancel(command.instanceId, this.state) : this.construction.demolish(command.instanceId, this.state);
    }
    if (command.type === 'clearEnvironment') {
      const object = this.state.world.environment.find(entry => entry.id === command.environmentId);
      if (!object) return { ok: false, reason: 'not_found' };
      this.state.world.environment = this.state.world.environment.filter(entry => entry.id !== object.id);
      this.gridSystem.getCell(object.x, object.z)!.canBuild = !this.state.world.environment.some(entry =>
        entry.x === object.x && entry.z === object.z && entry.kind !== 'bush');
      return { ok: true };
    }
    if (command.type !== 'setTerrain') return { ok: false, reason: 'invalid_command' };
    if (!command.cell || !this.gridSystem.getCell(command.cell.x, command.cell.z)) {
      return { ok: false, reason: 'invalid_cell' };
    }
    if (!['grass', 'dirt', 'concrete', 'water'].includes(command.terrain)) {
      return { ok: false, reason: 'invalid_terrain' };
    }
    if (command.terrain === 'water' && (this.gridSystem.getCell(command.cell.x, command.cell.z)!.buildingId ||
        Object.values(this.state.buildings).some(building => building.entrance?.x === command.cell.x && building.entrance.z === command.cell.z) ||
        Object.values(this.state.citizens).some(citizen => occupiesCell(citizen, command.cell)))) {
      return { ok: false, reason: 'occupied' };
    }
    this.gridSystem.setTerrain(command.cell.x, command.cell.z, command.terrain);
    return { ok: true };
  }

  getSnapshot(): Readonly<SimulationState> {
    return freezeData(structuredClone({ ...this.state,
      world: { ...this.state.world, grid: this.gridSystem.serialize() } }));
  }
}
