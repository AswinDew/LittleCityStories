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

  public update(): RaycastHitResult | null {
    if (this.pointer.x < -1 || this.pointer.x > 1 || this.pointer.y < -1 || this.pointer.y > 1) {
      this._currentCell = null;
      this._currentHitPoint = null;
      return null;
    }

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObject(this.groundMesh, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const cell = worldToGrid(hit.point);

      if (isWithinBounds(cell.x, cell.z)) {
        this._currentCell = cell;
        this._currentHitPoint = hit.point.clone();
        return {
          cell,
          worldPoint: this._currentHitPoint,
        };
      }
    }

    this._currentCell = null;
    this._currentHitPoint = null;
    return null;
  }

  /**
   * Raycast from an explicit screen coordinate (e.g. on click)
   */
  public castFromScreen(clientX: number, clientY: number): RaycastHitResult | null {
    const rect = this.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const coords = new THREE.Vector2(x, y);
    this.raycaster.setFromCamera(coords, this.camera);
    const intersects = this.raycaster.intersectObject(this.groundMesh, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const cell = worldToGrid(hit.point);
      if (isWithinBounds(cell.x, cell.z)) {
        return {
          cell,
          worldPoint: hit.point.clone(),
        };
      }
    }

    return null;
  }

  public dispose(): void {
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerleave', this.onPointerLeave);
  }
}
