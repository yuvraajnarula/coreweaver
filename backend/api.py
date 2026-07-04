import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from simulator import GPUPhysicsEngine
from groq import Groq 
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="CoreWeaver AI Agent")

# Allow React frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq Client
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    print(" WARNING: GROQ_API_KEY not found in .env file!")

client = Groq(api_key=api_key)

class PromptRequest(BaseModel):
    prompt: str

SYSTEM_PROMPT = """
You are an expert AI Hardware Compiler for the CoreWeaver GPU Simulator. 
The user will describe an AI workload in plain English. 
Your job is to translate their description into exact hardware simulation parameters.

You must extract or calculate the following parameters:
1. M, N, K: The matrix dimensions. (e.g., For an attention head, M is batch*heads, K is hidden_dim, N is seq_len). If they just give a single number like "16k matrix", set M, N, and K to that number.
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
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is missing from .env file")

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": req.prompt}
            ],
            temperature=0.1, # Low temperature for strict JSON output
            response_format={ "type": "json_object" }
        )
        
        content = response.choices[0].message.content
        params = json.loads(content)
        
        required_keys = ["M", "N", "K", "BLOCK_SIZE", "hardware_profile"]
        for key in required_keys:
            if key not in params:
                raise ValueError(f"AI failed to extract required key: {key}")
                
        print(f"AI extracted params: {params}")
        return {"status": "success", "params": params}
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON format.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
class CompareRequest(BaseModel):
    config_a: dict
    config_b: dict

@app.post("/api/compare")
async def compare_kernels(req: CompareRequest):
    try:
        engine = GPUPhysicsEngine()
        result = engine.compare_configs(req.config_a, req.config_b)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
if __name__ == "__main__":
    import uvicorn
    print("CoreWeaver AI Agent (Powered by Groq) starting on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)