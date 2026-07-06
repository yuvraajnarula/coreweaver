import { useSimulationStore } from '../store';

export function ComparisonView() {
  const { comparisonResult, clearComparisonResult } = useSimulationStore();

  if (!comparisonResult) return null;

  const { kernel_a, kernel_b, deltas } = comparisonResult;
  
  const getMetricColor = (delta: number, lowerIsBetter = false) => {
    if (delta === 0) return '#8b949e';
    const isPositive = delta > 0;
    const isGood = lowerIsBetter ? !isPositive : isPositive;
    return isGood ? '#3fb950' : '#f85149'; // Green for good, Red for bad
  };

  const formatStatus = (status: string) => {
    if (status === 'SUCCESS') return <span style={{color: '#3fb950'}}>Success</span>;
    if (status === 'SUCCESS_WITH_THROTTLE') return <span style={{color: '#d29922'}}>Throttled</span>;
    if (status === 'OOM_ERROR') return <span style={{color: '#f85149'}}>OOM Crash</span>;
    return <span style={{color: '#f85149'}}>Config Error</span>;
  };

  return (
    <div style={{ 
      background: '#0d1117', borderRadius: '12px', padding: '2rem', 
      border: '1px solid #30363d', marginTop: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, color: '#c9d1d9' }}>Kernel A/B Benchmark Report</h2>
        <button onClick={clearComparisonResult} style={{
          background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d',
          padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer'
        }}>
          Close Report
        </button>
      </div>

      {/* The Winner Banner */}
      <div style={{
        background: deltas.winner === 'KERNEL B' ? 'rgba(63, 185, 80, 0.1)' : deltas.winner === 'KERNEL A' ? 'rgba(88, 166, 255, 0.1)' : 'rgba(139, 148, 158, 0.1)',
        border: `1px solid ${deltas.winner === 'KERNEL B' ? '#3fb950' : deltas.winner === 'KERNEL A' ? '#58a6ff' : '#8b949e'}`,
        padding: '1.5rem', borderRadius: '8px', textAlign: 'center', marginBottom: '2rem'
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: deltas.winner === 'KERNEL B' ? '#3fb950' : deltas.winner === 'KERNEL A' ? '#58a6ff' : '#c9d1d9' }}>
          Winner: {deltas.winner}
        </div>
        <div style={{ color: '#8b949e', marginTop: '0.5rem' }}>{deltas.summary}</div>
      </div>

      {/* The Split Screen Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* KERNEL A */}
        <div style={{ background: '#161b22', padding: '1.5rem', borderRadius: '8px', border: '1px solid #30363d' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#58a6ff', textAlign: 'center' }}>Kernel A (Baseline)</h3>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>{formatStatus(deltas.status_a)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <MetricRow label="Total Cycles" value={kernel_a.metadata.total_cycles} />
            <MetricRow label="Achieved GFLOP/s" value={kernel_a.roofline_metrics?.achieved_gflops || 'N/A'} />
            <MetricRow label="Peak Temp" value={`${Math.max(...(kernel_a.timeline?.map((c:any) => c.hardware_state.current_temperature) || [45])).toFixed(1)}°C`} />
            <MetricRow label="VRAM Used" value={`${kernel_a.memory_breakdown?.total_requested_gb || 'N/A'} GB`} />
          </div>
        </div>

        {/* DELTA COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '3rem', minWidth: '120px', textAlign: 'center' }}>
          <DeltaBadge label="Cycles" value={`${deltas.cycle_delta_pct > 0 ? '+' : ''}${deltas.cycle_delta_pct}%`} color={getMetricColor(deltas.cycle_delta_pct, true)} />
          <DeltaBadge label="GFLOP/s" value={`${deltas.gflops_delta > 0 ? '+' : ''}${deltas.gflops_delta}`} color={getMetricColor(deltas.gflops_delta)} />
          <DeltaBadge label="Temp" value={`${deltas.temp_delta_c > 0 ? '+' : ''}${deltas.temp_delta_c}°C`} color={getMetricColor(deltas.temp_delta_c, true)} />
          <DeltaBadge label="VRAM" value={`${deltas.vram_delta_gb > 0 ? '+' : ''}${deltas.vram_delta_gb} GB`} color={getMetricColor(deltas.vram_delta_gb, true)} />
        </div>

        {/* KERNEL B */}
        <div style={{ background: '#161b22', padding: '1.5rem', borderRadius: '8px', border: '1px solid #30363d' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#bc8cff', textAlign: 'center' }}>Kernel B (Challenger)</h3>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>{formatStatus(deltas.status_b)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <MetricRow label="Total Cycles" value={kernel_b.metadata.total_cycles} />
            <MetricRow label="Achieved GFLOP/s" value={kernel_b.roofline_metrics?.achieved_gflops || 'N/A'} />
            <MetricRow label="Peak Temp" value={`${Math.max(...(kernel_b.timeline?.map((c:any) => c.hardware_state.current_temperature) || [45])).toFixed(1)}°C`} />
            <MetricRow label="VRAM Used" value={`${kernel_b.memory_breakdown?.total_requested_gb || 'N/A'} GB`} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components for clean code
function MetricRow({ label, value }: { label: string, value: any }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #21262d', paddingBottom: '0.5rem' }}>
      <span style={{ color: '#8b949e' }}>{label}</span>
      <span style={{ color: '#c9d1d9', fontWeight: 'bold' }}>{value}</span>
    </div>
  );
}

function DeltaBadge({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '0.5rem' }}>
      <div style={{ fontSize: '0.7rem', color: '#8b949e', marginBottom: '4px' }}>{label} Delta</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}