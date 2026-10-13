import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CameraController } from '../src/world/CameraController';
import { useGameStore } from '../src/state/GameStore';

describe('Rotation Mechanics & Shortcuts', () => {
  let mockElement: HTMLElement;
  let controller: CameraController;
  let originalWindow: unknown;

  beforeEach(() => {
    mockElement = {
      clientWidth: 1024,
      clientHeight: 768,
      addEventListener: () => {},
      removeEventListener: () => {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1024, height: 768 }),
    } as unknown as HTMLElement;

    originalWindow = (globalThis as any).window;
    (globalThis as any).window = {
      innerWidth: 1024,
      innerHeight: 768,
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    controller = new CameraController(mockElement);
    useGameStore.getState().resetGame();
  });

  afterEach(() => {
    controller.dispose();
    (globalThis as any).window = originalWindow;
  });

  it('rotates camera by exactly 90 degrees per rotation call', () => {
    const initialAngle = controller.getRotationAngle();
    expect(initialAngle).toBeCloseTo(Math.PI / 4);

    controller.rotateClockwise();
    // Simulate damping update to completion
    for (let i = 0; i < 20; i++) controller.update(0.1);

    expect(controller.getRotationAngle()).toBeCloseTo(Math.PI / 4 + Math.PI / 2, 2);

    controller.rotateCounterClockwise();
    for (let i = 0; i < 20; i++) controller.update(0.1);

    expect(controller.getRotationAngle()).toBeCloseTo(Math.PI / 4, 2);
  });

  it('rotates across full 360-degree cycles cleanly without drift', () => {
    // 4 quarter turns clockwise = full 360 degree revolution
    for (let i = 0; i < 4; i++) {
      controller.rotateClockwise();
    }
    for (let i = 0; i < 30; i++) controller.update(0.1);

    // After full turn, angle returns to initial π/4
    expect(controller.getRotationAngle()).toBeCloseTo(Math.PI / 4, 1);
  });

  it('toggles bulldoze tool on and off idempotently', () => {
    const store = useGameStore.getState();
    expect(store.activeTool.mode).toBe('idle');

    store.setDemolishTool();
    expect(useGameStore.getState().activeTool.mode).toBe('demolish');

    store.clearTool();
    expect(useGameStore.getState().activeTool.mode).toBe('idle');
  });
});
