// StoryNarrativeCard.tsx - Microarchitecture Physics Narrative HUD with Lucide Icons
import { useSimulationStore } from '../store';
import { Cpu, AlertTriangle, Zap, Flame, Download, HardDrive, Sparkles, Activity } from 'lucide-react';

export function StoryNarrativeCard() {
  const { timeline, currentCycleIndex, checkpoints } = useSimulationStore();
  const currentCycle = timeline[currentCycleIndex];

  if (!currentCycle) return null;

  // Find nearest story checkpoint
  let matchedCp = checkpoints.find(cp => cp.cycleIndex === currentCycleIndex);
  if (!matchedCp && checkpoints.length > 0) {
    for (let i = checkpoints.length - 1; i >= 0; i--) {
      if (currentCycleIndex >= checkpoints[i].cycleIndex) {
        matchedCp = checkpoints[i];
        break;
      }
    }
  }

  const instruction = currentCycle.instruction;
  const isConflict = currentCycle.hardware_state.bank_conflict;
  const isThermalStall = instruction === 'STALL_THERMAL';
  const isTensorCrunch = instruction === 'MMA_SYNC';
  const isLoad = instruction === 'LOAD_HBM';
  const isStore = instruction === 'STORE_HBM';

  let phaseTag = 'SIMT Execution';
  let phaseColor = 'var(--accent-blue)';
  let PhaseIcon = Activity;
  let narrativeText = currentCycle.description;

  if (isThermalStall) {
    phaseTag = 'Thermal Throttle Emergency';
    phaseColor = 'var(--accent-amber)';
    PhaseIcon = AlertTriangle;
    narrativeText = `Silicon junction temperature reached ${currentCycle.hardware_state.current_temperature}°C (>90°C critical threshold). Clock speed throttled to ${currentCycle.hardware_state.clock_speed_mhz} MHz with 300 NOP bubble cycles.`;
  } else if (isConflict) {
    phaseTag = 'SRAM Bank Collision';
    phaseColor = 'var(--accent-red)';
    PhaseIcon = Zap;
    narrativeText = `Bank hazard detected in Shared Memory (SRAM). Memory requests serialized, inflating memory latency by +${currentCycle.pipeline_metrics.bubble_cycles} stall cycles.`;
  } else if (isTensorCrunch) {
    phaseTag = 'Tensor Core Acceleration';
    phaseColor = 'var(--accent-green)';
    PhaseIcon = Flame;
    narrativeText = `Streaming Multiprocessors crunching matrix tiles with Tensor Cores. Power draw: ${currentCycle.micro_state.power_watts}W / ${currentCycle.micro_state.tdp_limit}W TDP.`;
  } else if (isLoad) {
    phaseTag = 'Global Memory Streaming';
    phaseColor = '#60a5fa';
    PhaseIcon = Download;
    narrativeText = `Transferring FP16 matrix tiles from off-chip HBM into L1/Shared Memory. Memory controller executing ${currentCycle.micro_state.memory_transactions} transaction(s).`;
  } else if (isStore) {
    phaseTag = 'Epilogue Result Writeback';
    phaseColor = '#c084fc';
    PhaseIcon = HardDrive;
    narrativeText = `Accumulator registers flushed back to global High Bandwidth Memory (HBM). Ready for next inference / training step.`;
  } else {
    PhaseIcon = Cpu;
  }

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 8,
      padding: '14px 16px',
      marginBottom: 16,
      borderLeft: `4px solid ${phaseColor}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 4,
            background: 'var(--bg-elevated)',
            color: phaseColor,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}>
            <PhaseIcon size={12} />
            <span>{phaseTag}</span>
          </span>
          {matchedCp && (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              {matchedCp.title}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-tertiary)' }}>
          <span>Op: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{instruction}</strong></span>
          <span>•</span>
          <span>Latency: <strong style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>{currentCycle.pipeline_metrics.total_latency} cy</strong></span>
          <span>•</span>
          <span>Temp: <strong style={{ color: currentCycle.hardware_state.current_temperature > 85 ? 'var(--accent-red)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{currentCycle.hardware_state.current_temperature}°C</strong></span>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        {narrativeText}
      </p>

      {matchedCp && matchedCp.metricsSnapshot && (
        <div style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-tertiary)',
          background: 'var(--bg-base)',
          padding: '4px 8px',
          borderRadius: 4,
          border: '1px solid var(--border-subtle)',
          width: 'fit-content',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <Sparkles size={11} color="var(--accent-blue)" />
          <span>Snapshot: {matchedCp.metricsSnapshot}</span>
        </div>
      )}
    </div>
  );
}
