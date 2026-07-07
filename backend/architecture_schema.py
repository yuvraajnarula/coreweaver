from pydantic import BaseModel, Field

class ComputeUnitSpecs(BaseModel):
    warp_size: int = Field(32, description="Threads per warp")
    fp32_cores: int = Field(1024, description="Total FP32 CUDA cores")
    tensor_cores: int = Field(128, description="Total Tensor/Matrix cores")
    clock_mhz: int = Field(1500, description="Base clock speed")
    pipeline_depth: int = Field(20, description="Instruction pipeline stages")

class MemoryHierarchySpecs(BaseModel):
    regs_per_thread: int = Field(255, description="Max registers per thread")
    sram_kb_per_sm: int = Field(192, description="Shared memory per SM")
    sram_banks: int = Field(32, description="Number of SRAM banks")
    l1_cache_kb: int = Field(128, description="L1 Data Cache per SM")
    l2_cache_mb: int = Field(40, description="Global L2 Cache")
    hbm_capacity_gb: float = Field(80.0, description="Total VRAM")
    hbm_bandwidth_gb_s: float = Field(2034, description="Memory bus bandwidth")
    hbm_bus_width_bits: int = Field(5120, description="Memory bus width")

class PowerAndThermalSpecs(BaseModel):
    tdp_watts: int = Field(300, description="Thermal Design Power limit")
    thermal_limit_c: int = Field(90, description="Throttling temperature")
    leakage_factor: float = Field(0.2, description="Idle power leakage ratio")

class CustomArchitecture(BaseModel):
    name: str
    node_nm: int = Field(5, description="Process node (e.g., 5nm, 3nm)")
    compute: ComputeUnitSpecs
    memory: MemoryHierarchySpecs
    power: PowerAndThermalSpecs