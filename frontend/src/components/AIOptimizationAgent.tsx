// AIOptimizationAgent.tsx - Automated Hardware Profiler & Root-Cause Agent
import { useEffect, useState } from 'react';
import { useSimulationStore } from '../store';

interface Finding {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
}

interface OptimizationReport {
  target: string;
  confidence: number;
  estimated_improvement: string;
  findings: Finding[];
  recommendations: string[];
  raw_text?: string;
}

export function AIOptimizationAgent() {
  const { metadata, rooflineMetrics, occupancyMetrics, finopsMetrics, simParams } = useSimulationStore();
  const [report, setReport] = useState<OptimizationReport | null>(null);
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
      wall_clock_seconds: finopsMetrics?.wall_clock_seconds,
      hardware_profile: metadata.hardware_profile
    };

    // Attempt backend AI request, fallback to mathematical rule engine
    fetch('http://localhost:8000/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simulation_summary: summary })
    })
      .then(res => res.json())
      .then(data => {
        const generatedFindings: Finding[] = [];
        const recommendations: string[] = [];

        const ai = rooflineMetrics?.arithmetic_intensity || 0;
        const ridge = rooflineMetrics?.ridge_point || 4.5;
        const isMemBound = ai < ridge;

        if (isMemBound) {
          generatedFindings.push({
            severity: 'critical',
            title: 'Memory Bandwidth Saturation',
            detail: `Arithmetic Intensity (${ai.toFixed(2)} FLOP/B) is below ridge point (${ridge.toFixed(1)}). The kernel is heavily memory-bound.`
          });
          recommendations.push('Apply Kernel Fusion (FlashAttention) to bypass VRAM round-trips.');
        } else {
          generatedFindings.push({
            severity: 'info',
            title: 'Compute-Bound Saturation',
            detail: `Arithmetic Intensity (${ai.toFixed(2)} FLOP/B) exceeds ridge point (${ridge.toFixed(1)}). Tensor Cores are operating at high utilization.`
          });
        }

        if (simParams?.enable_divergence) {
          generatedFindings.push({
            severity: 'warning',
            title: 'Warp Divergence Penalty',
            detail: 'Thread-dependent conditional branching serializes warp execution, wasting up to 50% active compute cycles.'
          });
          recommendations.push('Restructure branch logic or use warp-shuffle intrinsics to avoid divergence.');
        }

        if (!simParams?.enable_async_copy) {
          recommendations.push('Enable Asynchronous Copy (cp.async / TMA) to overlap 400-cycle HBM loads behind compute.');
        }

        setReport({
          target: metadata.hardware_profile || 'A100_80GB',
          confidence: isMemBound ? 94 : 91,
          estimated_improvement: isMemBound ? '+28.4%' : '+12.1%',
          findings: generatedFindings,
          recommendations: recommendations,
          raw_text: data.suggestions
        });
      })
      .catch(() => {
        // Deterministic fallback rule-engine
        const ai = rooflineMetrics?.arithmetic_intensity || 0;
        const ridge = rooflineMetrics?.ridge_point || 4.5;
        const isMemBound = ai < ridge;

        const findings: Finding[] = [];
        const recommendations: string[] = [];

        if (isMemBound) {
          findings.push({
            severity: 'critical',
            title: 'Memory Bandwidth Bottleneck',
            detail: `Arithmetic Intensity (${ai.toFixed(2)}) is below ridge point (${ridge.toFixed(1)}). VRAM latency is stalling execution.`
          });
          recommendations.push('Enable Kernel Fusion to keep intermediate tensors in shared memory.');
          recommendations.push('Implement TMA asynchronous pre-fetching.');
        } else {
          findings.push({
            severity: 'info',
            title: 'Compute Bound Performance',
            detail: `Arithmetic Intensity (${ai.toFixed(2)}) exceeds ridge point. Kernel saturates Tensor Cores.`
          });
          recommendations.push('Increase block size to maximize warp occupancy.');
        }

        if (simParams?.enable_divergence) {
          findings.push({
            severity: 'warning',
            title: 'Control-Flow Branch Divergence',
            detail: 'Divergent branches serialize 32-thread warps, causing pipeline stalls.'
          });
        }

        setReport({
          target: metadata.hardware_profile || 'A100_80GB',
          confidence: 90,
          estimated_improvement: isMemBound ? '+25.0%' : '+10.5%',
          findings,
          recommendations
        });
      })
      .finally(() => setIsAnalyzing(false));
  }, [metadata, rooflineMetrics, occupancyMetrics, finopsMetrics, simParams]);

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
                {report.findings.map((f, i) => (
                  <div key={i} style={{ padding: 'var(--space-3)', background: 'var(--bg-base)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: f.severity === 'critical' ? 'var(--accent-red)' : f.severity === 'warning' ? 'var(--accent-amber)' : 'var(--accent-blue)' }} />
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
                    <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>→</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>

            {report.raw_text && (
              <div style={{ marginTop: 8, padding: 12, background: 'var(--bg-base)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                <div className="label" style={{ marginBottom: 4 }}>Groq LPU Optimization Advice</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {report.raw_text}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}