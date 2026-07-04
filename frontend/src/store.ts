import { create } from 'zustand';

export interface SramAccess {
  thread_id: number;
  bank_id: number;
  address: number;
}
export interface CycleData {
  cycle: number;
  instruction: string;
  description: string;
  source_line: number;
  generated_token: string;
  hardware_state: {
    current_temperature: number;
    clock_speed_mhz: number;
    bank_conflict: boolean;
    conflict_details?: string;
    allocated_blocks: number[]; 
    thermal_map: number[];
    sram_access: SramAccess[];
  };
}

export type ViewMode = 'memory' | 'thermal';

interface SimulationState {
  currentCycleIndex: number;
  totalCycles: number;
  timeline: CycleData[];
  setCurrentCycleIndex: (index: number) => void;
  play: () => void;
  pause: () => void;
  isPlaying: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  addCycleToTimeline: (cycle: CycleData) => void;
}


export const useSimulationStore = create<SimulationState>((set) => ({
  currentCycleIndex: 0,
  totalCycles: 0,
  timeline: [],
  setCurrentCycleIndex: (index) => set({ currentCycleIndex: index }),
  isPlaying: true,
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  viewMode: 'memory', 
  setViewMode: (mode) => set({ viewMode: mode }),
  addCycleToTimeline: (cycle: CycleData) => set((state) => ({
    timeline: [...state.timeline, cycle],
    totalCycles: state.totalCycles + 1,
  })),
}));