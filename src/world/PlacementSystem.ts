import * as THREE from 'three';
import type { SceneManager } from '@/game/SceneManager';
import type { GridRenderer } from './GridRenderer';
import type { RaycastSystem } from './RaycastSystem';
import { PointerIntent } from './PointerIntent';
import { BuildingRegistry } from '@/buildings/BuildingRegistry';
import type { BuildingDefinition } from '@/buildings/types';
import { BuildingFactory } from '@/assets/BuildingFactory';
import { disposeBuilding } from '@/assets/procedural/houses';
import { CELL_SIZE, GridCoord, GridMetrics, gridToWorld } from '@/utils/coordinates';
import { buildingLayout } from '@/construction/BuildingLayout';
import { checkPlacement } from '@/construction/ConstructionSystem';
import type { SimulationState } from '@/simulation/types';
import type { GameCommand, CommandResult } from '@/simulation/commands';
import { useGameStore } from '@/state/GameStore';

export class PlacementSystem {
  placementRotation = 0;
  private ghostMesh: THREE.Group | null = null;
  private readonly pointer = new PointerIntent();
  private readonly unsubscribeStore: () => void;
  constructor(private readonly domElement: HTMLElement, private readonly scene: SceneManager,
    private readonly gridRenderer: GridRenderer, private readonly raycast: RaycastSystem,
    private readonly metrics: GridMetrics, private readonly getSnapshot: () => Readonly<SimulationState>,
    private readonly dispatch: (command: GameCommand) => CommandResult) {
    this.unsubscribeStore = useGameStore.subscribe((state, previous) => {
      if (state.activeTool === previous.activeTool) return;
      this.pointer.cancel(); this.placementRotation = 0; this.removeGhost();
      const def = state.activeTool.mode === 'place' ? BuildingRegistry.getInstance().get(state.activeTool.defId ?? '') : null;
      if (def?.purchasable) {
        this.ghostMesh = BuildingFactory.createGhostPreviewMesh(def.id);
        this.ghostMesh.scale.setScalar(metrics.cellSize / CELL_SIZE);
        this.ghostMesh.visible = false; this.scene.selectionGroup.add(this.ghostMesh);
      }
    });
    domElement.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onCancel);
    window.addEventListener('blur', this.onCancel);
    domElement.addEventListener('lostpointercapture', this.onCancel);
  }
  private removeGhost(): void {
    if (!this.ghostMesh) return;
    this.ghostMesh.removeFromParent(); disposeBuilding(this.ghostMesh); this.ghostMesh = null;
  }
  rotatePlacement(): void {
    this.placementRotation = (this.placementRotation + 1) % 4;
    if (this.ghostMesh) this.ghostMesh.rotation.y = this.placementRotation * Math.PI / 2;
  }
  getEffectiveFootprint(def: BuildingDefinition, rotation = this.placementRotation) {
    return buildingLayout(def, { x: 0, z: 0 }, rotation).footprint;
  }
  validatePlacement(x: number, z: number, def: BuildingDefinition, rotation = this.placementRotation): boolean {
    return checkPlacement({ type: 'placeBuilding', defId: def.id, cell: { x, z }, rotation }, this.getSnapshot()).ok;
  }
  update(): void {
    const hit = this.raycast.currentCell;
    if (!hit) { if (this.ghostMesh) this.ghostMesh.visible = false; this.gridRenderer.setHoverCell(null, null); return; }
    const { activeTool } = useGameStore.getState(), snapshot = this.getSnapshot();
    const def = activeTool.mode === 'place' ? BuildingRegistry.getInstance().get(activeTool.defId ?? '') : null;
    if (def) {
      const footprint = this.getEffectiveFootprint(def);
      const result = checkPlacement({ type: 'placeBuilding', defId: def.id, cell: hit, rotation: this.placementRotation }, snapshot);
      if (this.ghostMesh) {
        this.ghostMesh.position.copy(gridToWorld(hit.x, hit.z, footprint, this.metrics));
        this.ghostMesh.rotation.y = this.placementRotation * Math.PI / 2; this.ghostMesh.visible = true;
      }
      this.gridRenderer.setHoverCell(hit.x, hit.z, footprint.width, footprint.depth, result.ok);
      useGameStore.getState().setFeedback(result.ok ? null : result.reason);
    } else {
      const id = snapshot.world.grid[hit.x]?.[hit.z]?.buildingId;
      const building = id ? snapshot.buildings[id] : null;
      if (building) this.gridRenderer.setHoverCell(building.gridX, building.gridZ, building.footprint.width, building.footprint.depth, activeTool.mode === 'idle');
      else this.gridRenderer.setHoverCell(hit.x, hit.z, 1, 1, true);
    }
  }
  private onDown = (event: PointerEvent): void => { this.pointer.start(event); };
  private onMove = (event: PointerEvent): void => { this.pointer.move(event); };
  private onCancel = (): void => { this.pointer.cancel(); };
  private onUp = (event: PointerEvent): void => {
    if (!this.pointer.finish(event, this.domElement.contains(event.target as Node))) return;
    const hit = this.raycast.castFromScreen(event.clientX, event.clientY);
    if (!hit) return;
    const store = useGameStore.getState(), snapshot = this.getSnapshot();
    if (store.activeTool.mode === 'place') {
      const def = BuildingRegistry.getInstance().get(store.activeTool.defId ?? '');
      if (def) this.executePlacement(hit.cell, def);
    } else if (store.activeTool.mode === 'demolish') this.executeDemolition(hit.cell);
    else if (store.activeTool.mode === 'clear') {
      const object = snapshot.world.environment.find(entry => entry.x === hit.cell.x && entry.z === hit.cell.z);
      if (object) this.execute({ type: 'clearEnvironment', environmentId: object.id });
    } else store.selectBuilding(snapshot.world.grid[hit.cell.x][hit.cell.z].buildingId);
  };
  private execute(command: GameCommand): boolean {
    const result = this.dispatch(command);
    useGameStore.getState().setFeedback(result.ok ? null : result.reason);
    return result.ok;
  }
  executePlacement(cell: GridCoord, def: BuildingDefinition): boolean {
    return this.execute({ type: 'placeBuilding', defId: def.id, cell, rotation: this.placementRotation });
  }
  executeDemolition(cell: GridCoord): boolean {
    const id = this.getSnapshot().world.grid[cell.x]?.[cell.z]?.buildingId;
    return id ? this.execute({ type: 'demolishBuilding', instanceId: id }) : false;
  }
  dispose(): void {
    this.unsubscribeStore(); this.removeGhost(); this.pointer.cancel();
    this.domElement.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove); window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onCancel); window.removeEventListener('blur', this.onCancel);
    this.domElement.removeEventListener('lostpointercapture', this.onCancel);
  }
}
