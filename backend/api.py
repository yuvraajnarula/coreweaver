import os
import json
import uuid
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import AsyncGroq
from dotenv import load_dotenv
from simulator import GPUPhysicsEngine
import redis.asyncio as redis

load_dotenv()

app = FastAPI(title="CoreWeaver AI Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("GROQ_API_KEY")
client = AsyncGroq(api_key=api_key) if api_key else None

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

SHARE_TTL_SECONDS = 3600  # 1 Hour
ARCH_TTL_SECONDS = 30 * 24 * 3600  # 30 Days for Custom Architectures

class PromptRequest(BaseModel):
    prompt: str

class ShareRequest(BaseModel):
    params: dict

class CompareRequest(BaseModel):
    config_a: dict
    config_b: dict
    custom_arch_a: dict | None = None  # 🚀 NEW
    custom_arch_b: dict | None = None  # 🚀 NEW

class OptimizeRequest(BaseModel):
    simulation_summary: dict

# ==========================================
# AI PROMPTS
# ==========================================
SYSTEM_PROMPT = """
You are an expert AI Hardware Compiler for the CoreWeaver GPU Simulator. 
The user will describe an AI workload in plain English. 
Your job is to translate their description into exact hardware simulation parameters.

You must extract or calculate the following parameters:
1. M, N, K: The matrix dimensions. If they just give a single number like "16k matrix", set M, N, and K to that number.
2. BLOCK_SIZE: The Triton block size. Must be a multiple of 32 (e.g., 64, 128, 256). Default to 128 if unsure.
3. hardware_profile: The GPU they are using. Must be one of: "A100_80GB", "RTX_4090", "RTX_3090", "T4_16GB". Default to "A100_80GB" if unsure.

CRITICAL RULES:
- BLOCK_SIZE MUST be a multiple of 32 and <= 1024.
- M, N, K MUST be > 0.
- Return ONLY valid JSON. No markdown, no explanations, no code blocks.
"""

OPTIMIZATION_PROMPT = """
You are a Principal GPU Engineer reviewing a kernel simulation report. 
Based on the provided telemetry summary, identify the primary bottleneck and provide exactly 3 actionable, highly technical optimization suggestions. 
Focus on Triton/CUDA concepts like BLOCK_SIZE, memory coalescing, warp divergence, or kernel fusion.
Keep the response concise, professional, and formatted as a bulleted list. Do not use emojis.
"""

# ==========================================
# ENDPOINTS
# ==========================================

@app.post("/api/analyze")
async def analyze_prompt(req: PromptRequest):
    if not client:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is missing from .env file")

    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": req.prompt}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        params = json.loads(content)
        
        required_keys = ["M", "N", "K", "BLOCK_SIZE", "hardware_profile"]
        for key in required_keys:
            if key not in params:
                raise ValueError(f"AI failed to extract required key: {key}")
                
        return {"status": "success", "params": params}
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON format.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 🚀 NEW: ARCHITECTURE PERSISTENCE
@app.post("/api/architectures/save")
async def save_architecture(payload: dict):
    arch_id = uuid.uuid4().hex[:12]
    await redis_client.setex(
        f"arch:{arch_id}",
        ARCH_TTL_SECONDS,
        json.dumps(payload)
    )
    return {"arch_id": arch_id, "status": "saved", "ttl_seconds": ARCH_TTL_SECONDS}

@app.get("/api/architectures/{arch_id}")
async def get_architecture(arch_id: str):
    val = await redis_client.get(f"arch:{arch_id}")
    if not val:
        raise HTTPException(status_code=404, detail="Architecture not found or expired.")
    return json.loads(val)

@app.post("/api/compare")
async def compare_kernels(req: CompareRequest):
    try:
        engine = GPUPhysicsEngine()
        # 🚀 Pass custom architectures to the engine
        result = await asyncio.to_thread(
            engine.compare_configs, 
            req.config_a, req.config_b, 
            req.custom_arch_a, req.custom_arch_b
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/share")
async def create_share_link(req: ShareRequest):
    share_id = uuid.uuid4().hex[:12] 
    await redis_client.setex(f"share:{share_id}", SHARE_TTL_SECONDS, json.dumps(req.params))
    return {"share_id": share_id, "ttl_seconds": SHARE_TTL_SECONDS}

@app.get("/api/share/{share_id}")
async def get_share_link(share_id: str):
    val = await redis_client.get(f"share:{share_id}")
    if not val:
        raise HTTPException(status_code=404, detail="Link expired or not found.")
    return {"params": json.loads(val)}

@app.post("/api/optimize")
async def optimize_kernel(req: OptimizeRequest):
    if not client:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is missing.")

    try:
        summary_text = json.dumps(req.simulation_summary, indent=2)
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": OPTIMIZATION_PROMPT},
                {"role": "user", "content": f"Simulation Telemetry:\n{summary_text}\n\nProvide optimization suggestions:"}
            ],
            temperature=0.3,
        )
        suggestions = response.choices[0].message.content
        return {"status": "success", "suggestions": suggestions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("CoreWeaver AI Agent starting on http://localhost:8000")
    uvicorn.run("api:app", host="0.0.0.0", port=8000, workers=4)