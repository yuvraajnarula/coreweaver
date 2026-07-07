// AICommandBar.tsx
import { useState } from 'react';

interface AICommandBarProps {
  onParamsExtracted: (params: any) => void;
}

export function AICommandBar({ onParamsExtracted }: AICommandBarProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to analyze prompt');
      }

      const data = await response.json();
      
      // Pass the extracted parameters up to the App to trigger the simulation!
      onParamsExtracted(data.params);
      setPrompt(''); // Clear input
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      background: 'var(--bg-panel)', 
      border: '1px solid var(--border-subtle)', 
      borderRadius: 8, 
      overflow: 'hidden',
      transition: 'border-color 0.2s'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid var(--border-subtle)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'var(--bg-elevated)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-blue)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Natural Language Compiler</span>
        </div>
        <span className="label" style={{ fontSize: 10 }}>
          Describe workload in plain English
        </span>
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='e.g., "Run Llama-3 8B attention head on an RTX 4090, sequence length 8k"'
            disabled={isLoading}
            className="data"
            style={{
              width: '100%',
              padding: '12px 16px',
              paddingRight: '100px', // Space for the absolute button
              background: 'var(--bg-base)',
              border: '1px solid var(--border-default)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
              transition: 'border-color 0.15s',
              fontFamily: 'var(--font-mono)'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-default)'}
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              padding: '6px 12px',
              background: isLoading || !prompt.trim() ? 'var(--bg-elevated)' : 'var(--text-primary)',
              color: isLoading || !prompt.trim() ? 'var(--text-tertiary)' : 'var(--bg-base)',
              border: 'none',
              borderRadius: 4,
              fontWeight: 600,
              cursor: isLoading || !prompt.trim() ? 'not-allowed' : 'pointer',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'all 0.15s'
            }}
          >
            {isLoading ? 'Parsing...' : 'Compile'}
          </button>
        </div>

        {error && (
          <div style={{ 
            padding: '8px 12px', 
            background: 'rgba(239, 68, 68, 0.05)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            borderRadius: 4, 
            color: 'var(--accent-red)', 
            fontSize: 11, 
            fontFamily: 'var(--font-mono)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span style={{ fontWeight: 600 }}>⚠</span>
            <span>{error}</span>
          </div>
        )}
      </form>
    </div>
  );
}