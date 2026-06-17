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