import math

# ==========================================
# 1. HARDWARE PROFILES (The Silicon Truth)
# ==========================================
HARDWARE_PROFILES = {
    "A100_80GB": {"vram_gb": 80.0, "name": "NVIDIA A100 80GB", "bandwidth": 2034, "sram_kb": 192, "peak_tflops": 312.0},
    "RTX_4090": {"vram_gb": 24.0, "name": "NVIDIA RTX 4090 24GB", "bandwidth": 1008, "sram_kb": 100, "peak_tflops": 330.0},
    "RTX_3090": {"vram_gb": 24.0, "name": "NVIDIA RTX 3090 24GB", "bandwidth": 936, "sram_kb": 100, "peak_tflops": 280.0},
    "T4_16GB": {"vram_gb": 16.0, "name": "NVIDIA T4 16GB", "bandwidth": 320, "sram_kb": 96, "peak_tflops": 65.0}
}

# Mock constants for cycle calculation
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

    # 🛡️ PILLAR 2: THE VALIDATION BOUNCER
    def validate_config(self, params, gpu_specs):
        M, N, K = params['M'], params['N'], params['K']
        BLOCK_SIZE = params['BLOCK_SIZE']

        if M <= 0 or N <= 0 or K <= 0:
            return False, "Matrix dimensions (M, N, K) must be strictly greater than 0."
        if BLOCK_SIZE % 32 != 0:
            return False, f"BLOCK_SIZE ({BLOCK_SIZE}) is not a multiple of the hardware Warp Size (32). GPUs execute threads in lockstep groups of 32; partial warps waste silicon cycles."
        if BLOCK_SIZE > 1024:
            return False, f"BLOCK_SIZE ({BLOCK_SIZE}) exceeds the absolute hardware limit of 1024 threads per block."
        
        sram_bytes_needed = 2 * (BLOCK_SIZE * BLOCK_SIZE) * 2 
        sram_kb_needed = sram_bytes_needed / 1024
        max_sram_kb = gpu_specs['sram_kb']
        
        if sram_kb_needed > max_sram_kb:
            return False, f"Block requires {sram_kb_needed:.1f} KB of Shared Memory (SRAM) to hold the tiles, but the {gpu_specs['name']} only has {max_sram_kb} KB per SM. Reduce BLOCK_SIZE to fit in SRAM."
            
        return True, ""

    def generate_timeline(self, params: dict):
        self.reset_state()
        
        hardware_key = params.get('hardware_profile', 'A100_80GB')
        gpu_specs = HARDWARE_PROFILES.get(hardware_key, HARDWARE_PROFILES['A100_80GB'])
        
        # 🛑 STOP 1: Validate the configuration against physical laws
        is_valid, error_msg = self.validate_config(params, gpu_specs)
        if not is_valid:
            return {
                "metadata": {
                    "status": "INVALID_CONFIG",
                    "error_message": error_msg,
                    "hardware_profile": hardware_key,
                    "total_cycles": 0
                },
                "timeline": []
            }

        M, N, K = params['M'], params['N'], params['K']
        BLOCK_SIZE = params['BLOCK_SIZE']
        
        # 🛑 STOP 2: Memory Capacity Guard (OOM CHECK)
        available_vram_gb = gpu_specs['vram_gb'] * 0.95 
        bytes_a = (M * K) * 2
        bytes_b = (K * N) * 2
        bytes_c = (M * N) * 2
        total_bytes = bytes_a + bytes_b + bytes_c
        total_flops = 2 * M * N * K
        total_requested_gb = total_bytes / (1024**3)
        
        memory_breakdown = {
            "matrix_a_gb": round(bytes_a / (1024**3), 2),
            "matrix_b_gb": round(bytes_b / (1024**3), 2),
            "matrix_c_gb": round(bytes_c / (1024**3), 2),
            "total_requested_gb": round(total_requested_gb, 2),
            "total_available_gb": round(available_vram_gb, 2),
            "gpu_name": gpu_specs['name']
        }

        if total_requested_gb > available_vram_gb:
            return {
                "metadata": {
                    "status": "OOM_ERROR",
                    "error_message": f"CUDA Out of Memory. Requested {total_requested_gb:.2f} GB, but only {available_vram_gb:.2f} GB is available on the {gpu_specs['name']}.",
                    "hardware_profile": hardware_key,
                    "total_cycles": 0
                },
                "memory_breakdown": memory_breakdown,
                "timeline": []
            }

        # --- IF WE PASS BOTH GUARDS, PROCEED WITH PHYSICS ---
        
        total_vram_gb_visual = (total_bytes / 1e9) * 10 
        blocks_needed = min(100, max(1, int(total_vram_gb_visual))) 
        
        has_conflict = (BLOCK_SIZE == 64 and K % 32 != 0) 
        true_mem_cycles = total_bytes / BYTES_PER_CYCLE
        true_compute_cycles = total_flops / FLOPS_PER_CYCLE
        true_total_cycles = true_mem_cycles + true_compute_cycles + 2

        MIN_VISUAL = 20
        MAX_VISUAL = 100
        dynamic_cycles = MIN_VISUAL + int(total_flops / 1e9)
        total_visual_cycles = min(MAX_VISUAL, max(MIN_VISUAL, dynamic_cycles))
        compression_ratio = true_total_cycles / total_visual_cycles

        load_cycles = int((true_mem_cycles / true_total_cycles) * total_visual_cycles)
        math_cycles = total_visual_cycles - load_cycles - 2 
        load_cycles = max(2, load_cycles)
        math_cycles = max(2, math_cycles)

        heat_per_load = 2.0 * compression_ratio 
        for i in range(load_cycles):
            self.cycle_count += 1
            self.allocated_blocks = list(range(int((i+1)/load_cycles * blocks_needed)))
            self.calculate_thermal_diffusion([10, 11, 20, 21], heat_per_load)
            sram = [{"thread_id": 0, "bank_id": 12, "address": 1}, {"thread_id": 1, "bank_id": 12, "address": 2}] if (has_conflict and i == 1) else [{"thread_id": 0, "bank_id": 4, "address": 0}, {"thread_id": 1, "bank_id": 5, "address": 0}]
            self.timeline.append(self._build_cycle("LOAD_HBM", "Loading tiles from HBM to SRAM", 7, sram, has_conflict and i==1))

        tensor_cores = [33, 34, 43, 44]
        heat_per_math_cycle = (true_compute_cycles / total_visual_cycles) * 15.0 * compression_ratio 
        for i in range(math_cycles):
            self.cycle_count += 1
            self.calculate_thermal_diffusion(tensor_cores, heat_per_math_cycle)
            self.timeline.append(self._build_cycle("MMA_SYNC", "Tensor Cores executing MAC operations", 11, [], False))

        self.cycle_count += 1
        self.calculate_thermal_diffusion([80, 81], 3.0 * compression_ratio)
        self.timeline.append(self._build_cycle("STORE_HBM", "Writing result matrix to HBM", 14, [], False))

        max_temp = max(self.thermal_map)
        status = "SUCCESS"
        if max_temp > 90.0:
            status = "SUCCESS_WITH_THROTTLE"
            self.cycle_count += 1
            self.clock_speed = 750
            self.calculate_thermal_diffusion([], 0.0)
            self.timeline.append(self._build_cycle("STALL_THERMAL", "CRITICAL: Thermal limit reached. Clock throttled.", 11, [], False))
            self.clock_speed = 1500

                # --- STRICT ROOFLINE MODEL MATH ---
        # 1. Convert Peak Compute to GFLOPS to match the Y-axis units
        peak_compute_gflops = gpu_specs['peak_tflops'] * 1000 
        peak_mem_bw = gpu_specs['bandwidth'] # GB/s
        
        # 2. Calculate the Ridge Point (The transition from Memory Bound to Compute Bound)
        ridge_point = peak_compute_gflops / peak_mem_bw 
        
        # 3. Calculate Arithmetic Intensity (FLOP / Byte)
        arithmetic_intensity = total_flops / total_bytes if total_bytes > 0 else 0
        
        # 4. Calculate ACTUAL Achieved Performance (The "Realism" Factor)
        # No kernel achieves 100% efficiency. We start with a realistic 85% base.
        efficiency = 0.85 
        
        # Apply physical penalties based on our simulation!
        if has_conflict:
            efficiency *= 0.5  # Bank conflicts destroy memory throughput
        if status == "SUCCESS_WITH_THROTTLE":
            efficiency *= 0.6  # Thermal throttling drops compute throughput
            
        # The actual performance is bounded by the hardware ceilings, scaled by efficiency
        mem_achieved = arithmetic_intensity * peak_mem_bw 
        compute_achieved = peak_compute_gflops * efficiency
        
        # The kernel achieves the minimum of the memory ceiling or compute ceiling
        achieved_gflops = min(mem_achieved, compute_achieved)

        roofline_metrics = {
            "arithmetic_intensity": round(arithmetic_intensity, 2),
            "achieved_gflops": round(achieved_gflops, 2),
            "peak_compute_gflops": peak_compute_gflops,
            "peak_mem_bw": peak_mem_bw,
            "ridge_point": round(ridge_point, 2)
        }
        return {
            "metadata": {
                "status": status,
                "hardware_profile": hardware_key,
                "total_cycles": self.cycle_count
            },
            "memory_breakdown": memory_breakdown,
            "roofline_metrics": roofline_metrics,
            "timeline": self.timeline
        }

    def _build_cycle(self, instruction, description, source_line, sram_access, bank_conflict):
        conflict_details = "Bank conflict detected on SRAM_BANK_12" if bank_conflict else ""
        max_temp = max(self.thermal_map)
        token_idx = min(self.cycle_count - 1, len(MOCK_TOKENS) - 1)

        return {
            "cycle": self.cycle_count,
            "instruction": instruction,
            "description": description,
            "source_line": source_line,
            "generated_token": MOCK_TOKENS[token_idx],
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