try:
    import pytest
    fixture = pytest.fixture
except ImportError:
    def fixture(fn):
        return fn

from simulator import GPUPhysicsEngine, HARDWARE_PROFILES, custom_arch_to_gpu_specs

@fixture
def engine():
    return GPUPhysicsEngine()

def test_hardware_profiles_exist():
    assert "A100_80GB" in HARDWARE_PROFILES
    assert "H100_80GB" in HARDWARE_PROFILES
    assert "RTX_4090" in HARDWARE_PROFILES
    a100 = HARDWARE_PROFILES["A100_80GB"]
    assert a100["vram_gb"] == 80.0
    assert a100["bandwidth"] == 2034
    assert a100["sram_kb"] == 192

def test_validation_valid_config(engine):
    valid_params = {"M": 1024, "N": 1024, "K": 1024, "BLOCK_SIZE": 128, "hardware_profile": "A100_80GB"}
    is_valid, msg = engine.validate_config(valid_params, HARDWARE_PROFILES["A100_80GB"])
    assert is_valid is True
    assert msg == ""

def test_validation_invalid_block_size_not_multiple_of_32(engine):
    invalid_params = {"M": 1024, "N": 1024, "K": 1024, "BLOCK_SIZE": 50, "hardware_profile": "A100_80GB"}
    is_valid, msg = engine.validate_config(invalid_params, HARDWARE_PROFILES["A100_80GB"])
    assert is_valid is False
    assert "Warp Size (32)" in msg

def test_validation_invalid_block_size_exceeds_1024(engine):
    invalid_params = {"M": 1024, "N": 1024, "K": 1024, "BLOCK_SIZE": 2048, "hardware_profile": "A100_80GB"}
    is_valid, msg = engine.validate_config(invalid_params, HARDWARE_PROFILES["A100_80GB"])
    assert is_valid is False
    assert "1024" in msg

def test_validation_sram_overflow(engine):
    # BLOCK_SIZE 1024 requires 2 * (1024 * 1024) * 2 bytes = 4MB SRAM, but T4 only has 96 KB
    invalid_params = {"M": 1024, "N": 1024, "K": 1024, "BLOCK_SIZE": 1024, "hardware_profile": "T4_16GB"}
    is_valid, msg = engine.validate_config(invalid_params, HARDWARE_PROFILES["T4_16GB"])
    assert is_valid is False
    assert "Shared Memory (SRAM)" in msg

def test_oom_guard(engine):
    # Matrix within 10B compute element limit (95k x 95k x 1 = ~9.02B elements),
    # but Matrix C requires 16.8 GB which exceeds T4's 15.2 GB available VRAM limit
    params = {"M": 95000, "N": 95000, "K": 1, "BLOCK_SIZE": 128, "hardware_profile": "T4_16GB"}
    result = engine.generate_timeline(params)
    assert result["metadata"]["status"] == "OOM_ERROR"
    assert "CUDA Out of Memory" in result["metadata"]["error_message"]
    assert "memory_breakdown" in result
    assert result["memory_breakdown"]["total_requested_gb"] > result["memory_breakdown"]["total_available_gb"]

def test_timeline_generation_success(engine):
    params = {"M": 1024, "N": 1024, "K": 1024, "BLOCK_SIZE": 128, "hardware_profile": "A100_80GB"}
    result = engine.generate_timeline(params)
    assert result["metadata"]["status"] == "SUCCESS"
    assert len(result["timeline"]) > 0
    
    first_cycle = result["timeline"][0]
    assert "cycle" in first_cycle
    assert "instruction" in first_cycle
    assert "pipeline_trace" in first_cycle
    assert "hardware_state" in first_cycle
    assert "micro_state" in first_cycle
    
    # Check Roofline metrics
    assert "roofline_metrics" in result
    assert result["roofline_metrics"]["ridge_point"] > 0
    assert result["roofline_metrics"]["arithmetic_intensity"] > 0
    
    # Check FinOps metrics
    assert "finops_metrics" in result
    assert result["finops_metrics"]["true_total_cycles"] > 0
    assert result["finops_metrics"]["kernel_cost_usd"] > 0

def test_kernel_fusion_roofline_shift(engine):
    base_params = {"M": 2048, "N": 2048, "K": 2048, "BLOCK_SIZE": 128, "hardware_profile": "A100_80GB", "enable_fusion": False}
    fused_params = {"M": 2048, "N": 2048, "K": 2048, "BLOCK_SIZE": 128, "hardware_profile": "A100_80GB", "enable_fusion": True}
    
    base_res = engine.run_single_simulation(base_params)
    fused_res = engine.run_single_simulation(fused_params)
    
    base_ai = base_res["roofline_metrics"]["arithmetic_intensity"]
    fused_ai = fused_res["roofline_metrics"]["arithmetic_intensity"]
    
    # Fused kernel cuts VRAM traffic in half, doubling arithmetic intensity
    assert fused_ai >= base_ai * 1.9

def test_thermal_throttling_trigger(engine):
    # Compute-dense workload within element limit (2k x 2k x 2k = 8B elements)
    # saturating Tensor Cores to raise temperature past 90°C throttle threshold
    hot_params = {"M": 2000, "N": 2000, "K": 2000, "BLOCK_SIZE": 128, "hardware_profile": "RTX_3090"}
    result = engine.generate_timeline(hot_params)
    
    assert result["metadata"]["status"] == "SUCCESS_WITH_THROTTLE"
    # Verify stall cycle was injected
    stall_cycles = [c for c in result["timeline"] if c["instruction"] == "STALL_THERMAL"]
    assert len(stall_cycles) > 0
    assert stall_cycles[0]["hardware_state"]["clock_speed_mhz"] == 750

def test_cupti_counters_generation(engine):
    params = {"M": 1024, "N": 1024, "K": 1024, "BLOCK_SIZE": 128, "hardware_profile": "A100_80GB"}
    result = engine.generate_timeline(params)
    
    counters = result.get("cupti_counters")
    assert counters is not None
    expected_keys = [
        "sm__warps_active.avg.pct_of_peak_sustained_active",
        "sm__registers_sum.per_cycle_active",
        "l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum",
        "l1tex__t_sectors_pipe_lsu_mem_global_op_st.sum",
        "sm__sass_thread_inst_executed_op_ffma_pred_on.sum",
        "sm__inst_executed_pipe_tensor.sum",
        "dram__sectors_read.sum",
        "dram__sectors_write.sum",
        "gpu__time_duration.sum"
    ]
    for key in expected_keys:
        assert key in counters

def test_compare_configs(engine):
    config_a = {"M": 1024, "N": 1024, "K": 1024, "BLOCK_SIZE": 128, "hardware_profile": "A100_80GB", "enable_fusion": False}
    config_b = {"M": 1024, "N": 1024, "K": 1024, "BLOCK_SIZE": 128, "hardware_profile": "A100_80GB", "enable_fusion": True}
    
    comparison = engine.compare_configs(config_a, config_b)
    assert "kernel_a" in comparison
    assert "kernel_b" in comparison
    assert "deltas" in comparison
    assert comparison["deltas"]["winner"] in ["KERNEL A", "KERNEL B", "TIE"]

def test_custom_architecture_translation():
    custom_arch = {
        "name": "Custom_ASIC_v1",
        "compute": {"warp_size": 32, "fp32_cores": 2048, "tensor_cores": 256, "clock_mhz": 1800},
        "memory": {"hbm_capacity_gb": 96.0, "hbm_bandwidth_gb_s": 3200, "sram_kb_per_sm": 256},
        "power": {"tdp_watts": 400}
    }
    specs = custom_arch_to_gpu_specs(custom_arch)
    assert specs["name"] == "Custom_ASIC_v1"
    assert specs["vram_gb"] == 96.0
    assert specs["bandwidth"] == 3200
    assert specs["sram_kb"] == 256
    assert specs["peak_tflops"] == (2048 * 2 * 1800 * 1e6) / 1e12

if __name__ == "__main__":
    e = GPUPhysicsEngine()
    print("Running CoreWeaver Physics Engine Tests...")
    test_hardware_profiles_exist()
    print("[PASS] test_hardware_profiles_exist passed")
    test_validation_valid_config(e)
    print("[PASS] test_validation_valid_config passed")
    test_validation_invalid_block_size_not_multiple_of_32(e)
    print("[PASS] test_validation_invalid_block_size_not_multiple_of_32 passed")
    test_validation_invalid_block_size_exceeds_1024(e)
    print("[PASS] test_validation_invalid_block_size_exceeds_1024 passed")
    test_validation_sram_overflow(e)
    print("[PASS] test_validation_sram_overflow passed")
    test_oom_guard(e)
    print("[PASS] test_oom_guard passed")
    test_timeline_generation_success(e)
    print("[PASS] test_timeline_generation_success passed")
    test_kernel_fusion_roofline_shift(e)
    print("[PASS] test_kernel_fusion_roofline_shift passed")
    test_thermal_throttling_trigger(e)
    print("[PASS] test_thermal_throttling_trigger passed")
    test_cupti_counters_generation(e)
    print("[PASS] test_cupti_counters_generation passed")
    test_compare_configs(e)
    print("[PASS] test_compare_configs passed")
    test_custom_architecture_translation()
    print("[PASS] test_custom_architecture_translation passed")
    print("\nAll 12 CoreWeaver Physics Engine tests passed successfully!")
