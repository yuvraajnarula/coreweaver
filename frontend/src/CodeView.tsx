import { useSimulationStore } from './store';

const MOCK_TRITON_CODE = [
  "import triton",
  "import triton.language as tl",
  "",
  "@triton.jit",
  "def matmul_kernel(a_ptr, b_ptr, c_ptr, BLOCK_SIZE: tl.constexpr):",
  "    pid = tl.program_id(axis=0)",
  "    # Load Matrix A and B from HBM into SRAM",
  "    a_block = tl.load(a_ptr + pid * BLOCK_SIZE)",
  "    b_block = tl.load(b_ptr + pid * BLOCK_SIZE)", // Line 8 (Index 7)
  "    ",
  "    # Perform the Matrix Multiply Accumulate",
  "    c_block = tl.dot(a_block, b_block)",          // Line 11 (Index 10)
  "    ",
  "    # Store the result back to HBM",
  "    tl.store(c_ptr + pid * BLOCK_SIZE, c_block)", // Line 14 (Index 13)
];

export function CodeView() {
  const { timeline, currentCycleIndex } = useSimulationStore();
  const currentCycle = timeline[currentCycleIndex];
  
  // The backend sends 1-based line numbers (e.g., Line 4). 
  // Arrays are 0-indexed, so we subtract 1.
  const activeLineIndex = (currentCycle?.source_line || 1) - 1;

  return (
    <div style={{ 
      background: '#1e1e1e', 
      borderRadius: '8px', 
      padding: '1rem', 
      fontFamily: 'monospace', 
      fontSize: '0.9rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      overflowX: 'auto',
      marginTop: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
        <span style={{ color: '#888' }}>kernel_matmul.py (Triton)</span>
        <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>
          Executing Line: {currentCycle?.source_line || '-'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {MOCK_TRITON_CODE.map((line, index) => {
          const isActive = index === activeLineIndex;
          
          return (
            <div 
              key={index}
              style={{
                display: 'flex',
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: isActive ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
                borderLeft: isActive ? '3px solid #ffd700' : '3px solid transparent',
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{ 
                width: '30px', 
                textAlign: 'right', 
                marginRight: '1rem', 
                userSelect: 'none',
                fontWeight: isActive ? 'bold' : 'normal',
                color: isActive ? '#ffd700' : '#555'
              }}>
                {index + 1}
              </span>
              
              <span style={{ 
                color: isActive ? '#fff' : '#d4d4d4', 
                whiteSpace: 'pre',
                fontWeight: isActive ? 'bold' : 'normal'
              }}>
                {line || ' '}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}