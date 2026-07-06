import { useSimulationStore } from '../store';

export function RooflineChart() {
  const { rooflineMetrics, metadata } = useSimulationStore();

  if (!rooflineMetrics || !metadata) return null;

  const {
    arithmetic_intensity,
    achieved_gflops,
    peak_compute_gflops,
    peak_mem_bw,
    ridge_point
  } = rooflineMetrics;

  // Chart dimensions
  const width = 600;
  const height = 320;
  const padding = { top: 40, right: 40, bottom: 60, left: 70 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Log scale for X-axis (Arithmetic Intensity)
  const xMin = 0.1;
  const xMax = Math.max(arithmetic_intensity * 2, 10);
  const xScale = (val: number) => {
    const logMin = Math.log10(xMin);
    const logMax = Math.log10(xMax);
    const logVal = Math.log10(Math.max(val, 0.1));
    return padding.left + ((logVal - logMin) / (logMax - logMin)) * chartWidth;
  };

  // Linear scale for Y-axis (GFLOPS)
  const yMax = peak_compute_gflops * 1.1;
  const yScale = (val: number) => padding.top + chartHeight - (val / yMax) * chartHeight;

  // Determine if compute-bound or memory-bound
  const isComputeBound = arithmetic_intensity > ridge_point;
  const bottleneck = isComputeBound ? 'Compute-Bound' : 'Memory-Bound';
  const bottleneckColor = isComputeBound ? '#10b981' : '#f59e0b';

  // Roofline points
  const rooflinePath = `
    M ${xScale(xMin)} ${yScale(peak_mem_bw * xMin)}
    L ${xScale(ridge_point)} ${yScale(peak_compute_gflops)}
    L ${xScale(xMax)} ${yScale(peak_compute_gflops)}
  `;

  // Memory bandwidth line (extended)
  // const memLinePath = `
  //   M ${xScale(xMin)} ${yScale(peak_mem_bw * xMin)}
  //   L ${xScale(ridge_point)} ${yScale(peak_compute_gflops)}
  // `;

  // Compute ceiling line
  // const computeLinePath = `
  //   M ${xScale(ridge_point)} ${yScale(peak_compute_gflops)}
  //   L ${xScale(xMax)} ${yScale(peak_compute_gflops)}
  // `;

  // Kernel point
  const kernelX = xScale(arithmetic_intensity);
  const kernelY = yScale(achieved_gflops);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="label">Roofline Analysis</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{metadata.hardware_profile}</div>
        </div>
        <div style={{ 
          padding: '6px 12px', 
          background: `${bottleneckColor}15`, 
          border: `1px solid ${bottleneckColor}40`,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: bottleneckColor }} />
          <span className="data" style={{ fontSize: 11, color: bottleneckColor }}>{bottleneck}</span>
        </div>
      </div>

      <svg width={width} height={height} style={{ background: 'var(--bg-base)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
        {/* Define gradients */}
        <defs>
          <linearGradient id="rooflineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* X-axis ticks (log scale) */}
        {[0.1, 0.5, 1, 2, 5, 10].filter(v => v <= xMax).map((val, i) => (
          <g key={i}>
            <line
              x1={xScale(val)}
              y1={padding.top}
              x2={xScale(val)}
              y2={padding.top + chartHeight}
              stroke="var(--border-subtle)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={xScale(val)}
              y={padding.top + chartHeight + 20}
              textAnchor="middle"
              className="data"
              style={{ fontSize: '10px', fill: 'var(--text-tertiary)' }}
            >
              {val}
            </text>
          </g>
        ))}

        {/* Y-axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const val = yMax * ratio;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={yScale(val)}
                x2={padding.left + chartWidth}
                y2={yScale(val)}
                stroke="var(--border-subtle)"
                strokeWidth="1"
                strokeDasharray={ratio === 1 ? "0" : "4 4"}
              />
              <text
                x={padding.left - 10}
                y={yScale(val) + 4}
                textAnchor="end"
                className="data"
                style={{ fontSize: '10px', fill: 'var(--text-tertiary)' }}
              >
                {val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Roofline area */}
        <path
          d={`
            ${rooflinePath}
            L ${xScale(xMax)} ${yScale(0)}
            L ${xScale(xMin)} ${yScale(0)}
            Z
          `}
          fill="url(#rooflineGradient)"
          stroke="none"
        />

        {/* Roofline boundary */}
        <path
          d={rooflinePath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />

        {/* Ridge point marker */}
        <circle
          cx={xScale(ridge_point)}
          cy={yScale(peak_compute_gflops)}
          r="4"
          fill="#1f2937"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        <text
          x={xScale(ridge_point)}
          y={yScale(peak_compute_gflops) - 12}
          textAnchor="middle"
          className="data"
          style={{ fontSize: '9px', fill: 'var(--text-tertiary)' }}
        >
          Ridge: {ridge_point.toFixed(1)}
        </text>

        {/* Kernel performance point */}
        <circle
          cx={kernelX}
          cy={kernelY}
          r="6"
          fill={bottleneckColor}
          stroke="#09090b"
          strokeWidth="2"
        />
        <circle
          cx={kernelX}
          cy={kernelY}
          r="10"
          fill="none"
          stroke={bottleneckColor}
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Axis labels */}
        <text
          x={padding.left + chartWidth / 2}
          y={height - 10}
          textAnchor="middle"
          className="data"
          style={{ fontSize: '11px', fill: 'var(--text-secondary)', fontWeight: 500 }}
        >
          Arithmetic Intensity (FLOP/byte)
        </text>
        <text
          x={20}
          y={padding.top + chartHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90, 20, ${padding.top + chartHeight / 2})`}
          className="data"
          style={{ fontSize: '11px', fill: 'var(--text-secondary)', fontWeight: 500 }}
        >
          Achieved Performance (GFLOPS)
        </text>

        {/* Performance metrics */}
        <g transform={`translate(${width - padding.right - 140}, ${padding.top + 10})`}>
          <rect x="0" y="0" width="140" height="70" fill="var(--bg-elevated)" stroke="var(--border-subtle)" rx="4" />
          <text x="10" y="18" className="data" style={{ fontSize: '9px', fill: 'var(--text-tertiary)' }}>Peak Compute</text>
          <text x="10" y="34" className="data" style={{ fontSize: '11px', fill: 'var(--text-primary)', fontWeight: 600 }}>{peak_compute_gflops.toFixed(0)} GFLOPS</text>
          <text x="10" y="50" className="data" style={{ fontSize: '9px', fill: 'var(--text-tertiary)' }}>Peak Memory BW</text>
          <text x="10" y="66" className="data" style={{ fontSize: '11px', fill: 'var(--text-primary)', fontWeight: 600 }}>{peak_mem_bw.toFixed(0)} GB/s</text>
        </g>
      </svg>

      {/* Summary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
        <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
          <div className="label">Arithmetic Intensity</div>
          <div className="data" style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{arithmetic_intensity.toFixed(2)} <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>FLOP/byte</span></div>
        </div>
        <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
          <div className="label">Achieved Performance</div>
          <div className="data" style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{achieved_gflops.toFixed(1)} <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>GFLOPS</span></div>
        </div>
        <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
          <div className="label">Compute Efficiency</div>
          <div className="data" style={{ fontSize: 16, fontWeight: 600, marginTop: 4, color: achieved_gflops / peak_compute_gflops > 0.7 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
            {((achieved_gflops / peak_compute_gflops) * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}