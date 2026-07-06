import { useSimulationStore } from '../store';

export function WarpDivergenceView() {
  const { timeline, currentCycleIndex } = useSimulationStore();
  const currentCycle = timeline[currentCycleIndex];

  if (!currentCycle || !currentCycle.micro_state?.divergence_info) return null;

  const div = currentCycle.micro_state.divergence_info;

  return (
    <div style={{ 
      background: '#1e1e1e', borderRadius: '8px', padding: '1.5rem', 
      marginTop: '1rem', border: '1px solid #f85149', boxShadow: '0 0 15px rgba(248, 81, 73, 0.1)'
    }}>
      <h3 style={{ margin: '0 0 0.5rem 0', color: '#f85149', fontSize: '1.1rem' }}>
        ⚠️ Warp Divergence Detected
      </h3>
      <p style={{ margin: '0 0 1rem 0', color: '#888', fontSize: '0.85rem' }}>
        Threads in the 32-thread warp took different branches in the control flow. The hardware must serialize execution, leaving half the cores idle.
      </p>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        {/* Path A */}
        <div style={{ flex: 1, background: '#0d1117', padding: '1rem', borderRadius: '6px', border: '1px solid #30363d' }}>
          <div style={{ color: '#58a6ff', fontWeight: 'bold', marginBottom: '0.5rem' }}>Path A (IF Branch)</div>
          <div style={{ color: '#c9d1d9' }}>Executes for <strong>{div.path_a_cycles} cycles</strong></div>
          <div style={{ display: 'flex', gap: '2px', marginTop: '0.5rem' }}>
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} style={{ width: '100%', height: '8px', background: '#58a6ff', borderRadius: '2px' }} />
            ))}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '4px' }}>Threads 0-15 Active | Threads 16-31 IDLE</div>
        </div>

        {/* Path B */}
        <div style={{ flex: 1, background: '#0d1117', padding: '1rem', borderRadius: '6px', border: '1px solid #30363d' }}>
          <div style={{ color: '#bc8cff', fontWeight: 'bold', marginBottom: '0.5rem' }}>Path B (ELSE Branch)</div>
          <div style={{ color: '#c9d1d9' }}>Executes for <strong>{div.path_b_cycles} cycles</strong></div>
          <div style={{ display: 'flex', gap: '2px', marginTop: '0.5rem' }}>
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} style={{ width: '100%', height: '8px', background: '#bc8cff', borderRadius: '2px' }} />
            ))}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '4px' }}>Threads 0-15 IDLE | Threads 16-31 Active</div>
        </div>
      </div>

      <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(248, 81, 73, 0.1)', borderRadius: '6px', textAlign: 'center' }}>
        <span style={{ color: '#f85149', fontWeight: 'bold' }}>
          Serialized Penalty: +{div.serialized_penalty} Cycles Wasted
        </span>
      </div>
    </div>
  );
}