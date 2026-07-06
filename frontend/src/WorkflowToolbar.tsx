import { useRef } from 'react';
import { useSimulationStore } from './store';

interface WorkflowToolbarProps {
  params: any;
  setParams: (params: any) => void;
  onRunSimulation: (params: any) => void;
}

export function WorkflowToolbar({ params, setParams, onRunSimulation }: WorkflowToolbarProps) {
  const { timeline, metadata, memoryBreakdown, rooflineMetrics, finopsMetrics } = useSimulationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const exportData = { timeline, metadata, memoryBreakdown, rooflineMetrics, finopsMetrics, params };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coreweaver_trace_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    const searchParams = new URLSearchParams({
      m: params.M.toString(), n: params.N.toString(), k: params.K.toString(),
      block: params.BLOCK_SIZE.toString(), hw: params.hardware_profile,
      div: params.enable_divergence ? '1' : '0',
      coal: params.coalesced_memory ? '1' : '0',
      async: params.enable_async_copy ? '1' : '0',
      fuse: params.enable_fusion ? '1' : '0',
    });
    const url = `${window.location.origin}?${searchParams.toString()}`;
    navigator.clipboard.writeText(url);
    alert('Shareable link copied to clipboard');
  };

  const handleImportTrace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        if (json.simParams) {
          setParams(json.simParams);
          setTimeout(() => onRunSimulation(json.simParams), 100);
          alert('PyTorch Trace imported and simulation started');
        } else {
          alert('Invalid Trace File: Missing "simParams" object.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadMockTrace = () => {
    const mockTrace = {
      "version": "1.0",
      "simParams": {
        "M": 8192, "N": 8192, "K": 4096, "BLOCK_SIZE": 256,
        "hardware_profile": "RTX_4090", "enable_divergence": false,
        "coalesced_memory": true, "enable_async_copy": true, "enable_fusion": true
      }
    };
    const blob = new Blob([JSON.stringify(mockTrace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mock_pytorch_trace.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ 
      background: '#161b22', borderRadius: '8px', padding: '1rem', 
      border: '1px solid #30363d', marginBottom: '1rem',
      display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap'
    }}>
      <span style={{ color: '#8b949e', fontSize: '0.85rem', fontWeight: 'bold' }}>Enterprise Workflow:</span>
      
      <button onClick={handleShare} style={btnStyle('#58a6ff')}>
        Copy Share Link
      </button>
      
      <button onClick={handleExport} disabled={timeline.length === 0} style={btnStyle('#3fb950', timeline.length === 0)}>
        Export Telemetry (JSON)
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button onClick={() => fileInputRef.current?.click()} style={btnStyle('#bc8cff')}>
          Import PyTorch Trace
        </button>
        <input 
          type="file" 
          ref={fileInputRef}
          accept=".json" 
          onChange={handleImportTrace} 
          style={{ display: 'none' }} 
        />
        <button onClick={downloadMockTrace} style={{...btnStyle('#484f58'), fontSize: '0.75rem', padding: '0.4rem 0.8rem'}}>
          (Download Mock)
        </button>
      </div>
    </div>
  );
}

const btnStyle = (color: string, disabled = false): React.CSSProperties => ({
  padding: '0.5rem 1rem',
  background: disabled ? '#21262d' : 'transparent',
  color: disabled ? '#484f58' : color,
  border: `1px solid ${disabled ? '#30363d' : color}`,
  borderRadius: '6px',
  fontWeight: 'bold',
  fontSize: '0.85rem',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s ease'
});