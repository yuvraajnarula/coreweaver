# CoreWeaver: Enterprise GPU Architecture Simulator

CoreWeaver is a full-stack, mathematically rigorous, AI-driven GPU architecture simulator. It bridges the critical gap between high-level LLM software (Prompts, Triton/CUDA code) and low-level silicon physics (SIMT threads, SRAM, Thermal Throttling, Pipeline Hazards). 

Instead of relying on naive visual animations, CoreWeaver calculates the true physical cost of AI workloads, enforcing the actual physical limits of silicon to provide an uncompromising, educational, and diagnostic hardware profiling experience.

**Live Demo:** [Insert Vercel Link Here]

---

## What is the project about?

Modern AI engineers write PyTorch or Triton code, but the GPU executes clock cycles, memory transactions, and thermal loads. CoreWeaver translates abstract AI workloads into visceral, cycle-by-cycle hardware telemetry. It serves as a sandbox for AI researchers to understand hardware bottlenecks, and as a diagnostic tool for systems engineers to optimize kernel performance before deploying to expensive cloud infrastructure.

### Core Capabilities

**1. Core Physics & Strict Validation**
* **Strict Roofline Model:** Plots Arithmetic Intensity (FLOP/Byte) vs Performance (GFLOP/s) using strict, unit-aligned HPC math with logarithmic scaling to identify Memory vs. Compute bottlenecks.
* **Strict Validation Bouncer:** Rejects impossible configurations (OOM errors, SRAM overflows, invalid warp sizes) with realistic CUDA crash logs.
* **Bounded Thermodynamics:** Simulates hotspot generation, ambient diffusion, and hardware-level thermal throttling capped at realistic silicon limits.

**2. Deep Microarchitecture**
* **5-Stage Pipeline Gantt:** Models the instruction pipeline with true silicon latencies (e.g., 400 cycles for VRAM fetch) and injects dynamic NOP bubbles for thermal throttling.
* **Power Draw & TDP Throttling:** Tracks wattage independently of temperature, triggering power throttling when the silicon hits its Thermal Design Power limit.
* **Register Pressure & Occupancy:** Calculates theoretical SM occupancy based on register file limits and active warps.
* **Memory Coalescing Visualizer:** Shows the exact memory addresses requested by a 32-thread warp, highlighting the transaction penalty for scattered/strided access.
* **Warp Divergence & CFG:** Visualizes the control flow graph and calculates the exact cycles wasted when threads in a warp take divergent `if/else` branches.

**3. Modern Execution Models**
* **Asynchronous Memory Copy (TMA):** Simulates Tensor Memory Accelerators overlapping memory loads with Tensor Core compute to hide latency.
* **Kernel Fusion (FlashAttention):** Mathematically demonstrates how fused kernels bypass VRAM writes, physically shifting the workload on the Roofline chart.

**4. Enterprise UX & FinOps**
* **FinOps Cloud Cost Estimator:** Calculates exact wall-clock time from true cycle counts and multiplies it by real-world cloud GPU hourly rates to output the exact dollar cost of the kernel.
* **A/B Kernel Comparison:** Runs the physics engine twice to automatically benchmark two configurations and generate a split-screen delta report.
* **Telemetry Data Export:** Downloads the raw, cycle-by-cycle JSON trace for offline analysis in Python/Pandas.
* **Enterprise Shareable Links:** Generates secure, 12-character Hex ID URLs with a 1-hour backend TTL cache, ensuring clean URLs and automatic state expiration.

**5. AI & Automation**
* **AI Hardware Compiler:** Uses Groq's LPU to translate natural language prompts into exact hardware parameters in under 100ms.
* **Automated Root-Cause Agent:** Analyzes the telemetry of a slow run and suggests exact Triton/CUDA code fixes.
* **CUPTI Counter Emulation:** Outputs a dense, industry-standard table of hardware counters, bridging the gap between the visualizer and real CLI tools like NVIDIA Nsight Compute.

---

## Architecture

CoreWeaver utilizes a decoupled, event-driven architecture to simulate real-world hardware telemetry.

### 1. The Physics Engine (Python Backend)
* **`simulator.py`**: The core computational engine. It accepts hardware parameters, validates them against physical laws, calculates true FLOPs/Bytes, and generates a compressed timeline of cycle-by-cycle telemetry.
* **`server.py` (WebSockets)**: Streams the generated telemetry to the frontend in real-time, simulating a live hardware probe.
* **`api_server.py` (FastAPI)**: Handles REST requests for the AI Compiler, A/B Comparison, AI Optimization, and the TTL-based Share Link cache.

### 2. The Visualizer (React Frontend)
* **State Management**: Uses **Zustand** to handle high-frequency state updates from the WebSocket stream without causing React re-render bottlenecks.
* **Data Flow**: 
  `User Input / AI Prompt` -> `FastAPI (Extract/Compare)` -> `Physics Engine (Calculate)` -> `WebSocket (Stream)` -> `Zustand Store` -> `React UI (Render)`.
* **Visualizations**: Custom CSS Grids for the Die/SRAM maps, and **Recharts** (with custom logarithmic scaling) for the Roofline model.

### 3. The AI Layer (Groq LPU)
* Integrates with Groq's inference engine (Llama 3.3 70B) to parse natural language into strict JSON hardware configurations in milliseconds, making the AI integration feel instantaneous and native to the debugging flow.

---

## Instructions

### Prerequisites
* Node.js (v18+)
* Python (v3.9+)
* A free Groq API Key (from [console.groq.com](https://console.groq.com/))

### Local Development Setup

**1. Backend Setup**
```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

pip install -r requirements.txt

# Create a .env file and add your Groq key
echo "GROQ_API_KEY=your_groq_api_key_here" > .env

# Start the Physics Engine (WebSocket on port 8765)
python server.py

# In a NEW terminal, start the AI API (REST on port 8000)
uvicorn api_server:app --host 0.0.0.0 --port 8000
```

**2. Frontend Setup**
```bash
cd frontend
npm install

# (Optional) Point to a deployed backend by creating a .env file:
# echo "VITE_API_URL=https://your-backend-url.com" > .env
# echo "VITE_WS_URL=wss://your-backend-url.com" >> .env

npm run dev
```
Open your browser to `http://localhost:5173`.

### Docker Deployment (Backend)
```bash
cd backend
docker build -t coreweaver-backend .
docker run -p 8000:8000 -p 8765:8765 --env-file .env coreweaver-backend
```

---

## Engineering Decisions

### Why mock the hardware instead of hooking into real CUDA/Nsight?
**Portability and Education.** Real profilers require physical silicon and complex driver hooks. By building a deterministic physics engine, CoreWeaver can run in any browser, simulate future or hypothetical hardware, and visually explain *why* the hardware behaves the way it does, without requiring the user to own a $10,000 GPU.

### Why use strict, unit-aligned math for the Roofline Model?
**Engineering Integrity.** Many educational tools use arbitrary scaling factors to make charts "look nice." CoreWeaver refuses to do this. We use strict `GFLOP/s` vs `FLOP/Byte` math. This ensures the "Ridge Point" (the transition from Memory Bound to Compute Bound) is a physical constant of the selected GPU, not a visual hack.

### Why implement a "Validation Bouncer" for inputs?
**Realism.** A naive simulator would happily animate a `BLOCK_SIZE` of 5000. In reality, the CUDA driver would instantly reject it because it violates the 1024 thread/block hardware limit. CoreWeaver intercepts these invalid parameters and throws realistic `CUDA Config Error` or `OOM` crash logs, teaching users the actual physical constraints of the silicon.

### Why use WebSockets instead of REST for the simulation?
**Telemetry Simulation.** Real hardware profilers do not wait for a simulation to finish; they stream telemetry (temperatures, IPC, memory) cycle-by-cycle. WebSockets allow the React frontend to animate the die and pipeline in real-time as the Python backend calculates the physics, perfectly mimicking a live hardware probe.

### Why use Groq for the AI Compiler?
**Latency.** When an engineer is debugging a kernel, they do not want to wait 3 seconds for an LLM to parse their prompt. Groq's LPU architecture processes the natural language extraction in milliseconds, making the AI integration feel instantaneous and native to the debugging flow.

### Why use a "Hybrid Scale" for the Pipeline Gantt Chart?
**Visibility.** A true `FETCH` stage takes 4 cycles, while a `VRAM LOAD` takes 400 cycles. On a strictly linear scale, the `FETCH` stage would be 1% of the width and invisible. We use a hybrid scale that enforces a minimum visual width so the user can see all stages, while displaying the *true mathematical cycle counts* in the labels.

### Why use TTL-based Hex IDs for Shareable Links?
**Security and Cleanliness.** Exposing raw parameters in the URL (e.g., `?m=1024&n=1024...`) creates ugly, easily tampered links. CoreWeaver generates a 12-character Hex ID, stores the state in a backend cache with a 1-hour Time-To-Live (TTL), and serves a clean URL. This mirrors enterprise SaaS state-sharing patterns.

---

## Testing

The Python physics engine includes a comprehensive `pytest` suite to ensure deterministic behavior of the validation bouncer, OOM guards, FinOps calculations, and CUPTI counter mappings.

```bash
cd backend
pytest test_simulator.py -v
```

---

## Tech Stack

* **Frontend:** React, TypeScript, Vite, Zustand, Recharts
* **Backend:** Python, FastAPI, WebSockets, Uvicorn
* **AI:** Groq API (Llama 3.3 70B Versatile)
* **Infrastructure:** Docker, GitHub Actions (Mock CI/CD)