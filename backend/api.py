import os
import json
import uuid
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
from simulator import GPUPhysicsEngine

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
client = Groq(api_key=api_key) if api_key else None

# ==========================================
# ENTERPRISE SHARING: TTL CACHE IMPLEMENTATION
# ==========================================
# In a production environment, this would be Redis or Memcached.
# For this standalone backend, we use a dictionary with timestamp-based eviction.
share_cache = {}
SHARE_TTL_SECONDS = 3600  

def clean_expired_shares():
    current_time = time.time()
    expired_keys = [k for k, v in share_cache.items() if v['expires_at'] < current_time]
    for k in expired_keys:
        del share_cache[k]

class PromptRequest(BaseModel):
    prompt: str

class ShareRequest(BaseModel):
    params: dict

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

Example Output:
{"M": 4096, "N": 4096, "K": 4096, "BLOCK_SIZE": 128, "hardware_profile": "RTX_4090"}
"""

@app.post("/api/analyze")
async def analyze_prompt(req: PromptRequest):
    if not client:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is missing from .env file")

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": req.prompt}
            ],
            temperature=0.1,
            response_format={ "type": "json_object" }
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

@app.post("/api/compare")
async def compare_kernels(req: CompareRequest):
    try:
        engine = GPUPhysicsEngine()
        result = engine.compare_configs(req.config_a, req.config_b)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# NEW: SHARING ENDPOINTS
# ==========================================

@app.post("/api/share")
async def create_share_link(req: ShareRequest):
    clean_expired_shares()
    
    # Generate a 12-character hex ID (48 bits of entropy)
    share_id = uuid.uuid4().hex[:12] 
    
    share_cache[share_id] = {
        "params": req.params,
        "expires_at": time.time() + SHARE_TTL_SECONDS
    }
    
    return {
        "share_id": share_id, 
        "ttl_seconds": SHARE_TTL_SECONDS,
        "expires_at": time.time() + SHARE_TTL_SECONDS
    }

@app.get("/api/share/{share_id}")
async def get_share_link(share_id: str):
    clean_expired_shares()
    
    if share_id not in share_cache:
        raise HTTPException(status_code=404, detail="Link expired or not found.")
        
    return {"params": share_cache[share_id]["params"]}

class CompareRequest(BaseModel):
    config_a: dict
    config_b: dict
class OptimizeRequest(BaseModel):
    simulation_summary: dict

OPTIMIZATION_PROMPT = """
You are a Principal GPU Engineer reviewing a kernel simulation report. 
Based on the provided telemetry summary, identify the primary bottleneck and provide exactly 3 actionable, highly technical optimization suggestions. 
Focus on Triton/CUDA concepts like BLOCK_SIZE, memory coalescing, warp divergence, or kernel fusion.
Keep the response concise, professional, and formatted as a bulleted list. Do not use emojis.
"""

@app.post("/api/optimize")
async def optimize_kernel(req: OptimizeRequest):
    if not client:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is missing.")

    try:
        summary_text = json.dumps(req.simulation_summary, indent=2)
        
        response = client.chat.completions.create(
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
    uvicorn.run(app, host="0.0.0.0", port=8000)