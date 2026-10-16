import { describe, it, expect } from 'vitest';
import { SimulationClock } from '../src/simulation/SimulationClock';

describe('fixed simulation clock', () => {
  it('runs 10 Hz at normal speed, 20 Hz at fast speed and none while paused', () => {
    const clock = new SimulationClock();
    expect(clock.advance(1000)).toBe(10);
    clock.setSpeed(2);
    expect(clock.advance(1000)).toBe(20);
    clock.setSpeed(0);
    expect(clock.advance(1000)).toBe(0);
  });
  it.each([16, 33, 100])('is independent of elapsed time chunk size %s', chunk => {
    const clock = new SimulationClock();
    let ticks = 0;
    for (let remaining = 10000; remaining > 0; remaining -= Math.min(chunk, remaining)) {
      ticks += clock.advance(Math.min(chunk, remaining));
    }
    expect(ticks).toBe(100);
  });
  it('retains catch-up debt instead of discarding simulation time', () => {
    const clock = new SimulationClock();
    expect(clock.advance(5000)).toBe(20);
    expect(clock.advance(0)).toBe(20);
    expect(clock.advance(0)).toBe(10);
    expect(clock.advance(0)).toBe(0);
  });
  it('preserves fractional time, suspension and manual pause independently', () => {
    const clock = new SimulationClock();
    expect(clock.advance(50)).toBe(0);
    clock.suspend();
    expect(clock.advance(60000)).toBe(0);
    clock.setSpeed(0);
    clock.resume();
    expect(clock.advance(60000)).toBe(0);
    clock.setSpeed(1);
    expect(clock.advance(50)).toBe(1);
  });
  it.each([-1, NaN, Infinity])('rejects invalid elapsed time %s', elapsed => {
    expect(() => new SimulationClock().advance(elapsed)).toThrow();
  });
  it('rejects unsupported speeds without corrupting the clock', () => {
    const clock = new SimulationClock();
    expect(() => clock.setSpeed(3 as 1)).toThrow();
    expect(clock.advance(100)).toBe(1);
  });
});
