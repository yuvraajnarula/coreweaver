import { useSimulationStore } from './store';

export function ModernExecutionView() {
  const { timeline, currentCycleIndex, memoryBreakdown, rooflineMetrics } = useSimulationStore();
  const currentCycle = timeline[currentCycleIndex];

  if (!currentCycle || !currentCycle.pipeline_trace) return null;

  const isAsyncActive = currentCycle.pipeline_trace.some(s => s.status === 'OVERLAP');
  const isFused = rooflineMetrics && memoryBreakdown; // We can infer fusion if we want, or just check params

  return (
    <div style={{ 
      background: '#1e1e1e', borderRadius: '8px', padding: '1.5rem', 
      marginTop: '1rem', border: '1px solid #333', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'
    }}>
      {/* 1. ASYNC OVERLAP VISUALIZER */}
      <div>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#c9d1d9', fontSize: '0.9rem' }}>
          🔄 Async Memory Copy (TMA)
        </h4>
        <div style={{ 
          padding: '1rem', background: '#0d1117', borderRadius: '6px', border: '1px solid #30363d',
          display: 'flex', flexDirection: 'column', gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', background: isAsyncActive ? '#3fb950' : '#8b949e', borderRadius: '50%' }} />
            <span style={{ color: isAsyncActive ? '#3fb950' : '#8b949e', fontWeight: 'bold' }}>
              {isAsyncActive ? 'OVERLAP ACTIVE' : 'STALLED'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#888', lineHeight: '1.4' }}>
            {isAsyncActive 
              ? 'Memory loads are successfully hidden behind Tensor Core compute. 0 pipeline stalls.' 
              : 'Pipeline is waiting on VRAM. Memory and Compute are serialized.'}
          </div>
          
          {/* Mini Pipeline Visual */}
          <div style={{ display: 'flex', gap: '2px', marginTop: '0.5rem' }}>
            <div style={{ flex: 1, height: '16px', background: '#3fb950', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#fff' }}>
              COMPUTE
            </div>
            <div style={{ 
              flex: isAsyncActive ? 0.1 : 1, 
              height: '16px', 
              background: isAsyncActive ? 'rgba(63, 185, 80, 0.3)' : '#f0883e', 
              borderRadius: '2px', 
              border: isAsyncActive ? '1px dashed #3fb950' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#fff',
              transition: 'flex 0.5s ease'
            }}>
              {isAsyncActive ? '' : 'MEM'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. KERNEL FUSION (FLASHATTENTION) IMPACT */}
      <div>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#c9d1d9', fontSize: '0.9rem' }}>
          🧬 Kernel Fusion (FlashAttention)
        </h4>
        <div style={{ 
          padding: '1rem', background: '#0d1117', borderRadius: '6px', border: '1px solid #30363d',
          display: 'flex', flexDirection: 'column', gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#888', fontSize: '0.8rem' }}>Arithmetic Intensity</span>
            <span style={{ color: '#00ffcc', fontWeight: 'bold', fontSize: '1.2rem' }}>
              {rooflineMetrics?.arithmetic_intensity.toFixed(1)} FLOP/Byte
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#888', lineHeight: '1.4' }}>
            {rooflineMetrics && rooflineMetrics.arithmetic_intensity > 150 
              ? 'Fusion active: Intermediate matrices kept in SRAM. High Arithmetic Intensity.'
              : 'Standard execution: Intermediate matrices written to VRAM. Lower Arithmetic Intensity.'}
          </div>
          
          {/* Roofline Position Indicator */}
          <div style={{ marginTop: '0.5rem', height: '8px', background: 'linear-gradient(to right, #58a6ff, #f85149)', borderRadius: '4px', position: 'relative' }}>
            <div style={{ 
              position: 'absolute', top: '-4px', 
              left: `${Math.min(95, (rooflineMetrics?.arithmetic_intensity || 0) / 3)}%`, 
              width: '16px', height: '16px', background: '#00ffcc', borderRadius: '50%', border: '2px solid #fff',
              transform: 'translateX(-50%)', transition: 'left 0.5s ease'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#666', marginTop: '4px' }}>
            <span>Memory Bound</span>
            <span>Compute Bound</span>
          </div>
        </div>
      </div>
    </div>
  );
}