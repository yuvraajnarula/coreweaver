// PagedAttentionGrid.tsx - LLM KV-Cache PagedAttention & Block Table Visualizer
import { useState } from 'react';
import { useSimulationStore } from '../store';
import { Layers, Database, ShieldCheck, Info, CheckCircle2 } from 'lucide-react';

export function PagedAttentionGrid() {
  const { timeline, currentCycleIndex, metadata } = useSimulationStore();
  const [showExplanation, setShowExplanation] = useState(false);

  const cycle = timeline[currentCycleIndex];
  if (!cycle) return null;

  const allocatedBlocks = cycle.hardware_state.allocated_blocks || [];
  const allocatedSet = new Set(allocatedBlocks);
  const totalBlocks = 100; // 10x10 Physical VRAM Page Pool
  const allocatedCount = allocatedBlocks.length;
  const freeCount = Math.max(0, totalBlocks - allocatedCount);
  const utilizationPct = Math.round((allocatedCount / totalBlocks) * 100);

  // Theoretical contiguous waste avoided:
  // In classic contiguous allocation, engines had to reserve max sequence length (e.g. 4k-8k tokens) up front,
  // wasting 60-80% of reserved VRAM due to internal/external fragmentation.
  const fragmentationSavedPct = allocatedCount > 0 ? Math.min(84, Math.round(40 + (allocatedCount * 0.4))) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={16} color="var(--accent-green)" />
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              PagedAttention VRAM Block Table (10×10 Page Pool)
            </h4>
          </div>
          <p className="label" style={{ marginTop: 4, margin: 0 }}>
            Dynamic physical memory allocation eliminating continuous memory fragmentation.
          </p>
        </div>

        <button
          className="btn"
          onClick={() => setShowExplanation(!showExplanation)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '4px 8px' }}
        >
          <Info size={12} />
          <span>{showExplanation ? 'Hide Concept' : 'How PagedAttention Works'}</span>
        </button>
      </div>

      {/* Concept Callout Banner */}
      {showExplanation && (
        <div style={{ 
          background: 'var(--bg-elevated)', 
          border: '1px solid var(--accent-blue)', 
          borderRadius: 6, 
          padding: '12px 16px',
          fontSize: 12,
          lineHeight: 1.5,
          color: 'var(--text-secondary)'
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Database size={13} color="var(--accent-blue)" />
            <span>The PagedAttention Innovation (vLLM Architecture)</span>
          </div>
          <p style={{ margin: '0 0 6px 0' }}>
            Traditionally, serving LLMs required allocating massive, contiguous chunks of VRAM for each request's KV-cache. 
            Because sequence lengths are dynamic, this led to massive <strong>external fragmentation</strong> and memory waste—often causing Out-of-Memory (OOM) crashes even when 40% of VRAM was technically free.
          </p>
          <p style={{ margin: 0 }}>
            <strong>PagedAttention</strong> solves this like virtual memory in operating systems: VRAM is divided into small, fixed-size <strong>physical blocks</strong> (16 tokens each). As new tokens generate, the GPU grabs any free block on the grid, mapping non-contiguous physical pages through a virtual <strong>Block Table</strong> with near-zero waste.
          </p>
        </div>
      )}

      {/* Main Grid & Telemetry Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: 20, alignItems: 'center' }}>
        
        {/* 10x10 Physical VRAM Grid */}
        <div style={{ 
          background: 'var(--bg-base)', 
          padding: 10, 
          borderRadius: 8, 
          border: '1px solid var(--border-subtle)',
          aspectRatio: '1 / 1'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(10, 1fr)', 
            gap: 3, 
            height: '100%', 
            width: '100%' 
          }}>
            {Array.from({ length: totalBlocks }).map((_, blockId) => {
              const isAllocated = allocatedSet.has(blockId);
              const isRecent = blockId === allocatedBlocks[allocatedBlocks.length - 1];

              return (
                <div
                  key={blockId}
                  style={{
                    borderRadius: 2,
                    background: isAllocated 
                      ? isRecent ? 'var(--accent-green)' : 'rgba(16, 185, 129, 0.45)' 
                      : 'var(--bg-elevated)',
                    border: isRecent
                      ? '1px solid #fff'
                      : isAllocated
                      ? '1px solid rgba(16, 185, 129, 0.6)'
                      : '1px solid var(--border-subtle)',
                    transition: 'all 0.2s ease',
                    boxShadow: isRecent ? '0 0 8px rgba(16, 185, 129, 0.8)' : 'none'
                  }}
                  title={`Block #${blockId} | Status: ${isAllocated ? 'Allocated KV-Cache Page' : 'Free Page Pool'} | Precision: FP16`}
                />
              );
            })}
          </div>
        </div>

        {/* Status & Stats Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ padding: '10px 12px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
              <div className="label">Allocated Pages</div>
              <div className="data" style={{ fontSize: 18, color: 'var(--accent-green)', fontWeight: 600, marginTop: 4 }}>
                {allocatedCount} <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>/ 100</span>
              </div>
            </div>

            <div style={{ padding: '10px 12px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
              <div className="label">Free Page Pool</div>
              <div className="data" style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 600, marginTop: 4 }}>
                {freeCount} <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>pages</span>
              </div>
            </div>

            <div style={{ padding: '10px 12px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
              <div className="label">KV Pool Utilization</div>
              <div className="data" style={{ fontSize: 18, color: 'var(--accent-blue)', fontWeight: 600, marginTop: 4 }}>
                {utilizationPct}%
              </div>
            </div>

            <div style={{ padding: '10px 12px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
              <div className="label">Fragmentation Avoided</div>
              <div className="data" style={{ fontSize: 18, color: 'var(--accent-green)', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={14} />
                <span>+{fragmentationSavedPct}%</span>
              </div>
            </div>
          </div>

          {/* Allocation State Indicator */}
          <div style={{ 
            padding: '10px 12px', 
            background: 'var(--bg-base)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11
          }}>
            <div style={{ 
              width: 8, height: 8, borderRadius: '50%', 
              background: allocatedCount > 0 ? 'var(--accent-green)' : 'var(--text-tertiary)' 
            }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              {allocatedCount > 0 
                ? `Active KV-Cache Growth: Step ${(cycle.cycle).toString().padStart(2, '0')} allocating physical blocks without reservation waste.`
                : 'Awaiting kernel memory allocation...'}
            </span>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, fontSize: 10, color: 'var(--text-tertiary)', padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(16, 185, 129, 0.45)', border: '1px solid rgba(16, 185, 129, 0.6)' }} />
              <span>Allocated Page</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-green)', border: '1px solid #fff' }} />
              <span>Active Tile Page</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
              <span>Free Memory Block</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
