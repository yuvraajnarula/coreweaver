import { useSimulationStore } from './store';
const TOTAL_BLOCKS = 100;

// 🎨 Helper function to map temperature to a color
function getHeatColor(temp: number): string {
  if (temp < 50) return '#3498db';   // Cool (Blue)
  if (temp < 70) return '#2ecc71';   // Warm (Green)
  if (temp < 85) return '#f1c40f';   // Hot (Yellow)
  if (temp < 95) return '#e67e22';   // Very Hot (Orange)
  return '#c0392b';                  // Critical/Throttling (Red)
}

export function MemoryGrid() {
  const { timeline, currentCycleIndex, viewMode } = useSimulationStore();
  const currentCycle = timeline[currentCycleIndex];
  
  const allocatedBlocks = currentCycle?.hardware_state.allocated_blocks || [];
  const thermalMap = currentCycle?.hardware_state.thermal_map || [];

  return (
    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
      
      {/* Header & Toggle Switch */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, color: '#2980b9' }}>
          🧠 GPU VRAM {viewMode === 'memory' ? 'Allocation' : 'Thermal Heatmap'}
        </h2>
        
        {/* Toggle Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => useSimulationStore.getState().setViewMode('memory')}
            style={{
              padding: '0.5rem 1rem',
              background: viewMode === 'memory' ? '#2980b9' : '#ecf0f1',
              color: viewMode === 'memory' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Memory View
          </button>
          <button 
            onClick={() => useSimulationStore.getState().setViewMode('thermal')}
            style={{
              padding: '0.5rem 1rem',
              background: viewMode === 'thermal' ? '#c0392b' : '#ecf0f1',
              color: viewMode === 'thermal' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Thermal View
          </button>
        </div>
      </div>

      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        {viewMode === 'memory' 
          ? 'Green = KV-Cache Allocated | Gray = Free Memory' 
          : 'Blue = Cool | Red = Critical Hotspot (>95°C)'}
      </p>

      {/* The Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px', marginTop: '1rem' }}>
        {Array.from({ length: TOTAL_BLOCKS }).map((_, index) => {
          const isAllocated = allocatedBlocks.includes(index);
          const currentTemp = thermalMap[index] || 0;

          // 🧠 LOGIC: Decide the color based on the View Mode
          let backgroundColor = '#ecf0f1'; // Default gray
          
          if (viewMode === 'memory') {
            backgroundColor = isAllocated ? '#2ecc71' : '#ecf0f1';
          } else if (viewMode === 'thermal') {
            backgroundColor = getHeatColor(currentTemp);
          }

          return (
            <div
              key={index}
              title={viewMode === 'memory' ? `Block ${index}` : `Block ${index}: ${currentTemp.toFixed(1)}°C`}
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                backgroundColor: backgroundColor,
                borderRadius: '4px',
                border: '1px solid #bdc3c7',
                transition: 'background-color 0.5s ease', // Smooth color transition!
                cursor: 'pointer'
              }}
            />
          );
        })}
      </div>
    </div>
  );
}