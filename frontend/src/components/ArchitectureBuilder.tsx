// ArchitectureBuilder.tsx - Silicon Architecture Designer & Tape-Out Engine with Lucide Icons
import { useState } from 'react';
import { type CustomArchSpecs } from './SiliconConstraintEngine';
import { SiliconHealthPanel } from './SiliconHealthPanel';
import { Cpu, Layers, Zap, Maximize2, X, CheckCircle2 } from 'lucide-react';

const DEFAULT_ARCH: CustomArchSpecs = {
  name: 'Custom_GPU_v1', node_nm: 5,
  compute: { warp_size: 32, fp32_cores: 1024, tensor_cores: 128, clock_mhz: 1500, pipeline_depth: 20 },
  memory: { regs_per_thread: 255, sram_kb_per_sm: 192, sram_banks: 32, l1_cache_kb: 128, l2_cache_mb: 40, hbm_capacity_gb: 80.0, hbm_bandwidth_gb_s: 2034, hbm_bus_width_bits: 5120 },
  power: { tdp_watts: 300, thermal_limit_c: 90, leakage_factor: 0.2 }
};

type Section = 'compute' | 'memory' | 'power' | 'area';

export function ArchitectureBuilder({ onClose, onSave }: { onClose: () => void, onSave: (arch: CustomArchSpecs) => void }) {
  const [arch, setArch] = useState<CustomArchSpecs>(DEFAULT_ARCH);
  const [activeSection, setActiveSection] = useState<Section>('compute');

  const updateCompute = (key: keyof typeof arch.compute, val: number) => setArch({ ...arch, compute: { ...arch.compute, [key]: val } });
  const updateMemory = (key: keyof typeof arch.memory, val: number) => setArch({ ...arch, memory: { ...arch.memory, [key]: val } });
  const updatePower = (key: keyof typeof arch.power, val: number) => setArch({ ...arch, power: { ...arch.power, [key]: val } });

  // Area & Yield calculations
  const estimated_area_mm2 = (arch.compute.fp32_cores / 10) + (arch.compute.tensor_cores * 0.5) + (arch.memory.sram_kb_per_sm * 0.1);
  const estimated_yield_pct = Math.max(0, 100 - (estimated_area_mm2 / 8)); 

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', background: 'var(--bg-base)' }}>
      {/* Left Sidebar */}
      <aside style={{ width: 260, borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', background: 'var(--bg-panel)' }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="label">Silicon Hierarchy</div>
          <input 
            value={arch.name} onChange={(e) => setArch({...arch, name: e.target.value})}
            className="data"
            style={{ width: '100%', marginTop: 8, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, outline: 'none' }}
          />
        </div>
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NavItem icon={Cpu} label="Compute Cluster" active={activeSection === 'compute'} onClick={() => setActiveSection('compute')} />
          <NavItem icon={Layers} label="Memory Hierarchy" active={activeSection === 'memory'} onClick={() => setActiveSection('memory')} />
          <NavItem icon={Zap} label="Power & Thermal" active={activeSection === 'power'} onClick={() => setActiveSection('power')} />
          <NavItem icon={Maximize2} label="Area & Yield" active={activeSection === 'area'} onClick={() => setActiveSection('area')} />
        </div>
        <div style={{ padding: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8 }}>
          <button className="btn" onClick={onClose} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <X size={12} />
            <span>Cancel</span>
          </button>
          <button className="btn btn-primary" onClick={() => onSave(arch)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <CheckCircle2 size={12} />
            <span>Tape-Out</span>
          </button>
        </div>
      </aside>

      {/* Right Canvas */}
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', overflow: 'hidden' }}>
        <div style={{ padding: 32, overflowY: 'auto' }}>
          
          {activeSection === 'compute' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Cpu size={20} color="var(--accent-blue)" />
                <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Compute & Execution Units</h2>
              </div>
              <p className="label" style={{ marginBottom: 24 }}>Define the core processing topology and clock speeds.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <SliderInput label="Warp Size" value={arch.compute.warp_size} min={16} max={64} step={16} onChange={(v: number) => updateCompute('warp_size', v)} unit="threads" />
                <SliderInput label="FP32 Cores" value={arch.compute.fp32_cores} min={128} max={16384} step={128} onChange={(v: number) => updateCompute('fp32_cores', v)} unit="cores" />
                <SliderInput label="Tensor Cores" value={arch.compute.tensor_cores} min={0} max={1024} step={16} onChange={(v: number) => updateCompute('tensor_cores', v)} unit="cores" />
                <SliderInput label="Clock Speed" value={arch.compute.clock_mhz} min={500} max={3000} step={50} onChange={(v: number) => updateCompute('clock_mhz', v)} unit="MHz" />
              </div>
            </>
          )}

          {activeSection === 'memory' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Layers size={20} color="var(--accent-blue)" />
                <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Memory Hierarchy</h2>
              </div>
              <p className="label" style={{ marginBottom: 24 }}>Configure the silicon memory stack from registers to HBM.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <SliderInput label="Registers / Thread" value={arch.memory.regs_per_thread} min={32} max={255} step={8} onChange={(v: number) => updateMemory('regs_per_thread', v)} unit="regs" />
                <SliderInput label="Shared Memory (SRAM)" value={arch.memory.sram_kb_per_sm} min={16} max={512} step={16} onChange={(v: number) => updateMemory('sram_kb_per_sm', v)} unit="KB" />
                <SliderInput label="HBM Capacity" value={arch.memory.hbm_capacity_gb} min={8} max={192} step={8} onChange={(v: number) => updateMemory('hbm_capacity_gb', v)} unit="GB" />
                <SliderInput label="HBM Bandwidth" value={arch.memory.hbm_bandwidth_gb_s} min={100} max={4000} step={100} onChange={(v: number) => updateMemory('hbm_bandwidth_gb_s', v)} unit="GB/s" />
              </div>
            </>
          )}

          {activeSection === 'power' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Zap size={20} color="var(--accent-blue)" />
                <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Power & Thermal Envelope</h2>
              </div>
              <p className="label" style={{ marginBottom: 24 }}>Define the physical power limits and cooling capacity.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <SliderInput label="TDP Limit" value={arch.power.tdp_watts} min={50} max={700} step={10} onChange={(v: number) => updatePower('tdp_watts', v)} unit="Watts" />
                <SliderInput label="Thermal Throttle Limit" value={arch.power.thermal_limit_c} min={60} max={105} step={1} onChange={(v: number) => updatePower('thermal_limit_c', v)} unit="°C" />
                <SliderInput label="Process Node" value={arch.node_nm} min={3} max={14} step={1} onChange={(v: number) => setArch({...arch, node_nm: v})} unit="nm" />
                <SliderInput label="Leakage Factor" value={arch.power.leakage_factor * 100} min={5} max={40} step={1} onChange={(v: number) => updatePower('leakage_factor', v / 100)} unit="%" />
              </div>
            </>
          )}

          {activeSection === 'area' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Maximize2 size={20} color="var(--accent-blue)" />
                <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Silicon Area & Yield Estimator</h2>
              </div>
              <p className="label" style={{ marginBottom: 24 }}>Physical footprint and manufacturing viability based on current specs.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ padding: 24, background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                  <div className="label">Estimated Die Area</div>
                  <div className="data" style={{ fontSize: 32, fontWeight: 600, marginTop: 8, color: estimated_area_mm2 > 800 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                    {estimated_area_mm2.toFixed(0)} <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>mm²</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
                    {estimated_area_mm2 > 800 ? 'Exceeds standard reticle limit (800mm²). Yield will be severely impacted.' : 'Within standard reticle limits.'}
                  </p>
                </div>
                <div style={{ padding: 24, background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                  <div className="label">Estimated Manufacturing Yield</div>
                  <div className="data" style={{ fontSize: 32, fontWeight: 600, marginTop: 8, color: estimated_yield_pct < 20 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                    {estimated_yield_pct.toFixed(1)} <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>%</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
                    Percentage of functional dies per wafer. Below 20% is commercially unviable.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Inspector: Health Panel */}
        <aside style={{ borderLeft: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', padding: 24, overflowY: 'auto' }}>
          <SiliconHealthPanel arch={arch} />
        </aside>
      </main>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }: { icon: typeof Cpu, label: string, active: boolean, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      style={{ 
        padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
        background: active ? 'var(--bg-elevated)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: active ? 500 : 400,
        transition: 'all 0.15s'
      }}
    >
      <Icon size={14} />
      <span>{label}</span>
    </div>
  );
}

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit: string;
}

function SliderInput({ label, value, min, max, step, onChange, unit }: SliderInputProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="label">{label}</span>
        <span className="data" style={{ color: 'var(--text-primary)' }}>{value} <span style={{ color: 'var(--text-tertiary)' }}>{unit}</span></span>
      </div>
      <input 
        type="range" min={min} max={max} step={step} value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
      />
    </div>
  );
}