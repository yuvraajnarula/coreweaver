export interface CustomArchSpecs {
  name: string;
  node_nm: number;
  compute: {
    warp_size: number;
    fp32_cores: number;
    tensor_cores: number;
    clock_mhz: number;
    pipeline_depth: number;
  };
  memory: {
    regs_per_thread: number;
    sram_kb_per_sm: number;
    sram_banks: number;
    l1_cache_kb: number;
    l2_cache_mb: number;
    hbm_capacity_gb: number;
    hbm_bandwidth_gb_s: number;
    hbm_bus_width_bits: number;
  };
  power: {
    tdp_watts: number;
    thermal_limit_c: number;
    leakage_factor: number;
  };
}

export interface ConstraintAlert {
  severity: 'critical' | 'warning' | 'info';
  category: 'Power' | 'Memory' | 'Compute' | 'Area';
  title: string;
  description: string;
  affected_metric: string;
}

export function validateArchitecture(arch: CustomArchSpecs): ConstraintAlert[] {
  const alerts: ConstraintAlert[] = [];

  const compute_flops = arch.compute.fp32_cores * 2 * arch.compute.clock_mhz * 1e6;
  const required_bw_gb_s = (compute_flops * 4) / 1e9; 
  
  if (arch.memory.hbm_bandwidth_gb_s < required_bw_gb_s * 0.5) {
    alerts.push({
      severity: 'critical',
      category: 'Memory',
      title: 'Severe Memory Starvation',
      description: `Compute units can demand ${required_bw_gb_s.toFixed(0)} GB/s, but HBM bus is limited to ${arch.memory.hbm_bandwidth_gb_s} GB/s. Compute utilization will drop below 20%.`,
      affected_metric: 'HBM Bandwidth'
    });
  }


  const estimated_tdp = (arch.compute.fp32_cores * 0.05) + 
                        (arch.compute.tensor_cores * 0.5) + 
                        (arch.memory.hbm_capacity_gb * 2);
                        
  if (estimated_tdp > arch.power.tdp_watts * 1.1) {
    alerts.push({
      severity: 'critical',
      category: 'Power',
      title: 'TDP Envelope Exceeded',
      description: `Estimated silicon power draw (${estimated_tdp.toFixed(0)}W) exceeds your configured TDP limit (${arch.power.tdp_watts}W). The chip will physically throttle or fail to boot.`,
      affected_metric: 'Thermal Design Power'
    });
  }


  if (arch.memory.regs_per_thread < 64 && arch.compute.warp_size === 32) {
    alerts.push({
      severity: 'warning',
      category: 'Compute',
      title: 'Low Register File Capacity',
      description: 'With less than 64 registers per thread, complex kernels will suffer from severe register spilling to local memory, destroying performance.',
      affected_metric: 'Registers/Thread'
    });
  }


  const sram_per_tensor = arch.memory.sram_kb_per_sm / Math.max(1, arch.compute.tensor_cores / 64);
  if (sram_per_tensor < 2.0 && arch.compute.tensor_cores > 0) {
    alerts.push({
      severity: 'warning',
      category: 'Memory',
      title: 'SRAM Starvation for Tensor Cores',
      description: 'Tensor cores require high-bandwidth shared memory. Your SRAM allocation per tensor cluster is too low, leading to pipeline stalls.',
      affected_metric: 'SRAM per SM'
    });
  }
  
  const estimated_area_mm2 = (arch.compute.fp32_cores / 10) + (arch.compute.tensor_cores * 0.5) + (arch.memory.sram_kb_per_sm * 0.1);
  if (estimated_area_mm2 > 800) {
    alerts.push({
      severity: 'critical',
      category: 'Area',
      title: 'Exceeds Reticle Limit',
      description: `Estimated die size (${estimated_area_mm2.toFixed(0)} mm²) exceeds the standard 800 mm² reticle limit. Manufacturing yield will drop drastically, making this commercially unviable.`,
      affected_metric: 'Estimated Die Area'
    });
  }

  return alerts;
}