import { useState } from 'react';
import {type CustomArchSpecs } from './SiliconConstraintEngine';
import { SiliconHealthPanel } from './SiliconHealthPanel';

const DEFAULT_ARCH: CustomArchSpecs = {
  name: 'Custom_GPU_v1',
  node_nm: 5,
  compute: { warp_size: 32, fp32_cores: 1024, tensor_cores: 128, clock_mhz: 1500, pipeline_depth: 20 },
  memory: { regs_per_thread: 255, sram_kb_per_sm: 192, sram_banks: 32, l1_cache_kb: 128, l2_cache_mb: 40, hbm_capacity_gb: 80.0, hbm_bandwidth_gb_s: 2034, hbm_bus_width_bits: 5120 },
  power: { tdp_watts: 300, thermal_limit_c: 90, leakage_factor: 0.2 }
};

export function ArchitectureBuilder({ onClose, onSave }: { onClose: () => void, onSave: (arch: CustomArchSpecs) => void }) {
  const [arch, setArch] = useState<CustomArchSpecs>(DEFAULT_ARCH);

  const updateCompute = (key: keyof typeof arch.compute, val: number) => setArch({ ...arch, compute: { ...arch.compute, [key]: val } });
  const updateMemory = (key: keyof typeof arch.memory, val: number) => setArch({ ...arch, memory: { ...arch.memory, [key]: val } });
  const updatePower = (key: keyof typeof power, val: number) => setArch({ ...arch, power: { ...arch.power, [key]: val } });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', background: 'var(--bg-base)' }}>
      {/* Left Sidebar: Hierarchy */}
      <aside style={{ width: 260, borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', background: 'var(--bg-panel)' }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="label">Silicon Hierarchy</div>
          <input 
            value={arch.name} 
            onChange={(e) => setArch({...arch, name: e.target.value})}
            className="data"
            style={{ width: '100%', marginTop: 8, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, outline: 'none' }}
          />
        </div>
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NavItem icon="⬡" label="Compute Cluster" active />
          <NavItem icon="≡" label="Memory Hierarchy" />
          <NavItem icon="⚡" label="Power & Thermal" />
          <NavItem icon="◱" label="Area & Yield" />
        </div>
        <div style={{ padding: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8 }}>
          <button className="btn" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(arch)} style={{ flex: 1 }}>Tape-Out</button>
        </div>
      </aside>

      {/* Right Canvas: Configuration */}
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', overflow: 'hidden' }}>
        <div style={{ padding: 32, overflowY: 'auto' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Compute & Execution Units</h2>
          <p className="label" style={{ marginBottom: 24 }}>Define the core processing topology and clock speeds.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <SliderInput label="Warp Size" value={arch.compute.warp_size} min={16} max={64} step={16} onChange={(v) => updateCompute('warp_size', v)} unit="threads" />
            <SliderInput label="FP32 Cores" value={arch.compute.fp32_cores} min={128} max={16384} step={128} onChange={(v) => updateCompute('fp32_cores', v)} unit="cores" />
            <SliderInput label="Tensor Cores" value={arch.compute.tensor_cores} min={0} max={1024} step={16} onChange={(v) => updateCompute('tensor_cores', v)} unit="cores" />
            <SliderInput label="Clock Speed" value={arch.compute.clock_mhz} min={500} max={3000} step={50} onChange={(v) => updateCompute('clock_mhz', v)} unit="MHz" />
          </div>

          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Memory Hierarchy</h2>
            <p className="label" style={{ marginBottom: 24 }}>Configure the silicon memory stack from registers to HBM.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <SliderInput label="Registers / Thread" value={arch.memory.regs_per_thread} min={32} max={255} step={8} onChange={(v) => updateMemory('regs_per_thread', v)} unit="regs" />
              <SliderInput label="Shared Memory (SRAM)" value={arch.memory.sram_kb_per_sm} min={16} max={512} step={16} onChange={(v) => updateMemory('sram_kb_per_sm', v)} unit="KB" />
              <SliderInput label="HBM Capacity" value={arch.memory.hbm_capacity_gb} min={8} max={192} step={8} onChange={(v) => updateMemory('hbm_capacity_gb', v)} unit="GB" />
              <SliderInput label="HBM Bandwidth" value={arch.memory.hbm_bandwidth_gb_s} min={100} max={4000} step={100} onChange={(v) => updateMemory('hbm_bandwidth_gb_s', v)} unit="GB/s" />
            </div>
          </div>
        </div>

        {/* Right Inspector: Health Panel */}
        <aside style={{ borderLeft: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', padding: 24, overflowY: 'auto' }}>
          <SiliconHealthPanel arch={arch} />
        </aside>
      </main>
    </div>
  );
}

// --- Sub-components ---

function NavItem({ icon, label, active }: { icon: string, label: string, active?: boolean }) {
  return (
    <div style={{ 
      padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
      background: active ? 'var(--bg-elevated)' : 'transparent',
      color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
      display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: active ? 500 : 400
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span> {label}
    </div>
  );
}

function SliderInput({ label, value, min, max, step, onChange, unit }: any) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="label">{label}</span>
        <span className="data" style={{ color: 'var(--text-primary)' }}>{value} <span style={{ color: 'var(--text-tertiary)' }}>{unit}</span></span>
      </div>
      <input 
        type="range" 
        min={min} max={max} step={step} value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
      />
    </div>
  );
}