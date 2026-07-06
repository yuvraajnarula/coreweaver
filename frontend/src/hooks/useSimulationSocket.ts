import { useEffect, useRef } from "react";
import {
  useSimulationStore,
  type CycleData,
  type SimulationMetadata,
  type MemoryBreakdown,
  type RooflineMetrics,
} from "../store";

export function useSimulationSocket() {
  const {
    addCycleToTimeline,
    setCurrentCycleIndex,
    clearTimeline,
    setMetadata,
    setMemoryBreakdown,
    setRooflineMetrics,
    setOccupancyMetrics,
  } = useSimulationStore();

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8765");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to CoreWeaver Physics Engine!");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "METADATA") {
          setMetadata(msg.data as SimulationMetadata);
          if (msg.data.occupancy_metrics) {
            setOccupancyMetrics(msg.data.occupancy_metrics);
          }
        } else if (msg.type === "BREAKDOWN") {
          setMemoryBreakdown(msg.data as MemoryBreakdown);
        } else if (msg.type === "ROOFLINE") {
          setRooflineMetrics(msg.data as RooflineMetrics);
        } else if (msg.type === "CYCLE") {
          addCycleToTimeline(msg.data as CycleData);
          const currentLength = useSimulationStore.getState().timeline.length;
          setCurrentCycleIndex(currentLength - 1);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("Disconnected from backend.");
    };

    return () => {
      ws.close();
    };
  }, [
    addCycleToTimeline,
    setCurrentCycleIndex,
    clearTimeline,
    setMetadata,
    setMemoryBreakdown,
    setRooflineMetrics,
    setOccupancyMetrics,
  ]);

  const sendConfig = (params: any) => {
    clearTimeline();

    const trySend = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "CONFIG", params }));
        console.log("Sent CONFIG to backend!");
      } else if (
        wsRef.current &&
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        setTimeout(trySend, 100);
      } else {
        console.error("WebSocket is not open!", wsRef.current?.readyState);
      }
    };
    trySend();
  };

  return { sendConfig };
}
