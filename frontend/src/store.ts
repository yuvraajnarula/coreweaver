import { create } from 'zustand';

export interface SramAccess {
  thread_id: number;
  bank_id: number;
  address: number;
}
export interface PipelineStage {
  stage: 'FETCH' | 'DECODE' | 'EXECUTE' | 'MEMORY' | 'WRITEBACK';
  cycles: number;
  status: 'NORMAL' | 'STALL' | 'SLOW' | 'CONFLICT';
}
export interface CycleData {
  cycle: number;
  instruction: string;
  description: string;
  source_line: number;
  generated_token: string;
  pipeline_trace: PipelineStage[];
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

export interface SimulationMetadata {
  status: 'SUCCESS' | 'OOM_ERROR' | 'INVALID_CONFIG' | 'SUCCESS_WITH_THROTTLE';
  error_message?: string;
  hardware_profile: string;
  total_cycles: number;
}

export interface MemoryBreakdown {
  matrix_a_gb: number;
  matrix_b_gb: number;
  matrix_c_gb: number;
  total_requested_gb: number;
  total_available_gb: number;
  gpu_name: string;
}

export interface RooflineMetrics {
  arithmetic_intensity: number;
  achieved_gflops: number;
  peak_compute_gflops: number;
  peak_mem_bw: number;
  ridge_point: number;
}

export type ViewMode = 'memory' | 'thermal';

interface SimulationState {
  currentCycleIndex: number;
  totalCycles: number;
  timeline: CycleData[];
  setCurrentCycleIndex: (index: number) => void;
  
  isPlaying: boolean;
  play: () => void;
  pause: () => void;

  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  metadata: SimulationMetadata | null;
  memoryBreakdown: MemoryBreakdown | null;
  rooflineMetrics: RooflineMetrics | null;
  
  addCycleToTimeline: (cycle: CycleData) => void;
  setMetadata: (meta: SimulationMetadata) => void;
  setMemoryBreakdown: (breakdown: MemoryBreakdown) => void;
  setRooflineMetrics: (metrics: RooflineMetrics) => void;
  clearTimeline: () => void;
  comparisonResult: any | null;
  setComparisonResult: (result: any) => void;
  clearComparisonResult: () => void;

}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  currentCycleIndex: 0,
  totalCycles: 0,
  timeline: [],
  setCurrentCycleIndex: (index) => set({ currentCycleIndex: index }),
  
  isPlaying: true,
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),

  viewMode: 'memory',
  setViewMode: (mode) => set({ viewMode: mode }),
  
  metadata: null,
  memoryBreakdown: null,
  rooflineMetrics: null,
  
  addCycleToTimeline: (cycle) => set((state) => ({
    timeline: [...state.timeline, cycle],
    totalCycles: state.totalCycles + 1,
  })),
  setMetadata: (meta) => set({ metadata: meta, totalCycles: meta.total_cycles }),
  setMemoryBreakdown: (breakdown) => set({ memoryBreakdown: breakdown }),
  setRooflineMetrics: (metrics) => set({ rooflineMetrics: metrics }),
  clearTimeline: () => set({ 
    timeline: [], 
    totalCycles: 0, 
    currentCycleIndex: 0, 
    metadata: null, 
    memoryBreakdown: null,
    rooflineMetrics: null 
  }),
  comparisonResult: null,
  setComparisonResult: (result) => set({ comparisonResult: result }),
  clearComparisonResult: () => set({ comparisonResult: null }),
}));