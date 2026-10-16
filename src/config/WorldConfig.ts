import type { ResourceBundle } from '@/economy/types';
import { DEFAULT_GRID_METRICS, validateMetrics } from '@/world/GridMath';
import type { GridMetrics } from '@/world/GridMath';
export interface WorldConfig {
  metrics: GridMetrics;
  seed: number;
  startingPopulation: number;
  startingResources: ResourceBundle;
  environmentDensity: number;
}
export type WorldOverrides = Partial<Omit<WorldConfig, 'metrics' | 'startingResources'>> & {
  metrics?: Partial<GridMetrics>;
  startingResources?: Partial<ResourceBundle>;
};
export function createWorldConfig(overrides: WorldOverrides = {}): WorldConfig {
  const config: WorldConfig = {
    metrics: { ...DEFAULT_GRID_METRICS, ...overrides.metrics },
    seed: overrides.seed ?? 42,
    startingPopulation: overrides.startingPopulation ?? 3,
    startingResources: { wood: 160, stone: 100, food: 90, coins: 50, ...overrides.startingResources },
    environmentDensity: overrides.environmentDensity ?? 0.12,
  };
  validateMetrics(config.metrics);
  if (config.metrics.size < 12 || !Number.isInteger(config.seed) || config.seed < 0 || config.seed > 0xffffffff ||
      !Number.isSafeInteger(config.startingPopulation) || config.startingPopulation < 0 ||
      Object.values(config.startingResources).some(n => !Number.isSafeInteger(n) || n < 0) ||
      !Number.isFinite(config.environmentDensity) || config.environmentDensity < 0 || config.environmentDensity > 0.4) {
    throw new RangeError('Invalid world configuration (world size must be 12–128)');
  }
  return config;
}
