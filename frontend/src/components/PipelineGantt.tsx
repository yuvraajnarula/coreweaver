import { useSimulationStore } from '../store';

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

export function PipelineGantt() {
  const { timeline, currentCycleIndex } = useSimulationStore();
  const cycle = timeline[currentCycleIndex];
  
  if (!cycle) return null;
  
  const trace = cycle.pipeline_trace;
  const totalCyclesInTrace = trace.reduce((sum, s) => sum + s.cycles, 0);

  return (
    <div>
      {/* Timeline Axis */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
        <span className="data" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>CYCLE 0</span>
        <span className="data" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>CYCLE {totalCyclesInTrace}</span>
      </div>
      
      {/* Swimlane */}
      <div style={{ 
        display: 'flex', 
        height: 40, 
        background: 'var(--bg-base)', 
        borderRadius: 4, 
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden'
      }}>
        {trace.map((stage, i) => {
          const widthPct = (stage.cycles / totalCyclesInTrace) * 100;
          const bgColor = STAGE_COLORS[stage.stage] || '#6b7280';
          const borderColor = STATUS_BORDERS[stage.status] || 'transparent';
          
          return (
            <div 
              key={i}
              style={{
                width: `${widthPct}%`,
                height: '100%',
                background: bgColor,
                borderLeft: i > 0 ? '1px solid var(--bg-base)' : 'none',
                borderRight: stage.status !== 'NORMAL' ? `2px solid ${borderColor}` : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                opacity: stage.status === 'STALL' ? 0.6 : 1
              }}
              title={`${stage.stage} | ${stage.cycles} cycles | ${stage.status}`}
            >
              {widthPct > 8 && (
                <span style={{ 
                  fontSize: 10, 
                  fontWeight: 600, 
                  color: '#fff', 
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  padding: '0 4px'
                }}>
                  {stage.stage}
                </span>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Metrics Summary */}
      <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
        <div>
          <span className="label">Total Latency</span>
          <div className="data" style={{ fontSize: 14, marginTop: 4 }}>{cycle.pipeline_metrics.total_latency} cy</div>
        </div>
        <div>
          <span className="label">Bubble Cycles</span>
          <div className="data" style={{ fontSize: 14, color: 'var(--accent-red)', marginTop: 4 }}>{cycle.pipeline_metrics.bubble_cycles} cy</div>
        </div>
        <div>
          <span className="label">Pipeline Efficiency</span>
          <div className="data" style={{ fontSize: 14, color: 'var(--accent-green)', marginTop: 4 }}>{cycle.pipeline_metrics.efficiency_pct.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}