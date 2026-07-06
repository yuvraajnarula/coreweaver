import { useState, useEffect } from 'react';
import { useSimulationStore } from './store';

export function AIOptimizationAgent() {
  const { metadata, rooflineMetrics, occupancyMetrics, finopsMetrics } = useSimulationStore();
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!metadata || metadata.status === 'INVALID_CONFIG' || metadata.status === 'OOM_ERROR') {
      setSuggestions(null);
      return;
    }

    setIsLoading(true);
    
    const summary = {
      status: metadata.status,
      achieved_gflops: rooflineMetrics?.achieved_gflops,
      arithmetic_intensity: rooflineMetrics?.arithmetic_intensity,
      ridge_point: rooflineMetrics?.ridge_point,
      occupancy_pct: occupancyMetrics?.occupancy_pct,
      wall_clock_seconds: finopsMetrics?.wall_clock_seconds
    };

    fetch('http://localhost:8000/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simulation_summary: summary })
    })
    .then(res => res.json())
    .then(data => {
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    })
    .catch(err => console.error('Optimization agent failed:', err))
    .finally(() => setIsLoading(false));

  }, [metadata, rooflineMetrics, occupancyMetrics, finopsMetrics]);

  if (!metadata || metadata.status === 'INVALID_CONFIG' || metadata.status === 'OOM_ERROR') return null;

  return (
    <div style={{ 
      background: '#0d1117', borderRadius: '8px', padding: '1.5rem', 
      marginTop: '1rem', border: '1px solid #30363d', fontFamily: 'monospace'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: '#c9d1d9', fontSize: '1rem' }}>
          [AI Agent] Root-Cause Optimization Analysis
        </h3>
        {isLoading && <span style={{ color: '#58a6ff', fontSize: '0.8rem' }}>Analyzing telemetry...</span>}
      </div>

      <div style={{ 
        background: '#161b22', padding: '1rem', borderRadius: '6px', 
        border: '1px solid #21262d', minHeight: '100px', color: '#c9d1d9',
        fontSize: '0.85rem', lineHeight: '1.6', whiteSpace: 'pre-wrap'
      }}>
        {isLoading ? (
          <span style={{ color: '#8b949e' }}>Querying Groq LPU for bottleneck analysis...</span>
        ) : (
          suggestions || 'No specific optimizations required. Kernel is operating within nominal parameters.'
        )}
      </div>
    </div>
  );
}