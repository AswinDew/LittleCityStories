import * as THREE from 'three';
import { DEFAULT_GRID_METRICS, GridMetrics } from '@/world/GridMath';

export class CameraController {
  public readonly camera: THREE.OrthographicCamera;
  private domElement: HTMLElement;

  // View settings
  private frustumSize = 40;
  private minZoom = 0.5;
  private maxZoom = 2.8;

  // Orbit parameters
  public target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private currentTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private cameraDistance = 80;

  // Elevation: ~35.264° (classic isometric arctan(1/sqrt(2)))
  private elevation = Math.atan(1 / Math.SQRT2);

  // Rotation: 4 discrete 90-degree orientations, smoothly interpolated
  private rotationAngle = Math.PI / 4; // 45 degrees
  private targetRotationAngle = Math.PI / 4;

  // Interaction tracking
  private isDragging = false;
  private dragButton = -1; // 0: left, 1: middle, 2: right
  private lastPointerX = 0;
  private lastPointerY = 0;
  private dragDistance = 0;

  // Bounds for target panning
  private panLimit: number;

  // Scratch vectors for zero-allocation camera math during drag
  private readonly _right = new THREE.Vector3();
  private readonly _up = new THREE.Vector3();
  private readonly _forward = new THREE.Vector3();
  private readonly _scratch = new THREE.Vector3();
  private readonly _panVector = new THREE.Vector3();

  constructor(domElement: HTMLElement, metrics: GridMetrics = DEFAULT_GRID_METRICS) {
    this.domElement = domElement;
    const width = metrics.size * metrics.cellSize;
    this.frustumSize = width * 1.2;
    this.cameraDistance = Math.max(80, width * 2);
    this.panLimit = width * 0.75;

    const aspect = (domElement.clientWidth || window.innerWidth) / (domElement.clientHeight || window.innerHeight);
    const halfWidth = (this.frustumSize * aspect) / 2;
    const halfHeight = this.frustumSize / 2;

    this.camera = new THREE.OrthographicCamera(
      -halfWidth,
      halfWidth,
      halfHeight,
      -halfHeight,
      1,
      Math.max(500, this.cameraDistance * 4)
    );
    this.camera.zoom = 1.0;

    this.updateCameraPosition();
    this.attachEventListeners();
  }

  public resize(width: number, height: number): void {
    const aspect = width / height;
    const halfWidth = (this.frustumSize * aspect) / 2;
    const halfHeight = this.frustumSize / 2;

    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }

  public rotateClockwise(): void {
    this.targetRotationAngle += Math.PI / 2;
  }

  public rotateCounterClockwise(): void {
    this.targetRotationAngle -= Math.PI / 2;
  }

  public zoomIn(factor = 1.2): void {
    this.setZoom(this.camera.zoom * factor);
  }

  public zoomOut(factor = 0.833): void {
    this.setZoom(this.camera.zoom * factor);
  }

  public setZoom(zoom: number): void {
    this.camera.zoom = THREE.MathUtils.clamp(zoom, this.minZoom, this.maxZoom);
    this.camera.updateProjectionMatrix();
  }

  public resetView(): void {
    this.target.set(0, 0, 0);
    this.setZoom(1.0);
    // Smoothly rotate along the shortest angular distance to the default pi / 4 view
    const diff = Math.PI / 4 - this.rotationAngle;
    const shortestDelta = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.targetRotationAngle = this.rotationAngle + shortestDelta;
  }

  public update(deltaTime: number): void {
    // Smooth rotation interpolation
    const rotSpeed = 8.0;
    this.rotationAngle = THREE.MathUtils.damp(
      this.rotationAngle,
      this.targetRotationAngle,
      rotSpeed,
      deltaTime
    );

    // Periodically wrap angle when settled to avoid floating point precision degradation
    if (Math.abs(this.rotationAngle - this.targetRotationAngle) < 0.001) {
      const twoPi = Math.PI * 2;
      this.rotationAngle = ((this.rotationAngle % twoPi) + twoPi) % twoPi;
      this.targetRotationAngle = this.rotationAngle;
    }

    // Smooth target panning interpolation
    const panDamp = 14.0;
    this.currentTarget.x = THREE.MathUtils.damp(this.currentTarget.x, this.target.x, panDamp, deltaTime);
    this.currentTarget.z = THREE.MathUtils.damp(this.currentTarget.z, this.target.z, panDamp, deltaTime);

    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    // Spherical position based on elevation and azimuth
    const cosElev = Math.cos(this.elevation);
    const sinElev = Math.sin(this.elevation);

    const x = this.currentTarget.x + this.cameraDistance * cosElev * Math.sin(this.rotationAngle);
    const y = this.currentTarget.y + this.cameraDistance * sinElev;
    const z = this.currentTarget.z + this.cameraDistance * cosElev * Math.cos(this.rotationAngle);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.currentTarget.x, 0, this.currentTarget.z);
    this.camera.updateMatrixWorld();
  }

  private attachEventListeners(): void {
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
    window.addEventListener('blur', this.onPointerCancel);
    this.domElement.addEventListener('lostpointercapture', this.onPointerCancel);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
  }

  private onPointerDown = (event: PointerEvent): void => {
    const isTouch = event.pointerType === 'touch';
    // Allow dragging with right button (2), middle button (1), left button with Alt/Shift, or touch
    if (
      event.button === 1 ||
      event.button === 2 ||
      (event.button === 0 && (event.altKey || event.shiftKey)) ||
      isTouch
    ) {
      this.isDragging = true;
      this.dragButton = isTouch ? -2 : event.button;
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
      this.dragDistance = 0;
      event.preventDefault();
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.lastPointerX;
    const deltaY = event.clientY - this.lastPointerY;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    this.dragDistance += Math.hypot(deltaX, deltaY);

    // Calculate pan vector in camera's screen-space plane
    // Convert screen deltas to world units based on orthographic view
    const viewHeight = this.frustumSize / this.camera.zoom;
    const viewWidth = (this.frustumSize * (this.domElement.clientWidth / this.domElement.clientHeight)) / this.camera.zoom;

    const worldDeltaX = -(deltaX / this.domElement.clientWidth) * viewWidth;
    const worldDeltaY = (deltaY / this.domElement.clientHeight) * viewHeight;

    // Project camera right & up vectors onto the ground plane (y = 0)
    this.camera.matrixWorld.extractBasis(this._right, this._up, this._scratch);

    // Flatten onto ground
    this._right.y = 0;
    this._right.normalize();
    this._forward.set(-this._right.z, 0, this._right.x).normalize();

    // Exact isometric foreshortening multiplier: 1 / sin(elevation)
    const elevationMultiplier = 1 / Math.sin(this.elevation);

    // In isometric, screen up corresponds to -forward vector in ground projection
    this._panVector
      .set(0, 0, 0)
      .addScaledVector(this._right, worldDeltaX)
      .addScaledVector(this._forward, -worldDeltaY * elevationMultiplier);

    this.target.add(this._panVector);

    // Clamp boundaries
    this.target.x = THREE.MathUtils.clamp(this.target.x, -this.panLimit, this.panLimit);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -this.panLimit, this.panLimit);
  };

  private onPointerUp = (event: PointerEvent): void => {
    const isTouch = event.pointerType === 'touch';
    if ((isTouch && this.dragButton === -2) || event.button === this.dragButton) {
      this.isDragging = false;
      this.dragButton = -1;
    }
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const zoomFactor = event.deltaY < 0 ? 1.12 : 0.89;
    this.setZoom(this.camera.zoom * zoomFactor);
  };

  private onContextMenu = (event: Event): void => { event.preventDefault(); };
  private onPointerCancel = (): void => { this.isDragging = false; this.dragButton = -1; };

  public getRotationAngle(): number {
    return this.rotationAngle;
  }

  public isUserDragging(): boolean {
    return this.isDragging && this.dragDistance > 4;
  }

  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);
    window.removeEventListener('blur', this.onPointerCancel);
    this.domElement.removeEventListener('lostpointercapture', this.onPointerCancel);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
  }
}
