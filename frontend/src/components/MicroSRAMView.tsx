// MicroSRAMView.tsx - 32-Bank SRAM Microarchitecture Zoom with Lucide Icons
import { useSimulationStore } from '../store';
import { AlertTriangle, X, Layers } from 'lucide-react';

const styles = `
  @keyframes conflict-flash {
    0% { background-color: #ef4444; box-shadow: 0 0 10px #ef4444; }
    50% { background-color: #dc2626; box-shadow: 0 0 25px #dc2626; }
    100% { background-color: #ef4444; box-shadow: 0 0 10px #ef4444; }
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
      backgroundColor: 'rgba(9, 9, 11, 0.85)', backdropFilter: 'blur(8px)', zIndex: 2000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)'
    }}>
      <style>{styles}</style>

      <div style={{ maxWidth: '1100px', width: '100%', background: 'var(--bg-panel)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-subtle)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={18} color="var(--accent-blue)" />
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                Micro View: 32-Bank Shared Memory (SRAM)
              </h2>
              <p className="label" style={{ margin: '4px 0 0', fontSize: 11 }}>
                Cycle {currentCycle?.cycle}: {currentCycle?.instruction}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="btn"
            style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <X size={13} />
            <span>Close Zoom</span>
          </button>
        </div>

        {/* Conflict Warning Badge */}
        {hasConflict && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', 
            padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 
          }}>
            <AlertTriangle size={16} color="var(--accent-red)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-red)' }}>
              WARNING: BANK CONFLICT DETECTED! Serialized memory access causing pipeline stalls.
            </span>
          </div>
        )}

        {/* The 32 Banks Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${TOTAL_BANKS}, 1fr)`, 
          gap: '3px', 
          background: 'var(--bg-base)', 
          padding: '10px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)'
        }}>
          {Array.from({ length: TOTAL_BANKS }).map((_, bankIndex) => {
            const isAccessed = accessedBankIds.includes(bankIndex);
            const isConflictBank = hasConflict && isAccessed;

            return (
              <div key={bankIndex} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {/* Bank Header */}
                <div style={{ 
                  textAlign: 'center', fontSize: '9px', 
                  marginBottom: '2px',
                  fontWeight: isAccessed ? 700 : 400,
                  color: isConflictBank ? 'var(--accent-red)' : isAccessed ? 'var(--accent-blue)' : 'var(--text-tertiary)'
                }}>
                  B{bankIndex}
                </div>
                
                {/* The Memory Addresses (Rows) inside the Bank */}
                {Array.from({ length: ADDRESSES_PER_BANK }).map((_, addrIndex) => {
                  const isCellActive = sramAccess.some(a => a.bank_id === bankIndex && a.address === addrIndex);
                  
                  return (
                    <div 
                      key={addrIndex}
                      className={isConflictBank ? 'bank-conflict-active' : ''}
                      style={{
                        height: '18px',
                        backgroundColor: isCellActive 
                          ? (isConflictBank ? '#ef4444' : '#10b981') 
                          : 'var(--bg-elevated)',
                        transition: 'background-color 0.15s ease',
                        borderRadius: '2px',
                        border: '1px solid rgba(255,255,255,0.03)'
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
        
        <p style={{ marginTop: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 11 }}>
          32 Physical Memory Banks (4-byte stride) mapped to 32 Threads per SIMT Warp.
        </p>
      </div>
    </div>
  );
}