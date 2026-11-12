// PipelineGantt.tsx - 5-Stage Instruction Pipeline Swimlane with True Hybrid Scaling
import { useState } from 'react';
import { useSimulationStore } from '../store';
import { Info, HelpCircle } from 'lucide-react';

const STAGE_COLORS: Record<string, string> = {
  'FETCH': '#3b82f6',         
  'DECODE': '#8b5cf6',        
  'EXECUTE': '#10b981',       
  'EXECUTE (Tensor)': '#059669', 
  'MEMORY': '#f59e0b',        
  'MEMORY (VRAM)': '#d97706', 
  'WRITEBACK': '#ec4899',     
  'NOP (Thermal Bubble)': '#ef4444', 
  'ASYNC MEM (Hidden)': '#6366f1' 
};

const STATUS_BORDERS: Record<string, string> = {
  'NORMAL': 'transparent',
  'STALL': '#ef4444',
  'SLOW': '#f59e0b',
  'CONFLICT': '#ef4444',
  'DIVERGENT': '#f97316',
  'OVERLAP': '#10b981'
};

const STAGE_EXPLANATIONS: Record<string, string> = {
  'FETCH': '4 cycles: Instruction Cache (I-Cache) fetch into warp instruction buffer.',
  'DECODE': '4 cycles: Instruction dispatch unit decoding opcodes and resolving register dependencies.',
  'EXECUTE': '10 cycles: Standard ALU integer/floating-point mathematical execution.',
  'EXECUTE (Tensor)': 'Tens of cycles: Tensor Core Matrix Multiply-Accumulate (MMA) array execution.',
  'MEMORY': '10 cycles: On-chip L1 cache or Shared Memory (SRAM) access.',
  'MEMORY (VRAM)': '400 cycles: Off-chip High-Bandwidth Memory (HBM) latency round-trip.',
  'WRITEBACK': '4 cycles: Committing computed accumulator results to thread register file.',
  'NOP (Thermal Bubble)': '300 cycles: Hardware throttle injecting empty wait cycles to cool silicon below 90°C.',
  'ASYNC MEM (Hidden)': '0 stall cycles: Tensor Memory Accelerator (TMA) background copy hiding latency behind compute.'
};

export function PipelineGantt() {
  const { timeline, currentCycleIndex } = useSimulationStore();
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
  const [showHybridInfo, setShowHybridInfo] = useState(false);

  const cycle = timeline[currentCycleIndex];
  if (!cycle) return null;

  const trace = cycle.pipeline_trace;
  const totalCyclesInTrace = trace.reduce((sum, s) => sum + s.cycles, 0);

  // TRUE HYBRID SCALING ALGORITHM:
  // Ensures small stages (e.g. 4-cycle FETCH) remain clearly readable and labeled,
  // while visually preserving the mathematical dominance of 400-cycle memory stages.
  const stageCount = trace.length;
  const MIN_WIDTH_PCT = 11.0; // Guaranteed minimum width percentage per active stage
  const guaranteedTotal = stageCount * MIN_WIDTH_PCT;
  const remainingBudget = Math.max(0, 100.0 - guaranteedTotal);

  const stageWidths = trace.map(stage => {
    const proportionalBonus = totalCyclesInTrace > 0 
      ? (stage.cycles / totalCyclesInTrace) * remainingBudget 
      : remainingBudget / stageCount;
    return MIN_WIDTH_PCT + proportionalBonus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header and Hybrid Scale Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="label">5-Stage SIMT Execution Swimlane</span>
          <button 
            onClick={() => setShowHybridInfo(!showHybridInfo)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', padding: 0 }}
            title="What is Hybrid Scaling?"
          >
            <HelpCircle size={12} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-tertiary)' }}>
          <span style={{ padding: '1px 5px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            Hybrid Scale Active
          </span>
          <span>True Latency: <strong style={{ color: 'var(--text-primary)' }}>{totalCyclesInTrace} cycles</strong></span>
        </div>
      </div>

      {showHybridInfo && (
        <div style={{ 
          background: 'var(--bg-elevated)', 
          border: '1px solid var(--border-default)', 
          borderRadius: 6, 
          padding: '8px 12px',
          fontSize: 11,
          lineHeight: 1.4,
          color: 'var(--text-secondary)'
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>Why Hybrid Scaling?</strong> A true memory transaction takes 400 cycles, while instruction fetch takes 4 cycles. On a strictly linear scale, the 4-cycle FETCH stage would be 0.9% wide and completely invisible. CoreWeaver guarantees visual readability for all 5 stages while displaying the exact mathematical cycle counts.
        </div>
      )}

      {/* Swimlane Container */}
      <div style={{ 
        display: 'flex', 
        height: 48, 
        background: 'var(--bg-base)', 
        borderRadius: 6, 
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)'
      }}>
        {trace.map((stage, i) => {
          const widthPct = stageWidths[i];
          const bgColor = STAGE_COLORS[stage.stage] || '#6b7280';
          const borderColor = STATUS_BORDERS[stage.status] || 'transparent';
          const isHovered = hoveredStage === i;
          
          return (
            <div 
              key={i}
              onMouseEnter={() => setHoveredStage(i)}
              onMouseLeave={() => setHoveredStage(null)}
              style={{
                width: `${widthPct}%`,
                height: '100%',
                background: bgColor,
                borderLeft: i > 0 ? '1px solid rgba(0,0,0,0.2)' : 'none',
                borderTop: stage.status !== 'NORMAL' ? `3px solid ${borderColor}` : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                opacity: stage.status === 'STALL' ? 0.75 : 1,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                filter: isHovered ? 'brightness(1.15)' : 'none',
                padding: '0 4px'
              }}
            >
              <span style={{ 
                fontSize: 11, 
                fontWeight: 700, 
                color: '#fff', 
                textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
              }}>
                {stage.stage}
              </span>
              
              <span style={{ 
                fontSize: 9, 
                fontWeight: 500, 
                color: 'rgba(255,255,255,0.85)',
                textShadow: '0 1px 1px rgba(0,0,0,0.5)',
                marginTop: 1
              }}>
                {stage.cycles} cy
              </span>
            </div>
          );
        })}
      </div>

      {/* Dynamic Stage Tooltip / Inspector */}
      <div style={{ 
        minHeight: 32, 
        padding: '8px 12px', 
        background: 'var(--bg-base)', 
        borderRadius: 6, 
        border: '1px solid var(--border-subtle)',
        fontSize: 11,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: 'var(--text-secondary)'
      }}>
        {hoveredStage !== null ? (
          <>
            <span style={{ 
              fontWeight: 700, 
              color: STAGE_COLORS[trace[hoveredStage].stage] || 'var(--text-primary)' 
            }}>
              {trace[hoveredStage].stage} ({trace[hoveredStage].cycles} cycles):
            </span>
            <span>{STAGE_EXPLANATIONS[trace[hoveredStage].stage] || `${trace[hoveredStage].cycles} cycles in stage.`}</span>
            {trace[hoveredStage].status !== 'NORMAL' && (
              <span style={{ 
                marginLeft: 'auto', 
                padding: '1px 6px', 
                borderRadius: 3, 
                fontSize: 10, 
                fontWeight: 600,
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--accent-red)',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                {trace[hoveredStage].status}
              </span>
            )}
          </>
        ) : (
          <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={12} />
            <span>Hover over any pipeline stage to inspect its physical hardware operation and latency breakdown.</span>
          </span>
        )}
      </div>

      {/* Metrics Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={{ padding: '8px 12px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
          <div className="label">Total Instruction Latency</div>
          <div className="data" style={{ fontSize: 16, marginTop: 4, fontWeight: 600, color: 'var(--text-primary)' }}>
            {cycle.pipeline_metrics.total_latency} <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>cycles</span>
          </div>
        </div>
        
        <div style={{ padding: '8px 12px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
          <div className="label">Bubble / Stall Cycles</div>
          <div className="data" style={{ fontSize: 16, marginTop: 4, fontWeight: 600, color: cycle.pipeline_metrics.bubble_cycles > 0 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
            {cycle.pipeline_metrics.bubble_cycles} <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>cycles</span>
          </div>
        </div>

        <div style={{ padding: '8px 12px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
          <div className="label">Pipeline Efficiency</div>
          <div className="data" style={{ fontSize: 16, marginTop: 4, fontWeight: 600, color: cycle.pipeline_metrics.efficiency_pct >= 90 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
            {cycle.pipeline_metrics.efficiency_pct.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}