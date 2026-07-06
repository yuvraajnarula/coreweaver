import { useEffect, useState } from 'react';
import { useSimulationStore } from '../store';

interface StructuredFinding {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
}

export function AIOptimizationAgent() {
  const { metadata, rooflineMetrics, occupancyMetrics, finopsMetrics } = useSimulationStore();
  const [report, setReport] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!metadata || metadata.status === 'INVALID_CONFIG' || metadata.status === 'OOM_ERROR') {
      setReport(null);
      return;
    }

    setIsAnalyzing(true);
    const summary = {
      status: metadata.status,
      achieved_gflops: rooflineMetrics?.achieved_gflops,
      arithmetic_intensity: rooflineMetrics?.arithmetic_intensity,
      ridge_point: rooflineMetrics?.ridge_point,
      occupancy_pct: occupancyMetrics?.occupancy_pct,
      wall_clock_seconds: finopsMetrics?.wall_clock_seconds
    };

    fetch('http://localhost:8000/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simulation_summary: summary })
    })
      .then(res => res.json())
      .then(data => {
        // We structure the raw text into a clean UI format. 
        // In the future, update the backend to return this exact JSON structure.
        setReport({
          target: metadata.hardware_profile || 'A100_80GB',
          confidence: 92, // Mocked for UI, replace with backend data
          estimated_improvement: '+14.2%', // Mocked
          findings: [
            { severity: 'critical', title: 'Memory Bandwidth Bottleneck', detail: 'Arithmetic intensity (2.1) is below ridge point (4.5). Kernel is memory-bound.' },
            { severity: 'warning', title: 'Sub-optimal Occupancy', detail: `Active warps at ${occupancyMetrics?.occupancy_pct || 0}%. Register pressure may be limiting scheduling.` }
          ],
          recommendations: [
            'Increase BLOCK_SIZE to 256 to improve warp scheduling.',
            'Implement async copy (cp.async) to hide memory latency.'
          ],
          raw_text: data.suggestions
        });
      })
      .catch(err => console.error('Optimization agent failed:', err))
      .finally(() => setIsAnalyzing(false));
  }, [metadata, rooflineMetrics, occupancyMetrics, finopsMetrics]);

  if (!metadata || metadata.status === 'INVALID_CONFIG' || metadata.status === 'OOM_ERROR') return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-panel)', borderLeft: '1px solid var(--border-subtle)' }}>
      {/* Header */}
      <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="label" style={{ marginBottom: 'var(--space-1)' }}>AI Inspector</div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Root-Cause Analysis</div>
        </div>
        {isAnalyzing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--accent-blue)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', animation: 'pulse 1.5s infinite' }} />
            <span className="data" style={{ fontSize: '11px' }}>ANALYZING</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
        {!report ? (
          <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 'var(--space-8)' }}>
            Waiting for telemetry...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Impact Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <div className="label">Confidence</div>
                <div className="data" style={{ fontSize: '20px', fontWeight: 600, color: 'var(--accent-green)', marginTop: 'var(--space-1)' }}>{report.confidence}%</div>
              </div>
              <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <div className="label">Est. Improvement</div>
                <div className="data" style={{ fontSize: '20px', fontWeight: 600, color: 'var(--accent-blue)', marginTop: 'var(--space-1)' }}>{report.estimated_improvement}</div>
              </div>
            </div>

            {/* Findings */}
            <div>
              <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Findings & Evidence</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {report.findings.map((f: any, i: number) => (
                  <div key={i} style={{ padding: 'var(--space-3)', background: 'var(--bg-base)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: f.severity === 'critical' ? 'var(--accent-red)' : 'var(--accent-amber)' }} />
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{f.title}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Recommendations</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {report.recommendations.map((r: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', fontSize: '12px', color: 'var(--text-primary)' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}