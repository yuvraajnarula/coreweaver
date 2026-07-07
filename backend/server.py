import asyncio
import json
import websockets
from simulator import GPUPhysicsEngine

async def simulation_handler(websocket):
    print("Frontend connected. Waiting for simulation parameters...")
    engine = GPUPhysicsEngine()
    
    try:
        while True:
            message = await websocket.recv()
            data = json.loads(message)
            
            if data.get('type') == 'CONFIG':
                params = data['params']

                custom_arch = data.get('custom_arch') 
                
                print(f"Received Config: {params}")
                if custom_arch:
                    print(f"Using Custom Architecture: {custom_arch.get('name', 'Unknown')}")
                
                
                result = await asyncio.to_thread(engine.generate_timeline, params, custom_arch)
                
                await websocket.send(json.dumps({"type": "METADATA", "data": result['metadata']}))
                
                if 'memory_breakdown' in result:
                    await websocket.send(json.dumps({"type": "BREAKDOWN", "data": result['memory_breakdown']}))
                
                if result['metadata']['status'] in ['SUCCESS', 'SUCCESS_WITH_THROTTLE']:
                    if 'roofline_metrics' in result:
                        await websocket.send(json.dumps({"type": "ROOFLINE", "data": result['roofline_metrics']}))
                    
                    if 'finops_metrics' in result:
                        await websocket.send(json.dumps({"type": "FINOPS", "data": result['finops_metrics']}))
                        
                    total_cycles = len(result['timeline'])
                    target_duration_sec = 8.0 
                    delay = target_duration_sec / total_cycles if total_cycles > 0 else 0.1
                    delay = max(0.02, min(delay, 0.5)) 
                    
                    for cycle_data in result['timeline']:
                        await websocket.send(json.dumps({"type": "CYCLE", "data": cycle_data}))
                        await asyncio.sleep(delay)
                        
                    print("Simulation complete.\n")
                else:
                    print(f"Simulation halted: {result['metadata']['status']}\n")

    except websockets.exceptions.ConnectionClosed:
        print("Frontend disconnected.")

async def main():
    print("CoreWeaver Physics Engine starting on ws://localhost:8765")
    async with websockets.serve(simulation_handler, "localhost", 8765, max_size=10*1024*1024):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())