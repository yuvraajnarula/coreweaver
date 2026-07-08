import { type CycleData, type SimulationMetadata, type RooflineMetrics, type FinOpsMetrics } from '../store';

export function exportToJSON(timeline: CycleData[], metadata: SimulationMetadata, roofline: RooflineMetrics | null, finops: FinOpsMetrics | null): void {
  if (!metadata) return;

  const exportData = {
    metadata: {
      export_timestamp: new Date().toISOString(),
      simulator_version: "2.0.0",
      hardware_profile: metadata.hardware_profile,
      total_cycles: timeline.length
    },
    timeline: timeline.map(cycle => ({
      cycle: cycle.cycle,
      instruction: cycle.instruction,
      temperature_c: cycle.hardware_state.current_temperature,
      power_watts: cycle.micro_state.power_watts,
      efficiency_pct: cycle.pipeline_metrics.efficiency_pct
    })),
    summary: {
      avg_temperature: timeline.length > 0 ? timeline.reduce((sum, c) => sum + c.hardware_state.current_temperature, 0) / timeline.length : 0,
      peak_temperature: timeline.length > 0 ? Math.max(...timeline.map(c => c.hardware_state.current_temperature)) : 0,
      avg_power: timeline.length > 0 ? timeline.reduce((sum, c) => sum + c.micro_state.power_watts, 0) / timeline.length : 0,
      total_time_seconds: finops?.wall_clock_seconds || 0,
      
      // 🚀 ADDED: Include Roofline metrics in the export summary
      // This makes the exported JSON much more valuable for post-simulation analysis
      achieved_gflops: roofline?.achieved_gflops || 0,
      arithmetic_intensity: roofline?.arithmetic_intensity || 0,
      ridge_point: roofline?.ridge_point || 0,
      peak_compute_gflops: roofline?.peak_compute_gflops || 0,
      peak_mem_bw: roofline?.peak_mem_bw || 0
    }
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `coreweaver_trace_${metadata.hardware_profile}_${Date.now()}.json`);
}

export function exportToCSV(timeline: CycleData[]): void {
  const headers = ['Cycle', 'Instruction', 'Temperature_C', 'Power_Watts', 'Efficiency_Pct', 'Bank_Conflict', 'Clock_MHz'];
  const rows = timeline.map(cycle => [
    cycle.cycle, cycle.instruction, cycle.hardware_state.current_temperature,
    cycle.micro_state.power_watts, cycle.pipeline_metrics.efficiency_pct,
    cycle.hardware_state.bank_conflict ? 'YES' : 'NO', cycle.hardware_state.clock_speed_mhz
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  downloadBlob(blob, `coreweaver_trace_${Date.now()}.csv`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}