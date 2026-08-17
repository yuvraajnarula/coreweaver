// ModernExecutionView.tsx - TMA Asynchronous Copy & FlashAttention Fusion Visualizer with Lucide Icons
import { useSimulationStore } from '../store';
import { RefreshCw, Dna, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';

export function ModernExecutionView() {
  const { timeline, currentCycleIndex, rooflineMetrics, simParams } = useSimulationStore();
  const currentCycle = timeline[currentCycleIndex];

  if (!currentCycle || !currentCycle.pipeline_trace) return null;

  const isAsyncActive = currentCycle.pipeline_trace.some(s => s.status === 'OVERLAP');
  const isFusedActive = !!simParams?.enable_fusion || (rooflineMetrics ? rooflineMetrics.arithmetic_intensity > 5.0 : false);

  return (
    <div style={{ 
      background: 'var(--bg-base)', borderRadius: '8px', padding: '16px', 
      border: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'
    }}>
      {/* 1. ASYNC OVERLAP VISUALIZER (TMA) */}
      <div style={{
        padding: '14px', background: 'var(--bg-panel)', borderRadius: '6px', border: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column', gap: '8px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} color="var(--accent-blue)" />
            <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>
              Async Memory Copy (TMA)
            </h4>
          </div>
          <span style={{
            fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
            background: isAsyncActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: isAsyncActive ? 'var(--accent-green)' : 'var(--accent-amber)',
            border: `1px solid ${isAsyncActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            display: 'flex', alignItems: 'center', gap: 4
          }}>
            {isAsyncActive ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
            {isAsyncActive ? 'OVERLAP ACTIVE' : 'STALLED / SERIALLY FETCHING'}
          </span>
        </div>
        
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          {isAsyncActive 
            ? 'Memory loads are successfully hidden behind Tensor Core compute. 0 pipeline stall bubbles.' 
            : 'Standard memory pipeline. Tensor cores are waiting on VRAM transaction completion.'}
        </div>
        
        {/* Mini Pipeline Visual */}
        <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
          <div style={{ flex: 1, height: '20px', background: 'var(--accent-green)', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: '#fff' }}>
            COMPUTE (Tensor)
          </div>
          <div style={{ 
            flex: isAsyncActive ? 0.15 : 1, 
            height: '20px', 
            background: isAsyncActive ? 'rgba(16, 185, 129, 0.3)' : 'var(--accent-amber)', 
            borderRadius: '3px', 
            border: isAsyncActive ? '1px dashed var(--accent-green)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: '#fff',
            transition: 'flex 0.3s ease'
          }}>
            {isAsyncActive ? <Zap size={11} /> : 'HBM WAIT'}
          </div>
        </div>
      </div>

      {/* 2. KERNEL FUSION (FLASHATTENTION) IMPACT */}
      <div style={{ 
        padding: '14px', background: 'var(--bg-panel)', borderRadius: '6px', border: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column', gap: '8px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Dna size={14} color="var(--accent-blue)" />
            <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>
              Kernel Fusion (FlashAttention)
            </h4>
          </div>
          <span style={{
            fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
            background: isFusedActive ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-elevated)',
            color: isFusedActive ? 'var(--accent-blue)' : 'var(--text-tertiary)',
            border: `1px solid ${isFusedActive ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-subtle)'}`
          }}>
            {isFusedActive ? 'FUSED KERNEL' : 'UNFUSED'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>Arithmetic Intensity</span>
          <span className="data" style={{ color: 'var(--accent-blue)', fontWeight: 600, fontSize: '14px' }}>
            {rooflineMetrics ? rooflineMetrics.arithmetic_intensity.toFixed(2) : '0.00'} FLOP/Byte
          </span>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          {isFusedActive
            ? 'Fusion active: Intermediate matrices kept in fast SRAM. Bypasses 50% VRAM memory bandwidth.'
            : 'Standard execution: Intermediate matrices written and re-read from slow VRAM.'}
        </div>
        
        {/* Roofline Position Indicator */}
        <div style={{ marginTop: '4px', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', position: 'relative', overflow: 'visible' }}>
          <div style={{ 
            height: '100%', 
            width: `${Math.min(100, Math.max(10, ((rooflineMetrics?.arithmetic_intensity || 1) / (rooflineMetrics?.ridge_point ? rooflineMetrics.ridge_point * 2 : 10)) * 100))}%`, 
            background: 'linear-gradient(to right, var(--accent-amber), var(--accent-green))', 
            borderRadius: '3px' 
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-tertiary)' }}>
          <span>Memory-Bound (VRAM Wait)</span>
          <span>Compute-Bound (Tensor Cores)</span>
        </div>
      </div>
    </div>
  );
}