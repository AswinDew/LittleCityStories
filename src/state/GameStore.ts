import { createStore } from 'zustand/vanilla';
import { PlacedBuilding } from '@/buildings/types';
import { BuildingRegistry } from '@/buildings/BuildingRegistry';

export type ToolMode = 'idle' | 'place' | 'demolish';

export interface ActiveTool {
  mode: ToolMode;
  defId?: string;
}

export interface GameState {
  treasury: number;
  activeTool: ActiveTool;
  placedBuildings: Record<string, PlacedBuilding>;
  selectedBuildingId: string | null;

  // Actions
  setPlacementTool: (defId: string) => void;
  setDemolishTool: () => void;
  clearTool: () => void;
  selectBuilding: (id: string | null) => void;

  canAfford: (amount: number) => boolean;
  addBuilding: (building: PlacedBuilding, cost: number) => boolean;
  removeBuilding: (instanceId: string, refundPercent?: number) => number;
  addFunds: (amount: number) => void;
  resetGame: () => void;
}

const INITIAL_TREASURY = 10000;

export const gameStore = createStore<GameState>((set, get) => ({
  treasury: INITIAL_TREASURY,
  activeTool: { mode: 'idle' },
  placedBuildings: {},
  selectedBuildingId: null,

  setPlacementTool: (defId: string) => {
    set({
      activeTool: { mode: 'place', defId },
      selectedBuildingId: null,
    });
  },

  setDemolishTool: () => {
    set({
      activeTool: { mode: 'demolish' },
      selectedBuildingId: null,
    });
  },

  clearTool: () => {
    set({
      activeTool: { mode: 'idle' },
    });
  },

  selectBuilding: (id: string | null) => {
    set({
      selectedBuildingId: id,
    });
  },

  canAfford: (amount: number) => {
    return get().treasury >= amount;
  },

  addBuilding: (building: PlacedBuilding, cost: number) => {
    const { treasury } = get();
    if (treasury < cost) return false;

    set((state) => ({
      treasury: state.treasury - cost,
      placedBuildings: {
        ...state.placedBuildings,
        [building.instanceId]: building,
      },
    }));
    return true;
  },

  removeBuilding: (instanceId: string, refundPercent = 0.5) => {
    const { placedBuildings } = get();
    const building = placedBuildings[instanceId];
    if (!building) return 0;

    const registry = BuildingRegistry.getInstance();
    const def = registry.get(building.defId);
    const refund = def ? Math.round(def.cost * refundPercent) : 0;

    set((state) => {
      const nextBuildings = { ...state.placedBuildings };
      delete nextBuildings[instanceId];
      return {
        treasury: state.treasury + refund,
        placedBuildings: nextBuildings,
        selectedBuildingId:
          state.selectedBuildingId === instanceId ? null : state.selectedBuildingId,
      };
    });

    return refund;
  },

  addFunds: (amount: number) => {
    set((state) => ({ treasury: state.treasury + amount }));
  },

  resetGame: () => {
    set({
      treasury: INITIAL_TREASURY,
      activeTool: { mode: 'idle' },
      placedBuildings: {},
      selectedBuildingId: null,
    });
  },
}));

export const useGameStore = gameStore;
