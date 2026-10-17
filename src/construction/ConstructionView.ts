import * as THREE from 'three';
import type { SimulationState } from '@/simulation/types';
import { BuildingRegistry } from '@/buildings/BuildingRegistry';
import { BuildingFactory } from '@/assets/BuildingFactory';
import { assetBox } from '@/assets/GeometryCache';
import { MaterialLibrary } from '@/assets/MaterialLibrary';
import { disposeBuilding } from '@/assets/procedural/houses';
import { CELL_SIZE, GridMetrics } from '@/world/GridMath';
import { gridToWorld } from '@/utils/coordinates';
import type { SceneManager } from '@/game/SceneManager';

/** Reconciles domain-owned instances. A planned site is scaffolding, never a completed model. */
export class ConstructionView {
  private readonly meshes = new Map<string, { signature: string; group: THREE.Group }>();
  constructor(private readonly scene: SceneManager, private readonly metrics: GridMetrics) {}
  sync(snapshot: Readonly<SimulationState>): void {
    for (const [id, record] of this.meshes) if (!Object.hasOwn(snapshot.buildings, id)) {
      record.group.removeFromParent(); disposeBuilding(record.group); this.meshes.delete(id);
    }
    for (const building of Object.values(snapshot.buildings)) {
      const def = BuildingRegistry.getInstance().get(building.defId)!;
      const progress = Math.min(2, Math.floor(building.workTicks / Math.max(1, def.requiredWorkTicks / 3)));
      const signature = `${building.status}/${progress}/${building.rotation}/${building.gridX}/${building.gridZ}`;
      const current = this.meshes.get(building.instanceId);
      if (current?.signature === signature) continue;
      if (current) { current.group.removeFromParent(); disposeBuilding(current.group); }
      let model: THREE.Group;
      if (building.status === 'completed') model = BuildingFactory.createBuildingMesh(building.defId, building.level, building.seed);
      else {
        model = new THREE.Group();
        const w = def.footprint.width * CELL_SIZE - 0.1, d = def.footprint.depth * CELL_SIZE - 0.1;
        const box = (width: number, height: number, depth: number, x: number, y: number, z: number, color: string) => {
          const mesh = assetBox(width, height, depth, MaterialLibrary.getInstance().get(`ancient_${color}`));
          mesh.position.set(x, y, z); model.add(mesh);
        };
        box(w, 0.08, d, 0, 0.04, 0, 'soil');
        for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) for (const z of [-d / 2 + 0.08, d / 2 - 0.08]) {
          box(0.1, 1.1, 0.1, x, 0.6, z, 'wood');
        }
        for (const z of [-d / 2 + 0.08, d / 2 - 0.08]) box(w - 0.12, 0.08, 0.08, 0, 0.95, z, 'wood_light');
        if (progress > 0) box(w * 0.75, progress * 0.35, d * 0.75, 0, 0.08 + progress * 0.175, 0, 'linen');
      }
      model.name = building.instanceId; model.userData.stage = building.status;
      model.position.copy(gridToWorld(building.gridX, building.gridZ, building.footprint, this.metrics));
      model.scale.setScalar(this.metrics.cellSize / CELL_SIZE); model.rotation.y = building.rotation * Math.PI / 2;
      (building.defId === 'dirt_road' ? this.scene.roadsGroup : this.scene.buildingsGroup).add(model);
      this.meshes.set(building.instanceId, { signature, group: model });
    }
  }
  dispose(): void {
    for (const { group } of this.meshes.values()) { group.removeFromParent(); disposeBuilding(group); }
    this.meshes.clear();
  }
}
