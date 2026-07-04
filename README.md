# CoreWeaver: LLM Kernel Odyssey Sandbox

**CoreWeaver** is a full-stack, mathematically rigorous, AI-driven GPU architecture simulator. It bridges the critical gap between high-level LLM software (Prompts, Triton/CUDA code) and low-level silicon physics (SIMT threads, SRAM, Thermal Throttling, Pipeline Hazards). 

Instead of just animating data, CoreWeaver calculates the *true physical cost* of AI workloads, enforcing the actual physical limits of silicon to provide an uncompromising, educational, and diagnostic hardware profiling experience.

---

## What is the project about?

Modern AI engineers write PyTorch/Triton code, but the GPU executes clock cycles, memory transactions, and thermal loads. CoreWeaver translates abstract AI workloads into visceral, cycle-by-cycle hardware telemetry.

**Key Capabilities:**
* **Macro VRAM & PagedAttention:** Visualizes KV-Cache growth and memory fragmentation on a physical die floorplan.
* **Strict Roofline Model:** Plots Arithmetic Intensity (FLOP/Byte) vs Performance (GFLOP/s) using strict, unit-aligned HPC math to identify Memory vs. Compute bottlenecks.
* **Micro SRAM & Bank Conflicts:** Zooms into the 32-bank Shared Memory architecture to visualize SIMT warp serialization and pipeline stalls.
* **Instruction Pipeline Gantt:** Models the 5-stage pipeline with true silicon latencies (e.g., 400 cycles for VRAM fetch) and injects dynamic NOP bubbles for thermal throttling.
* **Bounded Thermodynamics:** Simulates hotspot generation, ambient diffusion, and hardware-level thermal throttling capped at realistic silicon limits.
* **AI Hardware Compiler:** Uses Groq's ultra-fast LPU to translate natural language prompts (e.g., *"Run Llama-3 attention on an RTX 4090"*) into exact hardware parameters.
* **A/B Kernel Comparison:** Runs the physics engine twice to automatically benchmark two configurations and generate a split-screen delta report.
* **Strict Validation Bouncer:** Rejects impossible configurations (OOM errors, SRAM overflows, invalid warp sizes) with realistic CUDA crash logs.

---

## Architecture

CoreWeaver utilizes a decoupled, event-driven architecture to simulate real-world hardware telemetry.

### 1. The Physics Engine (Python Backend)
* **`simulator.py`**: The core computational engine. It accepts hardware parameters, validates them against physical laws (Warp limits, SRAM capacity, VRAM limits), calculates true FLOPs/Bytes, and generates a compressed timeline of cycle-by-cycle telemetry.
* **`server.py` (WebSocket)**: Streams the generated telemetry to the frontend in real-time, simulating a live hardware probe.
* **`api_server.py` (FastAPI)**: Handles REST requests for the AI Compiler and A/B Comparison endpoints.

### 2. The Visualizer (React Frontend)
* **State Management**: Uses **Zustand** to handle high-frequency state updates from the WebSocket stream without causing React re-render bottlenecks.
* **Data Flow**: 
  `User Input / AI Prompt` ➔ `FastAPI (Extract/Compare)` ➔ `Physics Engine (Calculate)` ➔ `WebSocket (Stream)` ➔ `Zustand Store` ➔ `React UI (Render)`.
* **Visualizations**: Custom CSS Grids for the Die/SRAM maps, and **Recharts** (with custom logarithmic scaling) for the Roofline model.

### 3. The AI Layer (Groq LPU)
* Integrates with Groq's inference engine to parse natural language into strict JSON hardware configurations in <100ms, allowing the AI to feel like a native IDE feature rather than a slow chatbot.

---

## Instructions

### Prerequisites
* Node.js (v18+)
* Python (v3.9+)
* A free Groq API Key (from [console.groq.com](https://console.groq.com/))

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

pip install fastapi uvicorn websockets groq python-dotenv

# Create a .env file and add your Groq key
echo "GROQ_API_KEY=your_groq_api_key_here" > .env

# Start the Physics Engine (WebSocket on port 8765)
python server.py

# In a NEW terminal, start the AI API (REST on port 8000)
python api_server.py
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open your browser to `http://localhost:5173`.

---

## Decisions

### Why mock the hardware instead of hooking into real CUDA/Nsight?
**Portability & Education.** Real profilers require physical silicon and complex driver hooks. By building a deterministic physics engine, CoreWeaver can run in any browser, simulate future/hypothetical hardware, and visually explain *why* the hardware behaves the way it does, without requiring the user to own a $10,000 GPU.

### Why use strict, unit-aligned math for the Roofline Model?
**Engineering Integrity.** Many educational tools use arbitrary scaling factors to make charts "look nice." CoreWeaver refuses to do this. We use strict `GFLOP/s` vs `FLOP/Byte` math. This ensures the "Ridge Point" (the transition from Memory Bound to Compute Bound) is a physical constant of the selected GPU, not a visual hack.

### Why implement a "Validation Bouncer" for inputs?
**Realism.** A naive simulator would happily animate a `BLOCK_SIZE` of 5000. In reality, the CUDA driver would instantly reject it because it violates the 1024 thread/block hardware limit. CoreWeaver intercepts these invalid parameters and throws realistic `CUDA Config Error` or `OOM` crash logs, teaching users the actual physical constraints of the silicon.

### Why use WebSockets instead of REST for the simulation?
**Telemetry Simulation.** Real hardware profilers don't wait for a simulation to finish; they stream telemetry (temperatures, IPC, memory) cycle-by-cycle. WebSockets allow the React frontend to animate the die and pipeline in real-time as the Python backend calculates the physics, perfectly mimicking a live hardware probe.

### Why use Groq for the AI Compiler?
**Latency.** When an engineer is debugging a kernel, they don't want to wait 3 seconds for an LLM to parse their prompt. Groq's LPU architecture processes the natural language extraction in milliseconds, making the AI integration feel instantaneous and native to the debugging flow.

### Why use a "Hybrid Scale" for the Pipeline Gantt Chart?
**Visibility.** A true `FETCH` stage takes 4 cycles, while a `VRAM LOAD` takes 400 cycles. On a strictly linear scale, the `FETCH` stage would be 1% of the width and invisible. We use a hybrid scale that enforces a minimum visual width so the user can see all stages, while displaying the *true mathematical cycle counts* in the labels.
