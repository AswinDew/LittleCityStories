import { describe, it, expect, beforeEach } from 'vitest';
import { GridSystem } from '../src/world/GridSystem';
import { BuildingRegistry } from '../src/buildings/BuildingRegistry';
import { useGameStore } from '../src/state/GameStore';
import { getOccupiedCells } from '../src/utils/coordinates';

describe('Demolition & Refund Logic', () => {
  let grid: GridSystem;
  const registry = BuildingRegistry.getInstance();

  beforeEach(() => {
    grid = new GridSystem(20);
    useGameStore.getState().resetGame();
  });

  it('demolishes 1x1 building, frees the grid cell, and refunds 50% of cost', () => {
    const houseDef = registry.get('small_house')!; // Cost $150
    const instanceId = 'demolish_target_1';

    // Place building
    useGameStore.getState().addBuilding(
      {
        instanceId,
        defId: houseDef.id,
        gridX: 6,
        gridZ: 6,
        level: 1,
        seed: 12,
        placedAt: Date.now(),
      },
      houseDef.cost
    );
    grid.setBuilding(6, 6, instanceId);

    expect(useGameStore.getState().treasury).toBe(10000 - 150);
    expect(grid.isCellAvailable(6, 6)).toBe(false);

    // Demolish
    const refund = useGameStore.getState().removeBuilding(instanceId, 0.5);
    grid.clearBuilding(6, 6);

    expect(refund).toBe(75); // 50% of 150
    expect(useGameStore.getState().treasury).toBe(10000 - 150 + 75);
    expect(grid.isCellAvailable(6, 6)).toBe(true);
    expect(useGameStore.getState().placedBuildings[instanceId]).toBeUndefined();
  });

  it('demolishes 2x2 park and clears all 4 grid cells', () => {
    const parkDef = registry.get('park')!; // Cost $250
    const instanceId = 'park_target_1';
    const originX = 8;
    const originZ = 8;

    useGameStore.getState().addBuilding(
      {
        instanceId,
        defId: parkDef.id,
        gridX: originX,
        gridZ: originZ,
        level: 1,
        seed: 99,
        placedAt: Date.now(),
      },
      parkDef.cost
    );

    const cells = getOccupiedCells(originX, originZ, parkDef.footprint);
    for (const c of cells) {
      grid.setBuilding(c.x, c.z, instanceId);
    }

    // Verify all 4 cells are occupied
    expect(cells.every((c) => !grid.isCellAvailable(c.x, c.z))).toBe(true);

    // Demolish
    const refund = useGameStore.getState().removeBuilding(instanceId, 0.5);
    for (const c of cells) {
      grid.clearBuilding(c.x, c.z);
    }

    expect(refund).toBe(125); // 50% of 250
    expect(cells.every((c) => grid.isCellAvailable(c.x, c.z))).toBe(true);
  });

  it('returns 0 refund when trying to demolish a non-existent building ID', () => {
    const initialTreasury = useGameStore.getState().treasury;
    const refund = useGameStore.getState().removeBuilding('non_existent_id');

    expect(refund).toBe(0);
    expect(useGameStore.getState().treasury).toBe(initialTreasury);
  });
});
