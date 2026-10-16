export type SimulationSpeed = 0 | 1 | 2;
export const TICK_MS = 100;

/** Fixed-step accumulator, independent of rendering and browser scheduling. */
export class SimulationClock {
  private accumulator = 0;
  private speed: SimulationSpeed = 1;
  private suspended = false;

  get currentSpeed(): SimulationSpeed { return this.speed; }
  setSpeed(speed: SimulationSpeed): void {
    if (speed !== 0 && speed !== 1 && speed !== 2) throw new RangeError('Unsupported simulation speed');
    this.speed = speed;
  }
  suspend(): void { this.suspended = true; }
  resume(): void { this.suspended = false; }
  advance(elapsedMs: number): number {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('Invalid elapsed time');
    if (this.suspended || this.speed === 0) return 0;
    this.accumulator += elapsedMs * this.speed;
    const ticks = Math.min(20, Math.floor((this.accumulator + 1e-7) / TICK_MS));
    this.accumulator = Math.max(0, this.accumulator - ticks * TICK_MS);
    return ticks;
  }
}
