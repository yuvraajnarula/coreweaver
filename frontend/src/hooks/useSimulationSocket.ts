import { useEffect, useRef } from 'react';
import { 
  useSimulationStore, 
  type CycleData, 
  type SimulationMetadata, 
  type MemoryBreakdown,
  type RooflineMetrics,
  type OccupancyMetrics,
  type FinOpsMetrics 
} from '../store';

export function useSimulationSocket() {
  const { 
    addCycleToTimeline, 
    setCurrentCycleIndex, 
    clearTimeline, 
    clearComparisonResult, 
    setMetadata, 
    setMemoryBreakdown,
    setRooflineMetrics,
    setOccupancyMetrics,
    setFinOpsMetrics
  } = useSimulationStore();
  
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8765');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[CoreWeaver] Connected to Physics Engine (ws://localhost:8765)');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        switch (msg.type) {
          case 'METADATA':
            setMetadata(msg.data as SimulationMetadata);
            if (msg.data.occupancy_metrics) {
              setOccupancyMetrics(msg.data.occupancy_metrics);
            }
            break;
          case 'BREAKDOWN':
            setMemoryBreakdown(msg.data as MemoryBreakdown);
            break;
          case 'ROOFLINE':
            setRooflineMetrics(msg.data as RooflineMetrics);
            break;
          case 'FINOPS':
            setFinOpsMetrics(msg.data as FinOpsMetrics);
            break;
          case 'CYCLE': {
            addCycleToTimeline(msg.data as CycleData);
            const currentLength = useSimulationStore.getState().timeline.length;
            setCurrentCycleIndex(currentLength - 1);
            break;
          }
          default:
            console.warn('[CoreWeaver] Unknown message type:', msg.type);
        }
      } catch (error) {
        console.error('[CoreWeaver] Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('[CoreWeaver] Disconnected from Physics Engine.');
    };

    ws.onerror = (err) => {
      console.error('[CoreWeaver] WebSocket Error:', err);
    };

    return () => {
      ws.close();
    };
  }, [addCycleToTimeline, setCurrentCycleIndex, setMetadata, setMemoryBreakdown, setRooflineMetrics, setOccupancyMetrics, setFinOpsMetrics]);

  
  const sendConfig = (params: any) => {

    clearTimeline();
    clearComparisonResult(); 
    
    const trySend = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'CONFIG', params }));
        console.log('[CoreWeaver] Sent CONFIG to backend:', params);
      } else if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
        setTimeout(trySend, 100); 
      } else {
        console.error("[CoreWeaver] WebSocket is not open. ReadyState:", wsRef.current?.readyState);
      }
    };
    
    trySend();
  };

  return { sendConfig };
}