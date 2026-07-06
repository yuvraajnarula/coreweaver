import { useSimulationStore } from './store';

export function SiliconTelemetry() {
  const { timeline, currentCycleIndex, occupancyMetrics } = useSimulationStore();
  const currentCycle = timeline[currentCycleIndex];

  if (!currentCycle || !currentCycle.micro_state || !occupancyMetrics) return null;

  const micro = currentCycle.micro_state;
  const powerPct = Math.min(100, (micro.power_watts / micro.tdp_limit) * 100);
  const powerColor = micro.power_throttled ? '#f85149' : powerPct > 80 ? '#d29922' : '#3fb950';

  return (
    <div style={{ 
      background: '#1e1e1e', borderRadius: '8px', padding: '1.5rem', 
      marginTop: '1rem', border: '1px solid #333', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem'
    }}>
      {/* 1. POWER DRAW (TDP) */}
      <div>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#c9d1d9', fontSize: '0.9rem' }}>⚡ Power Draw (TDP)</h4>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: powerColor }}>
          {micro.power_watts.toFixed(0)}W <span style={{fontSize: '0.8rem', color: '#888'}}>/ {micro.tdp_limit}W</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: '#333', borderRadius: '4px', marginTop: '0.5rem', overflow: 'hidden' }}>
          <div style={{ width: `${powerPct}%`, height: '100%', background: powerColor, transition: 'width 0.3s ease' }} />
        </div>
        {micro.power_throttled && <div style={{color: '#f85149', fontSize: '0.75rem', marginTop: '4px'}}>⚠️ POWER THROTTLED</div>}
      </div>

      {/* 2. REGISTER OCCUPANCY */}
      <div>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#c9d1d9', fontSize: '0.9rem' }}>📊 SM Occupancy</h4>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: occupancyMetrics.occupancy_pct > 70 ? '#3fb950' : '#d29922' }}>
          {occupancyMetrics.occupancy_pct}%
        </div>
        <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>
          {occupancyMetrics.active_warps} / {occupancyMetrics.max_warps} Active Warps
        </div>
        <div style={{ fontSize: '0.75rem', color: '#888' }}>
          {occupancyMetrics.regs_per_thread} Regs/Thread
        </div>
      </div>

      {/* 3. MEMORY COALESCING */}
      <div>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#c9d1d9', fontSize: '0.9rem' }}>🧠 Warp Memory Coalescing</h4>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: micro.memory_transactions === 1 ? '#3fb950' : '#f85149' }}>
          {micro.memory_transactions} Transaction{micro.memory_transactions > 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', gap: '2px', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {micro.warp_pattern.map((addr, i) => (
            <div 
              key={i} 
              style={{ 
                width: '8px', height: '16px', 
                background: micro.memory_transactions === 1 ? '#3fb950' : '#f85149',
                borderRadius: '2px',
                opacity: addr ? 1 : 0.2
              }} 
              title={`Thread ${i}: Addr ${addr}`}
            />
          ))}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '4px' }}>
          {micro.memory_transactions === 1 ? 'Perfectly Contiguous' : 'Scattered/Strided'}
        </div>
      </div>
    </div>
  );
}