import { useSimulationStore } from '../store';

export function CrashScreen() {
  const { metadata, memoryBreakdown } = useSimulationStore();

  if (!metadata || (metadata.status !== 'OOM_ERROR' && metadata.status !== 'INVALID_CONFIG')) return null;

  const isOOM = metadata.status === 'OOM_ERROR';
  const errorTitle = isOOM ? "CUDA ERROR: Out of Memory (OOM)" : "CUDA ERROR: Invalid Configuration";
  const borderColor = isOOM ? '#f85149' : '#d29922'; // Red for OOM, Yellow/Orange for Config
  const textColor = isOOM ? '#ff7b72' : '#e3b341';

  return (
    <div style={{ 
      background: '#0d1117', borderRadius: '8px', padding: '2rem', 
      fontFamily: 'monospace', color: textColor, border: `2px solid ${borderColor}`,
      maxWidth: '800px', margin: '2rem auto', boxShadow: `0 0 20px ${borderColor}33`
    }}>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
{`======================================================================
= ${errorTitle}
======================================================================
Hardware Profile: ${metadata.hardware_profile}

${isOOM && memoryBreakdown ? `
Available VRAM:   ${memoryBreakdown.total_available_gb.toFixed(2)} GB (5% reserved for OS/Display)

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
  of the selected silicon.
======================================================================`}
      </pre>
    </div>
  );
}