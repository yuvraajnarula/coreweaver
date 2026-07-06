import { useSimulationStore } from './store';

const styles = `
  @keyframes conflict-flash {
    0% { background-color: #c0392b; box-shadow: 0 0 15px #c0392b; }
    50% { background-color: #ff0000; box-shadow: 0 0 30px #ff0000; }
    100% { background-color: #c0392b; box-shadow: 0 0 15px #c0392b; }
  }
  .bank-conflict-active {
    animation: conflict-flash 0.5s infinite;
  }
`;

const TOTAL_BANKS = 32;
const ADDRESSES_PER_BANK = 8;
export function MicroSRAMView({ onClose }: { onClose: () => void }) {
  const { timeline, currentCycleIndex } = useSimulationStore();
  const currentCycle = timeline[currentCycleIndex];

  const sramAccess = currentCycle?.hardware_state.sram_access || [];
  const hasConflict = currentCycle?.hardware_state.bank_conflict || false;

  // Figure out which banks are currently being accessed in this cycle
  const accessedBankIds = sramAccess.map(access => access.bank_id);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', color: 'white', fontFamily: 'monospace'
    }}>
      <style>{styles}</style>

      <div style={{ maxWidth: '1200px', width: '100%', background: '#1a1a1a', borderRadius: '12px', padding: '2rem', border: '1px solid #333' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#00ffcc' }}>Micro View: SM Shared Memory (SRAM)</h2>
            <p style={{ margin: '0.5rem 0 0', color: '#888' }}>Cycle {currentCycle?.cycle}: {currentCycle?.instruction}</p>
          </div>
          <button 
            onClick={onClose}
            style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', height: 'fit-content' }}
          >
            Close Zoom
          </button>
        </div>

        {/* Conflict Warning Badge */}
        {hasConflict && (
          <div style={{ background: 'rgba(231, 76, 60, 0.2)', border: '1px solid #e74c3c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ff7675' }}>WARNING: BANK CONFLICT DETECTED! Serialized memory access causing pipeline stalls.</span>
          </div>
        )}

        {/* The 32 Banks Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${TOTAL_BANKS}, 1fr)`, 
          gap: '2px', 
          background: '#333', 
          padding: '4px',
          borderRadius: '4px'
        }}>
          {Array.from({ length: TOTAL_BANKS }).map((_, bankIndex) => {
            const isAccessed = accessedBankIds.includes(bankIndex);
            // If there is a global conflict flag AND this bank is the one being accessed, it flashes
            const isConflictBank = hasConflict && isAccessed;

            return (
              <div key={bankIndex} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {/* Bank Header */}
                <div style={{ 
                  textAlign: 'center', fontSize: '0.6rem', 
                marginBottom: '4px',
                  fontWeight: isAccessed ? 'bold' : 'normal',
                  color: isAccessed ? '#00ffcc' : '#888'
                }}>
                  B{bankIndex}
                </div>
                
                {/* The Memory Addresses (Rows) inside the Bank */}
                {Array.from({ length: ADDRESSES_PER_BANK }).map((_, addrIndex) => {
                  // Check if this specific address is being accessed
                  const isCellActive = sramAccess.some(a => a.bank_id === bankIndex && a.address === addrIndex);
                  
                  return (
                    <div 
                      key={addrIndex}
                      className={isConflictBank ? 'bank-conflict-active' : ''}
                      style={{
                        height: '20px',
                        backgroundColor: isCellActive 
                          ? (isConflictBank ? '#c0392b' : '#2ecc71') // Red if conflict, Green if safe
                          : '#2c3e50', // Dark blue/gray inactive
                        transition: 'background-color 0.2s ease',
                        borderRadius: '2px'
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
        
        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: '#666', fontSize: '0.8rem' }}>
          32 Physical Memory Banks. Warp size = 32 Threads.
        </p>
      </div>
    </div>
  );
}