import type { ResourceBundle, ResourceId } from './types';

export const RESOURCE_IDS: readonly ResourceId[] = ['wood', 'stone', 'food', 'coins'];
export const emptyResources = (): ResourceBundle => ({ wood: 0, stone: 0, food: 0, coins: 0 });
const amount = (bundle: Partial<ResourceBundle>, key: ResourceId): number => Object.hasOwn(bundle, key) ? bundle[key] ?? 0 : 0;
export function isResourceBundle(value: unknown): value is Partial<ResourceBundle> {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) &&
    Reflect.ownKeys(value).every(key => {
      if (typeof key !== 'string' || !RESOURCE_IDS.includes(key as ResourceId)) return false;
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      return descriptor.enumerable && 'value' in descriptor &&
        Number.isSafeInteger(descriptor.value) && descriptor.value >= 0;
    });
}

/** Binds the session's resource objects. No separate mutable copy is retained. */
export class ResourceLedger {
  constructor(private readonly resources: ResourceBundle, private readonly capacity: ResourceBundle) {
    if (!isResourceBundle(resources) || !isResourceBundle(capacity) ||
        RESOURCE_IDS.some(key => resources[key] === undefined || capacity[key] === undefined)) {
      throw new RangeError('Invalid resource ledger');
    }
  }
  canAfford(cost: Partial<ResourceBundle>): boolean {
    return isResourceBundle(cost) && RESOURCE_IDS.every(key => this.resources[key] >= amount(cost, key));
  }
  trySpend(cost: Partial<ResourceBundle>): boolean {
    if (!this.canAfford(cost)) return false;
    for (const key of RESOURCE_IDS) this.resources[key] -= amount(cost, key);
    return true;
  }
  tryDeposit(bundle: Partial<ResourceBundle>): boolean {
    if (!isResourceBundle(bundle) || RESOURCE_IDS.some(key => amount(bundle, key) > 0 &&
        (!Number.isSafeInteger(this.resources[key] + amount(bundle, key)) ||
         this.resources[key] + amount(bundle, key) > this.capacity[key]))) return false;
    for (const key of RESOURCE_IDS) this.resources[key] += amount(bundle, key);
    return true;
  }
  refund(bundle: Partial<ResourceBundle>): void {
    if (!isResourceBundle(bundle) || RESOURCE_IDS.some(key =>
        !Number.isSafeInteger(this.resources[key] + amount(bundle, key)))) throw new RangeError('Invalid refund');
    for (const key of RESOURCE_IDS) this.resources[key] += amount(bundle, key);
  }
}
