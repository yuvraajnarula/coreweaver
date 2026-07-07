import {type  CustomArchSpecs } from './SiliconConstraintEngine';

export interface KernelValidationError {
  line: number | null;
  message: string;
  severity: 'error' | 'warning';
}

export function validateKernelScript(code: string, arch: CustomArchSpecs): KernelValidationError[] {
  const errors: KernelValidationError[] = [];
  const lines = code.split('\n');
  
  let estimated_sram_bytes = 0;
  lines.forEach((line, idx) => {
    const sharedMatch = line.match(/__shared__\s+(float|int|double|half)\s+\w+\s*\[(\d+)\]/);
    if (sharedMatch) {
      const typeSize = sharedMatch[1] === 'double' ? 8 : sharedMatch[1] === 'float' ? 4 : sharedMatch[1] === 'half' ? 2 : 4;
      const count = parseInt(sharedMatch[2]);
      estimated_sram_bytes += typeSize * count;
    }
  });

  const estimated_sram_kb = estimated_sram_bytes / 1024;
  if (estimated_sram_kb > arch.memory.sram_kb_per_sm) {
    errors.push({
      line: null,
      message: `Kernel requires ~${estimated_sram_kb.toFixed(1)}KB of Shared Memory, but custom architecture only provides ${arch.memory.sram_kb_per_sm}KB per SM.`,
      severity: 'error'
    });
  }

  
  const vectorCount = (code.match(/float4|int4|double2/g) || []).length;
  const localVars = (code.match(/\b(float|int)\s+\w+\s*=/g) || []).length;
  
  if ((vectorCount * 4 + localVars) > arch.memory.regs_per_thread * 0.8) {
    errors.push({
      line: null,
      message: `High register pressure detected. Custom arch limit is ${arch.memory.regs_per_thread} regs/thread. Expect severe register spilling to local memory.`,
      severity: 'warning'
    });
  }

  
  lines.forEach((line, idx) => {
    if (line.match(/if\s*\(.*threadIdx/)) {
      errors.push({
        line: idx + 1,
        message: `Thread-dependent branch detected. This will cause Warp Divergence on your custom ${arch.compute.warp_size}-thread warp, serializing execution.`,
        severity: 'warning'
      });
    }
  });

  return errors;
}