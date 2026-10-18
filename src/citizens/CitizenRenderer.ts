import * as THREE from 'three';
import type { GridMetrics } from '@/world/GridMath';
import type { SimulationState } from '@/simulation/types';
import type { SpriteAtlas } from '@/assets/SpriteAtlas';
import { CitizenSpriteView } from './CitizenSpriteView';
export class CitizenRenderer {
  private readonly views = new Map<string, CitizenSpriteView>();
  constructor(private readonly group: THREE.Group, private readonly metrics: GridMetrics, private readonly atlas: SpriteAtlas,
    private readonly texture: THREE.Texture, private readonly camera: THREE.Camera) {}
  sync(previous: Readonly<SimulationState>, current: Readonly<SimulationState>, interpolationAlpha: number): void {
    const alpha = Math.max(0, Math.min(1, interpolationAlpha));
    for (const [id, view] of this.views) if (!current.citizens[id]) { view.dispose(); this.views.delete(id); }
    const facing = this.camera.getWorldDirection(new THREE.Vector3());
    const time = (previous.tick + (current.tick - previous.tick) * alpha) * 100;
    for (const citizen of Object.values(current.citizens)) {
      let view = this.views.get(citizen.id);
      if (!view) {
        view = new CitizenSpriteView(this.atlas, this.texture, citizen.occupation, citizen.direction);
        view.sprite.name = citizen.id; view.sprite.scale.setScalar(this.metrics.cellSize * 1.1);
        this.group.add(view.sprite); this.views.set(citizen.id, view);
      }
      const from = previous.citizens[citizen.id]?.position ?? citizen.position;
      // Grid placement helpers intentionally accept integer tiles; moving citizens use continuous coordinates.
      const x = from.x + (citizen.position.x - from.x) * alpha, z = from.z + (citizen.position.z - from.z) * alpha;
      view.sprite.position.set((x + 0.5 - this.metrics.size / 2) * this.metrics.cellSize, 0.01,
        (z + 0.5 - this.metrics.size / 2) * this.metrics.cellSize);
      view.sprite.rotation.y = Math.atan2(-facing.x, -facing.z);
      const frame = view.update(citizen.animationState, time, citizen.occupation, citizen.direction);
      view.sprite.visible = !(citizen.room?.hidden && current.buildings[citizen.room.buildingId]);
      view.sprite.userData = { activity: citizen.animationState, direction: citizen.direction, frame: { ...frame } };
    }
  }
  dispose(): void { for (const view of this.views.values()) view.dispose(); this.views.clear(); }
}
