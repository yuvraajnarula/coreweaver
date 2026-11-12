import { useEffect, useRef } from 'react';
import { useSimulationStore, type CycleData, type SimulationMetadata, type MemoryBreakdown, type RooflineMetrics, type FinOpsMetrics } from '../store';

export function useSimulationSocket() {
  const { 
    addCycleToTimeline, setCurrentCycleIndex, clearTimeline, 
    setMetadata, setMemoryBreakdown, setRooflineMetrics, 
    setOccupancyMetrics, setFinOpsMetrics, setCuptiCounters, setConnectionStatus 
  } = useSimulationStore();
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const WS_URL = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8765';

  useEffect(() => {
    const connect = () => {
      setConnectionStatus('reconnecting');
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[CoreWeaver] Connected to Physics Engine on', WS_URL);
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
          } else if (msg.type === 'CUPTI') {
            setCuptiCounters(msg.data as Record<string, number>);
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
        // Auto-reconnect logic
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
  }, [addCycleToTimeline, setCurrentCycleIndex, setMetadata, setMemoryBreakdown, setRooflineMetrics, setOccupancyMetrics, setFinOpsMetrics, setCuptiCounters, setConnectionStatus, WS_URL]);

  const sendConfig = (params: any, customArch?: any) => {
    clearTimeline(); 
    const trySend = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const payload: any = { type: 'CONFIG', params };
        if (customArch) payload.custom_arch = customArch;
        wsRef.current.send(JSON.stringify(payload));
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