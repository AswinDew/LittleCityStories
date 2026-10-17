import type { BuildingCategory, BuildingDefinition } from '@/buildings/types';
import type { ResourceBundle } from '@/economy/types';

export const BALANCE = Object.freeze({ storagePerBuilding: 300, ticksPerSecond: 10 });
const cost = (wood = 0, stone = 0, food = 0, coins = 0): ResourceBundle => ({ wood, stone, food, coins });
function def(id: string, name: string, category: BuildingCategory, size: number,
  price: ResourceBundle, seconds: number, description: string, extra: Partial<BuildingDefinition> = {}): BuildingDefinition {
  return { id, name, category, cost: price, footprint: { width: size, depth: size },
    entrance: id === 'dirt_road' ? null : { x: Math.floor((size - 1) / 2), z: size },
    requiredWorkTicks: seconds * BALANCE.ticksPerSecond, workerSlots: 0, housing: 0, storage: 0,
    unlockedBy: null, purchasable: true, description, ...extra };
}
export const ANCIENT_CATALOG: readonly BuildingDefinition[] = [
  def('town_center', 'Town Center', 'community', 3, cost(), 0, 'Settlement home and basic storage.',
    { purchasable: false, housing: 3, storage: BALANCE.storagePerBuilding }),
  def('primitive_house', 'Primitive House', 'housing', 1, cost(30, 10), 15, 'Housing for four citizens after completion.', { housing: 4 }),
  def('farm', 'Farm', 'production', 2, cost(40), 20, 'Two farmer workplaces; food production after workers arrive.',
    { workerSlots: 2, production: { resource: 'food', amount: 3, intervalTicks: 100 } }),
  def('lumber_camp', 'Lumber Camp', 'production', 2, cost(35, 5), 20, 'Two lumberjack workplaces near trees.',
    { workerSlots: 2, production: { resource: 'wood', amount: 2, intervalTicks: 100 } }),
  def('stone_quarry', 'Stone Quarry', 'production', 2, cost(40, 10), 25, 'Two workplaces near stone.',
    { workerSlots: 2, production: { resource: 'stone', amount: 1, intervalTicks: 100 } }),
  def('storage_hut', 'Storage Hut', 'infrastructure', 2, cost(50, 20), 25, 'Adds 300 capacity per resource after completion.',
    { storage: BALANCE.storagePerBuilding }),
  def('research_hut', 'Research Hut', 'community', 2, cost(60, 30, 0, 10), 30, 'A research workplace after completion.', { workerSlots: 1 }),
  def('dirt_road', 'Dirt Road', 'infrastructure', 1, cost(0, 1), 0, 'Instant walkable infrastructure; no builder needed.'),
];
