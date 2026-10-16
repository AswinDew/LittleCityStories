import { createWorldConfig } from '@/config/WorldConfig';
import type { WorldConfig } from '@/config/WorldConfig';
import { SeededRandom } from '@/simulation/Random';
import { GridSystem } from './GridSystem';
import type { CellState } from './GridSystem';
import type { GridCoord } from './GridMath';
export interface EnvironmentObject extends GridCoord {
  id: string;
  kind: 'tree' | 'rock' | 'bush';
  variation: number;
}
export interface WorldData {
  grid: CellState[][];
  environment: EnvironmentObject[];
  starterArea: GridCoord[];
  townCenter: GridCoord;
  entrance: GridCoord;
  randomState: number;
}
export function generateWorld(input: WorldConfig): WorldData {
  const config = createWorldConfig(input);
  const { size } = config.metrics;
  const center = Math.floor(size / 2);
  const grid = new GridSystem(size);
  const random = new SeededRandom(config.seed);
  const starterArea: GridCoord[] = [];
  const environment: EnvironmentObject[] = [];
  const reserved = new Set<string>();
  for (let x = center - 4; x <= center + 4; x++) for (let z = center - 4; z <= center + 4; z++) {
    starterArea.push({ x, z });
    reserved.add(`${x},${z}`);
  }
  const add = (x: number, z: number, kind: EnvironmentObject['kind']) => {
    environment.push({ id: `env-${x}-${z}`, x, z, kind, variation: Math.floor(random.next() * 1000) });
    if (kind !== 'bush') grid.getCell(x, z)!.canBuild = false;
  };
  const sources = [{ x: center - 5, z: center, kind: 'tree' as const },
    { x: center + 5, z: center, kind: 'rock' as const }];
  for (const source of sources) {
    add(source.x, source.z, source.kind);
    reserved.add(`${source.x},${source.z}`);
  }
  // Border corridor and central expansion area are always clear.
  for (let x = 1; x < size - 1; x++) for (let z = 1; z < size - 1; z++) {
    if (reserved.has(`${x},${z}`) || random.next() >= config.environmentDensity) continue;
    const choice = random.next();
    add(x, z, choice < 0.6 ? 'tree' : choice < 0.85 ? 'rock' : 'bush');
  }
  return { grid: grid.serialize(), environment, starterArea,
    townCenter: { x: center - 1, z: center - 1 }, entrance: { x: center, z: center + 2 },
    randomState: random.state };
}
