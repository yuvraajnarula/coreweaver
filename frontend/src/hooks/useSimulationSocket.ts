import { useEffect } from 'react';
import { useSimulationStore, type CycleData } from '../store';

export function useSimulationSocket() {
  const { addCycleToTimeline, setCurrentCycleIndex } = useSimulationStore();

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8765');

    ws.onopen = () => {
      console.log('connected to CoreWeaver Backend!');
    };

    ws.onmessage = (event) => {
      try {
        const newCycle: CycleData = JSON.parse(event.data);
        
        addCycleToTimeline(newCycle);
        
        const currentLength = useSimulationStore.getState().timeline.length;
        setCurrentCycleIndex(currentLength - 1); 
        
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from backend.');
    };

    return () => {
      ws.close();
    };
  }, [addCycleToTimeline, setCurrentCycleIndex]);
}