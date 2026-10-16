import * as THREE from 'three';
import { GridSystem } from './GridSystem';
import { GridRenderer } from './GridRenderer';
import { RaycastSystem } from './RaycastSystem';
import { SceneManager } from '@/game/SceneManager';
import { BuildingRegistry } from '@/buildings/BuildingRegistry';
import { BuildingDefinition, PlacedBuilding } from '@/buildings/types';
import { BuildingFactory } from '@/assets/BuildingFactory';
import { disposeBuilding } from '@/assets/procedural/houses';
import {
  gridToWorld,
  isFootprintWithinBounds,
  getOccupiedCells,
  GridCoord,
  GridMetrics,
  CELL_SIZE,
} from '@/utils/coordinates';
import { useGameStore, ActiveTool } from '@/state/GameStore';
import { SeededRandom } from '@/simulation/Random';

export class PlacementSystem {
  private domElement: HTMLElement;
  private sceneManager: SceneManager;
  private gridSystem: GridSystem;
  private gridRenderer: GridRenderer;
  private raycastSystem: RaycastSystem;

  private activeTool: ActiveTool = { mode: 'idle' };
  private activeDef: BuildingDefinition | null = null;
  private ghostMesh: THREE.Group | null = null;
  private buildingMeshes: Map<string, THREE.Group> = new Map();

  /**
   * Current building placement orientation:
   * 0: 0°, 1: 90°, 2: 180°, 3: 270°
   */
  public placementRotation = 0;

  private unsubscribeStore: () => void;
  private nextId = 1;
  private readonly random = new SeededRandom(42);

  constructor(
    domElement: HTMLElement,
    sceneManager: SceneManager,
    gridSystem: GridSystem,
    gridRenderer: GridRenderer,
    raycastSystem: RaycastSystem,
    private readonly metrics: GridMetrics = { size: gridSystem.size, cellSize: 2 },
    private readonly allocateIdentity?: () => { id: string; seed: number; placedAt: number }
  ) {
    this.domElement = domElement;
    this.sceneManager = sceneManager;
    this.gridSystem = gridSystem;
    this.gridRenderer = gridRenderer;
    this.raycastSystem = raycastSystem;

    // Subscribe to tool changes in Zustand store (only fire when tool actually changes)
    let prevTool = useGameStore.getState().activeTool;
    this.unsubscribeStore = useGameStore.subscribe((state) => {
      const nextTool = state.activeTool;
      if (
        nextTool.mode !== prevTool.mode ||
        nextTool.defId !== prevTool.defId
      ) {
        prevTool = nextTool;
        this.handleToolChange(nextTool);
      }
    });

    this.attachEventListeners();
  }

  public rotatePlacement(): void {
    this.placementRotation = (this.placementRotation + 1) % 4;
    if (this.ghostMesh) {
      this.ghostMesh.rotation.y = this.placementRotation * (Math.PI / 2);
    }
  }

  public getEffectiveFootprint(def: BuildingDefinition, rotation = this.placementRotation): { width: number; depth: number } {
    const isRotated = rotation === 1 || rotation === 3;
    return {
      width: isRotated ? def.footprint.depth : def.footprint.width,
      depth: isRotated ? def.footprint.width : def.footprint.depth,
    };
  }

  private handleToolChange(newTool: ActiveTool): void {
    this.activeTool = newTool;
    this.placementRotation = 0;

    // Clean up existing ghost preview
    this.removeGhostPreview();

    if (newTool.mode === 'place' && newTool.defId) {
      const def = BuildingRegistry.getInstance().get(newTool.defId);
      this.activeDef = def || null;
      if (this.activeDef) {
        this.ghostMesh = BuildingFactory.createGhostPreviewMesh(this.activeDef.id);
        this.ghostMesh.scale.setScalar(this.metrics.cellSize / CELL_SIZE);
        this.ghostMesh.rotation.y = this.placementRotation * (Math.PI / 2);
        this.sceneManager.selectionGroup.add(this.ghostMesh);
        this.ghostMesh.visible = false;
      }
    } else {
      this.activeDef = null;
    }
  }

  private removeGhostPreview(): void {
    if (this.ghostMesh) {
      this.ghostMesh.removeFromParent();
      this.ghostMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
      this.ghostMesh = null;
    }
  }

  private attachEventListeners(): void {
    this.domElement.addEventListener('pointerup', this.onPointerUp);
  }

  /**
   * Tracks manual registration of externally created meshes (e.g. starter sample houses)
   */
  public registerBuildingMesh(instanceId: string, mesh: THREE.Group): void {
    this.buildingMeshes.set(instanceId, mesh);
  }

  public update(): void {
    const hit = this.raycastSystem.currentCell;

    if (!hit) {
      if (this.ghostMesh) this.ghostMesh.visible = false;
      this.gridRenderer.setHoverCell(null, null);
      return;
    }

    if (this.activeTool.mode === 'place' && this.activeDef) {
      const footprint = this.getEffectiveFootprint(this.activeDef, this.placementRotation);
      const isValid = this.validatePlacement(hit.x, hit.z, this.activeDef, this.placementRotation);

      // Position ghost preview
      if (this.ghostMesh) {
        const worldPos = gridToWorld(hit.x, hit.z, footprint, this.metrics);
        this.ghostMesh.position.copy(worldPos);
        this.ghostMesh.rotation.y = this.placementRotation * (Math.PI / 2);
        this.ghostMesh.visible = true;
      }

      // Update diorama hover tile dimensions & validity color
      this.gridRenderer.setHoverCell(hit.x, hit.z, footprint.width, footprint.depth, isValid);
    } else if (this.activeTool.mode === 'demolish') {
      if (this.ghostMesh) this.ghostMesh.visible = false;
      const cell = this.gridSystem.getCell(hit.x, hit.z);
      if (cell && cell.buildingId) {
        const bldg = useGameStore.getState().placedBuildings[cell.buildingId];
        if (bldg) {
          const def = BuildingRegistry.getInstance().get(bldg.defId);
          if (def) {
            const footprint = this.getEffectiveFootprint(def, bldg.rotation || 0);
            this.gridRenderer.setHoverCell(bldg.gridX, bldg.gridZ, footprint.width, footprint.depth, false);
            return;
          }
        }
        this.gridRenderer.setHoverCell(hit.x, hit.z, 1, 1, false);
      } else {
        this.gridRenderer.setHoverCell(hit.x, hit.z, 1, 1, true);
      }
    } else {
      // Idle mode: default 1x1 cell hover
      if (this.ghostMesh) this.ghostMesh.visible = false;
      const isAvailable = this.gridSystem.isCellAvailable(hit.x, hit.z);
      this.gridRenderer.setHoverCell(hit.x, hit.z, 1, 1, isAvailable);
    }
  }

  public validatePlacement(gx: number, gz: number, def: BuildingDefinition, rotation = this.placementRotation): boolean {
    const footprint = this.getEffectiveFootprint(def, rotation);

    // 1. Check grid boundaries
    if (!isFootprintWithinBounds(gx, gz, footprint, this.gridSystem.size)) {
      return false;
    }

    // 2. Check treasury affordability
    if (!useGameStore.getState().canAfford(def.cost)) {
      return false;
    }

    // 3. Check every cell in the multi-cell footprint
    const occupied = getOccupiedCells(gx, gz, footprint);
    for (const cellCoord of occupied) {
      if (!this.gridSystem.isCellAvailable(cellCoord.x, cellCoord.z)) {
        return false;
      }
    }

    return true;
  }

  private onPointerUp = (event: PointerEvent): void => {
    // Only execute on primary left-clicks without modifier keys
    if (event.button !== 0 || event.altKey || event.shiftKey) return;

    // Raycast current hit target
    const hit = this.raycastSystem.castFromScreen(event.clientX, event.clientY);
    if (!hit) return;

    if (this.activeTool.mode === 'place' && this.activeDef) {
      this.executePlacement(hit.cell, this.activeDef);
    } else if (this.activeTool.mode === 'demolish') {
      this.executeDemolition(hit.cell);
    }
  };

  public executePlacement(cell: GridCoord, def: BuildingDefinition): boolean {
    const currentRotation = this.placementRotation;
    if (!this.validatePlacement(cell.x, cell.z, def, currentRotation)) {
      return false;
    }

    const footprint = this.getEffectiveFootprint(def, currentRotation);
    const identity = this.allocateIdentity?.() ?? {
      id: `building-${this.nextId++}`, seed: Math.floor(this.random.next() * 1000), placedAt: 0,
    };
    const instanceId = identity.id;
    const seed = identity.seed;

    const placedData: PlacedBuilding = {
      instanceId,
      defId: def.id,
      gridX: cell.x,
      gridZ: cell.z,
      rotation: currentRotation,
      level: 1,
      seed,
      placedAt: identity.placedAt,
    };

    // Deduct cost and add to Zustand store
    const storeSuccess = useGameStore.getState().addBuilding(placedData, def.cost);
    if (!storeSuccess) return false;

    // Occupy cells in gridSystem
    const occupied = getOccupiedCells(cell.x, cell.z, footprint);
    for (const c of occupied) {
      this.gridSystem.setBuilding(c.x, c.z, instanceId);
      if (def.id === 'road') {
        this.gridSystem.setRoad(c.x, c.z, true);
      }
    }

    // Create 3D world mesh with matching rotation
    const mesh = BuildingFactory.createBuildingMesh(def.id, 1, seed);
    mesh.scale.setScalar(this.metrics.cellSize / CELL_SIZE);
    mesh.name = instanceId;
    mesh.rotation.y = currentRotation * (Math.PI / 2);
    const worldPos = gridToWorld(cell.x, cell.z, footprint, this.metrics);
    mesh.position.copy(worldPos);

    (def.id === 'road' ? this.sceneManager.roadsGroup : this.sceneManager.buildingsGroup).add(mesh);
    this.buildingMeshes.set(instanceId, mesh);

    return true;
  }

  public executeDemolition(cell: GridCoord): boolean {
    const cellData = this.gridSystem.getCell(cell.x, cell.z);
    if (!cellData || !cellData.buildingId) {
      return false;
    }

    const instanceId = cellData.buildingId;
    const buildingData = useGameStore.getState().placedBuildings[instanceId];

    // Refund and remove from Zustand store
    useGameStore.getState().removeBuilding(instanceId);

    // Free all cells on the grid occupied by this building
    if (buildingData) {
      const def = BuildingRegistry.getInstance().get(buildingData.defId);
      if (def) {
        const footprint = this.getEffectiveFootprint(def, buildingData.rotation || 0);
        const occupied = getOccupiedCells(buildingData.gridX, buildingData.gridZ, footprint);
        for (const c of occupied) {
          this.gridSystem.clearBuilding(c.x, c.z);
        }
      } else {
        this.gridSystem.clearBuilding(cell.x, cell.z);
      }
    } else {
      this.gridSystem.clearBuilding(cell.x, cell.z);
    }

    // Remove 3D mesh and dispose GPU geometries
    const mesh = this.buildingMeshes.get(instanceId);
    if (mesh) {
      mesh.removeFromParent();
      disposeBuilding(mesh);
      this.buildingMeshes.delete(instanceId);
    }

    return true;
  }

  public dispose(): void {
    this.unsubscribeStore();
    this.removeGhostPreview();
    this.domElement.removeEventListener('pointerup', this.onPointerUp);

    // Dispose all tracked building meshes
    this.buildingMeshes.forEach((mesh) => {
      mesh.removeFromParent();
      disposeBuilding(mesh);
    });
    this.buildingMeshes.clear();
  }
}
