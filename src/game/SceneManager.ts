import * as THREE from 'three';
import { DEFAULT_GRID_METRICS, GridMetrics } from '@/world/GridMath';

export class SceneManager {
  public readonly scene: THREE.Scene;
  public readonly buildingsGroup: THREE.Group;
  public readonly effectsGroup: THREE.Group;
  public readonly terrainGroup = new THREE.Group();
  public readonly roadsGroup = new THREE.Group();
  public readonly vegetationGroup = new THREE.Group();
  public readonly citizensGroup = new THREE.Group();
  public readonly selectionGroup = new THREE.Group();

  constructor(metrics: GridMetrics = DEFAULT_GRID_METRICS) {
    this.scene = new THREE.Scene();
    this.scene.name = 'CitySceneRoot';

    // Soft sky background
    this.scene.background = new THREE.Color(0xaedbf0);

    // Optional subtle fog to blend distant edges into the pastel sky
    const distance = Math.max(80, metrics.size * metrics.cellSize * 2);
    this.scene.fog = new THREE.FogExp2(0xaedbf0, 0.007 * 80 / distance);

    // Building container
    this.buildingsGroup = new THREE.Group();
    this.buildingsGroup.name = 'BuildingsGroup';
    this.scene.add(this.buildingsGroup);

    // Dynamic effects container
    this.effectsGroup = new THREE.Group();
    this.effectsGroup.name = 'EffectsGroup';
    this.scene.add(this.effectsGroup);
    for (const [name, group] of Object.entries({ terrain: this.terrainGroup, roads: this.roadsGroup,
      vegetation: this.vegetationGroup, citizens: this.citizensGroup, selection: this.selectionGroup })) {
      group.name = name;
      this.scene.add(group);
    }
  }

  public dispose(): void {
    // Clean up scene geometries. Materials are managed by MaterialLibrary or dedicated owners.
    this.scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
      }
    });
  }
}
