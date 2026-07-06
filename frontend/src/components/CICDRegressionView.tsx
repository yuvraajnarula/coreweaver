import { useState } from 'react';

interface CIRegressionViewProps {
  currentParams: any;
  onClose: () => void;
}

export function CIRegressionView({ currentParams, onClose }: CIRegressionViewProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'running' | 'passed' | 'failed'>('running');

  useState(() => {
    // Simulate CI pipeline execution
    const baselineBlock = 128;
    const currentBlock = currentParams.BLOCK_SIZE;
    
    const pipelineSteps = [
      { msg: 'Setting up CoreWeaver Physics Engine v1.0.0...', delay: 300 },
      { msg: 'Checking out branch: feature/kernel-optimization', delay: 400 },
      { msg: `Loading baseline configuration (BLOCK_SIZE=${baselineBlock})...`, delay: 500 },
      { msg: `Loading target configuration (BLOCK_SIZE=${currentBlock})...`, delay: 500 },
      { msg: 'Executing comparative physics simulation...', delay: 800 },
    ];

    // Determine pass/fail based on mock logic (e.g., if they dropped block size below 64, fail)
    const isRegression = currentBlock < 64 || currentParams.enable_divergence;
    
    if (isRegression) {
      pipelineSteps.push({ msg: '[WARN] Thermal throttling detected in target branch.', delay: 400 });
      pipelineSteps.push({ msg: '[WARN] Warp divergence penalty increased cycle count by 12%.', delay: 400 });
      pipelineSteps.push({ msg: 'Result: REGRESSION DETECTED. Performance dropped below 5% threshold.', delay: 300 });
    } else {
      pipelineSteps.push({ msg: '[INFO] Target branch arithmetic intensity matches baseline.', delay: 400 });
      pipelineSteps.push({ msg: '[INFO] No thermal throttling or pipeline bubbles detected.', delay: 400 });
      pipelineSteps.push({ msg: 'Result: PASS. Performance within 2% of baseline.', delay: 300 });
    }

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < pipelineSteps.length) {
        setLogs(prev => [...prev, pipelineSteps[currentLogIndex].msg]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
        setStatus(isRegression ? 'failed' : 'passed');
      }
    }, 500);

    return () => clearInterval(interval);
  });

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{ 
        background: '#0d1117', width: '700px', maxHeight: '80vh', borderRadius: '8px', 
        border: '1px solid #30363d', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '1rem', borderBottom: '1px solid #30363d', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, color: '#c9d1d9', fontSize: '1rem' }}>
            CI/CD Performance Regression Check
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.2rem' }}>
            X
          </button>
        </div>
        
        <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          {logs.map((log, i) => (
            <div key={i} style={{ color: log.includes('[WARN]') ? '#d29922' : log.includes('[INFO]') ? '#58a6ff' : '#c9d1d9', marginBottom: '0.5rem' }}>
              {log}
            </div>
          ))}
          
          {status !== 'running' && (
            <div style={{ 
              marginTop: '1rem', padding: '0.75rem', borderRadius: '4px', fontWeight: 'bold',
              background: status === 'passed' ? 'rgba(63, 185, 80, 0.1)' : 'rgba(248, 81, 73, 0.1)',
              color: status === 'passed' ? '#3fb950' : '#f85149',
              border: `1px solid ${status === 'passed' ? '#3fb950' : '#f85149'}`
            }}>
              Pipeline {status === 'passed' ? 'PASSED' : 'FAILED'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}