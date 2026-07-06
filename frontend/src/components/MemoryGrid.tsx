import { useSimulationStore } from '../store';

export function MemoryGrid() {
  const { timeline, currentCycleIndex } = useSimulationStore();
  const cycle = timeline[currentCycleIndex];
  
  if (!cycle) return null;
  
  const accesses = cycle.hardware_state.sram_access;
  const BANKS = 32; // Standard SRAM bank count
  const THREADS = 32; // Warp size
  
  // Create a matrix of accesses: threads x banks
  const matrix = Array.from({ length: THREADS }, () => Array(BANKS).fill(0));
  
  accesses.forEach(access => {
    const t = access.thread_id % THREADS;
    const b = access.bank_id % BANKS;
    matrix[t][b] += 1;
  });
  
  const hasConflict = cycle.hardware_state.bank_conflict;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="label">SRAM Bank Matrix (32x32 Warp)</div>
        {hasConflict && (
          <div className="data" style={{ fontSize: 11, color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-red)' }} />
            BANK CONFLICT DETECTED
          </div>
        )}
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${BANKS}, 1fr)`, 
        gap: 2, 
        background: 'var(--bg-base)',
        padding: 4,
        borderRadius: 4,
        border: '1px solid var(--border-subtle)'
      }}>
        {matrix.flat().map((count, i) => {
          const intensity = Math.min(count / 4, 1); // Normalize traffic density
          const bg = count > 0 
            ? `rgba(59, 130, 246, ${0.2 + intensity * 0.8})` 
            : 'var(--bg-elevated)';
            
          return (
            <div 
              key={i} 
              style={{ 
                aspectRatio: '1 / 1', 
                background: bg,
                borderRadius: 2,
                // Sharp red border for bank conflicts (multiple threads hitting same bank)
                border: count > 1 ? '1px solid var(--accent-red)' : '1px solid transparent',
                transition: 'background 0.1s'
              }}
              title={`Thread ${Math.floor(i / BANKS)} -> Bank ${i % BANKS} | Accesses: ${count}`}
            />
          );
        })}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 4px' }}>
        <span className="data" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>THREADS (0-31)</span>
        <span className="data" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>BANKS (0-31)</span>
      </div>
    </div>
  );
}