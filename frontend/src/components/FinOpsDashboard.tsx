// FinOpsDashboard.tsx - Cloud FinOps & Cost Projection Dashboard with Lucide Icons
import { useSimulationStore } from '../store';
import { DollarSign, Clock, Activity, Server } from 'lucide-react';

const USD_TO_INR = 95.33;

export function FinOpsDashboard() {
  const { finopsMetrics, metadata } = useSimulationStore();
  
  if (!finopsMetrics) return null;

  const { wall_clock_seconds, kernel_cost_usd, cost_per_million_runs, hourly_rate_usd } = finopsMetrics;
  
  const kernel_cost_inr = kernel_cost_usd * USD_TO_INR;
  const cost_per_million_runs_inr = cost_per_million_runs * USD_TO_INR;
  const hourly_rate_inr = hourly_rate_usd * USD_TO_INR;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <MetricCard 
          icon={DollarSign}
          label="Kernel Cost" 
          value={`₹${kernel_cost_inr.toFixed(4)} ($${kernel_cost_usd.toFixed(4)})`} 
          color="var(--text-primary)" 
        />
        <MetricCard 
          icon={Activity}
          label="Cost / 1M Runs" 
          value={`$${cost_per_million_runs.toFixed(2)} (₹${cost_per_million_runs_inr.toFixed(2)})`} 
          color="var(--accent-blue)" 
        />
        <MetricCard 
          icon={Clock}
          label="Wall Clock Time" 
          value={`${wall_clock_seconds.toFixed(2)}s`} 
          color="var(--text-secondary)" 
        />
        <MetricCard 
          icon={Server}
          label="Instance Rate" 
          value={`$${hourly_rate_usd}/hr (₹${hourly_rate_inr.toFixed(2)}/hr)`} 
          color="var(--text-tertiary)" 
        />
      </div>
      
      <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="label">Efficiency Rating</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              {wall_clock_seconds < 1.0 ? 'High Performance' : wall_clock_seconds < 5.0 ? 'Standard' : 'Optimization Required'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="label">Hardware Profile</div>
            <div className="data" style={{ fontSize: 12, marginTop: 4 }}>{metadata?.hardware_profile || 'Unknown'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: typeof DollarSign, label: string, value: string, color: string }) {
  return (
    <div style={{ padding: 16, background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="label">{label}</div>
        <Icon size={14} color="var(--text-tertiary)" />
      </div>
      <div className="data" style={{ fontSize: 16, fontWeight: 600, color: color, marginTop: 8 }}>
        {value}
      </div>
    </div>
  );
}