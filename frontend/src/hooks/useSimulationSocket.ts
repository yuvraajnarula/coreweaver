import { useEffect, useRef } from 'react';
import { useSimulationStore, type CycleData, type SimulationMetadata, type MemoryBreakdown, type RooflineMetrics, type FinOpsMetrics } from '../store';

export function useSimulationSocket() {
  const { 
    addCycleToTimeline, setCurrentCycleIndex, clearTimeline, 
    setMetadata, setMemoryBreakdown, setRooflineMetrics, 
    setOccupancyMetrics, setFinOpsMetrics, setConnectionStatus 
  } = useSimulationStore();
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const connect = () => {
      setConnectionStatus('reconnecting');
      const ws = new WebSocket('ws://localhost:8765');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[CoreWeaver] Connected to Physics Engine');
        setConnectionStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'METADATA') {
            setMetadata(msg.data as SimulationMetadata);
            if (msg.data.occupancy_metrics) setOccupancyMetrics(msg.data.occupancy_metrics);
          } else if (msg.type === 'BREAKDOWN') {
            setMemoryBreakdown(msg.data as MemoryBreakdown);
          } else if (msg.type === 'ROOFLINE') {
            setRooflineMetrics(msg.data as RooflineMetrics);
          } else if (msg.type === 'FINOPS') {
            setFinOpsMetrics(msg.data as FinOpsMetrics);
          } else if (msg.type === 'CYCLE') {
            addCycleToTimeline(msg.data as CycleData);
            const currentLength = useSimulationStore.getState().timeline.length;
            setCurrentCycleIndex(currentLength - 1); 
          }
        } catch (error) {
          console.error('[CoreWeaver] Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('[CoreWeaver] Disconnected. Reconnecting in 3s...');
        setConnectionStatus('disconnected');
        // 🚀 Auto-reconnect logic
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('[CoreWeaver] WebSocket Error:', err);
        setConnectionStatus('disconnected');
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [addCycleToTimeline, setCurrentCycleIndex, setMetadata, setMemoryBreakdown, setRooflineMetrics, setOccupancyMetrics, setFinOpsMetrics, setConnectionStatus]);

  const sendConfig = (params: any) => {
    clearTimeline(); 
    const trySend = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'CONFIG', params }));
      } else if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
        setTimeout(trySend, 100); 
      } else {
        console.error("[CoreWeaver] WebSocket is not open.");
      }
    };
    trySend();
  };

  return { sendConfig };
}