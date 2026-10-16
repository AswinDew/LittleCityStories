import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { Game } from '../src/game/Game';
import { useGameStore } from '../src/state/GameStore';

vi.mock('../src/game/Renderer', () => ({ GameRenderer: class {
  render = vi.fn();
  dispose = vi.fn();
  resize = () => ({ width: 800, height: 600 });
} }));

describe('game scheduler and lifecycle', () => {
  let game: Game;
  let visibility: EventTarget & { hidden: boolean };
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
    vi.stubGlobal('window', Object.assign(new EventTarget(), { innerWidth: 800, innerHeight: 600 }));
    visibility = Object.assign(new EventTarget(), { hidden: false });
    vi.stubGlobal('document', visibility);
    // No render callbacks run: simulation must still advance on its own scheduler.
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const container = Object.assign(new EventTarget(), { clientWidth: 800, clientHeight: 600,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) });
    game = new Game(container as unknown as HTMLElement);
  });
  afterEach(() => { game.dispose(); vi.useRealTimers(); vi.unstubAllGlobals(); });
  const setHidden = (value: boolean, target: typeof visibility) => {
    target.hidden = value;
    target.dispatchEvent(new Event('visibilitychange'));
  };

  it('ticks without render frames, publishes snapshots and rejects manual stepping', () => {
    vi.advanceTimersByTime(1000);
    expect(game.session.getSnapshot().tick).toBe(10);
    expect(useGameStore.getState().simulationSnapshot?.tick).toBe(10);
    expect(() => game.advanceTicks(1)).toThrow(/manual/i);
    expect(game.renderer.render).toHaveBeenCalledTimes(1);
  });

  it('counts visible remainder before hiding and excludes hidden time', () => {
    vi.advanceTimersByTime(80);
    setHidden(true, visibility);
    vi.advanceTimersByTime(1000);
    expect(game.session.getSnapshot().tick).toBe(0);
    setHidden(false, visibility);
    vi.advanceTimersByTime(120);
    expect(game.session.getSnapshot().tick).toBe(2);
  });

  it('preserves manual pause across visibility changes and resets the baseline on restart', () => {
    game.setSpeed(0);
    setHidden(true, visibility);
    vi.advanceTimersByTime(5000);
    setHidden(false, visibility);
    vi.advanceTimersByTime(500);
    expect(game.session.getSnapshot().tick).toBe(0);
    game.setSpeed(2);
    vi.advanceTimersByTime(500);
    expect(game.session.getSnapshot().tick).toBe(10);
    game.stop();
    vi.advanceTimersByTime(10000);
    game.start();
    vi.advanceTimersByTime(100);
    expect(game.session.getSnapshot().tick).toBe(12);
  });

  it('disposes once and leaves no scheduler running', () => {
    game.dispose();
    game.dispose();
    game.start();
    expect(game.renderer.dispose).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
