import { useEffect } from 'react';

interface ControlPanelProps {
  onRunSimulation: (params: any) => void;
  isRunning: boolean;
  params: {
    M: number;
    N: number;
    K: number;
    BLOCK_SIZE: number;
    hardware_profile: string;
  };
  setParams: (params: any) => void;
  onSetBaseline: () => void;
  onRunComparison: () => void;
  hasBaseline: boolean;
}

export function ControlPanel({ 
  onRunSimulation, 
  isRunning, 
  params, 
  setParams,
  onSetBaseline,
  onRunComparison,
  hasBaseline
}: ControlPanelProps) {
  
  const updateParam = (key: string, value: any) => {
    setParams({ ...params, [key]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRunSimulation(params);
  };

  return (
    <div style={{ 
      background: '#1e1e1e', 
      padding: '1.5rem', 
      borderRadius: '8px', 
      color: '#fff',
      marginBottom: '1rem',
      border: '1px solid #333'
    }}>
      <h3 style={{ marginTop: 0, color: '#00ffcc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        ⚙️ Simulation Parameters
      </h3>
      <p style={{ color: '#888', fontSize: '0.85rem', marginTop: 0 }}>
        Adjust the matrix dimensions and Triton block size. The physics engine will calculate the exact cycle count, heat, and memory pressure.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>Matrix M</label>
          <input 
            type="number" 
            value={params.M} 
            onChange={e => updateParam('M', Number(e.target.value))} 
            style={inputStyle} 
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>Matrix N</label>
          <input 
            type="number" 
            value={params.N} 
            onChange={e => updateParam('N', Number(e.target.value))} 
            style={inputStyle} 
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>Matrix K</label>
          <input 
            type="number" 
            value={params.K} 
            onChange={e => updateParam('K', Number(e.target.value))} 
            style={inputStyle} 
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>BLOCK_SIZE</label>
          <select 
            value={params.BLOCK_SIZE} 
            onChange={e => updateParam('BLOCK_SIZE', Number(e.target.value))} 
            style={inputStyle}
          >
            <option value={64}>64</option>
            <option value={128}>128</option>
            <option value={256}>256</option>
          </select>
        </div>
        
        <div style={{ gridColumn: 'span 4' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>Target Hardware</label>
          <select 
            value={params.hardware_profile} 
            onChange={e => updateParam('hardware_profile', e.target.value)} 
            style={inputStyle}
          >
            <option value="A100_80GB">NVIDIA A100 80GB (Data Center)</option>
            <option value="RTX_4090">NVIDIA RTX 4090 24GB (Consumer)</option>
            <option value="RTX_3090">NVIDIA RTX 3090 24GB (Consumer)</option>
            <option value="T4_16GB">NVIDIA T4 16GB (Edge/Server)</option>
          </select>
        </div>
        
        <button 
          type="submit" 
          disabled={isRunning}
          style={{
            gridColumn: 'span 4',
            padding: '0.75rem',
            background: isRunning ? '#555' : '#00ffcc',
            color: isRunning ? '#aaa' : '#000',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            marginTop: '0.5rem'
          }}
        >
          {isRunning ? '⏳ Simulating...' : '🚀 Compile & Run Simulation'}
        </button>

        {/* 👇 A/B COMPARISON BUTTONS 👇 */}
        <div style={{ gridColumn: 'span 4', display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button 
            type="button"
            onClick={onSetBaseline}
            style={{
              flex: 1, padding: '0.75rem', 
              background: hasBaseline ? '#0d1117' : '#21262d', 
              color: hasBaseline ? '#3fb950' : '#58a6ff',
              border: `1px solid ${hasBaseline ? '#3fb950' : '#58a6ff'}`, 
              borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {hasBaseline ? '✅ Baseline (A) Set' : '📌 Save as Baseline (A)'}
          </button>
          <button 
            type="button"
            onClick={onRunComparison}
            disabled={!hasBaseline || isRunning}
            style={{
              flex: 1, padding: '0.75rem', 
              background: !hasBaseline || isRunning ? '#21262d' : '#8957e5', 
              color: !hasBaseline || isRunning ? '#484f58' : '#fff',
              border: 'none', borderRadius: '4px', fontWeight: 'bold', 
              cursor: !hasBaseline || isRunning ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {isRunning ? '⏳ Comparing...' : '⚔️ Compare B against A'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  background: '#2d2d2d',
  border: '1px solid #444',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '1rem'
};