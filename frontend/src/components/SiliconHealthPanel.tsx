import { validateArchitecture, type CustomArchSpecs } from './SiliconConstraintEngine';

export function SiliconHealthPanel({ arch }: { arch: CustomArchSpecs }) {
  const alerts = validateArchitecture(arch);
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Silicon Health & Constraints</span>
        <div style={{ display: 'flex', gap: 12 }}>
          {criticalCount > 0 && (
            <span className="data" style={{ fontSize: 11, color: 'var(--accent-red)' }}>
              {criticalCount} CRITICAL
            </span>
          )}
          {warningCount > 0 && (
            <span className="data" style={{ fontSize: 11, color: 'var(--accent-amber)' }}>
              {warningCount} WARNINGS
            </span>
          )}
          {criticalCount === 0 && warningCount === 0 && (
            <span className="data" style={{ fontSize: 11, color: 'var(--accent-green)' }}>
              ALL CONSTRAINTS MET
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
        {alerts.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontSize: 12, textAlign: 'center', padding: 16 }}>
            Architecture is physically feasible. Ready for tape-out.
          </p>
        ) : (
          alerts.map((alert, i) => (
            <div key={i} style={{ 
              padding: 12, borderRadius: 6, 
              background: alert.severity === 'critical' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)',
              border: `1px solid ${alert.severity === 'critical' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ 
                  color: alert.severity === 'critical' ? 'var(--accent-red)' : 'var(--accent-amber)', 
                  fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' 
                }}>
                  {alert.severity === 'critical' ? '● CRITICAL' : '● WARNING'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{alert.title}</span>
              </div>
              <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{alert.description}</p>
              <div className="label" style={{ marginTop: 8 }}>Affected: {alert.affected_metric}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}