// GuideMode.tsx - Interactive GPU Architecture Lab & Guide Mode with Lucide Icons
import { useState } from 'react';
import { useSimulationStore } from '../store';
import { runClientSimulation } from '../utils/clientSimulator';
import { 
  GraduationCap, Zap, Check, X, ChevronLeft, ChevronRight, 
  BookOpen, FlaskConical, Cpu, Layers, Activity, Flame, 
  AlertTriangle, DollarSign, Table
} from 'lucide-react';

interface Lesson {
  id: number;
  title: string;
  subtitle: string;
  category: 'Fundamentals' | 'Microarchitecture' | 'Modern Execution' | 'Diagnostics & FinOps';
  icon: typeof Cpu;
  theory: string[];
  experimentParams: {
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
  targetTab: 'execution' | 'silicon' | 'analysis';
  targetCheckpointIndex?: number;
  observations: string[];
  takeaway: string;
}

export const GUIDE_LESSONS: Lesson[] = [
  {
    id: 1,
    title: 'Lesson 1: Anatomy of a GPU Clock Cycle & State Machine',
    subtitle: 'The Heartbeat of Silicon & Data Contracts',
    category: 'Fundamentals',
    icon: Activity,
    theory: [
      'In a GPU, a clock cycle is the fundamental heartbeat measuring how fast instructions retire.',
      'A simulator is a state machine: Current State + Instruction + Physical Silicon Rules = Next State.',
      'CoreWeaver captures this in a timeline array, enabling you to scrub back and forth in time like a hardware time machine.'
    ],
    experimentParams: {
      M: 1024, N: 1024, K: 1024, BLOCK_SIZE: 128, hardware_profile: 'A100_80GB',
      coalesced_memory: true, enable_async_copy: false, enable_fusion: false, enable_divergence: false
    },
    targetTab: 'execution',
    targetCheckpointIndex: 0,
    observations: [
      'Observe the Step ◀ / ▶ buttons and scrubber advancing through clock cycles.',
      'Watch the code editor highlight the active CUDA instruction and track latency.',
      'Inspect the Instruction Decoder below the code view for micro-op latency.'
    ],
    takeaway: 'Every AI token generated requires thousands of physical clock cycles flowing through registers, SRAM, and Tensor Cores.'
  },
  {
    id: 2,
    title: 'Lesson 2: LLM Memory & PagedAttention',
    subtitle: 'KV-Cache Allocation & Fragmentation',
    category: 'Fundamentals',
    icon: Layers,
    theory: [
      'When an LLM generates tokens, it stores past keys/values in a Key-Value (KV) cache.',
      'Contiguous allocation causes massive memory fragmentation, wasting gigabytes of precious VRAM.',
      'PagedAttention (like vLLM) breaks VRAM into small fixed blocks (e.g. 16MB) allocated on-demand.'
    ],
    experimentParams: {
      M: 4096, N: 4096, K: 2048, BLOCK_SIZE: 128, hardware_profile: 'A100_80GB',
      coalesced_memory: true, enable_async_copy: false, enable_fusion: false, enable_divergence: false
    },
    targetTab: 'silicon',
    targetCheckpointIndex: 0,
    observations: [
      'Look at the Memory Grid in the Silicon tab as allocated memory blocks fill up.',
      'Watch the Token Stream on the Execution tab emit generated tokens cycle-by-cycle.',
      'Observe how matrix sizes scale requested VRAM in the Session Config.'
    ],
    takeaway: 'Block-based memory management prevents CUDA Out-of-Memory crashes and maximizes batch sizes.'
  },
  {
    id: 3,
    title: 'Lesson 3: Silicon Die Infrared Thermals & Throttling',
    subtitle: 'Hotspot Diffusion, Power Draw & TDP Limits',
    category: 'Microarchitecture',
    icon: Flame,
    theory: [
      'Compute clusters (SMs) do not heat uniformly. Heavy Tensor Core math creates localized thermal hotspots in the chip center.',
      'When junction temperatures reach 90°C, hardware safety mechanisms drop clock frequencies (e.g., from 1500MHz to 750MHz).',
      'Throttling injects NOP (No-Operation) bubble cycles into the pipeline to prevent silicon damage.'
    ],
    experimentParams: {
      M: 8192, N: 8192, K: 4096, BLOCK_SIZE: 512, hardware_profile: 'RTX_3090',
      coalesced_memory: true, enable_async_copy: false, enable_fusion: false, enable_divergence: false
    },
    targetTab: 'silicon',
    targetCheckpointIndex: 2,
    observations: [
      'Switch to the Silicon tab to inspect the 10x10 infrared thermal diffusion map.',
      'Notice the center SM clusters glowing yellow/white (>90°C).',
      'Observe the status badge show THERMAL THROTTLE with clock frequency halved.'
    ],
    takeaway: 'Over-saturating threadblocks without adequate cooling leads to severe thermal throttling penalties.'
  },
  {
    id: 4,
    title: 'Lesson 4: SIMT Warps & 32-Bank Shared Memory Hazards',
    subtitle: 'Memory Coalescing vs Bank Collisions',
    category: 'Microarchitecture',
    icon: Zap,
    theory: [
      'GPUs group threads into Warps of 32 threads that execute in lockstep.',
      'Shared Memory (SRAM) is organized into 32 independent physical memory banks.',
      'If two threads access different words in the same bank, a Bank Conflict occurs, serializing access and halving bandwidth.'
    ],
    experimentParams: {
      M: 1024, N: 1024, K: 1024, BLOCK_SIZE: 64, hardware_profile: 'RTX_4090',
      coalesced_memory: false, enable_async_copy: false, enable_fusion: false, enable_divergence: false
    },
    targetTab: 'silicon',
    targetCheckpointIndex: 1,
    observations: [
      'Click the "SRAM Zoom" button in the TopBar to open the 32-Bank Shared Memory visualizer.',
      'Notice Bank 12 flashing red indicating conflicting simultaneous thread accesses.',
      'Observe the Memory Grid showing 32 separate transactions instead of 1.'
    ],
    takeaway: 'Always pad shared memory arrays (e.g., [32][33]) to eliminate bank collisions and preserve full bandwidth.'
  },
  {
    id: 5,
    title: 'Lesson 5: Warp Control Flow Divergence Penalty',
    subtitle: 'Branch Serialization & Idle Thread Stalls',
    category: 'Microarchitecture',
    icon: AlertTriangle,
    theory: [
      'Because all 32 threads in a warp share a single instruction pointer, branching `if/else` statements cannot execute concurrently.',
      'The GPU must serialize execution: threads taking the `if` branch execute first while the other 16 threads sit idle, and then vice versa.',
      'This serializes execution time, wasting 50% or more of theoretical peak compute.'
    ],
    experimentParams: {
      M: 2048, N: 2048, K: 2048, BLOCK_SIZE: 128, hardware_profile: 'A100_80GB',
      coalesced_memory: true, enable_async_copy: false, enable_fusion: false, enable_divergence: true
    },
    targetTab: 'execution',
    targetCheckpointIndex: 1,
    observations: [
      'Scroll to the "Warp Divergence" panel in the Execution tab.',
      'Observe Path A (IF branch) and Path B (ELSE branch) executing sequentially.',
      'Check the Serialized Penalty gauge showing wasted cycles.'
    ],
    takeaway: 'Avoid thread-dependent conditional branches inside tight kernel compute loops.'
  },
  {
    id: 6,
    title: 'Lesson 6: 5-Stage Pipeline Gantt & Hardware Bubbles',
    subtitle: 'Instruction Flow: Fetch, Decode, Execute, Memory, Writeback',
    category: 'Microarchitecture',
    icon: Activity,
    theory: [
      'Instructions traverse 5 stages: FETCH -> DECODE -> EXECUTE -> MEMORY -> WRITEBACK.',
      'Different operations have wildly different latencies (e.g., FETCH = 4 cycles, VRAM LOAD = 400 cycles).',
      'When instructions stall on data or hazards, Pipeline Bubbles are injected where silicon sits idle.'
    ],
    experimentParams: {
      M: 1024, N: 1024, K: 1024, BLOCK_SIZE: 128, hardware_profile: 'A100_80GB',
      coalesced_memory: true, enable_async_copy: false, enable_fusion: false, enable_divergence: false
    },
    targetTab: 'execution',
    targetCheckpointIndex: 0,
    observations: [
      'Examine the Pipeline Gantt chart in the Execution tab.',
      'Hover over each colored swimlane stage to see individual cycle latencies.',
      'Check the Pipeline Efficiency percentage and Bubble Cycle count.'
    ],
    takeaway: 'Minimizing pipeline bubbles through asynchronous pre-fetching is key to achieving high occupancy.'
  },
  {
    id: 7,
    title: 'Lesson 7: The Roofline Model (The Ultimate Diagnostic)',
    subtitle: 'Arithmetic Intensity & The Ridge Point Constant',
    category: 'Diagnostics & FinOps',
    icon: Activity,
    theory: [
      'The Roofline Model plots Arithmetic Intensity (FLOP/Byte) on the X-axis against Achieved GFLOPS on the Y-axis.',
      'The diagonal ceiling represents Peak Memory Bandwidth; the flat ceiling represents Peak Compute TFLOPS.',
      'The intersection is the Ridge Point—a physical constant of the silicon. Points to the left are Memory-Bound; points to the right are Compute-Bound.'
    ],
    experimentParams: {
      M: 1024, N: 1024, K: 1024, BLOCK_SIZE: 128, hardware_profile: 'A100_80GB',
      coalesced_memory: true, enable_async_copy: false, enable_fusion: false, enable_divergence: false
    },
    targetTab: 'analysis',
    targetCheckpointIndex: 1,
    observations: [
      'Switch to the Analysis tab to view the Roofline Chart.',
      'Find the glowing kernel dot and compare its position relative to the Ridge Point.',
      'Review the summary cards showing Arithmetic Intensity, Achieved GFLOPS, and Efficiency.'
    ],
    takeaway: 'If your kernel is Memory-Bound, optimizing compute instructions will yield zero speedup—you must increase Arithmetic Intensity.'
  },
  {
    id: 8,
    title: 'Lesson 8: Modern Execution (TMA Async Copy & Kernel Fusion)',
    subtitle: 'Hiding Latency & Bypassing VRAM Roundtrips',
    category: 'Modern Execution',
    icon: Cpu,
    theory: [
      'Asynchronous Memory Copy (TMA) overlaps memory loads with Tensor Core compute, reducing memory stall cycles to 0.',
      'Kernel Fusion (e.g. FlashAttention) keeps intermediate matrices in fast SRAM, bypassing VRAM writes/reads and doubling Arithmetic Intensity.',
      'Together, these modern primitives shift workloads rightward into the compute-bound ceiling.'
    ],
    experimentParams: {
      M: 4096, N: 4096, K: 2048, BLOCK_SIZE: 256, hardware_profile: 'H100_80GB',
      coalesced_memory: true, enable_async_copy: true, enable_fusion: true, enable_divergence: false
    },
    targetTab: 'execution',
    targetCheckpointIndex: 1,
    observations: [
      'In the Execution tab, check the "Modern Execution" panel.',
      'Notice TMA shows "OVERLAP ACTIVE" with 0 memory bubble stalls.',
      'Switch to the Analysis tab and observe the Roofline dot shifted far to the right.'
    ],
    takeaway: 'Modern LLM optimization relies on fusing kernels and asynchronous TMA copies to stay compute-bound.'
  },
  {
    id: 9,
    title: 'Lesson 9: Register Pressure & SM Occupancy',
    subtitle: 'Threadblock Sizing & Theoretical Occupancy Limits',
    category: 'Microarchitecture',
    icon: Layers,
    theory: [
      'Each Streaming Multiprocessor (SM) has a fixed register file (e.g., 65,536 32-bit registers).',
      'If a kernel allocates too many registers per thread, fewer active warps can be scheduled simultaneously.',
      'Low occupancy limits the GPU ability to hide memory latency behind other active warps.'
    ],
    experimentParams: {
      M: 2048, N: 2048, K: 2048, BLOCK_SIZE: 512, hardware_profile: 'A100_80GB',
      coalesced_memory: true, enable_async_copy: false, enable_fusion: false, enable_divergence: false
    },
    targetTab: 'analysis',
    targetCheckpointIndex: 0,
    observations: [
      'In the Analysis tab, scroll to CUPTI Counters and FinOps.',
      'Inspect `achieved_occupancy` and `registers_per_thread` in the counter table.',
      'Notice how increasing BLOCK_SIZE impacts registers per SM.'
    ],
    takeaway: 'Balance register usage per thread to maintain at least 4-8 active warps per SM for effective latency hiding.'
  },
  {
    id: 10,
    title: 'Lesson 10: FinOps: Translating Cycles to Cloud GPU Dollars',
    subtitle: 'Wall-Clock Time & Million-Run Cost Projections',
    category: 'Diagnostics & FinOps',
    icon: DollarSign,
    theory: [
      'In production AI systems, latency is money. Every wasted clock cycle compounds over billions of inference calls.',
      'CoreWeaver calculates exact Wall-Clock Time (True Cycles / Clock Frequency) and multiplies it by cloud instance hourly rates.',
      'This outputs exact kernel cost and projected cost for 1,000,000 runs in USD and INR.'
    ],
    experimentParams: {
      M: 4096, N: 4096, K: 4096, BLOCK_SIZE: 256, hardware_profile: 'H100_80GB',
      coalesced_memory: true, enable_async_copy: true, enable_fusion: true, enable_divergence: false
    },
    targetTab: 'analysis',
    targetCheckpointIndex: 2,
    observations: [
      'In the Analysis tab, inspect the FinOps Dashboard.',
      'Check the Kernel Cost, Cost per 1M Runs ($ and ₹), and Wall Clock Time.',
      'Notice how instance rates ($4.50/hr for H100) compare against throughput efficiency.'
    ],
    takeaway: 'A 20% kernel optimization on an H100 cluster can save tens of thousands of dollars annually in cloud spend.'
  },
  {
    id: 11,
    title: 'Lesson 11: CUPTI Hardware Counters (Nsight Compute Bridge)',
    subtitle: 'Industry-Standard Profiling Metrics',
    category: 'Diagnostics & FinOps',
    icon: Table,
    theory: [
      'Production systems engineers profile kernels using NVIDIA Nsight Compute (`ncu`), which exposes low-level CUPTI hardware counters.',
      'CoreWeaver generates exact CUPTI counters: `dram__throughput`, `smsp__sass_thread_inst_executed`, `sm__warps_active`, and L1 sector counters.',
      'This bridges high-level visual understanding with production CLI profiling tools.'
    ],
    experimentParams: {
      M: 2048, N: 2048, K: 2048, BLOCK_SIZE: 128, hardware_profile: 'A100_80GB',
      coalesced_memory: true, enable_async_copy: false, enable_fusion: false, enable_divergence: false
    },
    targetTab: 'analysis',
    targetCheckpointIndex: 1,
    observations: [
      'In the Analysis tab, review the CUPTI Counters table.',
      'Filter by category (Compute, Memory, Occupancy, Power) and sort by values.',
      'Inspect the trend sparklines showing counter behavior across cycles.'
    ],
    takeaway: 'Understanding CUPTI counter semantics allows engineers to quickly pinpoint memory vs compute stalls in real Nsight traces.'
  }
];

export function GuideModeModal({
  onClose,
  onSetActiveTab
}: {
  onClose: () => void;
  onSetActiveTab: (tab: 'execution' | 'silicon' | 'analysis') => void;
}) {
  const { currentGuideLesson, setGuideLesson, loadFullSimulation, setSimParams, jumpToCheckpoint } = useSimulationStore();
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(currentGuideLesson);

  const lesson = GUIDE_LESSONS[selectedLessonIdx] || GUIDE_LESSONS[0];
  const LessonIcon = lesson.icon || BookOpen;

  const handleLaunchLab = () => {
    // Run simulation with lesson's exact params
    const result = runClientSimulation(lesson.experimentParams);
    loadFullSimulation(result);
    setSimParams(lesson.experimentParams);
    onSetActiveTab(lesson.targetTab);
    
    if (lesson.targetCheckpointIndex !== undefined && result.checkpoints[lesson.targetCheckpointIndex]) {
      jumpToCheckpoint(result.checkpoints[lesson.targetCheckpointIndex].cycleIndex);
    }
    
    setGuideLesson(selectedLessonIdx);
    onClose();
  };

  const handlePrev = () => {
    if (selectedLessonIdx > 0) setSelectedLessonIdx(selectedLessonIdx - 1);
  };

  const handleNext = () => {
    if (selectedLessonIdx < GUIDE_LESSONS.length - 1) setSelectedLessonIdx(selectedLessonIdx + 1);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'rgba(9, 9, 11, 0.85)',
      backdropFilter: 'blur(10px)'
    }} onClick={onClose}>
      <div style={{
        width: '100%',
        maxWidth: 940,
        height: '85vh',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: '290px 1fr',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Left Lesson Navigation Sidebar */}
        <aside style={{
          borderRight: '1px solid var(--border-subtle)',
          background: 'var(--bg-base)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GraduationCap size={18} color="var(--accent-blue)" />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Architecture Lab Guide
              </h3>
            </div>
            <p className="label" style={{ marginTop: 4, fontSize: 10 }}>
              11 Interactive Physics Lessons
            </p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {GUIDE_LESSONS.map((l, idx) => {
              const isSelected = idx === selectedLessonIdx;
              const ItemIcon = l.icon || Cpu;

              return (
                <button
                  key={l.id}
                  onClick={() => setSelectedLessonIdx(idx)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    borderLeft: isSelected ? '3px solid var(--accent-blue)' : '3px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ItemIcon size={12} color={isSelected ? 'var(--accent-blue)' : 'var(--text-tertiary)'} />
                      <span style={{ fontSize: 11, fontWeight: 600 }}>Lesson {l.id}</span>
                    </div>
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--bg-panel)', color: 'var(--text-tertiary)' }}>
                      {l.category}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                    {l.title.replace(`Lesson ${l.id}: `, '')}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Lesson Detail Canvas */}
        <main style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div className="label" style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <LessonIcon size={12} />
                <span>{lesson.category} • Lesson {lesson.id} of {GUIDE_LESSONS.length}</span>
              </div>
              <h2 style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 600 }}>
                {lesson.title}
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {lesson.subtitle}
              </div>
            </div>
            <button className="btn" onClick={onClose} style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={13} />
              <span>Close</span>
            </button>
          </div>

          {/* Body Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Theory Breakdown */}
            <div>
              <div className="label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={12} />
                <span>Physical Theory & Architecture</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lesson.theory.map((point, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>•</span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guided Lab Action Box */}
            <div style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FlaskConical size={14} color="var(--accent-green)" />
                    <span>Hands-On Lab Simulation</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    Target: {lesson.experimentParams.hardware_profile} • {lesson.experimentParams.M}x{lesson.experimentParams.N}x{lesson.experimentParams.K} (Block {lesson.experimentParams.BLOCK_SIZE})
                  </div>
                </div>
                <button
                  onClick={handleLaunchLab}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Zap size={13} />
                  <span>Launch Interactive Lab</span>
                </button>
              </div>

              <div>
                <div className="label" style={{ marginBottom: 6, fontSize: 10 }}>What to observe in the visualizer:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {lesson.observations.map((obs, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
                      <Check size={13} color="var(--accent-green)" />
                      <span>{obs}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Core Architectural Takeaway */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.06)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 8,
              padding: 14
            }}>
              <div className="label" style={{ color: 'var(--accent-blue)', marginBottom: 4 }}>
                Key Engineering Takeaway
              </div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-primary)', fontWeight: 500 }}>
                {lesson.takeaway}
              </p>
            </div>
          </div>

          {/* Footer Controls */}
          <div style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <button
              className="btn"
              onClick={handlePrev}
              disabled={selectedLessonIdx === 0}
              style={{ opacity: selectedLessonIdx === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ChevronLeft size={13} />
              <span>Previous Lesson</span>
            </button>
            <span className="data" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {selectedLessonIdx + 1} / {GUIDE_LESSONS.length}
            </span>
            <button
              className="btn"
              onClick={handleNext}
              disabled={selectedLessonIdx === GUIDE_LESSONS.length - 1}
              style={{ opacity: selectedLessonIdx === GUIDE_LESSONS.length - 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>Next Lesson</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
