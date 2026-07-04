import asyncio
import json
import websockets
from simulator import GPUSimulator

async def simulation_broadcast(websocket):
    print("🔌 Frontend connected! Starting live simulation stream...")
    
    gpu = GPUSimulator()
    
    MOCK_TOKENS = ["The", " future", " of", " AI", " is", " highly", " parallel", " and", " extremely", " fast", "."]

    # The "Compiled" program now includes the tokens!
    mock_compiled_program = [
        ("LOAD_HBM", "Loading Matrix A into Shared Memory", 4, MOCK_TOKENS[0]),
        ("LOAD_HBM", "CRITICAL: Thread 0 and Thread 1 colliding on Bank 12!", 5, MOCK_TOKENS[1]),
        ("MMA_SYNC", "Tensor Cores executing Matrix Multiply-Accumulate", 8, MOCK_TOKENS[2]),
        ("STALL_THERMAL", "WARNING: Temperature exceeded 95C. Throttling clock speed.", 8, MOCK_TOKENS[3]),
        ("STORE_HBM", "Writing final result matrix back to main storage", 11, MOCK_TOKENS[4])
    ]



    try:
        while True:
            for instruction, description, source_line, token in mock_compiled_program:
                gpu.tick(instruction, description, source_line, token)

                latest_cycle = gpu.timeline[-1]
                
                await websocket.send(json.dumps(latest_cycle))
                print(f" Sent Cycle {latest_cycle['cycle']} to frontend")
                
                await asyncio.sleep(1.5) 
                
            gpu = GPUSimulator()
            print("Simulation loop restarting...\n")

    except websockets.exceptions.ConnectionClosed:
        print("Frontend disconnected.")

async def main():
    print("CoreWeaver WebSocket Server starting on ws://localhost:8765")
    async with websockets.serve(simulation_broadcast, "localhost", 8765):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())