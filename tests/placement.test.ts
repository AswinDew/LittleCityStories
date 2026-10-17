import { it, expect } from 'vitest';
import { SimulationSession } from '../src/simulation/SimulationSession';
import { checkPlacement } from '../src/construction/ConstructionSystem';

it('uses identical preview/command validation and does not mutate resources while previewing', () => {
  const session = new SimulationSession({ environmentDensity: 0 });
  for (const cell of [{ x: 12, z: 12 }, { x: 31, z: 31 }, { x: 15, z: 15 }, { x: 11, z: 16 }]) {
    const before = session.getSnapshot();
    const command = { type: 'placeBuilding' as const, defId: 'farm', cell, rotation: 1 };
    const preview = checkPlacement(command, before);
    expect(session.getSnapshot()).toEqual(before);
    const result = session.dispatch(command);
    expect(result.ok).toBe(preview.ok);
    if (!preview.ok) expect(session.getSnapshot()).toEqual(before);
  }
});

it('preserves rotation and reproducible IDs across consecutive successful placements', () => {
  const first = new SimulationSession({ seed: 42, environmentDensity: 0 });
  const second = new SimulationSession({ seed: 42, environmentDensity: 0 });
  // Leave the first house's east-facing entrance clear.
  for (const session of [first, second]) for (const x of [12, 14]) {
    expect(session.dispatch({ type: 'placeBuilding', defId: 'primitive_house', cell: { x, z: 12 }, rotation: 1 }).ok).toBe(true);
  }
  expect(first.getSnapshot()).toEqual(second.getSnapshot());
  expect(Object.values(first.getSnapshot().buildings).filter(b => b.defId === 'primitive_house').every(b => b.rotation === 1)).toBe(true);
});
