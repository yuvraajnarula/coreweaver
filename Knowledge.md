# Theory
## What are cycles?
In a GPU, a cycle is is the fundamental **heartbeat** of the hardware. It is a single tick of the GPU's internal clock, measuring how fast can do it's work.
| S No | Instruction | Purpose |
|---|---|---|
| 1 |LOAD_HBM| HBM (High Bandwidth memory ) is the gpu's main warehouse. It holds massive amounts of data but it is physicall located far from actual processing processors. This tells the GPU to go to the HBM, grab a specific batch of data like a matrix of numbers, and bring it right onto SRAM/Shared Memory so it can be used immediately. |
| 2 | MMA_SYNC | MMA aka Matrix Multiply Accumulate, this is the core mathematical operation behind all AI and LLMs. It tells the GPUs AI cores - Tensor cores to grab the data blocks currently sitting on the prep counter, multiply them together, and add them to a running total at a rapid speed. The **_SYNC** part means the parallel core working at the counter pause for a split second to make sure they finish this step together before moving on. 
| 3 | STORE_HBM | Once MMA_SYNC finishes calculating the answer, that answer is sitting in a temporary, tiny holding zone (registers). STORE_HBM takes that final result and sends it all the way back to the main warehouse (HBM) so it is saved safely and frees up the prep counter for the next task. | 

Put It All Together in a Cycle:
- LOAD_HBM: Bring data from the big warehouse to the fast local desk.
- MMA_SYNC: Crunch the numbers on the desk instantly.
- STORE_HBM: Send the finished answer back to the big warehouse.


### The Anatomy of a cycle
Each step in timeline represents exactly one clock cycle and contains:
1. `instruction` : the low level assembly commands (eg: `LOAD_HBM`, `MMA_SYNC`, etc. as stated above in the table).
2. `source` & `destination`: string identifiers that the front can regex match to highlight speciific visual boxes.
3. `hardware_state` : A snapshot of the physical chip at the exact nanosecond. This includes temperature, clock speeds, and memory allocations.

>> By storing this data in an array, the React frontend can use a simple slider(0 to `total_cycles`) to scrub backward and forward in time, acting as a "time machine" for the GPU.

## Lessons 

### Lesson 1 : The Data contract (cycle-by-cycle simulation)

**concept :** High Performance Computing Simulation.

In hardware simulatiom, we don't think in ms, we think in **clock cycles**. Every clock cycle, the GPU does something: it moves data, computes math, or waits.

To visualize this in a web browser, the backend(simulation engine) and the frontend (visualizer) must share a strict **data contract**. We represent the simulation as `timeline array`.

### Lesson 2 : LLM Memory & PagedAttention (the macro view)

**concept :** KV-Cache, Memory Fragmentation, and PagedAttention.

When an LLM generates text, it must remember everything, it has said so far. It does this using a **Key-Value cache (kv-cache)**. As the context window, (the text) gets longer, the KV cache grows.

#### the problem : memory fragmentation

Historically, GPUs tried to allocate one massive, continous chunk of VRAM for the kv-cache. Just like a fragemnted hard drive, this results in `holes` of unusable free memory scattered between allocated blocks, eventually causing Out-of-Memory (OOM) errors even if the GPU technically has free space.

#### the solution: PagedAttention

Modern inference engines like (vLLM) solve this by dividing the GPU's VRAM into a grid of small, fixed-size "blocks" or "pages" (eg: 16MB each).

1. When the LLM needs more memory, it simply grabs the next available empty block on the grid, no matter where it is physically located.
2. **visualizing it**: In coreweaver, the macroview represents this as a 10x10 grid. As the simulation progresses, we watch blocks light up green to represent the KV-Cache growing, and fade to gray when users disconnect and memory is freed.

### Lesson 3 : Silicon Die FloorPlans & Thermal throttling (the physical view)

**concept :** compute cluters, tensor cores, and thermal diffusion.

A  GPU silicon die is not a single, uniform heater. It is physically divided into **Compute Clusters** (Streaming Multiprocessors).

#### The hotspot phenomenon 
When you run a massive matrix multipy (`MMA_SYNC`), the GPU routes that math to specific **tensor cores** located in the physical center of the chip. Because all that math is happening in one specific physical area, that exact spot on silicon gets incredibly hot, creating a **hotspot**, while the edges of the chip stay relatively cool.


#### Thermal Throttling
1. If a specific sector's temperature crosses a physical threshold (e.g.90-100 deg celsius), the hardware's physical safety mechaims kick in. It artificially injects "stalls" (empty wait cycles) into the execution loop and drops the clock speed (eg: from 1500MHz to 750MHz) to prevent a silicon from melting.

2. **visualizing it :** In coreweaver, we track the temperature of *every single block* on the 10x10 grid (`thermal_map`).  We map these temperatures to a CSS color gradient (Blue = Cool, Red = Critical). During an `MMA_SYNC` instruction, the exact center blocks glow bright red, and in the next cycle, we visually simulate the clock speed plummeting as the chip throttles.

### Lesson 4 : SIMT Architecture & SRAM Bank Conflicts (The Micro View)

**concept:** SIMT Execution, Warps, Shared Memory (SRAM), and Coalescing.

To understand the micro view, you have to understand how a GPU actually executes code. GPUs use a paradim called **SIMT** (Single Instruction, Multiple Threads).

#### Warps and Lockstep Execution
An NVIDIA GPU groups threds into **Warps** of exactly 32 threads. These 32 threads execute instructions in perfect, physical lockstep. If thread 0 needs to do math, Thread 1 through 31 are doing the exact same math at the exact same time.

#### The 32-Bank SRAM architecture
When these 32 threads need to load data from Shared Memory (SRAM) into their registers, they do it all at the exact same clock cycle.
1. **Perfect Coalescing (The golden rule):** If all 32 threads need to load data from Shared Memory (SRAM) into their registers, they do it all at the exact clock cycle. To prevent a traffic jam, hardware engineers divide the SRAM into **32 physical memory banks**.

2. **The Bank Conflict:** If thread 0 and thread 1 try to access data in the *same* banm (even if they are asking ofr different addresses within that bank),  the hardware physically cannot do it at once. It has to serialize the requests, taking **2 cycles** (or more).

#### The Performance Penalty
1. A bank conflict literally halves (or worse) the memory bandwidth of the chip. It is one of the most common reasons CUDA/Triton kernels run slowly.
2. **Visualising :** In coreweaver, the microview renders the 32 physical memory banks. When a `LOAD_HBM` instruction happens, we light up the specific bank being accessed. If the backend detects that 2 threads mapped to the same bank in the same cycle, it affected bank literally pulses neon red, visualizng the hardware pipeline stall.