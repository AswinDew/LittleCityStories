import type { BuildingCategory, BuildingDefinition } from './types';
import { ANCIENT_CATALOG } from '@/config/BalanceConfig';
import { isResourceBundle, RESOURCE_IDS } from '@/economy/ResourceLedger';

export class BuildingRegistry {
  private static instance: BuildingRegistry | null = null;
  private readonly catalog = new Map<string, BuildingDefinition>();
  constructor(definitions: readonly BuildingDefinition[] = ANCIENT_CATALOG) {
    for (const definition of definitions) this.register(definition);
  }
  static getInstance(): BuildingRegistry { return this.instance ??= new BuildingRegistry(); }
  register(input: BuildingDefinition): void {
    if (!/^[a-z][a-z0-9_]*$/.test(input.id) || !isResourceBundle(input.cost) ||
        RESOURCE_IDS.some(key => input.cost[key] === undefined) ||
        ![input.footprint.width, input.footprint.depth].every(n => Number.isInteger(n) && n > 0 && n <= 128) ||
        ![input.requiredWorkTicks, input.workerSlots, input.housing, input.storage].every(n => Number.isSafeInteger(n) && n >= 0) ||
        (input.entrance && ![input.entrance.x, input.entrance.z].every(Number.isInteger))) {
      throw new RangeError('Invalid building definition');
    }
    const definition = structuredClone(input);
    Object.freeze(definition.cost); Object.freeze(definition.footprint);
    if (definition.entrance) Object.freeze(definition.entrance);
    if (definition.production) Object.freeze(definition.production);
    this.catalog.set(definition.id, Object.freeze(definition));
  }
  get(id: string): BuildingDefinition | undefined { return this.catalog.get(id); }
  getAll(): BuildingDefinition[] { return [...this.catalog.values()]; }
  getByCategory(category: BuildingCategory): BuildingDefinition[] { return this.getAll().filter(def => def.category === category); }
}
