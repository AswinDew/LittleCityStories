import type { SimulationState } from '@/simulation/types';
import type { NavigationGrid } from '@/world/NavigationGrid';
import type { Citizen } from './types';
import type { GridCoord } from '@/world/GridMath';
import { Pathfinder } from '@/world/Pathfinder';
import { BALANCE } from '@/config/BalanceConfig';
import { BuildingRegistry } from '@/buildings/BuildingRegistry';
import { ProductionSystem } from '@/economy/ProductionSystem';

const same = (a: GridCoord | null, b: GridCoord | null) => !!a && !!b && a.x === b.x && a.z === b.z;
export class ActivitySystem {
  private readonly finder = new Pathfinder();
  private readonly production: ProductionSystem;
  constructor(private readonly navigation: NavigationGrid, registry = BuildingRegistry.getInstance()) {
    this.production = new ProductionSystem(registry);
  }
  step(state: SimulationState): void {
    for (const citizen of Object.values(state.citizens).sort((a, b) => a.id.localeCompare(b.id))) {
      const workplace = citizen.workplaceId ? state.buildings[citizen.workplaceId] : null;
      const home = citizen.homeId ? state.buildings[citizen.homeId] : null;
      if (citizen.activity === 'idle') {
        citizen.animationState = 'idle';
        if (!workplace) {
          if (home?.entrance && !same(citizen.position, home.entrance)) citizen.activity = 'return';
          else { citizen.waitingReason = home ? null : 'no_home'; continue; }
        } else if (++citizen.activityTicks < BALANCE.homeRestTicks) continue;
        else { citizen.activity = 'navigate'; citizen.activityTicks = 0; }
      }
      if (citizen.activity === 'return') {
        if (!home?.entrance) { citizen.activity = 'idle'; citizen.animationState = 'idle'; citizen.waitingReason = 'no_home'; continue; }
        if (this.move(citizen, home.entrance)) {
          citizen.activity = 'idle'; citizen.activityTicks = 0; citizen.animationState = 'idle';
        }
        continue;
      }
      if (!workplace?.entrance) { citizen.activity = 'return'; citizen.animationState = 'idle'; continue; }
      if (citizen.activity === 'navigate') {
        if (!this.move(citizen, workplace.entrance)) continue;
        citizen.activity = 'work'; citizen.activityTicks = 0;
        // Reaching work from the current position does not certify access from home.
        citizen.pathRevision = -1;
      }
      if (!this.navigation.isWalkable(workplace.entrance) || !same(citizen.position, workplace.entrance)) {
        citizen.activity = 'navigate'; citizen.workplaceAccess = 'unreachable'; citizen.animationState = 'idle'; continue;
      }
      if (citizen.pathRevision !== this.navigation.revision) {
        citizen.workplaceAccess = !home?.entrance || this.finder.findPath(this.navigation, home.entrance, workplace.entrance) ? 'reachable' : 'unreachable';
        citizen.pathRevision = this.navigation.revision;
      }
      const blocker = citizen.workplaceAccess !== 'reachable' ? 'unreachable' :
        citizen.occupation === 'builder' ? null : this.production.getWorkBlocker(workplace.instanceId, state);
      citizen.waitingReason = blocker;
      citizen.animationState = blocker ? 'idle' : citizen.occupation === 'builder' ? 'build' :
        citizen.occupation === 'farmer' ? 'harvest' : citizen.occupation === 'lumberjack' ? 'chop' : 'work';
      citizen.activityTicks++;
      if (citizen.occupation !== 'builder' && citizen.activityTicks > BALANCE.workShiftTicks) {
        citizen.activity = 'return'; citizen.activityTicks = 0; citizen.animationState = 'idle'; citizen.destination = null;
      }
    }
  }
  private move(citizen: Citizen, goal: GridCoord): boolean {
    if (same(citizen.position, goal)) {
      citizen.path = []; citizen.pathProgress = 0; citizen.moveFrom = null; citizen.destination = null; citizen.waitingReason = null;
      return true;
    }
    if (citizen.pathProgress > 0 && !same(citizen.destination, goal)) citizen.pathRevision = -1;
    // Mid-segment travel finishes continuously before a changed destination/revision is routed.
    if (citizen.pathProgress === 0 && (!same(citizen.destination, goal) || citizen.pathRevision !== this.navigation.revision || !citizen.path.length)) {
      const path = this.finder.findPath(this.navigation, citizen.position, goal);
      citizen.path = path?.slice(1) ?? []; citizen.pathRevision = this.navigation.revision;
    }
    citizen.destination = { ...goal };
    const next = citizen.path[0];
    if (!next || !this.navigation.isWalkable(next)) {
      citizen.animationState = 'idle'; citizen.workplaceAccess = 'unreachable'; citizen.waitingReason = 'unreachable'; return false;
    }
    citizen.moveFrom ??= { ...citizen.position };
    const from = citizen.moveFrom, dx = next.x - from.x, dz = next.z - from.z;
    citizen.direction = dx > 0 ? 'SE' : dx < 0 ? 'NW' : dz > 0 ? 'SW' : 'NE';
    citizen.pathProgress++;
    const alpha = citizen.pathProgress / BALANCE.movementTicksPerTile;
    citizen.position = { x: from.x + dx * alpha, z: from.z + dz * alpha };
    citizen.animationState = 'walk'; citizen.waitingReason = null;
    if (citizen.pathProgress >= BALANCE.movementTicksPerTile) {
      citizen.position = { ...next }; citizen.path.shift(); citizen.pathProgress = 0; citizen.moveFrom = null;
      if (citizen.pathRevision !== this.navigation.revision) citizen.path = [];
    }
    if (same(citizen.position, goal)) { citizen.destination = null; citizen.path = []; return true; }
    return false;
  }
}
