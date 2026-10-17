import { describe, it, expect } from 'vitest';
import { SimulationSession } from '../src/simulation/SimulationSession';

describe('headless simulation session', () => {
  it('reproduces world, identities and ticks with the same seed and commands', () => {
    const first = new SimulationSession({ seed: 88 });
    const second = new SimulationSession({ seed: 88 });
    for (const session of [first, second]) {
      session.allocateIdentity('building');
      session.dispatch({ type: 'setTerrain', cell: { x: 1, z: 1 }, terrain: 'dirt' });
      session.step(100);
    }
    expect(first.getSnapshot()).toEqual(second.getSnapshot());
    expect(first.getSnapshot().tick).toBe(100);
    expect(first.getSnapshot().world.grid[1][1].terrain).toBe('dirt');
    expect(first.getSnapshot().citizens).toEqual({});
  });
  it('returns immutable isolated plain-data snapshots', () => {
    const session = new SimulationSession();
    const snapshot = session.getSnapshot();
    expect(() => { snapshot.world.grid[0][0].canBuild = false; }).toThrow();
    expect(session.getSnapshot().world.grid[0][0].canBuild).toBe(true);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype);
  });
  it('exposes the same Town Center occupancy through its grid and snapshot', () => {
    const session = new SimulationSession();
    const town = Object.values(session.getSnapshot().buildings)[0];
    expect(session.gridSystem.getCell(town.gridX, town.gridZ)?.buildingId).toBe(town.instanceId);
    expect(session.getSnapshot().world.grid[town.gridX][town.gridZ].buildingId).toBe(town.instanceId);
  });
  it('rejects invalid commands and ticks without mutating state', () => {
    const session = new SimulationSession();
    const before = session.getSnapshot();
    expect(session.dispatch({ type: 'setTerrain', cell: { x: -1, z: 1 }, terrain: 'dirt' }).ok).toBe(false);
    expect(session.dispatch({ type: 'setTerrain', cell: { x: 1.5, z: 1 }, terrain: 'dirt' }).ok).toBe(false);
    expect(session.dispatch({ type: 'unsupported' } as never).ok).toBe(false);
    expect(() => session.step(-1)).toThrow();
    expect(() => session.step(NaN)).toThrow();
    expect(session.getSnapshot()).toEqual(before);
  });
});
