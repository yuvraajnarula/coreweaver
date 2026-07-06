import { useState } from 'react';
import { useSimulationStore } from './store';

export function CUPTITable() {
  const { timeline, metadata } = useSimulationStore();
  const [isCopied, setIsCopied] = useState(false);

  if (!timeline.length || !metadata || metadata.status !== 'SUCCESS' && metadata.status !== 'SUCCESS_WITH_THROTTLE') return null;

  // Extract CUPTI counters from the last cycle or metadata if we stored it there. 
  // For simplicity, we'll reconstruct a mock table based on the store's current metrics.
  const { rooflineMetrics, occupancyMetrics, memoryBreakdown, finopsMetrics } = useSimulationStore();
  
  const counters = {
    "sm__warps_active.avg.pct_of_peak_sustained_active": occupancyMetrics?.occupancy_pct || 0,
    "l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum": Math.floor((memoryBreakdown?.total_requested_gb || 0) * 1e9 / 128),
    "sm__sass_thread_inst_executed_op_ffma_pred_on.sum": Math.floor((rooflineMetrics?.achieved_gflops || 0) * 1e6),
    "dram__sectors_read.sum": Math.floor((memoryBreakdown?.total_requested_gb || 0) * 1e9 / 128),
    "gpu__time_duration.sum": Math.floor((finopsMetrics?.wall_clock_seconds || 0) * 1e6)
  };

  const handleCopy = () => {
    const text = Object.entries(counters).map(([k, v]) => `${k}: ${v}`).join('\n');
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div style={{ 
      background: '#1e1e1e', borderRadius: '8px', padding: '1.5rem', 
      marginTop: '1rem', border: '1px solid #333'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: '#c9d1d9', fontSize: '1rem' }}>Hardware Performance Counters (CUPTI Emulation)</h3>
        <button onClick={handleCopy} style={{
          padding: '0.4rem 0.8rem', background: '#21262d', color: isCopied ? '#3fb950' : '#c9d1d9',
          border: '1px solid #30363d', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'
        }}>
          {isCopied ? 'Copied' : 'Copy Raw Data'}
        </button>
      </div>

      <div style={{ 
        background: '#0d1117', padding: '1rem', borderRadius: '6px', 
        fontFamily: 'monospace', fontSize: '0.8rem', overflowX: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#c9d1d9' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #30363d' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem', color: '#8b949e' }}>Metric Name</th>
              <th style={{ textAlign: 'right', padding: '0.5rem', color: '#8b949e' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(counters).map(([key, value]) => (
              <tr key={key} style={{ borderBottom: '1px solid #21262d' }}>
                <td style={{ padding: '0.5rem', color: '#58a6ff' }}>{key}</td>
                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>{typeof value === 'number' ? value.toLocaleString() : value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}