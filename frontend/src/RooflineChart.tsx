import { useSimulationStore } from './store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceLine } from 'recharts';

export function RooflineChart() {
  const { rooflineMetrics } = useSimulationStore();

  if (!rooflineMetrics) return null;

  const { 
    arithmetic_intensity, 
    achieved_gflops, 
    peak_compute_gflops, 
    peak_mem_bw, 
    ridge_point 
  } = rooflineMetrics; 

  // 🧠 THE FIX: Logarithmic Scaling
  // We calculate the log10 of the values to map them to a visual scale where 
  // 1, 10, 100, 1000, 10000 are evenly spaced.
  const maxX_val = Math.max(ridge_point * 10, arithmetic_intensity * 2);
  const maxX_log = Math.log10(maxX_val);
  const ridge_log = Math.log10(ridge_point);
  const user_log = Math.log10(arithmetic_intensity);

  const chartData = [];
  let x = 1; // Start at 1 FLOP/Byte (log10(1) = 0)
  while (x <= maxX_val) {
    const mem_perf = x * peak_mem_bw;
    const compute_perf = peak_compute_gflops;
    const roof = Math.min(mem_perf, compute_perf);

    chartData.push({
      log_intensity: Math.log10(x),
      real_intensity: x,
      roof: roof
    });
    x *= 1.1; // Step by 10% each time to create a smooth curve
  }

  return (
    <div style={{ 
      background: '#1e1e1e', borderRadius: '8px', padding: '1.5rem', 
      marginTop: '1rem', border: '1px solid #333' 
    }}>
      <h3 style={{ margin: '0 0 0.5rem 0', color: '#00ffcc', fontSize: '1.1rem' }}>
        📈 Roofline Model: Hardware Utilization
      </h3>
      <p style={{ margin: '0 0 1rem 0', color: '#888', fontSize: '0.85rem' }}>
        Strict physical units: GFLOP/s vs FLOP/Byte. Notice the <strong>Logarithmic X-Axis</strong> (industry standard) to properly visualize both Memory and Compute bound regions.
      </p>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          
          <XAxis 
            dataKey="log_intensity" 
            stroke="#888" 
            type="number"
            domain={[-1, Math.ceil(maxX_log)]} // -1 is 0.1, 0 is 1, 1 is 10, etc.
            ticks={[-1, 0, 1, 2, 3, 4, 5]} 
            tickFormatter={(val) => {
                const real = Math.pow(10, val);
                if (real >= 1000) return `${real/1000}k`;
                if (real < 1) return "0.1";
                return real.toFixed(0);
            }}
            label={{ value: 'Arithmetic Intensity (FLOP / Byte) - Log Scale', position: 'insideBottom', offset: -15, fill: '#888' }}
          />
          <YAxis 
            stroke="#888" 
            domain={[0, peak_compute_gflops * 1.1]}
            label={{ value: 'Performance (GFLOP / s)', angle: -90, position: 'insideLeft', fill: '#888' }}
          />
          
          <Tooltip 
            contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '4px' }}
            labelStyle={{ color: '#fff' }}
            formatter={(value: number) => [`${value.toFixed(1)} GFLOP/s`, 'Performance']}
            labelFormatter={(label) => `Intensity: ${Math.pow(10, label).toFixed(1)} FLOP/Byte`}
          />

          {/* The Ridge Point Vertical Marker */}
          <ReferenceLine 
            x={ridge_log} 
            stroke="#888" 
            strokeDasharray="5 5" 
            label={{ value: `Ridge (${ridge_point.toFixed(0)})`, position: 'top', fill: '#888', fontSize: 10 }}
          />

          {/* The Actual Hardware Roof */}
          <Line 
            type="monotone" 
            dataKey="roof" 
            stroke="#ffffff" 
            strokeWidth={3} 
            dot={false} 
            name="Hardware Roof"
          />

          {/* The User's Kernel (The Glowing Dot) */}
          <ReferenceDot 
            x={user_log} 
            y={achieved_gflops} 
            r={10} 
            fill="#00ffcc" 
            stroke="#fff" 
            strokeWidth={2}
          />
          
          <ReferenceLine 
            y={achieved_gflops} 
            stroke="#00ffcc" 
            strokeDasharray="3 3"
            label={{ value: `${achieved_gflops.toFixed(0)} GFLOP/s`, position: 'right', fill: '#00ffcc', fontSize: 11 }}
          />
          <ReferenceLine 
            x={user_log} 
            stroke="#00ffcc" 
            strokeDasharray="3 3"
            label={{ value: `Intensity: ${arithmetic_intensity.toFixed(0)}`, position: 'top', fill: '#00ffcc', fontSize: 11 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '1.5rem', fontSize: '0.9rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#58a6ff', fontWeight: 'bold' }}>Memory Bound</div>
          <div style={{ color: '#888', fontSize: '0.8rem' }}>Left of Ridge Point</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#00ffcc', fontWeight: 'bold' }}>Your Kernel</div>
          <div style={{ color: '#888', fontSize: '0.8rem' }}>
            {achieved_gflops < (peak_compute_gflops * 0.8) ? 'Sub-optimal Efficiency (Penalties Applied)' : 'Near Peak Efficiency'}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#f85149', fontWeight: 'bold' }}>Compute Bound</div>
          <div style={{ color: '#888', fontSize: '0.8rem' }}>Right of Ridge Point</div>
        </div>
      </div>
    </div>
  );
}