import { useSimulationStore } from './store';

export function FinOpsDashboard() {
  const { finopsMetrics, metadata } = useSimulationStore();

  if (!finopsMetrics || metadata?.status === 'OOM_ERROR' || metadata?.status === 'INVALID_CONFIG') return null;

  const formatUSD = (val: number) => {
    if (val < 0.01) return `$${val.toExponential(2)}`;
    return `$${val.toFixed(4)}`;
  };

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)', 
      borderRadius: '8px', padding: '1.5rem', marginTop: '1rem', 
      border: '1px solid #238636', boxShadow: '0 0 15px rgba(35, 134, 54, 0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: '#3fb950', fontSize: '1.1rem' }}>FinOps: Cloud Cost Estimator</h3>
        <span style={{ fontSize: '0.75rem', color: '#8b949e', background: '#21262d', padding: '4px 8px', borderRadius: '4px' }}>
          Billing Rate: ${finopsMetrics.hourly_rate_usd.toFixed(2)}/hr
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#8b949e', marginBottom: '4px' }}>True Hardware Cycles</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#c9d1d9' }}>
            {finopsMetrics.true_total_cycles.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#8b949e', marginBottom: '4px' }}>Wall-Clock Time</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#c9d1d9' }}>
            {finopsMetrics.wall_clock_seconds.toExponential(2)} s
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#8b949e', marginBottom: '4px' }}>Cost per Kernel Run</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3fb950' }}>
            {formatUSD(finopsMetrics.kernel_cost_usd)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#8b949e', marginBottom: '4px' }}>Cost per 1M Runs</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f0883e' }}>
            ${finopsMetrics.cost_per_million_runs.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}