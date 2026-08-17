// ControlPanel.tsx - Kernel Configuration & Simulation Controls
import { useSimulationStore } from '../store';
import { STORY_PRESETS } from '../utils/storyPresets';
import { runClientSimulation } from '../utils/clientSimulator';

interface ControlPanelProps {
  params: any;
  setParams: (params: any) => void;
  onRunSimulation: (params: any) => void;
  isRunning: boolean;
  onSetBaseline: () => void;
  onRunComparison: () => void;
  hasBaseline: boolean;
}

export function ControlPanel({ params, setParams, onRunSimulation, isRunning, onSetBaseline, onRunComparison, hasBaseline }: ControlPanelProps) {
  const { loadFullSimulation } = useSimulationStore();

  const updateParam = (key: string, value: any) => {
    setParams({ ...params, [key]: value });
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = STORY_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setParams(preset.params);
      const result = runClientSimulation(preset.params);
      loadFullSimulation(result);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>
      
      {/* Story Presets Selector */}
      <FieldGroup title="Interactive Story Presets" subtitle="Load curated micro-architectural scenarios">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
          {STORY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              style={{
                padding: '10px 12px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 6,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-blue)';
                e.currentTarget.style.background = 'var(--bg-elevated)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.background = 'var(--bg-base)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{preset.name}</span>
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--bg-elevated)', color: 'var(--accent-blue)' }}>
                  {preset.badge}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.3 }}>
                {preset.subtitle}
              </div>
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* Group 1: Matrix Dimensions */}
      <FieldGroup title="Matrix Dimensions" subtitle="Define the GEMM workload (M x N x K)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <NumberInput label="M (Rows)" value={params.M} onChange={(v) => updateParam('M', v)} />
          <NumberInput label="N (Cols)" value={params.N} onChange={(v) => updateParam('N', v)} />
          <NumberInput label="K (Depth)" value={params.K} onChange={(v) => updateParam('K', v)} />
        </div>
      </FieldGroup>

      {/* Group 2: Threadblock & Hardware */}
      <FieldGroup title="Threadblock & Hardware Target" subtitle="Execution configuration and silicon profile">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          <NumberInput label="BLOCK_SIZE" value={params.BLOCK_SIZE} onChange={(v) => updateParam('BLOCK_SIZE', v)} />
          <SelectInput 
            label="Hardware Profile" 
            value={params.hardware_profile} 
            onChange={(v) => updateParam('hardware_profile', v)}
            options={['A100_80GB', 'H100_80GB', 'RTX_4090', 'RTX_3090', 'MI300X', 'T4_16GB']}
          />
        </div>
      </FieldGroup>

      {/* Group 3: Advanced Optimizations */}
      <FieldGroup title="Advanced Optimizations" subtitle="Toggle micro-architectural features">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <Toggle label="Coalesced Memory Access" description="Align global memory loads to 128-byte boundaries" checked={params.coalesced_memory} onChange={(v) => updateParam('coalesced_memory', v)} />
          <Toggle label="Async Copy (cp.async)" description="Hide memory latency using shared memory pipelines" checked={params.enable_async_copy} onChange={(v) => updateParam('enable_async_copy', v)} />
          <Toggle label="Kernel Fusion" description="Fuse multiple operations to reduce VRAM traffic" checked={params.enable_fusion} onChange={(v) => updateParam('enable_fusion', v)} />
          <Toggle label="Simulate Divergence" description="Inject control-flow divergence for analysis" checked={params.enable_divergence} onChange={(v) => updateParam('enable_divergence', v)} />
        </div>
      </FieldGroup>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn" onClick={onSetBaseline}>
            {hasBaseline ? 'Update Baseline' : 'Set Baseline'}
          </button>
          <button className="btn" onClick={onRunComparison} disabled={!hasBaseline} style={{ opacity: hasBaseline ? 1 : 0.5 }}>
            Run A/B Comparison
          </button>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => onRunSimulation(params)} 
          disabled={isRunning}
          style={{ padding: '10px 24px', fontSize: 13, fontWeight: 600 }}
        >
          {isRunning ? 'Compiling & Profiling...' : 'Compile & Run Kernel'}
        </button>
      </div>
    </div>
  );
}

function FieldGroup({ title, subtitle, children }: { title: string, subtitle: string, children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        <div className="label" style={{ marginTop: 2 }}>{subtitle}</div>
      </div>
      <div style={{ padding: 16 }}>
        {children}
      </div>
    </div>
  );
}

function NumberInput({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div>
      <label className="label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="data"
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'var(--bg-base)',
          border: '1px solid var(--border-default)',
          borderRadius: 6,
          color: 'var(--text-primary)',
          fontSize: 13,
          outline: 'none',
          transition: 'border-color 0.15s'
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border-default)'}
      />
    </div>
  );
}

function SelectInput({ label, value, onChange, options }: { label: string, value: string, onChange: (v: string) => void, options: string[] }) {
  return (
    <div>
      <label className="label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="data"
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'var(--bg-base)',
          border: '1px solid var(--border-default)',
          borderRadius: 6,
          color: 'var(--text-primary)',
          fontSize: 13,
          outline: 'none',
          cursor: 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a1a1aa' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center'
        }}
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string, description: string, checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <div 
      onClick={() => onChange(!checked)}
      style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: 12, background: 'var(--bg-base)', borderRadius: 6, 
        border: `1px solid ${checked ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
        cursor: 'pointer', transition: 'all 0.15s'
      }}
    >
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{description}</div>
      </div>
      <div style={{ 
        width: 32, height: 18, borderRadius: 9, 
        background: checked ? 'var(--accent-blue)' : 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        position: 'relative', transition: 'background 0.15s', flexShrink: 0, marginLeft: 12
      }}>
        <div style={{ 
          width: 12, height: 12, borderRadius: '50%', background: '#fff', 
          position: 'absolute', top: 2, left: checked ? 16 : 2, 
          transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }} />
      </div>
    </div>
  );
}