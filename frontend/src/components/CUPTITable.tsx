// CUPTITable.tsx - NVIDIA Nsight Compute (CUPTI) Hardware Performance Counters
import { useState, useMemo } from 'react';
import { useSimulationStore } from '../store';
import { Table, Filter, ArrowUpDown, Info } from 'lucide-react';

interface CounterRow {
  name: string;
  value: number;
  unit: string;
  formattedValue: string;
  description: string;
  category: 'Memory' | 'Compute' | 'Occupancy' | 'Timing';
  nsightCategory: string;
  trend: number[];
}

export function CUPTITable() {
  const { timeline, currentCycleIndex, metadata, cuptiCounters, rooflineMetrics, finopsMetrics, occupancyMetrics } = useSimulationStore();
  const [sortField, setSortField] = useState<'name' | 'value'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [hoveredCounter, setHoveredCounter] = useState<string | null>(null);

  const cycle = timeline[currentCycleIndex];
  if (!cycle || !metadata) return null;

  // Build live cycle trend arrays across the timeline up to currentCycleIndex
  const history = useMemo(() => {
    const activeSlice = timeline.slice(0, Math.max(1, currentCycleIndex + 1));
    return {
      clock: activeSlice.map(c => c.hardware_state.clock_speed_mhz),
      power: activeSlice.map(c => c.micro_state.power_watts),
      temp: activeSlice.map(c => c.hardware_state.current_temperature),
      latency: activeSlice.map(c => c.pipeline_metrics.total_latency),
      efficiency: activeSlice.map(c => c.pipeline_metrics.efficiency_pct)
    };
  }, [timeline, currentCycleIndex]);

  // Industry-standard NVIDIA CUPTI Counters (as output by NVIDIA Nsight Compute 'ncu')
  const totalSectors = cuptiCounters?.["l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum"] ?? 
    Math.floor(((rooflineMetrics?.peak_mem_bw || 2034) * 1000) / 128);

  const counters: CounterRow[] = [
    {
      name: 'sm__warps_active.avg.pct_of_peak_sustained_active',
      value: cuptiCounters?.["sm__warps_active.avg.pct_of_peak_sustained_active"] ?? (occupancyMetrics?.occupancy_pct || 85.0),
      unit: '%',
      formattedValue: `${(cuptiCounters?.["sm__warps_active.avg.pct_of_peak_sustained_active"] ?? occupancyMetrics?.occupancy_pct ?? 85.0).toFixed(1)}%`,
      description: 'Percentage of theoretical peak active warps sustained during kernel execution.',
      category: 'Occupancy',
      nsightCategory: 'SM Occupancy',
      trend: history.efficiency.length > 1 ? history.efficiency : [75, 80, 85, 85, 88]
    },
    {
      name: 'sm__registers_sum.per_cycle_active',
      value: cuptiCounters?.["sm__registers_sum.per_cycle_active"] ?? ((occupancyMetrics?.regs_per_thread || 32) * (occupancyMetrics?.active_warps || 32)),
      unit: 'regs',
      formattedValue: (cuptiCounters?.["sm__registers_sum.per_cycle_active"] ?? ((occupancyMetrics?.regs_per_thread || 32) * (occupancyMetrics?.active_warps || 32))).toLocaleString(),
      description: 'Total live registers allocated and held across all concurrent warps on the SM.',
      category: 'Occupancy',
      nsightCategory: 'Register Pressure',
      trend: [24, 28, 32, 32, 32]
    },
    {
      name: 'sm__inst_executed_pipe_tensor.sum',
      value: cuptiCounters?.["sm__inst_executed_pipe_tensor.sum"] ?? Math.floor((rooflineMetrics?.achieved_gflops || 100) * 1e5),
      unit: 'inst',
      formattedValue: (cuptiCounters?.["sm__inst_executed_pipe_tensor.sum"] ?? Math.floor((rooflineMetrics?.achieved_gflops || 100) * 1e5)).toLocaleString(),
      description: 'Matrix Multiply-Accumulate (MMA) instructions executed on physical Tensor Cores.',
      category: 'Compute',
      nsightCategory: 'Tensor Pipeline',
      trend: history.latency.length > 1 ? history.latency : [100, 200, 450, 600]
    },
    {
      name: 'sm__sass_thread_inst_executed_op_ffma_pred_on.sum',
      value: cuptiCounters?.["sm__sass_thread_inst_executed_op_ffma_pred_on.sum"] ?? Math.floor((rooflineMetrics?.achieved_gflops || 100) * 1e6),
      unit: 'inst',
      formattedValue: (cuptiCounters?.["sm__sass_thread_inst_executed_op_ffma_pred_on.sum"] ?? Math.floor((rooflineMetrics?.achieved_gflops || 100) * 1e6)).toLocaleString(),
      description: 'SASS assembly Fused Multiply-Add (FFMA) operations retired with predicate=True.',
      category: 'Compute',
      nsightCategory: 'ALU Pipeline',
      trend: [512, 1024, 2048, 4096]
    },
    {
      name: 'l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum',
      value: totalSectors,
      unit: 'sectors',
      formattedValue: totalSectors.toLocaleString(),
      description: '32-byte memory sectors requested through the L1/Texture cache by global load instructions.',
      category: 'Memory',
      nsightCategory: 'Memory L1/LSU',
      trend: history.power.length > 1 ? history.power : [30, 45, 60, 65]
    },
    {
      name: 'l1tex__t_sectors_pipe_lsu_mem_global_op_st.sum',
      value: Math.floor(totalSectors * 0.2),
      unit: 'sectors',
      formattedValue: Math.floor(totalSectors * 0.2).toLocaleString(),
      description: '32-byte memory sectors written back through the LSU pipeline to global memory.',
      category: 'Memory',
      nsightCategory: 'Memory L1/LSU',
      trend: [10, 15, 20, 25]
    },
    {
      name: 'dram__sectors_read.sum',
      value: totalSectors,
      unit: 'sectors',
      formattedValue: totalSectors.toLocaleString(),
      description: 'Physical 32-byte sectors transferred from off-chip DRAM/HBM into the memory controller.',
      category: 'Memory',
      nsightCategory: 'DRAM / HBM',
      trend: [100, 250, 500, 800]
    },
    {
      name: 'dram__sectors_write.sum',
      value: Math.floor(totalSectors * 0.5),
      unit: 'sectors',
      formattedValue: Math.floor(totalSectors * 0.5).toLocaleString(),
      description: 'Physical 32-byte sectors written back from memory controller into off-chip DRAM/HBM.',
      category: 'Memory',
      nsightCategory: 'DRAM / HBM',
      trend: [50, 120, 250, 400]
    },
    {
      name: 'gpu__time_duration.sum',
      value: Math.round((finopsMetrics?.wall_clock_seconds || 0.001) * 1e6),
      unit: 'µs',
      formattedValue: `${Math.round((finopsMetrics?.wall_clock_seconds || 0.001) * 1e6).toLocaleString()} µs`,
      description: 'Total elapsed GPU hardware execution time in microseconds (dividing cycles by base clock frequency).',
      category: 'Timing',
      nsightCategory: 'Wall Clock',
      trend: history.clock.length > 1 ? history.clock : [1500, 1500, 1500]
    }
  ];

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

  const Sparkline = ({ data, color = 'var(--accent-blue)' }: { data: number[]; color?: string }) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 64;
    const height = 18;
    
    const points = data.map((val, i) => {
      const x = (i / Math.max(1, data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Category filter bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'Occupancy', 'Compute', 'Memory', 'Timing'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className="btn"
              style={{
                padding: '3px 8px',
                fontSize: 11,
                background: filterCategory === cat ? 'var(--bg-elevated)' : 'transparent',
                borderColor: filterCategory === cat ? 'var(--accent-blue)' : 'var(--border-subtle)',
                color: filterCategory === cat ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontWeight: filterCategory === cat ? 600 : 400
              }}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          Emulating NVIDIA Nsight Compute (`ncu --csv --metrics`)
        </span>
      </div>

      {/* Main CUPTI Counter Table */}
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th 
                onClick={() => handleSort('name')}
                style={{ textAlign: 'left', padding: '8px 12px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>METRIC NAME (CUPTI IDENTIFIER)</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>CATEGORY</th>
              <th 
                onClick={() => handleSort('value')}
                style={{ textAlign: 'right', padding: '8px 12px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <span>MEASURED VALUE</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600, width: 80 }}>TREND</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((counter, i) => {
              const isHovered = hoveredCounter === counter.name;
              return (
                <tr 
                  key={counter.name}
                  onMouseEnter={() => setHoveredCounter(counter.name)}
                  onMouseLeave={() => setHoveredCounter(null)}
                  style={{ 
                    borderBottom: i < sorted.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    background: isHovered ? 'var(--bg-elevated)' : 'transparent',
                    transition: 'background 0.1s ease'
                  }}
                >
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{counter.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2, fontFamily: 'sans-serif' }}>
                      {counter.description}
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ 
                      fontSize: 9, 
                      padding: '2px 6px', 
                      borderRadius: 3, 
                      background: 'var(--bg-base)', 
                      border: '1px solid var(--border-subtle)',
                      color: counter.category === 'Compute' ? 'var(--accent-green)' : counter.category === 'Memory' ? 'var(--accent-amber)' : 'var(--accent-blue)',
                      fontWeight: 600 
                    }}>
                      {counter.nsightCategory}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {counter.formattedValue}
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                    <Sparkline data={counter.trend} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}