import { useMemo } from 'react';
import { useSimulationStore } from '../store';

export function TokenStream() {
  const { timeline, currentCycleIndex, metadata } = useSimulationStore();
  
  // Extract tokens up to the current cycle
  const tokens = useMemo(() => {
    return timeline.slice(0, currentCycleIndex + 1).map(c => c.generated_token).filter(Boolean);
  }, [timeline, currentCycleIndex]);

  const totalTokens = tokens.length;
  const elapsedCycles = currentCycleIndex + 1;
  const tokensPerCycle = elapsedCycles > 0 ? (totalTokens / elapsedCycles).toFixed(2) : '0.00';

  if (!metadata || tokens.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--bg-panel)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
        <div className="label">Awaiting Generation</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Tokens will stream here during execution.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 16, background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden' }}>
      
      {/* Terminal Output */}
      <div style={{ flex: 1, padding: 16, background: 'var(--bg-base)', borderRight: '1px solid var(--border-subtle)', maxHeight: 200, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)' }} />
          <span className="label">LLM Generation Stream</span>
        </div>
        <div style={{ 
          fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.6, 
          color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all'
        }}>
          {tokens.map((token, i) => (
            <span 
              key={i} 
              style={{ 
                background: i === tokens.length - 1 ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                padding: i === tokens.length - 1 ? '0 2px' : '0',
                borderRadius: 2,
                transition: 'background 0.2s'
              }}
            >
              {token}
            </span>
          ))}
          <span style={{ display: 'inline-block', width: 8, height: 14, background: 'var(--text-primary)', marginLeft: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }} />
        </div>
      </div>

      {/* Stats Sidebar */}
      <div style={{ width: 160, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div className="label">Total Tokens</div>
          <div className="data" style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{totalTokens}</div>
        </div>
        <div>
          <div className="label">Tokens / Cycle</div>
          <div className="data" style={{ fontSize: 16, fontWeight: 500, color: 'var(--accent-blue)', marginTop: 4 }}>{tokensPerCycle}</div>
        </div>
        <div>
          <div className="label">Progress</div>
          <div className="data" style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            {currentCycleIndex + 1} / {timeline.length} cycles
          </div>
        </div>
      </div>
    </div>
  );
}