import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { GridSystem } from '../src/world/GridSystem';
import { BuildingRegistry } from '../src/buildings/BuildingRegistry';
import { useGameStore } from '../src/state/GameStore';
import { PlacementSystem } from '../src/world/PlacementSystem';
import { isFootprintWithinBounds, getOccupiedCells } from '../src/utils/coordinates';

describe('Placement & Validation Logic', () => {
  let grid: GridSystem;
  const registry = BuildingRegistry.getInstance();

  beforeEach(() => {
    grid = new GridSystem(20);
    useGameStore.getState().resetGame();
  });

  it('validates and executes 1x1 building placement with treasury deduction', () => {
    const houseDef = registry.get('small_house')!;
    expect(useGameStore.getState().treasury).toBe(10000);

    // Verify cell is initially available
    expect(grid.isCellAvailable(5, 5)).toBe(true);

    // Place building
    const success = useGameStore.getState().addBuilding(
      {
        instanceId: 'test_house_1',
        defId: houseDef.id,
        gridX: 5,
        gridZ: 5,
        level: 1,
        seed: 42,
        placedAt: Date.now(),
      },
      houseDef.cost
    );

    expect(success).toBe(true);
    expect(useGameStore.getState().treasury).toBe(10000 - houseDef.cost);

    // Mark cell on grid
    grid.setBuilding(5, 5, 'test_house_1');
    expect(grid.isCellAvailable(5, 5)).toBe(false);
  });

  it('prevents overlapping placement on already occupied cells', () => {
    grid.setBuilding(3, 3, 'existing_house');
    expect(grid.isCellAvailable(3, 3)).toBe(false);

    // Validation check on occupied cell
    const cellAvailable = grid.isCellAvailable(3, 3);
    expect(cellAvailable).toBe(false);
  });

  it('validates 2x2 multi-cell footprints and rejects partial overlaps', () => {
    const parkDef = registry.get('park')!;
    const originX = 4;
    const originZ = 4;

    // Check all 4 cells are initially available
    const cells = getOccupiedCells(originX, originZ, parkDef.footprint);
    expect(cells).toHaveLength(4);
    expect(cells.every((c) => grid.isCellAvailable(c.x, c.z))).toBe(true);

    // Block one sub-cell (e.g. 5, 5)
    grid.setBuilding(5, 5, 'obstacle');

    // Partial overlap should cause overall placement check to fail
    const canPlacePark = cells.every((c) => grid.isCellAvailable(c.x, c.z));
    expect(canPlacePark).toBe(false);
  });

  it('rejects multi-cell footprints exceeding grid boundaries', () => {
    const parkDef = registry.get('park')!; // 2x2
    // Origin (19, 19) in 20x20 grid would extend to (20, 20)
    expect(isFootprintWithinBounds(19, 19, parkDef.footprint, 20)).toBe(false);
    expect(isFootprintWithinBounds(18, 18, parkDef.footprint, 20)).toBe(true);
  });

  it('rejects placement when funds are insufficient', () => {
    // Set treasury to less than cost of a house ($100)
    useGameStore.setState({ treasury: 50 });
    const houseDef = registry.get('small_house')!;

    expect(useGameStore.getState().canAfford(houseDef.cost)).toBe(false);

    const success = useGameStore.getState().addBuilding(
      {
        instanceId: 'broke_house',
        defId: houseDef.id,
        gridX: 2,
        gridZ: 2,
        level: 1,
        seed: 1,
        placedAt: Date.now(),
      },
      houseDef.cost
    );

    expect(success).toBe(false);
    expect(useGameStore.getState().treasury).toBe(50);
  });

  it('supports building orientation rotation cycling and records rotation in PlacedBuilding', () => {
    const roadDef = registry.get('road')!;
    const placed: any = {
      instanceId: 'rotated_road_1',
      defId: roadDef.id,
      gridX: 7,
      gridZ: 7,
      rotation: 1, // 90 degrees
      level: 1,
      seed: 5,
      placedAt: Date.now(),
    };

    const success = useGameStore.getState().addBuilding(placed, roadDef.cost);
    expect(success).toBe(true);

    const retrieved = useGameStore.getState().placedBuildings['rotated_road_1'];
    expect(retrieved).toBeDefined();
    expect(retrieved.rotation).toBe(1);
  });

  it('preserves placementRotation across consecutive placements and applies rotation to created mesh', () => {
    const mockElement = { addEventListener: () => {}, removeEventListener: () => {} } as any;
    const scene = new THREE.Scene();
    const buildingsGroup = new THREE.Group();
    scene.add(buildingsGroup);
    const sceneManager = { scene, buildingsGroup } as any;
    const gridRenderer = { setHoverCell: () => {}, group: new THREE.Group() } as any;
    const raycastSystem = { currentCell: null, castFromScreen: () => null } as any;

    const system = new PlacementSystem(mockElement, sceneManager, grid, gridRenderer, raycastSystem);
    const roadDef = registry.get('road')!;

    useGameStore.getState().setPlacementTool('road');
    expect(system.placementRotation).toBe(0);

    // Rotate 90 degrees (rotation = 1)
    system.rotatePlacement();
    expect(system.placementRotation).toBe(1);

    // Place building at (2, 2)
    const placed1 = system.executePlacement({ x: 2, z: 2 }, roadDef);
    expect(placed1).toBe(true);

    // Verify rotation was preserved on the system and not wiped to 0
    expect(system.placementRotation).toBe(1);

    // Verify placed mesh in buildingsGroup has rotation.y = Math.PI / 2
    const mesh1 = buildingsGroup.children[0] as THREE.Group;
    expect(mesh1.rotation.y).toBeCloseTo(Math.PI / 2);

    // Place second building at (3, 2)
    const placed2 = system.executePlacement({ x: 3, z: 2 }, roadDef);
    expect(placed2).toBe(true);
    expect(system.placementRotation).toBe(1);

    const mesh2 = buildingsGroup.children[1] as THREE.Group;
    expect(mesh2.rotation.y).toBeCloseTo(Math.PI / 2);

    system.dispose();
  });
});

