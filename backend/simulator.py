import math


HARDWARE_PROFILES = {
    "A100_80GB": {
        "vram_gb": 80.0, "name": "NVIDIA A100 80GB", "bandwidth": 2034, "sram_kb": 192, 
        "peak_tflops": 312.0, "tdp_watts": 300.0, "max_regs_per_sm": 65536, 
        "max_threads_per_sm": 2048, "cost_per_hour": 3.50
    },
    "H100_80GB": {
        "vram_gb": 80.0, "name": "NVIDIA H100 SXM5 80GB", "bandwidth": 3350, "sram_kb": 228, 
        "peak_tflops": 989.0, "tdp_watts": 700.0, "max_regs_per_sm": 65536, 
        "max_threads_per_sm": 2048, "cost_per_hour": 4.50
    },
    "RTX_4090": {
        "vram_gb": 24.0, "name": "NVIDIA RTX 4090 24GB", "bandwidth": 1008, "sram_kb": 100, 
        "peak_tflops": 330.0, "tdp_watts": 450.0, "max_regs_per_sm": 65536, 
        "max_threads_per_sm": 1536, "cost_per_hour": 1.50
    },
    "RTX_3090": {
        "vram_gb": 24.0, "name": "NVIDIA RTX 3090 24GB", "bandwidth": 936, "sram_kb": 100, 
        "peak_tflops": 280.0, "tdp_watts": 350.0, "max_regs_per_sm": 65536, 
        "max_threads_per_sm": 1536, "cost_per_hour": 1.00
    },
    "MI300X": {
        "vram_gb": 192.0, "name": "AMD Instinct MI300X 192GB", "bandwidth": 5300, "sram_kb": 256, 
        "peak_tflops": 1300.0, "tdp_watts": 750.0, "max_regs_per_sm": 65536, 
        "max_threads_per_sm": 2048, "cost_per_hour": 4.00
    },
    "T4_16GB": {
        "vram_gb": 16.0, "name": "NVIDIA T4 16GB", "bandwidth": 320, "sram_kb": 96, 
        "peak_tflops": 65.0, "tdp_watts": 70.0, "max_regs_per_sm": 65536, 
        "max_threads_per_sm": 1024, "cost_per_hour": 0.50
    }
}


def custom_arch_to_gpu_specs(arch: dict) -> dict:
    """Translates the frontend Custom Architecture JSON into the engine's internal specs."""
    compute = arch.get('compute', {})
    memory = arch.get('memory', {})
    power = arch.get('power', {})
    
    fp32_cores = compute.get('fp32_cores', 1024)
    clock_mhz = compute.get('clock_mhz', 1500)
    # Heuristic: TFLOPS = (Cores * 2 ops/FLOP * Clock_Hz) / 1e12
    peak_tflops = (fp32_cores * 2 * clock_mhz * 1e6) / 1e12 
    
    warp_size = compute.get('warp_size', 32)
    
    return {
        "vram_gb": memory.get('hbm_capacity_gb', 80.0),
        "name": arch.get('name', 'Custom GPU'),
        "bandwidth": memory.get('hbm_bandwidth_gb_s', 2034),
        "sram_kb": memory.get('sram_kb_per_sm', 192),
        "peak_tflops": peak_tflops,
        "tdp_watts": power.get('tdp_watts', 300),
        "max_regs_per_sm": 65536, 
        "max_threads_per_sm": warp_size * 64, # Assuming 64 warps per SM max
        "cost_per_hour": round(power.get('tdp_watts', 300) * 0.01, 2) # Heuristic cloud cost
    }

BYTES_PER_CYCLE = 1500 
FLOPS_PER_CYCLE = 200000 

MOCK_TOKENS = [
    "The", " future", " of", " AI", " is", " highly", " parallel", " and", " extremely", " fast", ".", 
    " It", " relies", " on", " massive", " matrix", " multiplications", " to", " scale", " intelligence", ".",
    " By", " leveraging", " Tensor", " Cores", ",", " we", " can", " process", " billions", " of", " parameters", ".",
    " However", ",", " memory", " bandwidth", " often", " becomes", " the", " primary", " bottleneck", ".",
    " Optimizing", " SRAM", " usage", " and", " avoiding", " bank", " conflicts", " is", " critical", " for", " peak", " performance", ".",
    " Ultimately", ",", " hardware", " and", " software", " must", " co-design", " to", " unlock", " true", " potential", "."
]

class GPUPhysicsEngine:
    def __init__(self):
        self.reset_state()

    def reset_state(self):
        self.current_temp = 45.0
        self.clock_speed = 1500
        self.allocated_blocks = []
        self.thermal_map = [45.0] * 100
        self.timeline = []
        self.cycle_count = 0
        self.params = {}
        self.gpu_specs = HARDWARE_PROFILES['A100_80GB'] # Default fallback

    def calculate_thermal_diffusion(self, heat_source_indices, heat_amount):
        new_map = self.thermal_map.copy()
        for idx in heat_source_indices:
            if 0 <= idx < 100:
                new_map[idx] += heat_amount
                row, col = divmod(idx, 10)
                for n in [(row-1, col), (row+1, col), (row, col-1), (row, col+1)]:
                    if 0 <= n[0] < 10 and 0 <= n[1] < 10:
                        new_map[n[0]*10 + n[1]] += (heat_amount * 0.2)
        self.thermal_map = [max(35.0, t - 1.5) for t in new_map]

    def validate_config(self, params, gpu_specs):
        M, N, K = params['M'], params['N'], params['K']
        BLOCK_SIZE = params['BLOCK_SIZE']

        total_elements = M * N * K
        if total_elements > 10_000_000_000:  # 10 billion element limit
            return False, f"Matrix size ({M}x{N}x{K} = {total_elements:,} elements) exceeds maximum compute limit (10B elements) to prevent browser memory exhaustion."
        
        if M > 100_000 or N > 100_000 or K > 100_000:
            return False, "Individual matrix dimensions cannot exceed 100,000."

        if M <= 0 or N <= 0 or K <= 0:
            return False, "Matrix dimensions (M, N, K) must be strictly greater than 0."
        if BLOCK_SIZE % 32 != 0:
            return False, f"BLOCK_SIZE ({BLOCK_SIZE}) is not a multiple of the hardware Warp Size (32)."
        if BLOCK_SIZE > 1024:
            return False, f"BLOCK_SIZE ({BLOCK_SIZE}) exceeds the absolute hardware limit of 1024 threads per block."
        
        sram_bytes_needed = 2 * (BLOCK_SIZE * BLOCK_SIZE) * 2 
        sram_kb_needed = sram_bytes_needed / 1024
        max_sram_kb = gpu_specs['sram_kb']
        
        if sram_kb_needed > max_sram_kb:
            return False, f"Block requires {sram_kb_needed:.1f} KB of Shared Memory (SRAM), but {gpu_specs['name']} only has {max_sram_kb} KB per SM."
            
        return True, ""


    def generate_timeline(self, params: dict, custom_arch: dict = None):
        self.reset_state()
        self.params = params
        

        if custom_arch:
            self.gpu_specs = custom_arch_to_gpu_specs(custom_arch)
        else:
            hardware_key = params.get('hardware_profile', 'A100_80GB')
            self.gpu_specs = HARDWARE_PROFILES.get(hardware_key, HARDWARE_PROFILES['A100_80GB'])
            
        gpu_specs = self.gpu_specs
        
        is_valid, error_msg = self.validate_config(params, gpu_specs)
        if not is_valid:
            return {
                "metadata": {"status": "INVALID_CONFIG", "error_message": error_msg, "hardware_profile": gpu_specs['name'], "total_cycles": 0},
                "timeline": []
            }

        M, N, K = params['M'], params['N'], params['K']
        BLOCK_SIZE = params['BLOCK_SIZE']
        
        available_vram_gb = gpu_specs['vram_gb'] * 0.95 
        bytes_a, bytes_b, bytes_c = (M * K) * 2, (K * N) * 2, (M * N) * 2
        total_bytes = bytes_a + bytes_b + bytes_c
        
        is_fused = self.params.get('enable_fusion', False)
        if is_fused:
            total_bytes = int(total_bytes * 0.5)

        total_flops = 2 * M * N * K
        total_requested_gb = total_bytes / (1024**3)
        
        memory_breakdown = {
            "matrix_a_gb": round(bytes_a / (1024**3), 2), "matrix_b_gb": round(bytes_b / (1024**3), 2),
            "matrix_c_gb": round(bytes_c / (1024**3), 2), "total_requested_gb": round(total_requested_gb, 2),
            "total_available_gb": round(available_vram_gb, 2), "gpu_name": gpu_specs['name']
        }

        if total_requested_gb > available_vram_gb:
            return {
                "metadata": {"status": "OOM_ERROR", "error_message": f"CUDA Out of Memory. Requested {total_requested_gb:.2f} GB, but only {available_vram_gb:.2f} GB is available.", "hardware_profile": gpu_specs['name'], "total_cycles": 0},
                "memory_breakdown": memory_breakdown, "timeline": []
            }

        total_vram_gb_visual = (total_bytes / 1e9) * 10 
        blocks_needed = min(100, max(1, int(total_vram_gb_visual))) 
        has_conflict = (BLOCK_SIZE == 64 and K % 32 != 0) 
        
        true_mem_cycles = total_bytes / BYTES_PER_CYCLE
        true_compute_cycles = total_flops / FLOPS_PER_CYCLE
        true_total_cycles = true_mem_cycles + true_compute_cycles + 2

        MIN_VISUAL, MAX_VISUAL = 20, 100
        dynamic_cycles = MIN_VISUAL + int(total_flops / 1e9)
        total_visual_cycles = min(MAX_VISUAL, max(MIN_VISUAL, dynamic_cycles))

        load_cycles = max(2, int((true_mem_cycles / true_total_cycles) * total_visual_cycles))
        math_cycles = max(2, total_visual_cycles - load_cycles - 2)

        total_gflops = total_flops / 1e9
        target_temp_rise_math = min(70.0, total_gflops * 5.0) 
        heat_per_math_cycle = target_temp_rise_math / math_cycles if math_cycles > 0 else 0
        
        total_gb = total_bytes / 1e9
        target_temp_rise_load = min(20.0, total_gb * 2.0) 
        heat_per_load = target_temp_rise_load / load_cycles if load_cycles > 0 else 0
        heat_per_store = 3.0 

        regs_per_thread = 32 + (BLOCK_SIZE // 16) 
        max_regs = gpu_specs['max_regs_per_sm']
        max_threads = gpu_specs['max_threads_per_sm']
        
        threads_per_block = BLOCK_SIZE
        blocks_by_regs = max_regs // (regs_per_thread * threads_per_block)
        blocks_by_threads = max_threads // threads_per_block
        active_blocks = min(blocks_by_regs, blocks_by_threads)
        active_threads = active_blocks * threads_per_block
        occupancy_pct = round((active_threads / max_threads) * 100, 1)

        occupancy_metrics = {
            "regs_per_thread": regs_per_thread,
            "active_warps": (active_threads // 32),
            "max_warps": (max_threads // 32),
            "occupancy_pct": occupancy_pct
        }

        enable_div = self.params.get('enable_divergence', False)
        is_coalesced = self.params.get('coalesced_memory', True)
        is_async = self.params.get('enable_async_copy', False)

        for i in range(load_cycles):
            self.cycle_count += 1
            self.allocated_blocks = list(range(int((i+1)/load_cycles * blocks_needed)))
            self.calculate_thermal_diffusion([10, 11, 20, 21], heat_per_load)
            sram = [{"thread_id": 0, "bank_id": 12, "address": 1}, {"thread_id": 1, "bank_id": 12, "address": 2}] if (has_conflict and i == 1) else [{"thread_id": 0, "bank_id": 4, "address": 0}, {"thread_id": 1, "bank_id": 5, "address": 0}]
            self.timeline.append(self._build_cycle("LOAD_HBM", "Loading tiles from HBM to SRAM", 7, sram, has_conflict and i==1, enable_div, is_coalesced, is_async))

        tensor_cores = [33, 34, 43, 44]
        for i in range(math_cycles):
            self.cycle_count += 1
            self.calculate_thermal_diffusion(tensor_cores, heat_per_math_cycle)
            self.timeline.append(self._build_cycle("MMA_SYNC", "Tensor Cores executing MAC operations", 11, [], False, enable_div, is_coalesced, is_async))

        self.cycle_count += 1
        self.calculate_thermal_diffusion([80, 81], heat_per_store)
        self.timeline.append(self._build_cycle("STORE_HBM", "Writing result matrix to HBM", 14, [], False, enable_div, is_coalesced, is_async))

        max_temp = max(self.thermal_map)
        status = "SUCCESS"
        if max_temp > 90.0:
            status = "SUCCESS_WITH_THROTTLE"
            self.cycle_count += 1
            self.clock_speed = 750
            self.calculate_thermal_diffusion([], 0.0)
            self.timeline.append(self._build_cycle("STALL_THERMAL", "CRITICAL: Thermal limit reached. Clock throttled.", 11, [], False, enable_div, is_coalesced, is_async))
            self.clock_speed = 1500

        arithmetic_intensity = total_flops / total_bytes if total_bytes > 0 else 0
        peak_compute_gflops = gpu_specs['peak_tflops'] * 1000 
        peak_mem_bw = gpu_specs['bandwidth'] 
        
        efficiency = 0.85
        if has_conflict: efficiency *= 0.5
        if status == "SUCCESS_WITH_THROTTLE": efficiency *= 0.6
        
        mem_achieved = arithmetic_intensity * peak_mem_bw 
        compute_achieved = peak_compute_gflops * efficiency
        achieved_gflops = min(mem_achieved, compute_achieved)

        roofline_metrics = {
            "arithmetic_intensity": round(arithmetic_intensity, 2),
            "achieved_gflops": round(achieved_gflops, 2),
            "peak_compute_gflops": peak_compute_gflops,
            "peak_mem_bw": peak_mem_bw,
            "ridge_point": round(peak_compute_gflops / peak_mem_bw, 2)
        }

        base_clock_hz = 1500 * 1e6 
        true_wall_clock_seconds = true_total_cycles / base_clock_hz
        hourly_rate = gpu_specs.get('cost_per_hour', 3.50)
        kernel_cost_usd = (true_wall_clock_seconds / 3600.0) * hourly_rate
        
        finops_metrics = {
            "true_total_cycles": int(true_total_cycles),
            "wall_clock_seconds": round(true_wall_clock_seconds, 6),
            "hourly_rate_usd": hourly_rate,
            "kernel_cost_usd": round(kernel_cost_usd, 8),
            "cost_per_million_runs": round(kernel_cost_usd * 1_000_000, 2)
        }
        
        cupti_counters = self.generate_cupti_counters({
            "metadata": {"status": status, "occupancy_metrics": occupancy_metrics},
            "roofline_metrics": roofline_metrics,
            "memory_breakdown": memory_breakdown,
            "finops_metrics": finops_metrics
        })
        
        return {
            "metadata": {
                "status": status, "hardware_profile": gpu_specs['name'], 
                "total_cycles": self.cycle_count,
                "occupancy_metrics": occupancy_metrics
            },
            "memory_breakdown": memory_breakdown,
            "roofline_metrics": roofline_metrics,
            "finops_metrics": finops_metrics,
            "cupti_counters": cupti_counters,
            "timeline": self.timeline
        }

    def _build_cycle(self, instruction, description, source_line, sram_access, bank_conflict, enable_divergence=False, coalesced_memory=True, enable_async_copy=False):
        conflict_details = "Bank conflict detected on SRAM_BANK_12" if bank_conflict else ""
        max_temp = max(self.thermal_map)
        token_idx = min(self.cycle_count - 1, len(MOCK_TOKENS) - 1)

        pipeline_trace = [
            {"stage": "FETCH", "cycles": 4, "status": "NORMAL"},
            {"stage": "DECODE", "cycles": 4, "status": "NORMAL"},
            {"stage": "EXECUTE", "cycles": 10, "status": "NORMAL"},
            {"stage": "MEMORY", "cycles": 10, "status": "NORMAL"},
            {"stage": "WRITEBACK", "cycles": 4, "status": "NORMAL"}
        ]

        if instruction in ["LOAD_HBM", "STORE_HBM"]:
            pipeline_trace[3]["cycles"] = 400
            pipeline_trace[3]["stage"] = "MEMORY (VRAM)"
        elif instruction == "MMA_SYNC":
            block_size = self.params.get('BLOCK_SIZE', 128)
            math_cycles = max(20, int((block_size / 16) * 10))
            pipeline_trace[2]["cycles"] = math_cycles
            pipeline_trace[2]["stage"] = "EXECUTE (Tensor)"

        if bank_conflict:
            block_size = self.params.get('BLOCK_SIZE', 128)
            conflict_penalty = max(1, block_size // 32) * 50
            pipeline_trace[3]["cycles"] += conflict_penalty
            pipeline_trace[3]["status"] = "CONFLICT"
            
        if instruction == "STALL_THERMAL":
            pipeline_trace[2]["cycles"] = 0
            pipeline_trace[3]["cycles"] = 0
            pipeline_trace.insert(2, {"stage": "NOP (Thermal Bubble)", "cycles": 300, "status": "STALL"})

        if enable_async_copy and instruction == "LOAD_HBM" and self.cycle_count > 1:
            pipeline_trace[3]["cycles"] = 0 
            pipeline_trace[3]["stage"] = "ASYNC MEM (Hidden)"
            pipeline_trace[3]["status"] = "OVERLAP"


        tdp = self.gpu_specs['tdp_watts']
        idle_power = tdp * 0.20
        
        math_power = (pipeline_trace[2]["cycles"] / 100.0) * (tdp * 0.60)
        mem_power = (pipeline_trace[3]["cycles"] / 400.0) * (tdp * 0.30)
        
        current_power_watts = min(tdp * 1.1, idle_power + math_power + mem_power)
        
        power_throttled = False
        if current_power_watts > tdp:
            power_throttled = True
            current_power_watts = tdp

        warp_pattern = []
        if instruction in ["LOAD_HBM", "STORE_HBM"]:
            if coalesced_memory:
                warp_pattern = [1000 + (i * 4) for i in range(32)]
            else:
                warp_pattern = [1000 + (i * 128) for i in range(32)]
                
        transactions = 1 if coalesced_memory else 32

        divergence_info = None
        if enable_divergence and instruction == "MMA_SYNC":
            divergence_info = {
                "has_divergence": True,
                "path_a_cycles": 15,
                "path_b_cycles": 10,
                "serialized_penalty": 10 
            }
            pipeline_trace[2]["cycles"] += divergence_info["serialized_penalty"]
            pipeline_trace[2]["status"] = "DIVERGENT"

        total_latency = sum(stage["cycles"] for stage in pipeline_trace)
        bubble_cycles = sum(stage["cycles"] for stage in pipeline_trace if stage["status"] in ["STALL", "CONFLICT", "DIVERGENT"])
        efficiency_pct = round(((total_latency - bubble_cycles) / total_latency) * 100, 1) if total_latency > 0 else 100.0

        return {
            "cycle": self.cycle_count,
            "instruction": instruction,
            "description": description,
            "source_line": source_line,
            "generated_token": MOCK_TOKENS[token_idx],
            "pipeline_trace": pipeline_trace,
            "pipeline_metrics": {
                "total_latency": total_latency,
                "bubble_cycles": bubble_cycles,
                "efficiency_pct": efficiency_pct
            },
            "micro_state": {
                "power_watts": round(current_power_watts, 1),
                "tdp_limit": tdp,
                "power_throttled": power_throttled,
                "warp_pattern": warp_pattern,
                "memory_transactions": transactions,
                "divergence_info": divergence_info
            },
            "hardware_state": {
                "current_temperature": round(max_temp, 1),
                "clock_speed_mhz": self.clock_speed,
                "bank_conflict": bank_conflict,
                "conflict_details": conflict_details,
                "allocated_blocks": self.allocated_blocks,
                "thermal_map": [round(t, 1) for t in self.thermal_map],
                "sram_access": sram_access
            }
        }

    
    def run_single_simulation(self, params: dict, custom_arch: dict = None):
        self.reset_state()
        return self.generate_timeline(params, custom_arch)

    def compare_configs(self, config_a: dict, config_b: dict, custom_arch_a: dict = None, custom_arch_b: dict = None):
        result_a = self.run_single_simulation(config_a, custom_arch_a)
        result_b = self.run_single_simulation(config_b, custom_arch_b)
        
        status_a = result_a['metadata']['status']
        status_b = result_b['metadata']['status']
        
        deltas = {
            "status_a": status_a, "status_b": status_b,
            "cycle_delta_pct": 0.0, "gflops_delta": 0.0,
            "vram_delta_gb": 0.0, "temp_delta_c": 0.0,
            "winner": "TIE", "summary": "Both kernels executed."
        }

        if status_a in ['SUCCESS', 'SUCCESS_WITH_THROTTLE'] and status_b in ['SUCCESS', 'SUCCESS_WITH_THROTTLE']:
            cycles_a = result_a['metadata']['total_cycles']
            cycles_b = result_b['metadata']['total_cycles']
            gflops_a = result_a['roofline_metrics']['achieved_gflops']
            gflops_b = result_b['roofline_metrics']['achieved_gflops']
            temp_a = max(result_a['timeline'][-1]['hardware_state']['current_temperature'], 45.0) if result_a['timeline'] else 45.0
            temp_b = max(result_b['timeline'][-1]['hardware_state']['current_temperature'], 45.0) if result_b['timeline'] else 45.0

            if cycles_a > 0: deltas['cycle_delta_pct'] = round(((cycles_a - cycles_b) / cycles_a) * 100, 1)
            deltas['gflops_delta'] = round(gflops_b - gflops_a, 1)
            deltas['temp_delta_c'] = round(temp_b - temp_a, 1)
            
            if result_a.get('memory_breakdown') and result_b.get('memory_breakdown'):
                deltas['vram_delta_gb'] = round(result_b['memory_breakdown']['total_requested_gb'] - result_a['memory_breakdown']['total_requested_gb'], 2)

            if gflops_b > gflops_a * 1.05:
                deltas['winner'] = "KERNEL B"
                deltas['summary'] = f"Kernel B is faster, achieving +{deltas['gflops_delta']} GFLOP/s."
            elif gflops_a > gflops_b * 1.05:
                deltas['winner'] = "KERNEL A"
                deltas['summary'] = f"Kernel A is faster. Kernel B lost {-deltas['gflops_delta']} GFLOP/s."
            else:
                deltas['summary'] = "Performance is virtually identical."
                
        elif status_a == "OOM_ERROR" and status_b in ['SUCCESS', 'SUCCESS_WITH_THROTTLE']:
            deltas['winner'] = "KERNEL B"
            deltas['summary'] = "Kernel A ran Out of Memory. Kernel B succeeded!"
        elif status_b == "OOM_ERROR" and status_a in ['SUCCESS', 'SUCCESS_WITH_THROTTLE']:
            deltas['winner'] = "KERNEL A"
            deltas['summary'] = "Kernel B ran Out of Memory. Kernel A succeeded!"
        elif status_a == "OOM_ERROR" and status_b == "OOM_ERROR":
            deltas['summary'] = "Both kernels ran Out of Memory."

        return {"kernel_a": result_a, "kernel_b": result_b, "deltas": deltas}

    def generate_cupti_counters(self, result: dict):
        occ = result['metadata'].get('occupancy_metrics', {})
        roof = result.get('roofline_metrics', {})
        mem = result.get('memory_breakdown', {})
        total_sectors = int((mem.get('total_requested_gb', 0) * 1e9) / 128)
        
        return {
            "sm__warps_active.avg.pct_of_peak_sustained_active": round(occ.get('occupancy_pct', 0), 2),
            "sm__registers_sum.per_cycle_active": occ.get('regs_per_thread', 0) * occ.get('active_warps', 0),
            "l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum": total_sectors,
            "l1tex__t_sectors_pipe_lsu_mem_global_op_st.sum": int(total_sectors * 0.2),
            "sm__sass_thread_inst_executed_op_ffma_pred_on.sum": int(roof.get('achieved_gflops', 0) * 1e6),
            "sm__inst_executed_pipe_tensor.sum": int(roof.get('achieved_gflops', 0) * 1e5),
            "dram__sectors_read.sum": total_sectors,
            "dram__sectors_write.sum": int(total_sectors * 0.5),
            "gpu__time_duration.sum": result.get('finops_metrics', {}).get('wall_clock_seconds', 0) * 1e6
        }