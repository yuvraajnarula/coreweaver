import { useSimulationStore } from '../store';

const getInfraredColor = (t: number) => {
  const colors = [
    [0, 0, 4],       // Cold (Black/Deep Purple)
    [59, 15, 112],   // Cool
    [140, 41, 129],  // Mid
    [221, 73, 104],  // Warm (Red/Magenta)
    [253, 159, 108], // Hot (Orange)
    [252, 255, 164]  // Critical (Bright Yellow/White)
  ];
  const idx = t * (colors.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  const weight = idx - lower;
  
  const r = Math.round(colors[lower][0] * (1 - weight) + colors[upper][0] * weight);
  const g = Math.round(colors[lower][1] * (1 - weight) + colors[upper][1] * weight);
  const b = Math.round(colors[lower][2] * (1 - weight) + colors[upper][2] * weight);
  
  return `rgb(${r}, ${g}, ${b})`;
};

export function SiliconTelemetry() {
  const { timeline, currentCycleIndex } = useSimulationStore();
  const cycle = timeline[currentCycleIndex];
  
  if (!cycle) return null;
  
  const thermalMap = cycle.hardware_state.thermal_map;
  // Assume a square grid (e.g., 16x16 or 32x32)
  const gridSize = Math.sqrt(thermalMap.length);
  const cols = Math.round(gridSize) || 16;
  
  // Hardware thermal limits for normalization
  const minTemp = 20;
  const maxTemp = 100;

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* The Thermal Grid */}
      <div style={{ flex: 1, maxWidth: 400 }}>
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 1,
            background: '#000', // True black background for infrared
            padding: 1,
            borderRadius: 4,
            aspectRatio: '1 / 1',
            width: '100%',
            border: '1px solid var(--border-subtle)'
          }}
        >
          {thermalMap.map((temp, i) => {
            const t = Math.max(0, Math.min(1, (temp - minTemp) / (maxTemp - minTemp)));
            return (
              <div 
                key={i} 
                style={{ 
                  background: getInfraredColor(t),
                  borderRadius: 1
                }} 
                title={`${temp.toFixed(1)}°C`}
              />
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 60 }}>
        <div className="label" style={{ textAlign: 'center' }}>TEMP (°C)</div>
        <div style={{ 
          flex: 1, 
          height: 200, 
          borderRadius: 4, 
          background: `linear-gradient(to bottom, ${getInfraredColor(1)}, ${getInfraredColor(0.75)}, ${getInfraredColor(0.5)}, ${getInfraredColor(0.25)}, ${getInfraredColor(0)})`,
          position: 'relative',
          border: '1px solid var(--border-subtle)'
        }}>
          <span className="data" style={{ position: 'absolute', top: -4, right: -32, fontSize: 10, color: 'var(--text-tertiary)' }}>100°</span>
          <span className="data" style={{ position: 'absolute', top: '50%', right: -32, fontSize: 10, color: 'var(--text-tertiary)', transform: 'translateY(-50%)' }}>60°</span>
          <span className="data" style={{ position: 'absolute', bottom: -4, right: -32, fontSize: 10, color: 'var(--text-tertiary)' }}>20°</span>
        </div>
      </div>
    </div>
  );
}