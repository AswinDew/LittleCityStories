import type { SimulationState } from '@/simulation/types';
import type { NavigationGrid } from '@/world/NavigationGrid';
import type { Citizen } from './types';
import type { GridCoord } from '@/world/GridMath';
import { Pathfinder } from '@/world/Pathfinder';
import { BALANCE } from '@/config/BalanceConfig';
import { BuildingRegistry } from '@/buildings/BuildingRegistry';
import { ProductionSystem } from '@/economy/ProductionSystem';
import { atWorkstation, enterRoom, jobAnimation, leaveRoom, roomLayout, workerSlot } from './BuildingPresence';

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
      if (citizen.room) {
        const room = citizen.room;
        const leave = room.phase === 'leaving' || !state.buildings[room.buildingId] ||
          (room.purpose === 'home' ? home?.instanceId !== room.buildingId || (citizen.activity === 'navigate' && !!workplace) :
            workplace?.instanceId !== room.buildingId || citizen.activity === 'return');
        if (leave) { leaveRoom(citizen); this.moveInRoom(citizen); continue; }
        if (room.phase === 'entering') {
          if (!this.moveInRoom(citizen)) continue;
          citizen.activity = room.purpose === 'home' ? 'idle' : 'work'; citizen.activityTicks = 0; citizen.pathRevision = -1;
          if (room.purpose === 'home') { citizen.animationState = 'idle'; continue; }
        }
        if (room.purpose === 'home') {
          citizen.animationState = 'idle';
          if (workplace && ++citizen.activityTicks >= BALANCE.homeRestTicks) {
            citizen.activity = 'navigate'; citizen.activityTicks = 0; leaveRoom(citizen); this.moveInRoom(citizen);
          }
          continue;
        }
      }
      if (citizen.activity === 'idle') {
        citizen.animationState = 'idle';
        if (!workplace) {
          if (home?.entrance) citizen.activity = 'return';
          else { citizen.waitingReason = home ? null : 'no_home'; continue; }
        } else if (++citizen.activityTicks < BALANCE.homeRestTicks) continue;
        else { citizen.activity = 'navigate'; citizen.activityTicks = 0; }
      }
      if (citizen.activity === 'return') {
        if (!home?.entrance) { citizen.activity = 'idle'; citizen.animationState = 'idle'; citizen.waitingReason = 'no_home'; continue; }
        if (this.move(citizen, home.entrance)) {
          citizen.room = enterRoom(citizen, home, 'home'); this.moveInRoom(citizen);
        }
        continue;
      }
      if (!workplace?.entrance) { citizen.activity = 'return'; citizen.animationState = 'idle'; continue; }
      if (citizen.activity === 'navigate') {
        if (!this.move(citizen, workplace.entrance)) continue;
        citizen.workplaceAccess = !home?.entrance || this.finder.findPath(this.navigation, home.entrance, workplace.entrance) ? 'reachable' : 'unreachable';
        citizen.pathRevision = this.navigation.revision;
        if (citizen.workplaceAccess !== 'reachable') { citizen.animationState = 'idle'; citizen.waitingReason = 'unreachable'; continue; }
        citizen.room = enterRoom(citizen, workplace, 'work', workerSlot(citizen, state));
        this.moveInRoom(citizen); continue;
      }
      if (!this.navigation.isWalkable(workplace.entrance) || !atWorkstation(citizen, workplace)) {
        citizen.activity = 'navigate'; citizen.workplaceAccess = 'unreachable'; citizen.animationState = 'idle'; continue;
      }
      const slot = workerSlot(citizen, state);
      if (citizen.room && slot !== citizen.room.slot) {
        const target = roomLayout(workplace, 'work', slot, citizen.occupation === 'builder').station;
        Object.assign(citizen.room, { slot, phase: 'entering', route: [target], step: 0, ticks: 0, from: { ...citizen.position } });
        citizen.activity = 'navigate'; this.moveInRoom(citizen); continue;
      }
      if (citizen.pathRevision !== this.navigation.revision) {
        citizen.workplaceAccess = !home?.entrance || this.finder.findPath(this.navigation, home.entrance, workplace.entrance) ? 'reachable' : 'unreachable';
        citizen.pathRevision = this.navigation.revision;
      }
      const blocker = citizen.workplaceAccess !== 'reachable' ? 'unreachable' :
        citizen.occupation === 'builder' ? null : this.production.getWorkBlocker(workplace.instanceId, state);
      citizen.waitingReason = blocker;
      citizen.animationState = blocker ? 'idle' : citizen.occupation === 'builder' ? 'build' : jobAnimation(workplace.defId, citizen.activityTicks);
      const directions: Citizen['direction'][] = ['NE', 'NW', 'SW', 'SE'];
      citizen.direction = directions[(workplace.rotation + slot % 2) % 4];
      citizen.activityTicks++;
      if (citizen.occupation !== 'builder' && citizen.activityTicks > BALANCE.workShiftTicks) {
        citizen.activity = 'return'; citizen.activityTicks = 0; citizen.animationState = 'idle'; citizen.destination = null;
      }
    }
  }
  private moveInRoom(citizen: Citizen): boolean {
    const room = citizen.room!, next = room.route[room.step];
    if (!next) return room.phase === 'inside';
    const dx = next.x - room.from.x, dz = next.z - room.from.z;
    const duration = Math.max(1, Math.ceil((Math.abs(dx) + Math.abs(dz)) * BALANCE.movementTicksPerTile));
    const alpha = Math.min(1, (room.ticks + 1) / duration);
    const position = { x: room.from.x + dx * alpha, z: room.from.z + dz * alpha };
    if (!this.navigation.isWalkable({ x: Math.round(position.x), z: Math.round(position.z) }, room.buildingId)) {
      citizen.animationState = 'idle'; citizen.waitingReason = 'unreachable'; citizen.workplaceAccess = 'unreachable'; return false;
    }
    room.ticks++; citizen.position = position; citizen.animationState = 'walk'; citizen.waitingReason = null;
    citizen.direction = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'SE' : 'NW') : (dz > 0 ? 'SW' : 'NE');
    if (room.ticks >= duration) {
      citizen.position = { ...next }; room.from = { ...next }; room.step++; room.ticks = 0;
      if (room.purpose === 'home' && same(next, room.door)) room.hidden = room.phase === 'entering';
      if (room.step >= room.route.length) {
        if (room.phase === 'leaving') { citizen.room = null; citizen.pathRevision = -1; return true; }
        room.phase = 'inside'; room.hidden = room.purpose === 'home';
        return true;
      }
    }
    return false;
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
