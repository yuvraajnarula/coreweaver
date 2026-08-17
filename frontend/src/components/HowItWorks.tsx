// HowItWorks.tsx - Architecture & Documentation Modal with Lucide Icons
import { BookOpen, Cpu, Zap, Share2, X, Activity } from 'lucide-react';

export function HowItWorksModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'rgba(9, 9, 11, 0.85)',
      backdropFilter: 'blur(8px)'
    }} onClick={onClose}>
      <div style={{
        width: '100%',
        maxWidth: 760,
        maxHeight: '85vh',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-elevated)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen size={16} color="var(--accent-blue)" />
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                CoreWeaver Silicon Architecture Engine
              </h2>
              <div className="label" style={{ marginTop: 2, fontSize: 10 }}>
                Cycle-Accurate Hardware Simulator Specification
              </div>
            </div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={12} />
            <span>Close</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <DocSection
            icon={Cpu}
            title="1. Hardware State Machine & 5-Stage Pipeline"
            description="CoreWeaver evaluates each instruction through Fetch, Decode, Execute, Memory, and Writeback stages. Physical latencies (e.g. 400-cycle off-chip HBM vs 20-cycle SRAM) determine pipeline bubble injection and overall hardware occupancy."
          />

          <DocSection
            icon={Activity}
            title="2. Infrared Thermal Diffusion & Hotspots"
            description="Active Tensor Core compute generates localized heat across the 10x10 SM grid. A 2D thermodynamic diffusion model simulates thermal dissipation to copper heat sinks. Exceeding 90°C triggers automatic clock frequency halving (1500MHz -> 750MHz)."
          />

          <DocSection
            icon={Zap}
            title="3. 32-Bank Shared Memory Bus & Bank Hazards"
            description="Shared memory is partitioned into 32 independent 4-byte banks. When multiple threads within a 32-thread SIMT warp access different addresses residing on the same bank, memory requests are serialized, doubling latency."
          />

          <DocSection
            icon={Share2}
            title="4. Enterprise Telemetry & Cloud FinOps"
            description="Every simulation exports cycle-by-cycle telemetry traces compatible with Python/Pandas analysis. The FinOps engine calculates exact wall-clock time and cloud GPU cost projections per 1,000,000 runs in USD and INR."
          />

        </div>
      </div>
    </div>
  );
}

function DocSection({ icon: Icon, title, description }: { icon: typeof Cpu, title: string, description: string }) {
  return (
    <div style={{
      background: 'var(--bg-base)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 8,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-blue)' }}>
        <Icon size={15} />
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
        {description}
      </p>
    </div>
  );
}