// CICDRegressionView.tsx - CI/CD Performance Regression Verification Modal with Lucide Icons
import { useState, useEffect } from 'react';
import { GitCommit, CheckCircle2, AlertTriangle, X, Activity } from 'lucide-react';

interface CIRegressionViewProps {
  currentParams: any;
  onClose: () => void;
}

export function CIRegressionView({ currentParams, onClose }: CIRegressionViewProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'running' | 'passed' | 'failed'>('running');

  useEffect(() => {
    // Simulate CI pipeline execution
    const baselineBlock = 128;
    const currentBlock = Number(currentParams.BLOCK_SIZE) || 128;
    
    const pipelineSteps = [
      { msg: 'Setting up CoreWeaver Physics Engine v1.0.0...', delay: 300 },
      { msg: 'Checking out branch: feature/kernel-optimization', delay: 400 },
      { msg: `Loading baseline configuration (BLOCK_SIZE=${baselineBlock})...`, delay: 500 },
      { msg: `Loading target configuration (BLOCK_SIZE=${currentBlock})...`, delay: 500 },
      { msg: 'Executing comparative physics simulation...', delay: 800 },
    ];

    // Determine pass/fail based on physics rules
    const isRegression = currentBlock < 64 || !!currentParams.enable_divergence;
    
    if (isRegression) {
      pipelineSteps.push({ msg: '[WARN] Sub-optimal block size or warp divergence detected in target branch.', delay: 400 });
      pipelineSteps.push({ msg: '[WARN] Divergence penalty increased cycle latency by >10%.', delay: 400 });
      pipelineSteps.push({ msg: 'Result: REGRESSION DETECTED. Performance dropped below 5% threshold.', delay: 300 });
    } else {
      pipelineSteps.push({ msg: '[INFO] Target branch arithmetic intensity matches baseline expectations.', delay: 400 });
      pipelineSteps.push({ msg: '[INFO] No severe thermal throttling or pipeline stalls detected.', delay: 400 });
      pipelineSteps.push({ msg: 'Result: PASS. Performance is within acceptable HPC tolerances.', delay: 300 });
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
    }, 450);

    return () => clearInterval(interval);
  }, [currentParams]);

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 2000, backdropFilter: 'blur(6px)'
    }}>
      <div style={{ 
        background: 'var(--bg-panel)', width: '700px', maxHeight: '80vh', borderRadius: '12px', 
        border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{ 
          padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--bg-elevated)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GitCommit size={16} color="var(--accent-blue)" />
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>
              CI/CD Kernel Regression Benchmark
            </h3>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={12} />
            <span>Close</span>
          </button>
        </div>
        
        <div style={{ flex: 1, padding: '16px', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '12px', background: 'var(--bg-base)' }}>
          {logs.map((log, i) => (
            <div key={i} style={{ 
              color: log.includes('[WARN]') ? 'var(--accent-amber)' : log.includes('[INFO]') ? 'var(--accent-blue)' : log.includes('PASS') ? 'var(--accent-green)' : log.includes('REGRESSION') ? 'var(--accent-red)' : 'var(--text-secondary)', 
              marginBottom: '6px', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 6 
            }}>
              <Activity size={10} style={{ opacity: 0.5 }} />
              <span>{log}</span>
            </div>
          ))}
          
          {status !== 'running' && (
            <div style={{ 
              marginTop: '16px', padding: '12px', borderRadius: '6px', fontWeight: 600,
              background: status === 'passed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: status === 'passed' ? 'var(--accent-green)' : 'var(--accent-red)',
              border: `1px solid ${status === 'passed' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              {status === 'passed' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>Pipeline Result: {status === 'passed' ? 'ALL CHECKS PASSED' : 'PERFORMANCE REGRESSION DETECTED'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}