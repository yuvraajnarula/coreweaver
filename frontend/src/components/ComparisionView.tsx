import { useSimulationStore } from '../store';

export function ComparisonView() {
  const { comparisonResult, clearComparisonResult } = useSimulationStore();
  
  if (!comparisonResult) return null;

  const { config_a, config_b, metrics_a, metrics_b, verdict } = comparisonResult;

  // Helper to format delta
  const getDelta = (a: number, b: number, invertColor = false) => {
    const delta = ((b - a) / a) * 100;
    const isPositive = delta > 0;
    const color = invertColor 
      ? (isPositive ? 'var(--accent-red)' : 'var(--accent-green)') 
      : (isPositive ? 'var(--accent-green)' : 'var(--accent-red)');
      
    return {
      text: `${delta > 0 ? '+' : ''}${delta.toFixed(2)}%`,
      color
    };
  };

  const rows = [
    { label: 'Total Latency (Cycles)', a: metrics_a.total_cycles, b: metrics_b.total_cycles, unit: 'cy', invert: true },
    { label: 'Achieved GFLOPS', a: metrics_a.achieved_gflops, b: metrics_b.achieved_gflops, unit: 'GFLOPS', invert: false },
    { label: 'Arithmetic Intensity', a: metrics_a.arithmetic_intensity, b: metrics_b.arithmetic_intensity, unit: 'FLOP/byte', invert: false },
    { label: 'Occupancy', a: metrics_a.occupancy_pct, b: metrics_b.occupancy_pct, unit: '%', invert: false },
    { label: 'Kernel Cost', a: metrics_a.kernel_cost_usd, b: metrics_b.kernel_cost_usd, unit: 'USD', invert: true, isCurrency: true },
  ];

  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden', marginTop: 24 }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>A/B Performance Comparison</div>
          <div className="label" style={{ marginTop: 2 }}>Baseline vs. Current Configuration</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
            background: verdict === 'IMPROVEMENT' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: verdict === 'IMPROVEMENT' ? 'var(--accent-green)' : 'var(--accent-red)',
            border: `1px solid ${verdict === 'IMPROVEMENT' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            {verdict}
          </div>
          <button className="btn" onClick={clearComparisonResult} style={{ padding: '4px 8px', fontSize: 11 }}>Close</button>
        </div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metric</th>
            <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Baseline (A)</th>
            <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current (B)</th>
            <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const delta = getDelta(row.a, row.b, row.invert);
            return (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-primary)' }}>{row.label}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {row.isCurrency ? `$${row.a.toFixed(6)}` : row.a.toFixed(2)} <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>{row.unit}</span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
                  {row.isCurrency ? `$${row.b.toFixed(6)}` : row.b.toFixed(2)} <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>{row.unit}</span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: delta.color }}>
                  {delta.text}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}