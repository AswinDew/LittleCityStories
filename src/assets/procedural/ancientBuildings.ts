import { createStitchBuilding } from './stitchBuildings';

export const ANCIENT_FOOTPRINTS = { town_center: 3, primitive_house: 1, farm: 2, lumber_camp: 2,
  stone_quarry: 2, storage_hut: 2, research_hut: 2, dirt_road: 1 } as const;
export type AncientBuildingId = keyof typeof ANCIENT_FOOTPRINTS;
export function createAncientBuilding(id: AncientBuildingId, seed = 0) {
  return createStitchBuilding(id, ANCIENT_FOOTPRINTS[id] * 2, seed);
}
