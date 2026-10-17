import { describe, it, expect } from 'vitest';
import { ResourceLedger } from '../src/economy/ResourceLedger';

const initial = () => ({ wood: 160, stone: 100, food: 90, coins: 50 });
const capacity = () => ({ wood: 300, stone: 300, food: 300, coins: 300 });
describe('atomic resource ledger', () => {
  it('rejects inherited costs so a prototype cannot introduce a negative spend', () => {
    const resources = initial(), ledger = new ResourceLedger(resources, capacity());
    const inherited = Object.create({ wood: -30 });
    expect(ledger.trySpend(inherited)).toBe(false);
    expect(resources).toEqual(initial());
  });
  it.each([
    Object.defineProperty({}, 'wood', { value: -30 }),
    Object.defineProperty({}, 'wood', { get: () => -30, enumerable: true }),
    { [Symbol('gold')]: 1 },
  ])('rejects non-plain cost descriptors and symbol resources: %o', cost => {
    const resources = initial(), ledger = new ResourceLedger(resources, capacity());
    expect(ledger.trySpend(cost)).toBe(false);
    expect(ledger.tryDeposit(cost)).toBe(false);
    expect(() => ledger.refund(cost)).toThrow();
    expect(resources).toEqual(initial());
  });
  it('spends a resource vector once and leaves everything unchanged on shortage', () => {
    const resources = initial(), ledger = new ResourceLedger(resources, capacity());
    expect(ledger.trySpend({ wood: 30, stone: 10 })).toBe(true);
    expect(resources).toEqual({ wood: 130, stone: 90, food: 90, coins: 50 });
    const before = { ...resources };
    expect(ledger.trySpend({ wood: 10, stone: 91 })).toBe(false);
    expect(resources).toEqual(before);
  });
  it.each([{ wood: -1 }, { wood: 0.5 }, { wood: NaN }, { wood: Infinity }, { gold: 1 }, null, []])(
    'rejects invalid bundles %o without mutation', bundle => {
      const resources = initial(), ledger = new ResourceLedger(resources, capacity());
      expect(ledger.canAfford(bundle as never)).toBe(false);
      expect(ledger.trySpend(bundle as never)).toBe(false);
      expect(ledger.tryDeposit(bundle as never)).toBe(false);
      expect(() => ledger.refund(bundle as never)).toThrow();
      expect(resources).toEqual(initial());
    });
  it('deposits a whole batch, preserves over-capacity refunds and rejects overflow', () => {
    const resources = initial(), limits = capacity(), ledger = new ResourceLedger(resources, limits);
    expect(ledger.tryDeposit({ wood: 141, stone: 1 })).toBe(false);
    expect(resources).toEqual(initial());
    ledger.refund({ wood: 200 });
    expect(resources.wood).toBe(360);
    limits.wood = 100;
    expect(ledger.tryDeposit({ stone: 2 })).toBe(true);
    expect(ledger.tryDeposit({ wood: 1, food: 2 })).toBe(false);
    expect(resources.food).toBe(90);
    expect(ledger.trySpend({ wood: 300 })).toBe(true);
    expect(resources.wood).toBe(60);
    expect(() => ledger.refund({ wood: Number.MAX_SAFE_INTEGER })).toThrow();
    expect(resources.wood).toBe(60);
  });
});
