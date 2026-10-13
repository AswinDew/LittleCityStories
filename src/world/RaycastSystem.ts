import * as THREE from 'three';
import { GridCoord, worldToGrid, isWithinBounds } from '@/utils/coordinates';

export interface RaycastHitResult {
  cell: GridCoord;
  worldPoint: THREE.Vector3;
}

export class RaycastSystem {
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private domElement: HTMLElement;
  private camera: THREE.Camera;
  private groundMesh: THREE.Mesh;

  private _currentCell: GridCoord | null = null;
  private _currentHitPoint: THREE.Vector3 | null = null;

  // Pre-allocated scratch objects to achieve zero garbage allocations during 60+ FPS loop
  private readonly _scratchHitPoint: THREE.Vector3 = new THREE.Vector3();
  private readonly _scratchCell: GridCoord = { x: 0, z: 0 };
  private readonly _cachedResult: RaycastHitResult;
  private readonly _screenCoords: THREE.Vector2 = new THREE.Vector2();

  public get currentCell(): GridCoord | null {
    return this._currentCell;
  }

  public get currentHitPoint(): THREE.Vector3 | null {
    return this._currentHitPoint;
  }

  constructor(domElement: HTMLElement, camera: THREE.Camera, groundMesh: THREE.Mesh) {
    this.domElement = domElement;
    this.camera = camera;
    this.groundMesh = groundMesh;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(-999, -999);

    this._cachedResult = {
      cell: this._scratchCell,
      worldPoint: this._scratchHitPoint,
    };

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerleave', this.onPointerLeave);
  }

  private onPointerMove = (event: PointerEvent): void => {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  private onPointerLeave = (): void => {
    this.pointer.set(-999, -999);
    this._currentCell = null;
    this._currentHitPoint = null;
  };

  /**
   * Internal reusable raycasting routine from normalized device coordinates (NDC).
   */
  private performRaycast(ndc: THREE.Vector2): RaycastHitResult | null {
    this.raycaster.setFromCamera(ndc, this.camera);
    const intersects = this.raycaster.intersectObject(this.groundMesh, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const cell = worldToGrid(hit.point);

      if (isWithinBounds(cell.x, cell.z)) {
        this._scratchCell.x = cell.x;
        this._scratchCell.z = cell.z;
        this._scratchHitPoint.copy(hit.point);
        this._currentCell = this._scratchCell;
        this._currentHitPoint = this._scratchHitPoint;
        return this._cachedResult;
      }
    }

    this._currentCell = null;
    this._currentHitPoint = null;
    return null;
  }

  /**
   * Evaluates hover intersection for the current pointer position.
   * Reuses internal pre-allocated buffers for zero-allocation performance.
   */
  public update(): RaycastHitResult | null {
    if (this.pointer.x < -1 || this.pointer.x > 1 || this.pointer.y < -1 || this.pointer.y > 1) {
      this._currentCell = null;
      this._currentHitPoint = null;
      return null;
    }

    return this.performRaycast(this.pointer);
  }

  /**
   * Raycast from an explicit screen coordinate (e.g. on click / tap).
   */
  public castFromScreen(clientX: number, clientY: number): RaycastHitResult | null {
    const rect = this.domElement.getBoundingClientRect();
    this._screenCoords.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._screenCoords.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const hit = this.performRaycast(this._screenCoords);
    if (!hit) return null;

    // Return a cloned copy so click events can store results without being mutated by subsequent hover updates
    return {
      cell: { ...hit.cell },
      worldPoint: hit.worldPoint.clone(),
    };
  }

  public dispose(): void {
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerleave', this.onPointerLeave);
  }
}
