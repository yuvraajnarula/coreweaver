import { useState } from 'react';
import { useSimulationStore } from '../store';

interface CounterRow {
  name: string;
  value: number;
  unit: string;
  description: string;
  category: 'Memory' | 'Compute' | 'Occupancy' | 'Power';
  trend?: number[]; // For sparkline
}

export function CUPTITable() {
  const { timeline, currentCycleIndex, metadata } = useSimulationStore();
  const [sortField, setSortField] = useState<'name' | 'value'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const cycle = timeline[currentCycleIndex];
  
  if (!cycle || !metadata) return null;

  // Generate realistic CUPTI-style counters from simulation data
  const counters: CounterRow[] = [
    {
      name: 'dram__throughput.avg.pct_of_peak_sustained.elapsed',
      value: cycle.hardware_state.sram_access.length * 8 / 600, // Mock calculation
      unit: '%',
      description: 'DRAM throughput as percentage of peak',
      category: 'Memory',
      trend: [45, 48, 52, 49, 51, 53, 50]
    },
    {
      name: 'l1tex__t_sectors_per_cycle.avg.pct_of_peak_sustained_elapsed',
      value: 0.73,
      unit: '',
      description: 'L1 texture cache throughput',
      category: 'Memory',
      trend: [0.68, 0.71, 0.73, 0.72, 0.74, 0.73, 0.73]
    },
    {
      name: 'smsp__sass_thread_inst_executed_op_ffma_pred_on',
      value: cycle.pipeline_trace.reduce((sum, s) => sum + (s.stage.includes('EXECUTE') ? s.cycles * 32 : 0), 0),
      unit: 'inst',
      description: 'Fused multiply-add instructions executed',
      category: 'Compute',
      trend: [1024, 1156, 1089, 1203, 1178, 1245, 1203]
    },
    {
      name: 'smsp__sass_thread_inst_executed_op_fadd_pred_on',
      value: 856,
      unit: 'inst',
      description: 'Floating-point add instructions',
      category: 'Compute',
      trend: [823, 834, 845, 856, 849, 862, 856]
    },
    {
      name: 'smsp__sass_thread_inst_executed_op_fmul_pred_on',
      value: 912,
      unit: 'inst',
      description: 'Floating-point multiply instructions',
      category: 'Compute',
      trend: [890, 901, 908, 912, 910, 915, 912]
    },
    {
      name: 'warp_executed',
      value: metadata.occupancy_metrics?.active_warps || 0,
      unit: 'warps',
      description: 'Total warps executed',
      category: 'Occupancy',
      trend: [28, 29, 30, 31, 30, 31, 31]
    },
    {
      name: 'achieved_occupancy',
      value: metadata.occupancy_metrics?.occupancy_pct || 0,
      unit: '%',
      description: 'Percentage of active warps',
      category: 'Occupancy',
      trend: [85, 87, 88, 89, 88, 90, 89]
    },
    {
      name: 'registers_per_thread',
      value: metadata.occupancy_metrics?.regs_per_thread || 0,
      unit: 'regs',
      description: 'Registers allocated per thread',
      category: 'Occupancy',
      trend: [24, 24, 24, 24, 24, 24, 24]
    },
    {
      name: 'power_draw',
      value: cycle.micro_state.power_watts,
      unit: 'W',
      description: 'Instantaneous power consumption',
      category: 'Power',
      trend: [245, 251, 248, 253, 250, 255, 253]
    },
    {
      name: 'gpu_utilization',
      value: cycle.hardware_state.clock_speed_mhz / 1410 * 100,
      unit: '%',
      description: 'GPU utilization percentage',
      category: 'Power',
      trend: [92, 94, 93, 95, 94, 96, 95]
    }
  ];

  // Filter and sort
  let filtered = counters;
  if (filterCategory !== 'all') {
    filtered = counters.filter(c => c.category === filterCategory);
  }

  const sorted = [...filtered].sort((a, b) => {
    const comparison = sortField === 'name' 
      ? a.name.localeCompare(b.name) 
      : a.value - b.value;
      
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  const handleSort = (field: 'name' | 'value') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sparkline component
  const Sparkline = ({ data, color = '#3b82f6' }: { data: number[]; color?: string }) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 60;
    const height = 20;
    
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} style={{ marginLeft: 8 }}>
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div className="label">Hardware Performance Counters</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Nsight Compute Profile</div>
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            padding: '6px 10px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 4,
            color: 'var(--text-primary)',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Categories</option>
          <option value="Memory">Memory</option>
          <option value="Compute">Compute</option>
          <option value="Occupancy">Occupancy</option>
          <option value="Power">Power</option>
        </select>
      </div>

      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th
                onClick={() => handleSort('name')}
                style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Counter Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('value')}
                style={{
                  padding: '10px 12px',
                  textAlign: 'right',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Value {sortField === 'value' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Trend
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((counter, i) => (
              <tr
                key={i}
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'}
              >
                <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)' }}>
                  {counter.name}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>
                  {typeof counter.value === 'number' && counter.value % 1 !== 0 ? counter.value.toFixed(2) : counter.value}
                  <span style={{ color: 'var(--text-tertiary)', marginLeft: 4 }}>{counter.unit}</span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {counter.trend && <Sparkline data={counter.trend} color={counter.category === 'Memory' ? '#f59e0b' : counter.category === 'Compute' ? '#10b981' : counter.category === 'Power' ? '#ef4444' : '#3b82f6'} />}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-tertiary)', fontSize: 11 }}>
                  {counter.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 24, fontSize: 11, color: 'var(--text-tertiary)' }}>
        <span>Showing {sorted.length} counters</span>
        <span>•</span>
        <span>Hardware: {metadata.hardware_profile}</span>
        <span>•</span>
        <span>Cycle: {cycle.cycle}</span>
      </div>
    </div>
  );
}