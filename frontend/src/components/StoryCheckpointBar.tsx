// StoryCheckpointBar.tsx - Interactive Story Checkpointing Navigation Bar with Lucide Icons
import { useSimulationStore } from '../store';
import { Flag, Download, Zap, Flame, AlertTriangle, HardDrive, Sparkles } from 'lucide-react';

const CATEGORY_CONFIG: Record<string, { bg: string; text: string; border: string; icon: typeof Download }> = {
  fetch: { bg: 'rgba(59, 130, 246, 0.12)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.35)', icon: Download },
  sram: { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.35)', icon: Zap },
  compute: { bg: 'rgba(16, 185, 129, 0.12)', text: '#34d399', border: 'rgba(16, 185, 129, 0.35)', icon: Flame },
  throttle: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.4)', icon: AlertTriangle },
  writeback: { bg: 'rgba(168, 85, 247, 0.12)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.35)', icon: HardDrive },
};

export function StoryCheckpointBar() {
  const { checkpoints, currentCycleIndex, jumpToCheckpoint, timeline } = useSimulationStore();

  if (!checkpoints || checkpoints.length === 0 || timeline.length === 0) {
    return null;
  }

  // Find current nearest checkpoint
  let activeCp = checkpoints[0];
  for (let i = checkpoints.length - 1; i >= 0; i--) {
    if (currentCycleIndex >= checkpoints[i].cycleIndex) {
      activeCp = checkpoints[i];
      break;
    }
  }

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 8,
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
    }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-blue)' }}>
            <Flag size={13} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Story Checkpoints
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            Jump to key micro-architectural milestones
          </span>
        </div>
        <div className="data" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          Cycle <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{currentCycleIndex + 1}</span> / {timeline.length}
        </div>
      </div>

      {/* Checkpoint Pills Horizontal Track */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        overflowX: 'auto',
        paddingBottom: 2
      }}>
        {checkpoints.map((cp, idx) => {
          const isSelected = activeCp.id === cp.id;
          const conf = CATEGORY_CONFIG[cp.category] || CATEGORY_CONFIG.compute;
          const IconComponent = conf.icon || Sparkles;

          return (
            <button
              key={cp.id}
              onClick={() => jumpToCheckpoint(cp.cycleIndex)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                border: `1px solid ${isSelected ? conf.text : 'var(--border-subtle)'}`,
                background: isSelected ? conf.bg : 'var(--bg-base)',
                color: isSelected ? conf.text : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: isSelected ? 600 : 500,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? `0 0 10px ${conf.border}` : 'none'
              }}
              title={cp.description}
            >
              <IconComponent size={13} />
              <span>{idx + 1}. {cp.title}</span>
              <span style={{
                fontSize: 9,
                padding: '1px 5px',
                borderRadius: 4,
                background: isSelected ? 'rgba(0,0,0,0.3)' : 'var(--bg-elevated)',
                color: isSelected ? '#fff' : 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)'
              }}>
                CY {String(cp.cycleNumber).padStart(2, '0')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
