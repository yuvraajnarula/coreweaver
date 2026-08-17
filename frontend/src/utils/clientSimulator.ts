// clientSimulator.ts - High-Performance Client-Side GPU Physics Engine
import { type CycleData, type SimulationMetadata, type MemoryBreakdown, type RooflineMetrics, type FinOpsMetrics, type OccupancyMetrics, type SramAccess } from '../store';

export interface HardwareProfileSpec {
  vram_gb: number;
  name: string;
  bandwidth: number; // GB/s
  sram_kb: number;
  peak_tflops: number;
  tdp_watts: number;
  max_regs_per_sm: number;
  max_threads_per_sm: number;
  cost_per_hour: number;
}

export const HARDWARE_PROFILES: Record<string, HardwareProfileSpec> = {
  "A100_80GB": {
    vram_gb: 80.0, name: "NVIDIA A100 80GB", bandwidth: 2034, sram_kb: 192,
    peak_tflops: 312.0, tdp_watts: 300.0, max_regs_per_sm: 65536,
    max_threads_per_sm: 2048, cost_per_hour: 3.50
  },
  "H100_80GB": {
    vram_gb: 80.0, name: "NVIDIA H100 SXM5 80GB", bandwidth: 3350, sram_kb: 228,
    peak_tflops: 989.0, tdp_watts: 700.0, max_regs_per_sm: 65536,
    max_threads_per_sm: 2048, cost_per_hour: 4.50
  },
  "RTX_4090": {
    vram_gb: 24.0, name: "NVIDIA RTX 4090 24GB", bandwidth: 1008, sram_kb: 100,
    peak_tflops: 330.0, tdp_watts: 450.0, max_regs_per_sm: 65536,
    max_threads_per_sm: 1536, cost_per_hour: 1.50
  },
  "RTX_3090": {
    vram_gb: 24.0, name: "NVIDIA RTX 3090 24GB", bandwidth: 936, sram_kb: 100,
    peak_tflops: 280.0, tdp_watts: 350.0, max_regs_per_sm: 65536,
    max_threads_per_sm: 1536, cost_per_hour: 1.00
  },
  "MI300X": {
    vram_gb: 192.0, name: "AMD Instinct MI300X 192GB", bandwidth: 5300, sram_kb: 256,
    peak_tflops: 1300.0, tdp_watts: 750.0, max_regs_per_sm: 65536,
    max_threads_per_sm: 2048, cost_per_hour: 4.00
  },
  "T4_16GB": {
    vram_gb: 16.0, name: "NVIDIA T4 16GB", bandwidth: 320, sram_kb: 96,
    peak_tflops: 65.0, tdp_watts: 70.0, max_regs_per_sm: 65536,
    max_threads_per_sm: 1024, cost_per_hour: 0.50
  }
};

const MOCK_TOKENS = [
  "The", " future", " of", " AI", " is", " highly", " parallel", " and", " extremely", " fast", ".", 
  " It", " relies", " on", " massive", " matrix", " multiplications", " to", " scale", " intelligence", ".",
  " By", " leveraging", " Tensor", " Cores", ",", " we", " can", " process", " billions", " of", " parameters", ".",
  " However", ",", " memory", " bandwidth", " often", " becomes", " the", " primary", " bottleneck", ".",
  " Optimizing", " SRAM", " usage", " and", " avoiding", " bank", " conflicts", " is", " critical", " for", " peak", " performance", ".",
  " Ultimately", ",", " hardware", " and", " software", " must", " co-design", " to", " unlock", " true", " potential", "."
];

export interface ClientSimulationResult {
  metadata: SimulationMetadata;
  memoryBreakdown?: MemoryBreakdown;
  rooflineMetrics?: RooflineMetrics;
  finopsMetrics?: FinOpsMetrics;
  occupancyMetrics?: OccupancyMetrics;
  timeline: CycleData[];
  checkpoints: StoryCheckpointInfo[];
}

export interface StoryCheckpointInfo {
  cycleIndex: number;
  cycleNumber: number;
  id: string;
  title: string;
  subtitle: string;
  category: 'fetch' | 'sram' | 'compute' | 'throttle' | 'writeback';
  description: string;
  metricsSnapshot: string;
}

export function runClientSimulation(params: any, customArch?: any): ClientSimulationResult {
  const M = Number(params.M) || 1024;
  const N = Number(params.N) || 1024;
  const K = Number(params.K) || 1024;
  const BLOCK_SIZE = Number(params.BLOCK_SIZE) || 128;
  const hardwareKey = params.hardware_profile || 'A100_80GB';
  
  let gpuSpecs: HardwareProfileSpec = HARDWARE_PROFILES[hardwareKey] || HARDWARE_PROFILES['A100_80GB'];
  if (customArch) {
    const compute = customArch.compute || {};
    const mem = customArch.memory || {};
    const pow = customArch.power || {};
    const fp32_cores = compute.fp32_cores || 1024;
    const clock_mhz = compute.clock_mhz || 1500;
    const peak_tflops = (fp32_cores * 2 * clock_mhz * 1e6) / 1e12;
    const warp_size = compute.warp_size || 32;
    gpuSpecs = {
      vram_gb: mem.hbm_capacity_gb || 80.0,
      name: customArch.name || 'Custom ASIC GPU',
      bandwidth: mem.hbm_bandwidth_gb_s || 2034,
      sram_kb: mem.sram_kb_per_sm || 192,
      peak_tflops,
      tdp_watts: pow.tdp_watts || 300,
      max_regs_per_sm: 65536,
      max_threads_per_sm: warp_size * 64,
      cost_per_hour: Math.round((pow.tdp_watts || 300) * 0.01 * 100) / 100
    };
  }

  // 1. Validation Bouncer
  const totalElements = M * N * K;
  if (totalElements > 10_000_000_000) {
    return {
      metadata: {
        status: 'INVALID_CONFIG',
        error_message: `Matrix size (${M}x${N}x${K} = ${totalElements.toLocaleString()} elements) exceeds maximum compute limit (10B elements).`,
        hardware_profile: gpuSpecs.name,
        total_cycles: 0
      },
      timeline: [],
      checkpoints: []
    };
  }

  if (M <= 0 || N <= 0 || K <= 0) {
    return {
      metadata: {
        status: 'INVALID_CONFIG',
        error_message: "Matrix dimensions (M, N, K) must be strictly greater than 0.",
        hardware_profile: gpuSpecs.name,
        total_cycles: 0
      },
      timeline: [],
      checkpoints: []
    };
  }

  if (BLOCK_SIZE % 32 !== 0) {
    return {
      metadata: {
        status: 'INVALID_CONFIG',
        error_message: `BLOCK_SIZE (${BLOCK_SIZE}) is not a multiple of hardware Warp Size (32).`,
        hardware_profile: gpuSpecs.name,
        total_cycles: 0
      },
      timeline: [],
      checkpoints: []
    };
  }

  if (BLOCK_SIZE > 1024) {
    return {
      metadata: {
        status: 'INVALID_CONFIG',
        error_message: `BLOCK_SIZE (${BLOCK_SIZE}) exceeds absolute hardware limit of 1024 threads per block.`,
        hardware_profile: gpuSpecs.name,
        total_cycles: 0
      },
      timeline: [],
      checkpoints: []
    };
  }

  const sramBytesNeeded = 2 * (BLOCK_SIZE * BLOCK_SIZE) * 2;
  const sramKbNeeded = sramBytesNeeded / 1024;
  if (sramKbNeeded > gpuSpecs.sram_kb) {
    return {
      metadata: {
        status: 'INVALID_CONFIG',
        error_message: `Block requires ${sramKbNeeded.toFixed(1)} KB of Shared Memory (SRAM), but ${gpuSpecs.name} only has ${gpuSpecs.sram_kb} KB per SM.`,
        hardware_profile: gpuSpecs.name,
        total_cycles: 0
      },
      timeline: [],
      checkpoints: []
    };
  }

  // 2. VRAM & Precision
  const availableVramGb = gpuSpecs.vram_gb * 0.95;
  const bytesA = (M * K) * 2;
  const bytesB = (K * N) * 2;
  const bytesC = (M * N) * 2;
  let totalBytes = bytesA + bytesB + bytesC;

  const isFused = !!params.enable_fusion;
  if (isFused) {
    totalBytes = Math.floor(totalBytes * 0.5);
  }

  const totalFlops = 2 * M * N * K;
  const totalRequestedGb = totalBytes / (1024 ** 3);

  const memoryBreakdown: MemoryBreakdown = {
    matrix_a_gb: Math.round((bytesA / (1024 ** 3)) * 100) / 100,
    matrix_b_gb: Math.round((bytesB / (1024 ** 3)) * 100) / 100,
    matrix_c_gb: Math.round((bytesC / (1024 ** 3)) * 100) / 100,
    total_requested_gb: Math.round(totalRequestedGb * 100) / 100,
    total_available_gb: Math.round(availableVramGb * 100) / 100,
    gpu_name: gpuSpecs.name
  };

  if (totalRequestedGb > availableVramGb) {
    return {
      metadata: {
        status: 'OOM_ERROR',
        error_message: `CUDA Out of Memory. Requested ${totalRequestedGb.toFixed(2)} GB, but only ${availableVramGb.toFixed(2)} GB is available.`,
        hardware_profile: gpuSpecs.name,
        total_cycles: 0
      },
      memoryBreakdown,
      timeline: [],
      checkpoints: []
    };
  }

  // 3. Occupancy Metrics
  const regsPerThread = 32 + Math.floor(BLOCK_SIZE / 16);
  const maxRegs = gpuSpecs.max_regs_per_sm;
  const maxThreads = gpuSpecs.max_threads_per_sm;
  const threadsPerBlock = BLOCK_SIZE;
  const blocksByRegs = Math.floor(maxRegs / (regsPerThread * threadsPerBlock));
  const blocksByThreads = Math.floor(maxThreads / threadsPerBlock);
  const activeBlocks = Math.min(blocksByRegs, blocksByThreads);
  const activeThreads = activeBlocks * threadsPerBlock;
  const occupancyPct = Math.round(((activeThreads / maxThreads) * 100) * 10) / 10;

  const occupancyMetrics: OccupancyMetrics = {
    regs_per_thread: regsPerThread,
    active_warps: Math.floor(activeThreads / 32),
    max_warps: Math.floor(maxThreads / 32),
    occupancy_pct: occupancyPct
  };

  // 4. Timeline Synthesis & Thermodynamic State
  const BYTES_PER_CYCLE = 1500;
  const FLOPS_PER_CYCLE = 200000;
  const trueMemCycles = totalBytes / BYTES_PER_CYCLE;
  const trueComputeCycles = totalFlops / FLOPS_PER_CYCLE;
  const trueTotalCycles = trueMemCycles + trueComputeCycles + 2;

  const MIN_VISUAL = 20;
  const MAX_VISUAL = 100;
  const dynamicCycles = MIN_VISUAL + Math.floor(totalFlops / 1e9);
  const totalVisualCycles = Math.min(MAX_VISUAL, Math.max(MIN_VISUAL, dynamicCycles));

  const loadCycles = Math.max(2, Math.floor((trueMemCycles / trueTotalCycles) * totalVisualCycles));
  const mathCycles = Math.max(2, totalVisualCycles - loadCycles - 2);

  const totalGflops = totalFlops / 1e9;
  const targetTempRiseMath = Math.min(70.0, totalGflops * 5.0);
  const heatPerMathCycle = mathCycles > 0 ? targetTempRiseMath / mathCycles : 0;
  const totalGb = totalBytes / 1e9;
  const targetTempRiseLoad = Math.min(20.0, totalGb * 2.0);
  const heatPerLoad = loadCycles > 0 ? targetTempRiseLoad / loadCycles : 0;
  const heatPerStore = 3.0;

  let currentTemp = 45.0;
  let thermalMap = Array(100).fill(45.0);
  let clockSpeedMhz = 1500;
  const timeline: CycleData[] = [];
  const checkpoints: StoryCheckpointInfo[] = [];

  const calculateDiffusion = (heatIndices: number[], amount: number) => {
    const nextMap = [...thermalMap];
    heatIndices.forEach(idx => {
      if (idx >= 0 && idx < 100) {
        nextMap[idx] += amount;
        const row = Math.floor(idx / 10);
        const col = idx % 10;
        [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]].forEach(([r, c]) => {
          if (r >= 0 && r < 10 && c >= 0 && c < 10) {
            nextMap[r * 10 + c] += amount * 0.2;
          }
        });
      }
    });
    thermalMap = nextMap.map(t => Math.max(35.0, t - 1.5));
    currentTemp = Math.max(...thermalMap);
  };

  const hasConflict = BLOCK_SIZE === 64 && (K % 32 !== 0);
  const enableDiv = !!params.enable_divergence;
  const isCoalesced = params.coalesced_memory !== false;
  const isAsync = !!params.enable_async_copy;
  const totalVramVisual = Math.min(100, Math.max(1, Math.floor((totalBytes / 1e9) * 10)));

  let cycleCounter = 0;

  const buildCycle = (
    instruction: string,
    description: string,
    sourceLine: number,
    sramAccess: SramAccess[],
    isConflictCycle: boolean
  ): CycleData => {
    cycleCounter++;
    const tokenIdx = Math.min(cycleCounter - 1, MOCK_TOKENS.length - 1);

    const pipelineTrace: any[] = [
      { stage: 'FETCH', cycles: 4, status: 'NORMAL' },
      { stage: 'DECODE', cycles: 4, status: 'NORMAL' },
      { stage: 'EXECUTE', cycles: 10, status: 'NORMAL' },
      { stage: 'MEMORY', cycles: 10, status: 'NORMAL' },
      { stage: 'WRITEBACK', cycles: 4, status: 'NORMAL' }
    ];

    if (instruction === 'LOAD_HBM' || instruction === 'STORE_HBM') {
      pipelineTrace[3].cycles = 400;
      pipelineTrace[3].stage = 'MEMORY (VRAM)';
    } else if (instruction === 'MMA_SYNC') {
      const mathC = Math.max(20, Math.floor((BLOCK_SIZE / 16) * 10));
      pipelineTrace[2].cycles = mathC;
      pipelineTrace[2].stage = 'EXECUTE (Tensor)';
    }

    if (isConflictCycle) {
      const conflictPenalty = Math.max(1, Math.floor(BLOCK_SIZE / 32)) * 50;
      pipelineTrace[3].cycles += conflictPenalty;
      pipelineTrace[3].status = 'CONFLICT';
    }

    if (instruction === 'STALL_THERMAL') {
      pipelineTrace[2].cycles = 0;
      pipelineTrace[3].cycles = 0;
      pipelineTrace.splice(2, 0, { stage: 'NOP (Thermal Bubble)', cycles: 300, status: 'STALL' });
    }

    if (isAsync && instruction === 'LOAD_HBM' && cycleCounter > 1) {
      pipelineTrace[3].cycles = 0;
      pipelineTrace[3].stage = 'ASYNC MEM (Hidden)';
      pipelineTrace[3].status = 'OVERLAP';
    }

    const tdp = gpuSpecs.tdp_watts;
    const idlePower = tdp * 0.20;
    const mathPower = (pipelineTrace[2].cycles / 100.0) * (tdp * 0.60);
    const memPower = (pipelineTrace[3].cycles / 400.0) * (tdp * 0.30);
    let powerWatts = Math.min(tdp * 1.1, idlePower + mathPower + memPower);
    let powerThrottled = false;
    if (powerWatts > tdp) {
      powerThrottled = true;
      powerWatts = tdp;
    }

    const warpPattern = (instruction === 'LOAD_HBM' || instruction === 'STORE_HBM')
      ? Array.from({ length: 32 }, (_, i) => 1000 + (i * (isCoalesced ? 4 : 128)))
      : [];
    const transactions = (instruction === 'LOAD_HBM' || instruction === 'STORE_HBM')
      ? (isCoalesced ? 1 : 32)
      : 0;

    let divergenceInfo = null;
    if (enableDiv && instruction === 'MMA_SYNC') {
      divergenceInfo = {
        has_divergence: true,
        path_a_cycles: 15,
        path_b_cycles: 10,
        serialized_penalty: 10
      };
      pipelineTrace[2].cycles += divergenceInfo.serialized_penalty;
      pipelineTrace[2].status = 'DIVERGENT';
    }

    const totalLatency = pipelineTrace.reduce((s, st) => s + st.cycles, 0);
    const bubbleCycles = pipelineTrace
      .filter(st => ['STALL', 'CONFLICT', 'DIVERGENT'].includes(st.status))
      .reduce((s, st) => s + st.cycles, 0);
    const efficiencyPct = totalLatency > 0
      ? Math.round(((totalLatency - bubbleCycles) / totalLatency) * 1000) / 10
      : 100.0;

    return {
      cycle: cycleCounter,
      instruction,
      description,
      source_line: sourceLine,
      generated_token: MOCK_TOKENS[tokenIdx],
      pipeline_trace: pipelineTrace,
      pipeline_metrics: {
        total_latency: totalLatency,
        bubble_cycles: bubbleCycles,
        efficiency_pct: efficiencyPct
      },
      micro_state: {
        power_watts: Math.round(powerWatts * 10) / 10,
        tdp_limit: tdp,
        power_throttled: powerThrottled,
        warp_pattern: warpPattern,
        memory_transactions: transactions,
        divergence_info: divergenceInfo
      },
      hardware_state: {
        current_temperature: Math.round(currentTemp * 10) / 10,
        clock_speed_mhz: clockSpeedMhz,
        bank_conflict: isConflictCycle,
        conflict_details: isConflictCycle ? 'Bank conflict detected on SRAM_BANK_12' : '',
        allocated_blocks: Array.from({ length: Math.min(100, Math.floor((cycleCounter / totalVisualCycles) * totalVramVisual)) }, (_, k) => k),
        thermal_map: thermalMap.map(t => Math.round(t * 10) / 10),
        sram_access: sramAccess
      }
    };
  };

  // Checkpoint 1: Memory Fetch Init
  const c1Idx = 0;
  checkpoints.push({
    cycleIndex: c1Idx,
    cycleNumber: 1,
    id: 'fetch-hbm',
    title: 'Global HBM Tile Fetch',
    subtitle: 'High-Bandwidth Memory Transaction',
    category: 'fetch',
    description: `Streaming matrix tiles from off-chip HBM into on-chip SM Shared Memory. Latency is 400 cycles per transaction${isAsync ? ' (Overlapped via TMA)' : ''}.`,
    metricsSnapshot: `${gpuSpecs.bandwidth} GB/s Peak HBM BW | ${isCoalesced ? '1 Coalesced Transaction (128B)' : '32 Scattered Transactions'}`
  });

  // Generate Load Cycles
  for (let i = 0; i < loadCycles; i++) {
    calculateDiffusion([10, 11, 20, 21], heatPerLoad);
    const isConflictNow = hasConflict && i === 1;
    const sram: SramAccess[] = isConflictNow
      ? [{ thread_id: 0, bank_id: 12, address: 1 }, { thread_id: 1, bank_id: 12, address: 2 }]
      : [{ thread_id: 0, bank_id: 4, address: 0 }, { thread_id: 1, bank_id: 5, address: 0 }];

    if (isConflictNow) {
      checkpoints.push({
        cycleIndex: timeline.length,
        cycleNumber: timeline.length + 1,
        id: 'sram-hazard',
        title: 'SRAM Bank Conflict Hazard',
        subtitle: 'Serialized Shared Memory Traffic',
        category: 'sram',
        description: 'Two threads simultaneously addressed different rows in Bank 12. Hardware serialized memory access, doubling load latency and stalling the pipeline.',
        metricsSnapshot: `+${Math.max(1, Math.floor(BLOCK_SIZE / 32)) * 50} Stalled Cycles | 50% Memory Throughput Penalty`
      });
    }

    timeline.push(buildCycle('LOAD_HBM', 'Loading tiles from HBM to SRAM', 7, sram, isConflictNow));
  }

  // Checkpoint 3: Tensor Core MMA Compute
  const c3Idx = timeline.length;
  checkpoints.push({
    cycleIndex: c3Idx,
    cycleNumber: c3Idx + 1,
    id: 'mma-compute',
    title: 'Tensor Core MMA Matrix Crunch',
    subtitle: 'Peak Mathematical Intensity',
    category: 'compute',
    description: `Parallel Tensor Cores computing Matrix Multiply-Accumulate (MMA_SYNC) at ${clockSpeedMhz} MHz. Hotspots emerge in center SM clusters.`,
    metricsSnapshot: `${gpuSpecs.peak_tflops} TFLOPS Peak | ${enableDiv ? 'Warp Divergence Active (+10 cy penalty)' : '100% SIMT Lockstep'}`
  });

  // Generate Math Cycles
  const tensorIndices = [33, 34, 43, 44];
  for (let i = 0; i < mathCycles; i++) {
    calculateDiffusion(tensorIndices, heatPerMathCycle);
    timeline.push(buildCycle('MMA_SYNC', 'Tensor Cores executing MAC operations', 11, [], false));
  }

  // Check for thermal throttle
  let status: 'SUCCESS' | 'SUCCESS_WITH_THROTTLE' = 'SUCCESS';
  if (currentTemp > 90.0) {
    status = 'SUCCESS_WITH_THROTTLE';
    clockSpeedMhz = 750;
    calculateDiffusion([], 0.0);
    const throttleIdx = timeline.length;
    checkpoints.push({
      cycleIndex: throttleIdx,
      cycleNumber: throttleIdx + 1,
      id: 'thermal-throttle',
      title: 'Thermodynamic Throttle Trigger',
      subtitle: '90°C Critical Limit Safety Event',
      category: 'throttle',
      description: `Silicon junction temperature reached ${currentTemp.toFixed(1)}°C. Hardware safety circuits dropped clock speed to 750 MHz and injected 300 NOP bubble cycles.`,
      metricsSnapshot: `Clock: 1500 -> 750 MHz | 300 NOP Bubble Cycles Injected`
    });
    timeline.push(buildCycle('STALL_THERMAL', 'CRITICAL: Thermal limit reached. Clock throttled.', 11, [], false));
    clockSpeedMhz = 1500;
  }

  // Checkpoint 5: Store back to HBM
  const storeIdx = timeline.length;
  checkpoints.push({
    cycleIndex: storeIdx,
    cycleNumber: storeIdx + 1,
    id: 'store-hbm',
    title: 'Result Epilogue & Global Writeback',
    subtitle: 'SRAM to VRAM Final Flush',
    category: 'writeback',
    description: 'Writing computed matrix accumulators back to persistent High Bandwidth Memory (HBM) and freeing shared memory blocks.',
    metricsSnapshot: `${memoryBreakdown.matrix_c_gb} GB Written | Final Output Validated`
  });

  calculateDiffusion([80, 81], heatPerStore);
  timeline.push(buildCycle('STORE_HBM', 'Writing result matrix to HBM', 14, [], false));

  // 5. Roofline Metrics
  const arithmeticIntensity = totalBytes > 0 ? totalFlops / totalBytes : 0;
  const peakComputeGflops = gpuSpecs.peak_tflops * 1000;
  const peakMemBw = gpuSpecs.bandwidth;
  let efficiency = 0.85;
  if (hasConflict) efficiency *= 0.5;
  if (status === 'SUCCESS_WITH_THROTTLE') efficiency *= 0.6;
  const memAchieved = arithmeticIntensity * peakMemBw;
  const computeAchieved = peakComputeGflops * efficiency;
  const achievedGflops = Math.min(memAchieved, computeAchieved);
  const ridgePoint = peakComputeGflops / peakMemBw;

  const rooflineMetrics: RooflineMetrics = {
    arithmetic_intensity: Math.round(arithmeticIntensity * 100) / 100,
    achieved_gflops: Math.round(achievedGflops * 100) / 100,
    peak_compute_gflops: peakComputeGflops,
    peak_mem_bw: peakMemBw,
    ridge_point: Math.round(ridgePoint * 100) / 100
  };

  // 6. FinOps Metrics
  const baseClockHz = 1500 * 1e6;
  const trueWallClockSecs = trueTotalCycles / baseClockHz;
  const hourlyRate = gpuSpecs.cost_per_hour;
  const kernelCostUsd = (trueWallClockSecs / 3600.0) * hourlyRate;

  const finopsMetrics: FinOpsMetrics = {
    true_total_cycles: Math.floor(trueTotalCycles),
    wall_clock_seconds: Math.round(trueWallClockSecs * 1e6) / 1e6,
    hourly_rate_usd: hourlyRate,
    kernel_cost_usd: Math.round(kernelCostUsd * 1e8) / 1e8,
    cost_per_million_runs: Math.round(kernelCostUsd * 1_000_000 * 100) / 100
  };

  return {
    metadata: {
      status,
      hardware_profile: gpuSpecs.name,
      total_cycles: timeline.length,
      occupancy_metrics: occupancyMetrics
    },
    memoryBreakdown,
    rooflineMetrics,
    finopsMetrics,
    occupancyMetrics,
    timeline,
    checkpoints
  };
}
