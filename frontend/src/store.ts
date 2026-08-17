// store.ts - CoreWeaver Zustand State Store with Story Checkpointing & Guide Mode
import { create } from 'zustand';

export interface SramAccess {
  thread_id: number;
  bank_id: number;
  address: number;
}

export interface PipelineStage {
  stage: 'FETCH' | 'DECODE' | 'EXECUTE' | 'MEMORY' | 'WRITEBACK' | 'MEMORY (VRAM)' | 'EXECUTE (Tensor)' | 'NOP (Thermal Bubble)' | 'ASYNC MEM (Hidden)';
  cycles: number;
  status: 'NORMAL' | 'STALL' | 'SLOW' | 'CONFLICT' | 'DIVERGENT' | 'OVERLAP';
}

export interface PipelineMetrics {
  total_latency: number;
  bubble_cycles: number;
  efficiency_pct: number;
}

export interface MicroState {
  power_watts: number;
  tdp_limit: number;
  power_throttled: boolean;
  warp_pattern: number[];
  memory_transactions: number;
  divergence_info: {
    has_divergence: boolean;
    path_a_cycles: number;
    path_b_cycles: number;
    serialized_penalty: number;
  } | null;
}

export interface CycleData {
  cycle: number;
  instruction: string;
  description: string;
  source_line: number;
  generated_token: string;
  pipeline_trace: PipelineStage[];
  pipeline_metrics: PipelineMetrics;
  micro_state: MicroState;
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
  occupancy_metrics?: OccupancyMetrics;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface OccupancyMetrics {
  regs_per_thread: number;
  active_warps: number;
  max_warps: number;
  occupancy_pct: number;
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

export interface FinOpsMetrics {
  true_total_cycles: number;
  wall_clock_seconds: number;
  hourly_rate_usd: number;
  kernel_cost_usd: number;
  cost_per_million_runs: number;
}

export interface StoryCheckpoint {
  cycleIndex: number;
  cycleNumber: number;
  id: string;
  title: string;
  subtitle: string;
  category: 'fetch' | 'sram' | 'compute' | 'throttle' | 'writeback';
  description: string;
  metricsSnapshot: string;
}

// ==========================================
// STATE INTERFACE
// ==========================================
interface SimulationState {
  // Timeline & Playback
  currentCycleIndex: number;
  totalCycles: number;
  timeline: CycleData[];
  setCurrentCycleIndex: (index: number) => void;
  
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;

  // Story Checkpointing
  checkpoints: StoryCheckpoint[];
  setCheckpoints: (cps: StoryCheckpoint[]) => void;
  jumpToCheckpoint: (index: number) => void;

  // Guide Mode
  guideModeOpen: boolean;
  setGuideMode: (open: boolean) => void;
  currentGuideLesson: number;
  setGuideLesson: (idx: number) => void;

  // Configuration Params Synchronized
  simParams: any;
  setSimParams: (params: any) => void;

  // Global Metrics (Updated via WebSocket or Client Sim)
  metadata: SimulationMetadata | null;
  memoryBreakdown: MemoryBreakdown | null;
  rooflineMetrics: RooflineMetrics | null;
  occupancyMetrics: OccupancyMetrics | null;
  finopsMetrics: FinOpsMetrics | null;
  
  // Comparison State
  comparisonResult: any | null;

  // Actions
  addCycleToTimeline: (cycle: CycleData) => void;
  setMetadata: (meta: SimulationMetadata) => void;
  setMemoryBreakdown: (breakdown: MemoryBreakdown) => void;
  setRooflineMetrics: (metrics: RooflineMetrics) => void;
  setOccupancyMetrics: (metrics: OccupancyMetrics) => void;
  setFinOpsMetrics: (metrics: FinOpsMetrics) => void;
  setComparisonResult: (result: any) => void;
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;
  
  loadFullSimulation: (data: {
    metadata: SimulationMetadata;
    memoryBreakdown?: MemoryBreakdown;
    rooflineMetrics?: RooflineMetrics;
    finopsMetrics?: FinOpsMetrics;
    occupancyMetrics?: OccupancyMetrics;
    timeline: CycleData[];
    checkpoints?: StoryCheckpoint[];
  }) => void;

  clearTimeline: () => void;
  clearComparisonResult: () => void;
}

const DEFAULT_PARAMS = {
  M: 1024, N: 1024, K: 1024, BLOCK_SIZE: 128, hardware_profile: 'A100_80GB',
  enable_divergence: false, coalesced_memory: true,
  enable_async_copy: false, enable_fusion: false
};

// ==========================================
// ZUSTAND STORE IMPLEMENTATION
// ==========================================
export const useSimulationStore = create<SimulationState>((set) => ({
  // Initial State
  currentCycleIndex: 0,
  totalCycles: 0,
  timeline: [],
  
  isPlaying: false,
  playbackSpeed: 1,

  checkpoints: [],
  guideModeOpen: false,
  currentGuideLesson: 0,
  simParams: DEFAULT_PARAMS,

  metadata: null,
  memoryBreakdown: null,
  rooflineMetrics: null,
  occupancyMetrics: null,
  finopsMetrics: null,
  comparisonResult: null,
  connectionStatus: 'disconnected',

  // Actions
  setCurrentCycleIndex: (index) => set({ currentCycleIndex: Math.max(0, index) }),
  
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  setCheckpoints: (cps) => set({ checkpoints: cps }),
  jumpToCheckpoint: (cycleIndex) => set({ currentCycleIndex: cycleIndex, isPlaying: false }),

  setGuideMode: (open) => set({ guideModeOpen: open }),
  setGuideLesson: (idx) => set({ currentGuideLesson: idx }),

  setSimParams: (params) => set({ simParams: params }),

  addCycleToTimeline: (cycle) => set((state) => {
    const nextTimeline = [...state.timeline, cycle];
    return {
      timeline: nextTimeline,
      totalCycles: nextTimeline.length,
      currentCycleIndex: nextTimeline.length - 1
    };
  }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  
  setMetadata: (meta) => set({ metadata: meta, totalCycles: meta.total_cycles }),
  setMemoryBreakdown: (breakdown) => set({ memoryBreakdown: breakdown }),
  setRooflineMetrics: (metrics) => set({ rooflineMetrics: metrics }),
  setOccupancyMetrics: (metrics) => set({ occupancyMetrics: metrics }),
  setFinOpsMetrics: (metrics) => set({ finopsMetrics: metrics }),
  setComparisonResult: (result) => set({ comparisonResult: result }),
  
  loadFullSimulation: (data) => set({
    timeline: data.timeline,
    totalCycles: data.timeline.length,
    currentCycleIndex: 0,
    metadata: data.metadata,
    memoryBreakdown: data.memoryBreakdown || null,
    rooflineMetrics: data.rooflineMetrics || null,
    finopsMetrics: data.finopsMetrics || null,
    occupancyMetrics: data.occupancyMetrics || null,
    checkpoints: data.checkpoints || [],
    isPlaying: false
  }),

  clearTimeline: () => set({ 
    timeline: [], 
    totalCycles: 0, 
    currentCycleIndex: 0, 
    metadata: null, 
    memoryBreakdown: null,
    rooflineMetrics: null,
    occupancyMetrics: null,
    finopsMetrics: null,
    checkpoints: [],
    isPlaying: false
  }),
  
  clearComparisonResult: () => set({ comparisonResult: null }),
}));