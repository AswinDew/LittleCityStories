import { createWorldConfig } from '@/config/WorldConfig';
import type { WorldOverrides } from '@/config/WorldConfig';
import { GridSystem } from '@/world/GridSystem';
import { generateWorld } from '@/world/WorldGenerator';
import { SeededRandom } from './Random';
import type { SimulationState } from './types';
import type { GameCommand, CommandResult } from './commands';

function freezeData<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeData(child);
    Object.freeze(value);
  }
  return value;
}

export class SimulationSession {
  /** Transitional mutable facade over the one grid owned by this session. */
  public readonly gridSystem: GridSystem;
  private readonly state: SimulationState;
  private readonly random: SeededRandom;

  constructor(overrides: WorldOverrides = {}) {
    const config = createWorldConfig(overrides);
    const world = generateWorld(config);
    this.random = new SeededRandom(world.randomState);
    this.gridSystem = new GridSystem(config.metrics.size);
    this.gridSystem.deserialize(world.grid);
    // Live grid is owned by GridSystem. Snapshots capture it; don't retain another mutable copy.
    this.state = { config, world: { ...world, grid: [] }, tick: 0,
      randomState: this.random.state, nextId: 1, citizens: {} };
  }

  step(ticks: number): void {
    if (!Number.isSafeInteger(ticks) || ticks < 0 || !Number.isSafeInteger(this.state.tick + ticks)) {
      throw new RangeError('Invalid simulation tick count');
    }
    this.state.tick += ticks;
  }

  allocateIdentity(prefix: string): { id: string; seed: number; placedAt: number } {
    if (!/^[a-z][a-z0-9_-]{0,31}$/i.test(prefix)) throw new RangeError('Invalid identity prefix');
    const id = `${prefix}-${this.state.nextId++}`;
    const seed = Math.floor(this.random.next() * 1000);
    this.state.randomState = this.random.state;
    return { id, seed, placedAt: this.state.tick * 100 };
  }

  dispatch(command: GameCommand): CommandResult {
    if (!command || command.type !== 'setTerrain') return { ok: false, reason: 'invalid_command' };
    if (!command.cell || !this.gridSystem.getCell(command.cell.x, command.cell.z)) {
      return { ok: false, reason: 'invalid_cell' };
    }
    if (!['grass', 'dirt', 'concrete', 'water'].includes(command.terrain)) {
      return { ok: false, reason: 'invalid_terrain' };
    }
    this.gridSystem.setTerrain(command.cell.x, command.cell.z, command.terrain);
    return { ok: true };
  }

  getSnapshot(): Readonly<SimulationState> {
    return freezeData(structuredClone({ ...this.state,
      world: { ...this.state.world, grid: this.gridSystem.serialize() } }));
  }
}
