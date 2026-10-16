import * as THREE from 'three';
import { DEFAULT_GRID_METRICS, GridMetrics } from '@/world/GridMath';

export class GameLighting {
  public readonly group: THREE.Group;
  public readonly sunLight: THREE.DirectionalLight;
  public readonly hemiLight: THREE.HemisphereLight;
  public readonly ambientLight: THREE.AmbientLight;

  constructor(metrics: GridMetrics = DEFAULT_GRID_METRICS) {
    const GRID_WORLD_WIDTH = metrics.size * metrics.cellSize;
    this.group = new THREE.Group();
    this.group.name = 'LightingGroup';

    // Warm daylight sky color + subtle ground bounce
    this.hemiLight = new THREE.HemisphereLight(0xdff0fc, 0x8ab986, 0.65);
    this.group.add(this.hemiLight);

    // Soft global ambient
    this.ambientLight = new THREE.AmbientLight(0xfff6ea, 0.45);
    this.group.add(this.ambientLight);

    // Main directional sunlight with soft pastel warmth
    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 1.35);
    const scale = GRID_WORLD_WIDTH / 40;
    this.sunLight.position.set(45 * scale, 65 * scale, 35 * scale);
    this.sunLight.castShadow = true;

    // Scale shadow depth and coverage with the configured world.
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10 * scale;
    this.sunLight.shadow.camera.far = 160 * scale;
    this.sunLight.shadow.bias = -0.0003;
    this.sunLight.shadow.normalBias = 0.02;

    const shadowFrustum = GRID_WORLD_WIDTH * 0.9;
    this.sunLight.shadow.camera.left = -shadowFrustum;
    this.sunLight.shadow.camera.right = shadowFrustum;
    this.sunLight.shadow.camera.top = shadowFrustum;
    this.sunLight.shadow.camera.bottom = -shadowFrustum;

    this.group.add(this.sunLight);
  }

  public dispose(): void {
    this.sunLight.dispose();
    this.hemiLight.dispose();
    this.ambientLight.dispose();
  }
}
