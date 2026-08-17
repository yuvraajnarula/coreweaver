# CoreWeaver: Interactive User Manual & Architecture Lab Guide

Welcome to **CoreWeaver**, a full-stack, mathematically rigorous AI GPU architecture simulator. CoreWeaver bridges the gap between high-level AI software (PyTorch, Triton, CUDA) and low-level silicon physics (SIMT thread warps, 32-bank SRAM, infrared thermal diffusion, pipeline hazards, and cloud billing).

This document serves as an interactive handbook for engineers, researchers, and students to explore, experiment, and interact with every facet of the simulator.

---

## ⚡ Quick Start: 2 Ways to Run

### Option A: Instant Web / Standalone Mode (Zero Setup)
CoreWeaver includes a deterministic, client-side GPU physics engine. You can run the frontend standalone without requiring local Python or Redis instances:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. All physics calculations, story checkpoints, and visualizers run in real-time in your browser.

### Option B: Full-Stack Enterprise Mode (With Live WebSockets & Groq AI)
To enable live telemetry streaming and the Groq LPU natural language compiler:
```bash
# 1. Start Python WebSocket server (port 8765)
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python server.py

# 2. In a second terminal, start the FastAPI REST server (port 8000)
# (Ensure GROQ_API_KEY is set in backend/.env for AI features)
uvicorn api:app --host 0.0.0.0 --port 8000

# 3. In a third terminal, start the frontend (port 5173)
cd frontend
npm run dev
```

---

## 🧭 Navigating the CoreWeaver Interface

CoreWeaver features a **4-Zone Workspace** engineered for deep hardware introspection:

```
+-----------------------------------------------------------------------------------+
|  [● CoreWeaver]  [◀] [▶] [▶] [0.5x|1x|2x|4x] [Scrubber]   [SRAM Zoom] [🎓 Guide] [⬡ Silicon]  |
+-----------------------------------------------------------------------------------+
| 1. CONFIG & LOG   | 2. MAIN PROFILER CANVAS              | 3. AI & CODE VIEW     |
|                   |   [🚩 Story Checkpoint Navigation]   |                       |
| • Hardware Target |   [Story Physics Narrative HUD]      | • AI Root-Cause Agent |
| • Matrix MxNxK    |   [Tabs: EXECUTION | SILICON | ANLYS]|   - Findings & Proof  |
| • Execution Log   |   - Pipeline Gantt & Divergence      |   - Recommendations   |
|   (CY 001, 002..) |   - Thermal Map & SRAM Matrix        | • CUDA Code Heatmap   |
|                   |   - Roofline Model & CUPTI Counters  |   - Line-by-line cost |
+-----------------------------------------------------------------------------------+
```

---

## 🚩 Story Checkpointing & Playback Engine

CoreWeaver translates complex GPU execution into a structured, chronological **story**. 

### 1. Milestone Checkpoints
At the top of the canvas, the **Story Checkpoint Bar** lets you jump immediately to the 5 defining moments of a kernel's lifecycle:

| Checkpoint | Category | What Happens in Hardware |
|---|---|---|
| **01. Global HBM Fetch** | `FETCH` | Memory controller fetches matrix tiles from High Bandwidth Memory (400-cycle latency) into on-chip SRAM. |
| **02. SRAM Bank Hazard** | `SRAM` | Multiple threads in a 32-thread warp access the same physical bank, causing a bank collision and pipeline stall. |
| **03. Tensor Core MMA** | `COMPUTE` | Tensor Cores execute Matrix Multiply-Accumulate (`MMA_SYNC`) at peak frequency, driving up temperature. |
| **04. Thermal / TDP Throttle** | `THROTTLE` | Silicon junction temperature breaches 90°C. Clock speed is halved to 750MHz and 300 NOP bubbles are injected. |
| **05. Epilogue Writeback** | `WRITEBACK` | Computed accumulator matrices are flushed from registers back to global HBM. |

### 2. Time-Machine Playback Controls
- **Play / Pause (`▶` / `❚❚`)**: Continuously plays the simulation timeline cycle-by-cycle.
- **Step (`◀` / `▶`)**: Steps backward or forward by exactly 1 clock cycle.
- **Speed Multipliers (`0.5x`, `1x`, `2x`, `4x`)**: Adjusts the simulation clock rate.
- **Interactive Scrubber**: Drag across the timeline to scrub to any cycle from `0` to `total_cycles`.
- **Cycle Execution Log**: In the left sidebar, click any cycle (`CY 001`, `CY 002`, etc.) to jump directly to that hardware state.

---

## 🎓 Interactive Guide Mode (11 Structured Lessons)

Click the **`🎓 Guide Mode`** button in the TopBar to open the interactive curriculum based on `Knowledge.md`. Each lesson contains:
1. **Physical Theory**: Explaining the exact silicon physics.
2. **Interactive Lab Button (`⚡ Launch Interactive Lab`)**: Sets up the exact GPU parameters and jumps to the relevant visualizer tab.
3. **Observation Checklist**: Guides your eyes to what hardware counters and visual cues to verify.
4. **Key Takeaway**: Summary for AI systems engineers.

### Curriculum Overview
1. **Lesson 1: Anatomy of a GPU Clock Cycle & State Machine** (Cycles, state transitions, time scrubbing)
2. **Lesson 2: LLM Memory & PagedAttention** (KV-Cache growth, memory fragmentation, block tables)
3. **Lesson 3: Silicon Die Infrared Thermals & Throttling** (Hotspot generation, 90°C safety cap, NOP bubbles)
4. **Lesson 4: SIMT Warps & 32-Bank Shared Memory Conflicts** (32-thread warps, SRAM banks, bank hazards)
5. **Lesson 5: Warp Control Flow Divergence Penalty** (Branch serialization, idle thread penalty)
6. **Lesson 6: 5-Stage Instruction Pipeline Gantt & Bubbles** (FETCH -> DECODE -> EXECUTE -> MEMORY -> WRITEBACK)
7. **Lesson 7: The Roofline Model** (Arithmetic Intensity, FLOP/Byte, GFLOPS, Ridge Point physical constant)
8. **Lesson 8: Modern Execution: TMA Async Copy & Kernel Fusion** (cp.async overlap, FlashAttention VRAM bypass)
9. **Lesson 9: Register Pressure & SM Occupancy Limits** (Registers per thread, active warps, scheduling)
10. **Lesson 10: FinOps: Translating Cycles to Cloud GPU Dollars** (Wall-clock time, instance pricing, 1M run cost)
11. **Lesson 11: CUPTI Hardware Counters** (Nsight Compute emulation table, metric categories, trend sparklines)

---

## 🧪 6 Hands-On Lab Experiments

Try these hands-on experiments to understand how software choices impact silicon behavior:

---

### Experiment 1: Memory-Bound vs. Compute-Bound (FlashAttention Fusion)
**Goal:** Mathematically demonstrate how kernel fusion shifts a workload on the Roofline chart.

1. In the TopBar, click **Configure**.
2. Set the following parameters:
   - `M = 2048`, `N = 2048`, `K = 2048`
   - `BLOCK_SIZE = 128`
   - `Hardware Profile = A100_80GB`
   - `Kernel Fusion = OFF`
3. Click **Compile & Run Kernel**.
4. Open the **Analysis Tab** -> Observe the **Roofline Chart**:
   - Arithmetic Intensity is `~2.0 FLOP/Byte` (Memory-Bound, well left of the `4.5` Ridge Point).
   - In the **Execution Tab**, the Pipeline Gantt shows large yellow `MEMORY (VRAM)` stages taking 400 cycles.
5. Now, toggle `Kernel Fusion = ON` and re-run:
   - Intermediate matrices are kept in SRAM, cutting memory traffic in half.
   - Arithmetic Intensity jumps to `~4.0+ FLOP/Byte`, shifting the kernel dot directly to the right toward the Compute ceiling!

---

### Experiment 2: Inducing & Resolving SRAM Bank Conflicts
**Goal:** Experience shared memory bank collisions and watch the 32-bank visualizer pulse red.

1. Set the following parameters:
   - `M = 1024`, `N = 1024`, `K = 1024`
   - `BLOCK_SIZE = 64`
   - `Coalesced Memory Access = OFF`
   - `Hardware Profile = RTX_4090`
2. Click **Compile & Run Kernel**.
3. In the TopBar, click **SRAM Zoom**:
   - Notice **Bank 12** flashes red with a `WARNING: BANK CONFLICT DETECTED!` banner.
   - In the **Silicon Tab**, the 32x32 SRAM Bank Matrix shows red cell borders.
   - In the **Execution Tab**, the Pipeline Gantt injects a red `CONFLICT` stage, doubling latency.
4. To fix it, toggle `Coalesced Memory Access = ON` and increase `BLOCK_SIZE = 128`. Re-run to verify 0 bank conflicts!

---

### Experiment 3: Pushing Silicon to Thermal & TDP Throttling
**Goal:** Saturate Tensor Cores to breach the 90°C thermal limit and observe hardware throttling.

1. Set a massive compute-heavy configuration:
   - `M = 8192`, `N = 8192`, `K = 4096`
   - `BLOCK_SIZE = 512`
   - `Hardware Profile = RTX_3090` (350W TDP)
2. Click **Compile & Run Kernel**.
3. Open the **Silicon Tab**:
   - Watch the 10x10 infrared thermal grid diffuse heat until the center clusters glow bright yellow (`>90°C`).
   - Notice the TopBar badge turns amber: `● THERMAL THROTTLE`.
4. Open the **Execution Tab** -> Click the **`4. Thermodynamic Throttle Trigger`** checkpoint:
   - Observe the Pipeline Gantt inject a 300-cycle red `NOP (Thermal Bubble)` stage.
   - The clock speed plummets from `1500 MHz` to `750 MHz` to protect the silicon die.

---

### Experiment 4: Hiding 400-Cycle Memory Latency with TMA (Async Copy)
**Goal:** Compare synchronous vs. asynchronous memory staging on modern Hopper architecture.

1. Set the following parameters:
   - `M = 2048`, `N = 2048`, `K = 2048`, `BLOCK_SIZE = 128`
   - `Hardware Profile = H100_80GB`
   - `Async Copy (cp.async) = OFF`
2. Click **Set Baseline** in the Control Panel.
3. Now toggle `Async Copy (cp.async) = ON` and click **Compile & Run Kernel**.
4. Check the **Modern Execution** panel:
   - Status switches to `OVERLAP ACTIVE`.
   - The 400-cycle HBM memory latency is completely hidden behind Tensor Core compute (0 stall bubbles).
5. Click **Run A/B Comparison** to see a side-by-side delta report showing cycle reduction and dollar savings!

---

### Experiment 5: Designing a Custom Silicon Architecture & Tape-Out
**Goal:** Design your own AI accelerator ASIC and validate physical silicon constraints.

1. In the TopBar, click **`⬡ Design Silicon`**.
2. Navigate through the silicon hierarchy tabs:
   - **Compute Cluster**: Adjust Warp Size (32/64), FP32 Cores, Tensor Cores, and Clock Speed (MHz).
   - **Memory Hierarchy**: Adjust Registers per thread, SRAM per SM (KB), HBM Capacity (GB), and HBM Bandwidth (GB/s).
   - **Power & Thermal**: Adjust TDP Limit (Watts), Thermal Throttle Limit (°C), and Process Node (nm).
   - **Area & Yield**: Inspect the estimated Die Area (mm²) and wafer yield percentage.
3. Check the **Silicon Health Panel** on the right:
   - If HBM Bandwidth is too low for your compute cores, it triggers a `Severe Memory Starvation` warning.
   - If power exceeds your cooling budget, it triggers a `TDP Envelope Exceeded` alert.
   - If die area exceeds 800mm², it warns of reticle limit yield collapse.
4. Once balanced, click **Tape-Out** to immediately simulate and profile kernels on your custom silicon!

---

### Experiment 6: AI Natural Language Compiler & Root-Cause Agent
**Goal:** Use AI to translate human workload descriptions into hardware configurations.

1. Open the configuration panel.
2. In the **Natural Language Compiler** bar, type:
   > *"Run Llama-3 8B attention head with sequence length 4096 on an H100 GPU with fused softmax"*
3. Click **Compile**:
   - Groq's LPU extracts `M=4096`, `N=4096`, `K=4096`, `BLOCK_SIZE=256`, `hardware_profile=H100_80GB`, `enable_fusion=true`.
   - The simulation automatically launches.
4. Inspect the **AI Inspector (Root-Cause Analysis)** in the right sidebar:
   - Evaluates confidence score, findings (e.g. Memory Bandwidth vs Compute Saturation), and actionable recommendations.

---

## 📊 Hardware Profiler Panels Reference

| Visualizer Panel | Location | Primary Metric / Diagnosis |
|---|---|---|
| **Token Stream** | Execution Tab | Streams generated LLM tokens with tokens-per-cycle throughput counter. |
| **Modern Execution** | Execution Tab | Visualizes TMA asynchronous copy overlap and FlashAttention fusion intensity. |
| **Pipeline Gantt** | Execution Tab | 5-stage instruction pipeline swimlane with bubble cycle counter and efficiency percentage. |
| **Warp Divergence** | Execution Tab | Control flow branch graph showing serialized penalty cycles when threads diverge. |
| **Silicon Telemetry** | Silicon Tab | 10x10 infrared temperature grid with thermal diffusion and throttling indicators. |
| **Memory Grid** | Silicon Tab | 32x32 SRAM bank access matrix showing bus routing and bank collision cells. |
| **Roofline Model** | Analysis Tab | Logarithmic plot of Arithmetic Intensity (FLOP/B) vs Performance (GFLOPS) with Ridge Point. |
| **CUPTI Counters** | Analysis Tab | Nsight Compute table of industry-standard hardware counters with sparkline trends and category filtering. |
| **FinOps Dashboard** | Analysis Tab | Converts hardware cycles to wall-clock time and real cloud GPU hourly costs (in USD and INR). |
| **CUDA Code View** | Right Sidebar | Visual Studio Code-style CUDA editor with line latency heatmap, active execution pointer, and instruction decoder. |

---

## 🛠️ Diagnostics & Error Handling

CoreWeaver includes a strict **Validation Bouncer** to teach realistic silicon limits:

- **CUDA Out-of-Memory (OOM)**: Triggered if requested matrix memory exceeds 95% of available VRAM (with 5% reserved for OS/Display). Displays a detailed breakdown of Matrix A, B, and C sizes.
- **CUDA Invalid Configuration**: Triggered if `BLOCK_SIZE` is not a multiple of 32 (Warp Size), exceeds 1024 threads/block, or requires more SRAM than physically present on the SM.

---

## 💾 Telemetry Export & State Sharing

1. **Export Telemetry JSON**: Click `⬇ Export Trace` in the TopBar to download the full, cycle-by-cycle JSON trace containing temperature maps, pipeline stages, memory accesses, and FinOps metrics for offline analysis in Python/Pandas.
2. **Enterprise Share Links**: Click `Generate Share Link` in the Enterprise Workflow bar to generate a clean, 12-character hex ID URL with a 1-hour Redis TTL cache. Share with teammates for instant state reproduction.
3. **CI/CD Performance Regression**: Click `Run CI Regression Check` to execute a mock CI/CD pipeline comparing your branch against baseline performance thresholds.
