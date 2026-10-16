import * as THREE from 'three';
import {
  DEFAULT_GRID_METRICS,
  GridMetrics,
  gridToWorld,
} from '@/utils/coordinates';
import { MaterialLibrary } from '@/assets/MaterialLibrary';

export class GridRenderer {
  public readonly group: THREE.Group;
  public readonly groundPlane: THREE.Mesh; // The raycast target
  private gridHelperGroup: THREE.Group;
  private hoverTile: THREE.Mesh;

  constructor(private readonly metrics: GridMetrics = DEFAULT_GRID_METRICS) {
    const GRID_WORLD_WIDTH = metrics.size * metrics.cellSize;
    const CELL_SIZE = metrics.cellSize;
    this.group = new THREE.Group();
    this.group.name = 'GridRendererGroup';

    const mats = MaterialLibrary.getInstance();

    // 1. Base Diorama Island Slab
    const slabHeight = 2.0;
    const slabGeo = new THREE.BoxGeometry(GRID_WORLD_WIDTH + 1.2, slabHeight, GRID_WORLD_WIDTH + 1.2);
    const slabMat = mats.get('ground_slab');
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(0, -slabHeight / 2 - 0.01, 0);
    slab.receiveShadow = true;
    this.group.add(slab);

    // 2. Main Grass Ground Surface
    const groundGeo = new THREE.PlaneGeometry(GRID_WORLD_WIDTH, GRID_WORLD_WIDTH);
    const groundMat = mats.get('ground_grass');
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = 0;
    this.groundPlane.receiveShadow = true;
    this.groundPlane.name = 'GroundRaycastTarget';
    this.group.add(this.groundPlane);

    // 3. Subtle Grid Tile Lines
    this.gridHelperGroup = new THREE.Group();
    this.createGridLines();
    this.group.add(this.gridHelperGroup);

    // 4. Hover Tile Highlight Mesh
    const hoverGeo = new THREE.PlaneGeometry(CELL_SIZE * 0.96, CELL_SIZE * 0.96);
    const hoverMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0.35,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.hoverTile = new THREE.Mesh(hoverGeo, hoverMat);
    this.hoverTile.rotation.x = -Math.PI / 2;
    this.hoverTile.position.y = 0.02; // Slightly above ground to prevent z-fighting
    this.hoverTile.visible = false;
    this.group.add(this.hoverTile);
  }

  private createGridLines(): void {
    const GRID_WORLD_WIDTH = this.metrics.size * this.metrics.cellSize;
    const GRID_SIZE = this.metrics.size;
    const CELL_SIZE = this.metrics.cellSize;
    const halfWidth = GRID_WORLD_WIDTH / 2;
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x82b968, // Subtle darker green for grid borders
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = -halfWidth + i * CELL_SIZE;

      // Vertical lines along Z
      points.push(new THREE.Vector3(pos, 0.01, -halfWidth));
      points.push(new THREE.Vector3(pos, 0.01, halfWidth));

      // Horizontal lines along X
      points.push(new THREE.Vector3(-halfWidth, 0.01, pos));
      points.push(new THREE.Vector3(halfWidth, 0.01, pos));
    }

    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    this.gridHelperGroup.add(lines);
  }

  /**
   * Updates hover tile position and size
   */
  public setHoverCell(gx: number | null, gz: number | null, width = 1, depth = 1, isValid = true): void {
    if (gx === null || gz === null) {
      this.hoverTile.visible = false;
      return;
    }

    this.hoverTile.visible = true;
    const worldPos = gridToWorld(gx, gz, { width, depth }, this.metrics);
    this.hoverTile.position.x = worldPos.x;
    this.hoverTile.position.z = worldPos.z;

    this.hoverTile.scale.set(width, depth, 1);

    const mat = this.hoverTile.material as THREE.MeshBasicMaterial;
    if (isValid) {
      mat.color.setHex(0x38ef7d); // Clean pastel green
      mat.opacity = 0.45;
    } else {
      mat.color.setHex(0xff4b4b); // Soft warning red
      mat.opacity = 0.55;
    }
  }

  public setGridVisible(visible: boolean): void {
    this.gridHelperGroup.visible = visible;
  }

  public dispose(): void {
    // Dispose geometries across the group
    this.group.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
      }
    });

    // Only dispose unshared, local materials (hover tile & grid lines)
    (this.hoverTile.material as THREE.Material).dispose();
    this.gridHelperGroup.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.LineSegments && child.material) {
        (child.material as THREE.Material).dispose();
      }
    });
  }
}
