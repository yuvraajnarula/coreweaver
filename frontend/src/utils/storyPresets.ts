// storyPresets.ts - Curated Architectural Stories & Scenarios

export interface StoryPreset {
  id: string;
  name: string;
  badge: string;
  subtitle: string;
  narrative: string;
  params: {
    M: number;
    N: number;
    K: number;
    BLOCK_SIZE: number;
    hardware_profile: string;
    coalesced_memory: boolean;
    enable_async_copy: boolean;
    enable_fusion: boolean;
    enable_divergence: boolean;
  };
  focusTab: 'execution' | 'silicon' | 'analysis';
  highlights: string[];
}

export const STORY_PRESETS: StoryPreset[] = [
  {
    id: 'standard-gemm',
    name: '1. Standard GEMM Baseline',
    badge: 'Memory-Bound',
    subtitle: 'Classic unfused matrix multiplication waiting on HBM bandwidth',
    narrative: 'Standard large GEMM kernel on an A100 GPU. Watch the 400-cycle VRAM latency stall the pipeline during LOAD_HBM and observe the kernel sitting to the left of the Roofline Ridge Point.',
    params: {
      M: 2048,
      N: 2048,
      K: 2048,
      BLOCK_SIZE: 128,
      hardware_profile: 'A100_80GB',
      coalesced_memory: true,
      enable_async_copy: false,
      enable_fusion: false,
      enable_divergence: false
    },
    focusTab: 'analysis',
    highlights: [
      'Arithmetic Intensity sits below the 4.5 Ridge Point',
      'Pipeline Gantt shows 400-cycle MEMORY stalls',
      'FinOps displays standard cloud cost model'
    ]
  },
  {
    id: 'flash-attention-fused',
    name: '2. FlashAttention Fused',
    badge: 'Compute-Bound',
    subtitle: 'Kernel fusion keeping intermediate matrices in on-chip SRAM',
    narrative: 'By fusing QK^T matrix multiply with online Softmax and V reduction, we completely bypass global VRAM round-trips. This cuts memory traffic by 50%, doubling Arithmetic Intensity and shifting the kernel past the Ridge Point into the Compute-Bound ceiling.',
    params: {
      M: 4096,
      N: 4096,
      K: 2048,
      BLOCK_SIZE: 256,
      hardware_profile: 'H100_80GB',
      coalesced_memory: true,
      enable_async_copy: true,
      enable_fusion: true,
      enable_divergence: false
    },
    focusTab: 'execution',
    highlights: [
      'Arithmetic Intensity doubled past the Ridge Point',
      'VRAM memory writebacks completely bypassed',
      'Full Tensor Core saturation at 989 TFLOPS'
    ]
  },
  {
    id: 'sram-bank-conflict',
    name: '3. SRAM Bank Conflict Hazard',
    badge: 'Hardware Hazard',
    subtitle: 'Uncoalesced strided access causing serialized shared memory collisions',
    narrative: 'When multiple threads in a 32-thread warp access different addresses located within the same physical SRAM bank, the memory controller cannot serve them in parallel. Watch Bank 12 flash red in the SRAM matrix as memory throughput drops by 50% due to serialization.',
    params: {
      M: 1024,
      N: 1024,
      K: 1024,
      BLOCK_SIZE: 64, // triggers bank conflict condition with K%32 != 0
      hardware_profile: 'RTX_4090',
      coalesced_memory: false,
      enable_async_copy: false,
      enable_fusion: false,
      enable_divergence: true
    },
    focusTab: 'silicon',
    highlights: [
      'Bank 12 collision flashes neon red in 32x32 memory grid',
      '32 separate memory transactions instead of 1 coalesced fetch',
      'Warp divergence penalty injects +10 cycles of idle serialized execution'
    ]
  },
  {
    id: 'thermal-throttle-crisis',
    name: '4. Thermal Throttling & TDP Limit',
    badge: 'Thermodynamics',
    subtitle: 'Center Tensor Core hotspots exceeding 90°C silicon limit',
    narrative: 'Sustained peak compute density on center SM clusters drives junction temperature past 90°C. Watch the infrared infrared die glow yellow/white and observe the hardware safety mechanisms drop clock frequency from 1500MHz to 750MHz while injecting 300 NOP bubble cycles.',
    params: {
      M: 8192,
      N: 8192,
      K: 4096,
      BLOCK_SIZE: 512,
      hardware_profile: 'RTX_3090',
      coalesced_memory: true,
      enable_async_copy: false,
      enable_fusion: false,
      enable_divergence: false
    },
    focusTab: 'silicon',
    highlights: [
      'Infrared die view reaches critical 90°C+ hotspot in center SMs',
      'Clock speed throttled to 750 MHz',
      'Pipeline Gantt shows red NOP (Thermal Bubble) stage'
    ]
  },
  {
    id: 'tma-async-copy',
    name: '5. TMA Asynchronous Memory Overlap',
    badge: 'Modern Architecture',
    subtitle: 'Tensor Memory Accelerator hiding 400-cycle VRAM latency behind compute',
    narrative: 'On modern architectures (Hopper / TMA), dedicated hardware copy engines pre-fetch the next tile of data in the background while Tensor Cores execute on the current tile. The 400-cycle memory latency is completely hidden (0 pipeline bubble stalls).',
    params: {
      M: 2048,
      N: 2048,
      K: 2048,
      BLOCK_SIZE: 128,
      hardware_profile: 'H100_80GB',
      coalesced_memory: true,
      enable_async_copy: true,
      enable_fusion: true,
      enable_divergence: false
    },
    focusTab: 'execution',
    highlights: [
      'Modern Execution view shows OVERLAP ACTIVE',
      '0 memory stall bubbles in instruction pipeline',
      '100% pipeline scheduling efficiency'
    ]
  }
];
