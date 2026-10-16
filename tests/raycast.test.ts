import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { RaycastSystem } from '../src/world/RaycastSystem';

describe('RaycastSystem', () => {
  let mockElement: HTMLElement;
  let camera: THREE.OrthographicCamera;
  let groundMesh: THREE.Mesh;

  beforeEach(() => {
    mockElement = {
      clientWidth: 800,
      clientHeight: 600,
      addEventListener: () => {},
      removeEventListener: () => {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    } as unknown as HTMLElement;

    camera = new THREE.OrthographicCamera(-20, 20, 20, -20, 1, 100);
    camera.up.set(0, 0, -1);
    camera.position.set(0, 50, 0);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const geo = new THREE.PlaneGeometry(40, 40);
    groundMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.updateMatrixWorld();
  });

  it('casts from center screen to middle grid cell', () => {
    const raycast = new RaycastSystem(mockElement, camera, groundMesh, { size: 20, cellSize: 2 });
    // Screen center: clientX = 400, clientY = 300
    const hit = raycast.castFromScreen(400, 300);

    expect(hit).not.toBeNull();
    if (hit) {
      // (0, 0) in world is cell (10, 10) on a 20x20 grid with origin at -20, -20
      expect(hit.cell.x).toBe(10);
      expect(hit.cell.z).toBe(10);
    }
    raycast.dispose();
  });

  it('returns null when screen coords are outside valid grid bounds', () => {
    const raycast = new RaycastSystem(mockElement, camera, groundMesh);
    // Far off-screen coordinates
    const hit = raycast.castFromScreen(9999, 9999);
    expect(hit).toBeNull();
    raycast.dispose();
  });

  it('reuses internal cached result object during update() to prevent heap allocations', () => {
    const raycast = new RaycastSystem(mockElement, camera, groundMesh);

    // Simulate pointer in bounds
    (raycast as any).pointer.set(0, 0);
    const hit1 = raycast.update();
    const hit2 = raycast.update();

    expect(hit1).not.toBeNull();
    expect(hit2).not.toBeNull();
    // Must be the exact same object reference in memory (zero new allocations)
    expect(hit1).toBe(hit2);

    raycast.dispose();
  });
});
