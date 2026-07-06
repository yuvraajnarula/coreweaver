# CoreWeaver Knowledge Base: The Physics of AI Hardware

## Theory

### What are cycles?
In a GPU, a cycle is the fundamental **heartbeat** of the hardware. It is a single tick of the GPU's internal clock, measuring how fast it can do its work. 

| S No | Instruction | Purpose |
|---|---|---|
| 1 | `LOAD_HBM` | HBM (High Bandwidth Memory) is the GPU's main warehouse. It holds massive amounts of data but is physically located far from the processing cores. This tells the GPU to go to the HBM, grab a specific batch of data (like a matrix of numbers), and bring it onto the SRAM/Shared Memory so it can be used immediately. |
| 2 | `MMA_SYNC` | MMA (Matrix Multiply-Accumulate) is the core mathematical operation behind all AI and LLMs. It tells the GPU's AI cores (Tensor Cores) to grab the data blocks currently sitting on the prep counter, multiply them together, and add them to a running total at rapid speed. The **_SYNC** part means the parallel cores working at the counter pause for a split second to ensure they finish this step together before moving on. |
| 3 | `STORE_HBM` | Once `MMA_SYNC` finishes calculating the answer, that answer is sitting in a temporary, tiny holding zone (registers). `STORE_HBM` takes that final result and sends it all the way back to the main warehouse (HBM) so it is saved safely, freeing up the prep counter for the next task. |

**Put It All Together in a Cycle:**
- `LOAD_HBM`: Bring data from the big warehouse to the fast local desk.
- `MMA_SYNC`: Crunch the numbers on the desk instantly.
- `STORE_HBM`: Send the finished answer back to the big warehouse.

### The Anatomy of a Cycle
Each step in the timeline represents exactly one clock cycle and contains:
1. `instruction`: The low-level assembly commands (e.g., `LOAD_HBM`, `MMA_SYNC`).
2. `source` & `destination`: String identifiers that the frontend can regex-match to highlight specific visual boxes.
3. `hardware_state`: A snapshot of the physical chip at that exact nanosecond. This includes temperature, clock speeds, power draw, and memory allocations.

> By storing this data in an array, the React frontend can use a simple slider (0 to `total_cycles`) to scrub backward and forward in time, acting as a "time machine" for the GPU.

---

## Lessons 

### Lesson 1: The Data Contract & State Machine
**Concept:** High-Performance Computing Simulation.

A hardware simulator is not just a random number generator; it is a **State Machine**. It has a current state (temperatures, allocated memory, clock speed), receives an input (an instruction like `LOAD_HBM`), and calculates the next state based on physical rules.

**The Golden Rule of Simulation:**
`Current State + Instruction + Physical Rules = Next State`

To visualize this in a web browser, the backend (simulation engine) and the frontend (visualizer) must share a strict **data contract**. We represent the simulation as a `timeline` array. In hardware simulation, we don't think in milliseconds; we think in **clock cycles**.

### Lesson 2: LLM Memory & PagedAttention (The Macro View)
**Concept:** KV-Cache, Memory Fragmentation, and PagedAttention.

When an LLM generates text, it must remember everything it has said so far using a **Key-Value cache (KV-Cache)**. As the context window (the text) gets longer, the KV-Cache grows.

#### The Problem: Memory Fragmentation
Historically, GPUs tried to allocate one massive, continuous chunk of VRAM for the KV-Cache. Just like a fragmented hard drive, this results in "holes" of unusable free memory scattered between allocated blocks, eventually causing Out-of-Memory (OOM) errors even if the GPU technically has free space.

#### The Solution: PagedAttention
Modern inference engines (like vLLM) solve this by dividing the GPU's VRAM into a grid of small, fixed-size "blocks" or "pages" (e.g., 16MB each). When the LLM needs more memory, it simply grabs the next available empty block on the grid, no matter where it is physically located.

**Visualizing it:** In CoreWeaver, the macro view represents this as a 10x10 grid. As the simulation progresses, we watch blocks light up green to represent the KV-Cache growing, and fade to gray when users disconnect and memory is freed.

### Lesson 3: Silicon Die, Thermal & Power Throttling (The Physical View)
**Concept:** Compute clusters, Tensor Cores, Thermal Diffusion, and TDP.

A GPU silicon die is not a single, uniform heater. It is physically divided into **Compute Clusters** (Streaming Multiprocessors).

#### The Hotspot Phenomenon
When you run a massive matrix multiply (`MMA_SYNC`), the GPU routes that math to specific **Tensor Cores** located in the physical center of the chip. Because all that math is happening in one specific physical area, that exact spot on the silicon gets incredibly hot, creating a **hotspot**, while the edges of the chip stay relatively cool.

#### Thermal & Power Throttling
1. **Thermal Throttling:** If a specific sector's temperature crosses a physical threshold (e.g., 90-100°C), the hardware's physical safety mechanisms kick in. It artificially injects "stalls" (empty wait cycles) into the execution loop and drops the clock speed (e.g., from 1500MHz to 750MHz) to prevent the silicon from melting.
2. **Power Throttling (TDP):** Even if the chip is cool, it has a maximum power draw limit (Thermal Design Power, e.g., 300W for an A100). If the math and memory controllers draw more wattage than the TDP limit, the hardware will throttle the clock speed to stay within the power budget.

**Visualizing it:** In CoreWeaver, we track the temperature of *every single block* on the 10x10 grid (`thermal_map`) and map it to a CSS color gradient. We also track the exact Wattage draw. If either limit is breached, we visually simulate the clock speed plummeting and inject gray "NOP" (No-Operation) bubbles into the pipeline.

### Lesson 4: SIMT, SRAM, Bank Conflicts & Coalescing (The Micro View)
**Concept:** SIMT Execution, Warps, Shared Memory (SRAM), and Memory Coalescing.

GPUs use a paradigm called **SIMT** (Single Instruction, Multiple Threads). An NVIDIA GPU groups threads into **Warps** of exactly 32 threads. These 32 threads execute instructions in perfect, physical lockstep.

#### The 32-Bank SRAM Architecture
When these 32 threads need to load data from Shared Memory (SRAM), they do it all at the exact same clock cycle. To prevent a traffic jam, hardware engineers divide the SRAM into **32 physical memory banks**.

1. **The Bank Conflict:** If Thread 0 and Thread 1 try to access data in the *same* bank (even if they are asking for different addresses within that bank), the hardware physically cannot do it at once. It has to serialize the requests, taking 2 cycles (or more). This literally halves the memory bandwidth of the chip.
2. **Memory Coalescing:** This refers to how the 32 threads map to memory addresses. If Thread 0 asks for Address 1000, Thread 1 asks for 1004, Thread 2 for 1008, etc. (contiguous), the memory controller can fetch it all in **1 transaction**. If the threads ask for scattered, strided addresses (e.g., Thread 0 asks for 1000, Thread 1 asks for 2000), the memory controller must issue **32 separate transactions**, destroying performance.

**Visualizing it:** In CoreWeaver, the micro view renders the 32 physical memory banks. If the backend detects a bank conflict, the affected bank pulses neon red. We also visualize the 32 memory addresses requested by the warp; contiguous addresses glow green (1 transaction), while scattered addresses glow red (32 transactions).

### Lesson 5: Warp Divergence (The Control Flow Penalty)
**Concept:** Control Flow Graphs (CFG) and Serialized Execution.

Because threads in a warp execute in lockstep, what happens if they hit an `if/else` statement and need to take different paths? 

The hardware cannot do both at the same time. It must **serialize** the execution. It will execute the `if` block for the threads that need it (while the other 16 threads sit completely idle), and then it will execute the `else` block for the remaining threads. 

**Visualizing it:** CoreWeaver visualizes the Control Flow Graph, showing Path A and Path B executing sequentially. It explicitly calculates and displays the "Serialized Penalty"—the exact number of clock cycles wasted because half the warp was forced to sit idle.

### Lesson 6: The 5-Stage Pipeline & Hardware Bubbles
**Concept:** Instruction Pipelining and Latency Hiding.

An instruction doesn't just happen instantly; it flows through a 5-stage assembly line: **FETCH -> DECODE -> EXECUTE -> MEMORY -> WRITEBACK**.

In a perfect world, these stages overlap. But in reality, instructions have **true physical latencies**. A `FETCH` takes 4 cycles, but a `LOAD_HBM` (waiting for VRAM) takes **400 cycles**. 

When an instruction stalls (due to a bank conflict, thermal throttle, or VRAM latency), it creates a **Pipeline Bubble**—a literal gap in the assembly line where the hardware sits empty, doing nothing.

**Visualizing it:** CoreWeaver renders a Gantt chart of the 5 stages. It uses a "Hybrid Scale" so the 4-cycle FETCH stage isn't visually squished to 1% width next to the 400-cycle MEMORY stage. It displays the true mathematical cycle counts and highlights pipeline bubbles in red or gray.

### Lesson 7: The Roofline Model (The Ultimate Diagnostic)
**Concept:** Arithmetic Intensity, Memory Bound vs. Compute Bound, and the Ridge Point.

The Roofline Model is the most important diagnostic tool in High-Performance Computing. It answers the question: *"Is my code slow because it's doing too much math, or because it's waiting for data?"*

* **X-Axis (Arithmetic Intensity):** How much math (FLOPs) are we doing per byte of data loaded? 
* **Y-Axis (Performance):** How many Trillion Operations Per Second (TFLOPS) are we achieving?
* **The Roof:** The chart features a "roof" made of two lines. The diagonal line is the **Memory Ceiling** (max VRAM bandwidth). The flat line at the top is the **Compute Ceiling** (max Tensor Core TFLOPS).
* **The Ridge Point:** The exact X-coordinate where the diagonal memory line hits the flat compute ceiling. It is a physical constant of the GPU silicon.

**Visualizing it:** CoreWeaver plots the user's kernel as a glowing dot on a **Logarithmic** Roofline chart. If the dot is on the left (below the Ridge Point), the kernel is *Memory Bound*. If it's on the right (hitting the flat ceiling), it is *Compute Bound*.

### Lesson 8: Modern Execution (Async Copy & Kernel Fusion)
**Concept:** Hiding Latency and Bypassing VRAM.

Modern GPUs (like NVIDIA Hopper/Ampere) use architectural tricks to bypass the physical limits of the silicon:
1. **Asynchronous Memory Copy (TMA):** Instead of stalling the pipeline for 400 cycles while waiting for VRAM, the GPU uses a dedicated copy engine to fetch the *next* tile of data in the background *while* the Tensor Cores do math on the *current* tile. The memory latency is "hidden" behind the compute.
2. **Kernel Fusion (FlashAttention):** Standard attention calculates a matrix, writes it to slow VRAM, and reads it back. "Fused" kernels do the math and immediately use the data in SRAM, completely skipping the VRAM write/read. This physically cuts the memory traffic in half, which **doubles the Arithmetic Intensity**, shooting the kernel's Roofline dot to the right.

**Visualizing it:** CoreWeaver allows users to toggle these features. When Async Copy is on, the Pipeline Gantt shows the MEMORY stage taking 0 stall cycles. When Fusion is on, the Roofline chart visually shifts the kernel's position to the right.

### Lesson 9: Register Pressure & SM Occupancy
**Concept:** Register Files and Theoretical Occupancy.

Every thread needs registers to hold its variables. An SM (Streaming Multiprocessor) has a fixed number of registers (e.g., 65,536). 

If a kernel uses too many registers per thread, fewer threads can run simultaneously. This drops the **Occupancy**—the percentage of the SM's theoretical maximum threads that are actually active. Low occupancy means the GPU cannot hide memory latency, resulting in poor performance.

**Visualizing it:** CoreWeaver calculates the exact registers per thread based on the `BLOCK_SIZE` and displays a gauge showing the theoretical Occupancy percentage and the number of active warps.

### Lesson 10: FinOps (Translating Cycles to Cloud Dollars)
**Concept:** Cloud Billing and Wall-Clock Time.

Hardware is expensive. A kernel's performance isn't just about speed; it's about cost. 

CoreWeaver takes the **True Hardware Cycles** (not the compressed visual cycles), divides it by the GPU's base clock speed (e.g., 1.5 GHz) to get the exact **Wall-Clock Time** in seconds. It then multiplies that by the real-world cloud hourly rate (e.g., $3.50/hr for an A100) to output the exact dollar cost of the kernel, as well as the projected cost if that kernel is run 1 million times.

### Lesson 11: Hardware Performance Counters (CUPTI Emulation)
**Concept:** Bridging Visualizers to CLI Tools.

Real hardware engineers use tools like NVIDIA Nsight Compute (`ncu`), which output dense tables of Hardware Performance Counters via the CUPTI API (e.g., `sm__warps_active.avg.pct_of_peak_sustained_active`).

CoreWeaver maps its internal visual metrics (Occupancy, Memory Sectors, FLOPs) to these exact industry-standard counter names, allowing engineers to see exactly what a real CLI profiler would output, bridging the gap between visual learning and production debugging.