import { useSimulationStore, type PipelineStage } from './store';

export function PipelineGantt() {
  const { timeline, currentCycleIndex } = useSimulationStore();
  const currentCycle = timeline[currentCycleIndex];

  if (!currentCycle || !currentCycle.pipeline_trace || !currentCycle.pipeline_metrics) return null;

  const trace = currentCycle.pipeline_trace;
  const metrics = currentCycle.pipeline_metrics;
  
  // HYBRID SCALING: Prevent tiny stages from disappearing
  // We calculate visual width based on cycles, but enforce a 5% minimum visual width.
  const totalCycles = metrics.total_latency;
  const visualWeights = trace.map(stage => Math.max(5, (stage.cycles / totalCycles) * 100));
  const visualTotal = visualWeights.reduce((a, b) => a + b, 0);

  const getStageColor = (stage: PipelineStage) => {
    if (stage.status === 'CONFLICT') return '#f85149'; // Red
    if (stage.status === 'STALL') return '#d29922';    // Orange/Yellow
    
    switch (stage.stage) {
      case 'FETCH': return '#58a6ff';     
      case 'DECODE': return '#a371f7';    
      case 'EXECUTE': return '#3fb950';   
      case 'EXECUTE (Tensor)': return '#238636'; // Darker green for heavy math
      case 'MEMORY (VRAM)': return '#f0883e';    
      case 'NOP (Thermal Bubble)': return '#6e7681'; // Gray for empty bubbles
      case 'WRITEBACK': return '#8b949e'; 
      default: return '#333';
    }
  };

  return (
    <div style={{ 
      background: '#1e1e1e', borderRadius: '8px', padding: '1.5rem', 
      marginTop: '1rem', border: '1px solid #333' 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, color: '#00ffcc', fontSize: '1.1rem' }}>
          Instruction Pipeline Lifecycle (Strict Latency)
        </h3>
        
        {/* Pipeline Efficiency Gauge */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: '#888' }}>Pipeline Efficiency</div>
          <div style={{ 
            fontSize: '1.5rem', fontWeight: 'bold', 
            color: metrics.efficiency_pct > 90 ? '#3fb950' : metrics.efficiency_pct > 50 ? '#d29922' : '#f85149' 
          }}>
            {metrics.efficiency_pct}%
          </div>
        </div>
      </div>

      <p style={{ margin: '0 0 1rem 0', color: '#888', fontSize: '0.85rem' }}>
        Instruction: <code style={{color: '#fff'}}>{currentCycle.instruction}</code> | 
        Total Latency: <strong style={{color: '#fff'}}>{metrics.total_latency} Cycles</strong> | 
        Wasted in Bubbles: <strong style={{color: metrics.bubble_cycles > 0 ? '#f85149' : '#3fb950'}}>{metrics.bubble_cycles} Cycles</strong>
      </p>

      {/* The Pipeline Bar */}
      <div style={{ 
        display: 'flex', 
        width: '100%', 
        height: '70px', 
        borderRadius: '6px', 
        overflow: 'hidden',
        border: '1px solid #444',
        background: '#0d1117'
      }}>
        {trace.map((stage, index) => {
          // Use the hybrid visual weight for width, but show TRUE cycles in text
          const widthPercent = (visualWeights[index] / visualTotal) * 100;
          const isStalled = stage.status !== 'NORMAL';

          return (
            <div 
              key={`${stage.stage}-${index}`}
              style={{
                width: `${widthPercent}%`,
                backgroundColor: getStageColor(stage),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: index < trace.length - 1 ? '2px solid #0d1117' : 'none',
                transition: 'width 0.5s ease, background-color 0.3s ease',
                position: 'relative',
                padding: '0 4px'
              }}
            >
              <span style={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)', textAlign: 'center', lineHeight: '1.2' }}>
                {stage.stage.replace(' (VRAM)', '').replace(' (Tensor)', '')}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', marginTop: '2px' }}>
                {stage.cycles}c
              </span>
              
              {isStalled && (
                <div style={{ 
                  position: 'absolute', top: '4px', right: '4px', 
                  background: '#000', color: '#fff', borderRadius: '50%', 
                  width: '16px', height: '16px', fontSize: '10px', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  !
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend & Explanation */}
      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', fontSize: '0.8rem', color: '#888', flexWrap: 'wrap', borderTop: '1px solid #333', paddingTop: '1rem' }}>
        <div>* Visual widths are compressed to show all stages. Cycle counts (e.g., 400c) represent true silicon latency.</div>
      </div>
    </div>
  );
}