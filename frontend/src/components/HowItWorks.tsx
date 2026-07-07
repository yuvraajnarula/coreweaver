export function HowItWorksModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(9, 9, 11, 0.85)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 720, background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>System Architecture & Guide</h2>
            <p className="label" style={{ marginTop: 4 }}>CoreWeaver Physics Engine Documentation</p>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '6px 10px', fontSize: 12 }}>Close</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Workflow Section */}
          <Section title="01. Execution Workflows" subtitle="Two ways to configure the silicon">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InfoCard 
                title="Natural Language Compiler" 
                desc="Describe your workload in plain English. The AI Agent (powered by Groq) parses your intent and extracts exact M, N, K dimensions and hardware profiles."
                tag="AI Agent"
              />
              <InfoCard 
                title="Manual Configuration" 
                desc="Fine-tune matrix dimensions, threadblock sizes, and toggle micro-architectural features like async copy, kernel fusion, and warp divergence injection."
                tag="Control Panel"
              />
            </div>
          </Section>

          {/* Profiler Section */}
          <Section title="02. The Profiler Canvas" subtitle="Cycle-by-cycle telemetry and analysis">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <RowItem label="Execution Tab" value="Pipeline Gantt, Warp Divergence, and Token Stream generation." />
              <RowItem label="Silicon Tab" value="Infrared thermal mapping and SRAM bus routing matrices." />
              <RowItem label="Analysis Tab" value="Academic Roofline model, Nsight-style CUPTI counters, and FinOps cost analysis." />
            </div>
          </Section>

          {/* Sharing Section */}
          <Section title="03. Enterprise Sharing" subtitle="Redis-backed state persistence">
            <div style={{ padding: 16, background: 'var(--bg-base)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                Generate a secure, time-limited share link for your team. The link encapsulates your exact kernel configuration. 
                Links are stored in a distributed Redis cache with a <span className="data" style={{ color: 'var(--accent-blue)' }}>1-hour TTL</span> and are automatically evicted to ensure zero state bloat.
              </p>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: any) {
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        <div className="label" style={{ marginTop: 2 }}>{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function InfoCard({ title, desc, tag }: any) {
  return (
    <div style={{ padding: 16, background: 'var(--bg-base)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
        <span className="label" style={{ fontSize: 9, padding: '2px 6px', background: 'var(--bg-elevated)', borderRadius: 4 }}>{tag}</span>
      </div>
      <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>{desc}</p>
    </div>
  );
}

function RowItem({ label, value }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-base)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}