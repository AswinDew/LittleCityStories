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

interface AssemblyPart { mesh: THREE.Mesh; scale: THREE.Vector3; y: number; bottom: number; start: number; end: number; cutaway: boolean }
interface BuildingView { signature: string; group: THREE.Group; scaffold: THREE.Group; parts: AssemblyPart[] }

/** Final geometry is assembled continuously from actual work; no finished-model swap. */
export class ConstructionView {
  private readonly meshes = new Map<string, BuildingView>();
  constructor(private readonly scene: SceneManager, private readonly metrics: GridMetrics) {}
  sync(snapshot: Readonly<SimulationState>): void {
    for (const [id, record] of this.meshes) if (!Object.hasOwn(snapshot.buildings, id)) {
      record.group.removeFromParent(); disposeBuilding(record.group); this.meshes.delete(id);
    }
    for (const building of Object.values(snapshot.buildings)) {
      const def = BuildingRegistry.getInstance().get(building.defId)!;
      const signature = `${building.defId}/${building.level}/${building.seed}/${building.rotation}/${building.gridX}/${building.gridZ}`;
      let record = this.meshes.get(building.instanceId);
      if (record?.signature !== signature) {
        if (record) { record.group.removeFromParent(); disposeBuilding(record.group); }
        const group = new THREE.Group(), final = BuildingFactory.createBuildingMesh(building.defId, building.level, building.seed);
        group.add(final);
        const parts: AssemblyPart[] = [];
        final.traverse(node => {
          if (!(node instanceof THREE.Mesh)) return;
          let metadata: THREE.Object3D = node;
          while (metadata.parent && metadata !== final && !metadata.userData.assembly) metadata = metadata.parent;
          const start = metadata.userData.assemblyStart ?? 0.55, end = metadata.userData.assemblyEnd ?? 0.98;
          const normal = metadata.userData.cutawayNormal as { x: number; z: number } | undefined;
          const angle = building.rotation * Math.PI / 2;
          // MVP camera looks from +X/+Z; rotate the wall normal with its building.
          const facingCamera = !normal || normal.x * (Math.cos(angle) - Math.sin(angle)) + normal.z * (Math.sin(angle) + Math.cos(angle)) > 0.01;
          node.userData.assembly ??= metadata.userData.assembly ?? 'detail';
          node.geometry.computeBoundingBox();
          parts.push({ mesh: node, scale: node.scale.clone(), y: node.position.y, bottom: node.geometry.boundingBox!.min.y,
            start, end, cutaway: !!metadata.userData.cutaway && facingCamera });
        });
        const scaffold = new THREE.Group(); scaffold.name = 'construction-scaffold';
        const w = def.footprint.width * CELL_SIZE - 0.1, d = def.footprint.depth * CELL_SIZE - 0.1;
        const box = (width: number, height: number, depth: number, x: number, y: number, z: number) => {
          const mesh = assetBox(width, height, depth, MaterialLibrary.getInstance().get('ancient_wood_light'));
          mesh.position.set(x, y, z); scaffold.add(mesh);
        };
        box(w, 0.06, d, 0, 0.03, 0);
        for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) for (const z of [-d / 2 + 0.08, d / 2 - 0.08]) box(0.08, 1.1, 0.08, x, 0.6, z);
        for (const z of [-d / 2 + 0.08, d / 2 - 0.08]) box(w, 0.06, 0.06, 0, 0.9, z);
        group.add(scaffold); group.name = building.instanceId;
        group.position.copy(gridToWorld(building.gridX, building.gridZ, building.footprint, this.metrics));
        group.scale.setScalar(this.metrics.cellSize / CELL_SIZE); group.rotation.y = building.rotation * Math.PI / 2;
        (building.defId === 'dirt_road' ? this.scene.roadsGroup : this.scene.buildingsGroup).add(group);
        record = { signature, group, scaffold, parts }; this.meshes.set(building.instanceId, record);
      }
      const progress = building.status === 'completed' ? 1 : Math.max(0, Math.min(1, building.workTicks / Math.max(1, def.requiredWorkTicks)));
      record.group.userData.stage = building.status; record.group.userData.progress = progress;
      record.scaffold.visible = progress < 1;
      const cutaway = building.defId === 'research_hut' && Object.values(snapshot.citizens).some(c =>
        c.room?.buildingId === building.instanceId && c.room.purpose === 'work' && c.room.phase !== 'leaving');
      for (const part of record.parts) {
        const fraction = Math.max(0, Math.min(1, (progress - part.start) / (part.end - part.start)));
        part.mesh.visible = fraction > 0 && !(cutaway && part.cutaway);
        part.mesh.scale.copy(part.scale); part.mesh.scale.y *= Math.max(0.0001, fraction);
        part.mesh.position.y = part.y + part.bottom * part.scale.y * (1 - fraction);
      }
    }
  }
  dispose(): void {
    for (const { group } of this.meshes.values()) { group.removeFromParent(); disposeBuilding(group); }
    this.meshes.clear();
  }
}
