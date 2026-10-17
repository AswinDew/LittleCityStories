import { createStore } from 'zustand/vanilla';
import type { SimulationState } from '@/simulation/types';
import type { CommandFailure } from '@/simulation/commands';

export type ToolMode = 'idle' | 'place' | 'demolish' | 'clear';
export interface ActiveTool { mode: ToolMode; defId?: string }
export interface GameState {
  simulationSnapshot: Readonly<SimulationState> | null;
  activeTool: ActiveTool;
  selectedBuildingId: string | null;
  feedback: CommandFailure | null;
  publishSnapshot: (snapshot: Readonly<SimulationState>) => void;
  setPlacementTool: (defId: string) => void;
  setDemolishTool: () => void;
  setClearTool: () => void;
  clearTool: () => void;
  selectBuilding: (id: string | null) => void;
  setFeedback: (reason: CommandFailure | null) => void;
  resetGame: () => void;
}
/** Presentation and UI state only. Resources/buildings have no writable store actions. */
export const gameStore = createStore<GameState>((set, get) => ({
  simulationSnapshot: null, activeTool: { mode: 'idle' }, selectedBuildingId: null, feedback: null,
  publishSnapshot: simulationSnapshot => set(state => ({ simulationSnapshot,
    selectedBuildingId: state.selectedBuildingId && Object.hasOwn(simulationSnapshot.buildings, state.selectedBuildingId) ? state.selectedBuildingId : null })),
  setPlacementTool: defId => set({ activeTool: { mode: 'place', defId }, selectedBuildingId: null, feedback: null }),
  setDemolishTool: () => set({ activeTool: { mode: 'demolish' }, selectedBuildingId: null, feedback: null }),
  setClearTool: () => set({ activeTool: { mode: 'clear' }, selectedBuildingId: null, feedback: null }),
  clearTool: () => set({ activeTool: { mode: 'idle' }, feedback: null }),
  selectBuilding: selectedBuildingId => set({ selectedBuildingId, feedback: null }),
  setFeedback: feedback => { if (get().feedback !== feedback) set({ feedback }); },
  resetGame: () => set({ simulationSnapshot: null, activeTool: { mode: 'idle' }, selectedBuildingId: null, feedback: null }),
}));
export const useGameStore = gameStore;
