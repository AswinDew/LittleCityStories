import * as THREE from 'three';
import type { SimulationState } from '@/simulation/types';
import { CELL_SIZE, GridMetrics } from '@/world/GridMath';
import { gridToWorld } from '@/utils/coordinates';
import { createShadeTree } from '@/assets/procedural/decorations';
import { disposeBuilding } from '@/assets/procedural/houses';
import { MaterialLibrary } from '@/assets/MaterialLibrary';
import { SceneManager } from './SceneManager';

/** Projects environment data into meshes; never owns or mutates simulation data. */
export class WorldView {
  private readonly objects = new Map<string, THREE.Object3D>();
  private readonly terrainOverlays = new Map<string, THREE.Mesh>();
  private readonly terrainMaterials = {
    dirt: new THREE.MeshLambertMaterial({ color: 0xb99a70 }),
    concrete: new THREE.MeshLambertMaterial({ color: 0xbac0ba }),
    water: new THREE.MeshLambertMaterial({ color: 0x65b9d7 }),
  };
  constructor(private readonly scene: SceneManager, private readonly metrics: GridMetrics) {}

  sync(snapshot: Readonly<SimulationState>): void {
    const ids = new Set(snapshot.world.environment.map(object => object.id));
    for (const [id, object] of this.objects) if (!ids.has(id)) {
      object.removeFromParent();
      disposeBuilding(object);
      this.objects.delete(id);
    }
    for (const object of snapshot.world.environment) {
      if (this.objects.has(object.id)) continue;
      let mesh: THREE.Object3D;
      if (object.kind === 'tree') mesh = createShadeTree(object.variation);
      else {
        const material = MaterialLibrary.getInstance().get(object.kind === 'rock' ? 'roof_slate_blue' : 'tree_canopy_light');
        mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(object.kind === 'rock' ? 0.55 : 0.3, 0), material);
        mesh.position.y = object.kind === 'rock' ? 0.4 : 0.2;
        mesh.scale.y = object.kind === 'rock' ? 0.7 : 1;
        mesh.castShadow = true;
      }
      const point = gridToWorld(object.x, object.z, undefined, this.metrics);
      const scale = this.metrics.cellSize / CELL_SIZE;
      mesh.scale.multiplyScalar(scale);
      mesh.position.y *= scale;
      mesh.position.x = point.x;
      mesh.position.z = point.z;
      mesh.name = object.id;
      this.scene.vegetationGroup.add(mesh);
      this.objects.set(object.id, mesh);
    }
    for (const row of snapshot.world.grid) for (const cell of row) {
      const key = `${cell.x},${cell.z}`;
      const existing = this.terrainOverlays.get(key);
      if (cell.terrain === 'grass') {
        if (existing) { existing.removeFromParent(); existing.geometry.dispose(); this.terrainOverlays.delete(key); }
      } else if (existing) existing.material = this.terrainMaterials[cell.terrain];
      else {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.metrics.cellSize, this.metrics.cellSize),
          this.terrainMaterials[cell.terrain]);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.copy(gridToWorld(cell.x, cell.z, undefined, this.metrics));
        mesh.position.y = 0.002;
        mesh.receiveShadow = true;
        this.scene.terrainGroup.add(mesh);
        this.terrainOverlays.set(key, mesh);
      }
    }
  }
  dispose(): void {
    for (const object of this.objects.values()) { object.removeFromParent(); disposeBuilding(object); }
    for (const mesh of this.terrainOverlays.values()) { mesh.removeFromParent(); mesh.geometry.dispose(); }
    Object.values(this.terrainMaterials).forEach(material => material.dispose());
    this.objects.clear();
    this.terrainOverlays.clear();
  }
}
