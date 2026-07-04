import asyncio
import json
import websockets
from simulator import GPUPhysicsEngine

async def simulation_handler(websocket):
    print("Frontend connected! Waiting for simulation parameters...")
    engine = GPUPhysicsEngine()
    
    try:
        while True:
            message = await websocket.recv()
            data = json.loads(message)
            
            if data.get('type') == 'CONFIG':
                params = data['params']
                print(f"Received Config: {params}")
                
                # 1. Generate the result (which might be an OOM/Config error!)
                result = engine.generate_timeline(params)
                
                # 2. Send METADATA first
                await websocket.send(json.dumps({"type": "METADATA", "data": result['metadata']}))
                
                # 3. Send MEMORY BREAKDOWN (Useful for both Success and OOM)
                if 'memory_breakdown' in result:
                    await websocket.send(json.dumps({"type": "BREAKDOWN", "data": result['memory_breakdown']}))
                
                # 4. Stream the timeline ONLY if it's a success
                if result['metadata']['status'] in ['SUCCESS', 'SUCCESS_WITH_THROTTLE']:
                    # Send ROOFLINE METRICS before the cycles start
                    if 'roofline_metrics' in result:
                        await websocket.send(json.dumps({"type": "ROOFLINE", "data": result['roofline_metrics']}))
                        
                    for cycle_data in result['timeline']:
                        await websocket.send(json.dumps({"type": "CYCLE", "data": cycle_data}))
                        await asyncio.sleep(0.8) 
                    print("Simulation complete.\n")
                else:
                    print(f" Simulation halted: {result['metadata']['status']}\n")

    except websockets.exceptions.ConnectionClosed:
        print("Frontend disconnected.")

async def main():
    print("CoreWeaver Physics Engine starting on ws://localhost:8765")
    async with websockets.serve(simulation_handler, "localhost", 8765):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())