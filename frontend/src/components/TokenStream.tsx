import { useSimulationStore } from '../store';

export function TokenStream() {
  const { timeline, currentCycleIndex } = useSimulationStore();

  const visibleTokens = timeline
    .slice(0, currentCycleIndex + 1)
    .map(cycle => cycle.generated_token);
  
  const fullText = visibleTokens.join("");

  return (
    <div style={{ 
      background: '#0d1117', 
      borderRadius: '8px', 
      padding: '1.5rem', 
      fontFamily: 'monospace', 
      fontSize: '1rem',
      color: '#c9d1d9',
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      border: '1px solid #30363d',
      minHeight: '150px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #30363d', paddingBottom: '0.5rem' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }}></div>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }}></div>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }}></div>
        <span style={{ marginLeft: '1rem', color: '#8b949e', fontSize: '0.8rem' }}>LLM Inference Engine - Decoding Phase</span>
      </div>

      <div style={{ flex: 1, lineHeight: '1.5' }}>
        <span style={{ color: '#58a6ff' }}>User Prompt: </span>
        <span style={{ color: '#8b949e' }}>"Explain GPU architecture in one sentence:"</span>
        <br /><br />
        <span style={{ color: '#58a6ff' }}>Model Output: </span>
        
        {/* The dynamically generated text! */}
        <span style={{ color: '#f0f6fc' }}>
          {fullText}
          {/* Blinking cursor effect */}
          <span style={{ 
            display: 'inline-block', 
            width: '8px', 
            height: '16px', 
            backgroundColor: '#58a6ff', 
            marginLeft: '2px',
            animation: 'blink 1s step-end infinite',
            verticalAlign: 'text-bottom'
          }} />
        </span>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}