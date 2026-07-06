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
      background: '#161b22', borderRadius: '8px', padding: '1rem', 
      border: '1px solid #30363d', marginBottom: '1rem' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.2rem' }}>AI</span>
        <h3 style={{ margin: 0, color: '#c9d1d9', fontSize: '1rem' }}>AI Hardware Compiler</h3>
        <span style={{ fontSize: '0.75rem', color: '#8b949e', background: '#21262d', padding: '2px 6px', borderRadius: '4px' }}>
          Describe your workload in plain English
        </span>
      </div>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='e.g., "Run Llama-3 8B attention head on an RTX 4090, sequence length 8k"'
          disabled={isLoading}
          style={{
            flex: 1, padding: '0.75rem', background: '#0d1117', border: '1px solid #30363d',
            borderRadius: '6px', color: '#c9d1d9', fontSize: '0.95rem', outline: 'none'
          }}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: '0 1.5rem', background: isLoading ? '#21262d' : '#238636',
            color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: '0.95rem'
          }}
        >
          {isLoading ? 'Compiling...' : 'Compile'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: '0.5rem', color: '#f85149', fontSize: '0.85rem', fontFamily: 'monospace' }}>
          Error: {error}
        </div>
      )}
    </div>
  );
}