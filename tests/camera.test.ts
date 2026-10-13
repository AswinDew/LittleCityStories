import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CameraController } from '../src/world/CameraController';

describe('CameraController', () => {
  let mockElement: HTMLElement;
  let originalWindow: unknown;

  beforeEach(() => {
    mockElement = {
      clientWidth: 800,
      clientHeight: 600,
      addEventListener: () => {},
      removeEventListener: () => {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    } as unknown as HTMLElement;

    originalWindow = (globalThis as any).window;
    (globalThis as any).window = {
      innerWidth: 800,
      innerHeight: 600,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
  });

  it('initializes with default orthographic isometric parameters', () => {
    const controller = new CameraController(mockElement);
    expect(controller.camera).toBeDefined();
    expect(controller.camera.zoom).toBe(1.0);
    expect(controller.getRotationAngle()).toBeCloseTo(Math.PI / 4);
    controller.dispose();
  });

  it('rotates clockwise and counter-clockwise in 90-degree increments', () => {
    const controller = new CameraController(mockElement);
    controller.rotateClockwise();
    // Simulate damping update
    controller.update(0.5);
    expect(controller.getRotationAngle()).toBeGreaterThan(Math.PI / 4);

    controller.rotateCounterClockwise();
    controller.update(1.0);
    expect(controller.getRotationAngle()).toBeCloseTo(Math.PI / 4, 1);
    controller.dispose();
  });

  it('clamps zoom levels within bounds', () => {
    const controller = new CameraController(mockElement);
    controller.setZoom(10.0);
    expect(controller.camera.zoom).toBe(2.8); // maxZoom

    controller.setZoom(0.01);
    expect(controller.camera.zoom).toBe(0.5); // minZoom
    controller.dispose();
  });

  it('resets view without unwinding multiple revolutions', () => {
    const controller = new CameraController(mockElement);
    // Rotate 8 full turns (32 quarter-turns)
    for (let i = 0; i < 32; i++) {
      controller.rotateClockwise();
    }
    // Settle rotation
    for (let i = 0; i < 20; i++) {
      controller.update(0.1);
    }

    // Call resetView()
    controller.resetView();

    // Settle back to default
    for (let i = 0; i < 20; i++) {
      controller.update(0.1);
    }

    // Angle must cleanly settle to π/4 without spinning through all 32 turns
    expect(controller.getRotationAngle()).toBeCloseTo(Math.PI / 4, 1);
    controller.dispose();
  });
});
