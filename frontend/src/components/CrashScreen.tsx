// CrashScreen.tsx - CUDA Hardware Fault & OOM Crash Handler with Lucide Icons
import { useSimulationStore } from '../store';
import { AlertTriangle } from 'lucide-react';

export function CrashScreen() {
  const { metadata, memoryBreakdown } = useSimulationStore();

  if (!metadata || (metadata.status !== 'OOM_ERROR' && metadata.status !== 'INVALID_CONFIG')) return null;

  const isOOM = metadata.status === 'OOM_ERROR';
  const errorTitle = isOOM ? "CUDA ERROR: Out of Memory (OOM)" : "CUDA ERROR: Invalid Configuration";
  const borderColor = isOOM ? 'var(--accent-red)' : 'var(--accent-amber)';
  const textColor = isOOM ? '#f87171' : '#fbbf24';

  return (
    <div style={{ 
      background: 'var(--bg-panel)', borderRadius: '8px', padding: '24px', 
      fontFamily: 'var(--font-mono)', color: textColor, border: `1px solid ${borderColor}`,
      maxWidth: '800px', margin: '24px auto', boxShadow: `0 0 30px rgba(239, 68, 68, 0.15)`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${borderColor}` }}>
        <AlertTriangle size={18} color={borderColor} />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '0.02em' }}>
          {errorTitle}
        </h3>
      </div>
      
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: 12 }}>
{`Hardware Profile: ${metadata.hardware_profile}

${isOOM && memoryBreakdown ? `Available VRAM:   ${memoryBreakdown.total_available_gb.toFixed(2)} GB (5% reserved for OS/Display)

Requested Memory Breakdown (FP16 Precision):
  Matrix A (M x K):  ${memoryBreakdown.matrix_a_gb.toFixed(2).padStart(6)} GB
  Matrix B (K x N):  ${memoryBreakdown.matrix_b_gb.toFixed(2).padStart(6)} GB
  Matrix C (M x N):  ${memoryBreakdown.matrix_c_gb.toFixed(2).padStart(6)} GB
  --------------------------------
  Total Requested:  ${memoryBreakdown.total_requested_gb.toFixed(2).padStart(6)} GB
` : ''}
> ${metadata.error_message}

> Traceback: The kernel launch was aborted by the CUDA driver. 
  Please adjust your parameters to match the physical constraints 
  of the selected silicon.`}
      </pre>
    </div>
  );
}