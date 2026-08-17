// WarpDivergence.tsx - SIMT Warp Control Flow Divergence Analyzer with Lucide Icons
import { useSimulationStore } from '../store';
import { GitBranch, AlertTriangle, Clock } from 'lucide-react';

export function WarpDivergenceView() {
  const { timeline, currentCycleIndex } = useSimulationStore();
  const currentCycle = timeline[currentCycleIndex];

  if (!currentCycle || !currentCycle.micro_state?.divergence_info) return null;

  const div = currentCycle.micro_state.divergence_info;

  return (
    <div style={{ 
      background: 'var(--bg-panel)', borderRadius: '8px', padding: '16px', 
      border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 0 15px rgba(239, 68, 68, 0.08)',
      display: 'flex', flexDirection: 'column', gap: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-red)' }}>
          <AlertTriangle size={15} />
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
            Warp Divergence Detected (SIMT Serialization)
          </h3>
        </div>
        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
          Branch Penalty
        </span>
      </div>

      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '11px', lineHeight: 1.5 }}>
        Threads in the 32-thread warp took divergent branches in the control flow graph. The SIMT hardware serialized execution, leaving half the processing cores completely idle.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Path A */}
        <div style={{ background: 'var(--bg-base)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-blue)', fontWeight: 600, fontSize: 12, marginBottom: '6px' }}>
            <GitBranch size={13} />
            <span>Path A (IF Branch)</span>
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: 11 }}>
            Executes for <strong style={{ color: 'var(--accent-blue)' }}>{div.path_a_cycles} cycles</strong>
          </div>
          <div style={{ display: 'flex', gap: '2px', marginTop: '6px' }}>
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} style={{ width: '100%', height: '6px', background: 'var(--accent-blue)', borderRadius: '1px' }} />
            ))}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Threads 0-15 Active | Threads 16-31 IDLE
          </div>
        </div>

        {/* Path B */}
        <div style={{ background: 'var(--bg-base)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#c084fc', fontWeight: 600, fontSize: 12, marginBottom: '6px' }}>
            <GitBranch size={13} />
            <span>Path B (ELSE Branch)</span>
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: 11 }}>
            Executes for <strong style={{ color: '#c084fc' }}>{div.path_b_cycles} cycles</strong>
          </div>
          <div style={{ display: 'flex', gap: '2px', marginTop: '6px' }}>
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} style={{ width: '100%', height: '6px', background: '#c084fc', borderRadius: '1px' }} />
            ))}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Threads 0-15 IDLE | Threads 16-31 Active
          </div>
        </div>
      </div>

      <div style={{ 
        padding: '10px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '6px', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        border: '1px solid rgba(239, 68, 68, 0.25)' 
      }}>
        <Clock size={13} color="var(--accent-red)" />
        <span style={{ color: 'var(--accent-red)', fontWeight: 600, fontSize: 12 }}>
          Serialized Penalty: +{div.serialized_penalty} Cycles Wasted
        </span>
      </div>
    </div>
  );
}