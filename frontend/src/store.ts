import { create } from 'zustand';

export interface CycleData {
  cycle: number;
  instruction: string;
  description: string;
  hardware_state: {
    current_temperature: number;
    clock_speed_mhz: number;
    bank_conflict: boolean;
    conflict_details?: string;
  };
}

interface SimulationState {
  currentCycleIndex: number;
  totalCycles: number;
  timeline: CycleData[];
  setCurrentCycleIndex: (index: number) => void;
  play: () => void;
  pause: () => void;
  isPlaying: boolean;
}

const mockData = {
  "simulation_metadata": {
    "kernel_name": "mock_2x2_matmul",
    "total_cycles": 5,
    "thermal_threshold_celsius": 90.0
  },
  "timeline": [
    {
      "cycle": 1,
      "instruction": "LOAD_HBM",
      "description": "Loading Matrix A into Shared Memory",
      "source": "HBM_ADDR_0x1000",
      "destination": "SRAM_BANK_0",
      "data_payload": [1.0, 2.0],
      "hardware_state": {
        "current_temperature": 45.0,
        "clock_speed_mhz": 1500,
        "bank_conflict": false
      }
    },
    {
      "cycle": 2,
      "instruction": "LOAD_HBM",
      "description": "CRITICAL: Thread 0 and Thread 1 colliding on Bank 0!",
      "source": "HBM_ADDR_0x2000",
      "destination": "SRAM_BANK_0",
      "data_payload": [3.0, 4.0],
      "hardware_state": {
        "current_temperature": 75.0,
        "clock_speed_mhz": 1500,
        "bank_conflict": true,
        "conflict_details": "Bank conflict detected on SRAM_BANK_0"
      }
    },
    {
      "cycle": 3,
      "instruction": "MMA_SYNC",
      "description": "Tensor Cores executing Matrix Multiply-Accumulate",
      "source": "SRAM_BANK_0",
      "destination": "REGISTER_ACCUM_0",
      "data_payload": [11.0, 14.0],
      "hardware_state": {
        "current_temperature": 95.0,
        "clock_speed_mhz": 1500,
        "bank_conflict": false
      }
    },
    {
      "cycle": 4,
      "instruction": "STALL_THERMAL",
      "description": "WARNING: Temperature exceeded 90C. Throttling clock speed.",
      "source": "NONE",
      "destination": "NONE",
      "data_payload": [],
      "hardware_state": {
        "current_temperature": 88.0,
        "clock_speed_mhz": 750,
        "bank_conflict": false
      }
    },
    {
      "cycle": 5,
      "instruction": "STORE_HBM",
      "description": "Writing final result matrix back to main storage",
      "source": "REGISTER_ACCUM_0",
      "destination": "HBM_ADDR_0x3000",
      "data_payload": [11.0, 14.0],
      "hardware_state": {
        "current_temperature": 82.0,
        "clock_speed_mhz": 750,
        "bank_conflict": false
      }
    }
  ]
};

export const useSimulationStore = create<SimulationState>((set) => ({
  currentCycleIndex: 0,
  totalCycles: mockData.simulation_metadata.total_cycles,
  timeline: mockData.timeline,
  setCurrentCycleIndex: (index) => set({ currentCycleIndex: index }),
  isPlaying: false,
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
}));