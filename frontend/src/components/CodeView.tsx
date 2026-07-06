import { useEffect, useRef, useMemo } from 'react';
import { useSimulationStore } from '../store';

const highlightSyntax = (code: string) => {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, '<span style="color: #6a9955; font-style: italic;">$1</span>');
  html = html.replace(/(".*?")/g, '<span style="color: #ce9178;">$1</span>');
  html = html.replace(/\b(__global__|__shared__|__device__|void|int|float|double|const|for|if|else|return|while|true|false|nullptr|auto|template|typename|pragma|unroll)\b/g, '<span style="color: #569cd6; font-weight: 500;">$1</span>');
  html = html.replace(/\b(float4|int4|dim3|size_t|uint32_t|INFINITY)\b/g, '<span style="color: #4ec9b0;">$1</span>');
  html = html.replace(/\b(\d+\.?\d*f?)\b/g, '<span style="color: #b5cea8;">$1</span>');
  html = html.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span style="color: #dcdcaa;">$1</span>');
  
  return html;
};

const generateKernelSnippet = (activeLine: number) => {
  const lines = [
    "__global__ void flash_attention_kernel(const float* Q, const float* K, const float* V, float* O, int N, int d) {",
    "    int tid = threadIdx.x;",
    "    int bid = blockIdx.x;",
    "    ",
    "    __shared__ float Q_shared[TILE_SIZE][D_HEAD];",
    "    __shared__ float K_shared[TILE_SIZE][D_HEAD];",
    "    __shared__ float V_shared[TILE_SIZE][D_HEAD];",
    "    ",
    "    float acc[O_TILE_SIZE] = {0.0f};",
    "    float max_score = -INFINITY;",
    "    float sum_exp = 0.0f;",
    "    ",
    "    // Load Q into shared memory",
    "    for (int i = 0; i < D_HEAD; i += WARP_SIZE) {",
    "        if (tid + i < D_HEAD) {",
    "            Q_shared[tid % TILE_SIZE][tid + i] = Q[bid * TILE_SIZE * D_HEAD + (tid % TILE_SIZE) * D_HEAD + tid + i];",
    "        }",
    "    }",
    "    __syncthreads();",
    "    ",
    "    // Compute Attention Scores",
    "    for (int j = 0; j < TILE_SIZE; ++j) {",
    "        float score = 0.0f;",
    "        #pragma unroll",
    "        for (int k = 0; k < D_HEAD; ++k) {",
    "            score += Q_shared[tid % TILE_SIZE][k] * K_shared[j][k];",
    "        }",
    "        score /= sqrtf((float)D_HEAD);",
    "        ",
    "        // Online Softmax",
    "        float new_max = fmaxf(max_score, score);",
    "        sum_exp = sum_exp * expf(max_score - new_max) + expf(score - new_max);",
    "        max_score = new_max;",
    "        ",
    "        // Accumulate V",
    "        for (int k = 0; k < D_HEAD; ++k) {",
    "            acc[k] += expf(score - max_score) * V_shared[j][k];",
    "        }",
    "    }",
    "    ",
    "    // Write Output",
    "    for (int i = 0; i < D_HEAD; ++i) {",
    "        O[bid * TILE_SIZE * D_HEAD + tid * D_HEAD + i] = acc[i] / sum_exp;",
    "    }",
    "}"
  ];
  
  const windowSize = 24;
  const halfWindow = Math.floor(windowSize / 2);
  const start = Math.max(0, activeLine - halfWindow - 1);
  const end = Math.min(lines.length, start + windowSize);
  
  return lines.slice(start, end).map((code, i) => ({
    lineNum: start + i + 1,
    code
  }));
};

export function CodeView() {
  const { timeline, currentCycleIndex } = useSimulationStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  
  const cycle = timeline[currentCycleIndex];
  
  // Calculate Heatmap data from the entire timeline (Data-Driven)
  const lineHeatmap = useMemo(() => {
    const heat: Record<number, number> = {};
    timeline.forEach(c => {
      if (c.source_line) {
        heat[c.source_line] = (heat[c.source_line] || 0) + c.pipeline_metrics.total_latency;
      }
    });
    return heat;
  }, [timeline]);

  const maxHeat = Math.max(...Object.values(lineHeatmap), 1);

  // Auto-scroll to active line
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = activeLineRef.current;
      const elementTop = element.offsetTop;
      const elementHeight = element.offsetHeight;
      const containerHeight = container.clientHeight;
      
      // Scroll so the active line is perfectly centered
      container.scrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
    }
  }, [currentCycleIndex]);

  if (!cycle) return null;

  const activeLine = cycle.source_line;
  const snippet = generateKernelSnippet(activeLine);
  const currentHeat = lineHeatmap[activeLine] || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-base)', fontFamily: 'var(--font-mono)', fontSize: 12, overflow: 'hidden', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
      {/* Editor Header (VS Code Style) */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--accent-blue)', fontSize: 14 }}>⬤</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>flash_attention_kernel.cu</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 10, marginLeft: 8, padding: '2px 6px', background: 'var(--bg-elevated)', borderRadius: 4 }}>CUDA C++</span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 10, color: 'var(--text-tertiary)' }}>
          <span>Ln <span style={{ color: 'var(--accent-blue)' }}>{activeLine}</span></span>
          <span>Cost <span style={{ color: 'var(--accent-amber)' }}>{currentHeat} cy</span></span>
        </div>
      </div>

      {/* Code Editor Area */}
      <div 
        ref={containerRef}
        style={{ flex: 1, overflowY: 'auto', padding: '8px 0', position: 'relative' }}
      >
        {snippet.map((line, i) => {
          const isActive = line.lineNum === activeLine;
          const heat = lineHeatmap[line.lineNum] || 0;
          const heatIntensity = heat / maxHeat;
          
          return (
            <div 
              key={i}
              ref={isActive ? activeLineRef : null}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 40px 20px 1fr', // Heat bar, Line Num, Pointer, Code
                height: 22,
                lineHeight: '22px',
                background: isActive ? 'rgba(255, 204, 0, 0.08)' : 'transparent',
                borderLeft: isActive ? '2px solid #ffcc00' : '2px solid transparent',
                transition: 'background 0.1s'
              }}
            >
              {/* Heatmap Gutter */}
              <div style={{ 
                height: '100%', 
                background: heat > 0 ? `rgba(239, 68, 68, ${0.1 + heatIntensity * 0.6})` : 'transparent',
                marginRight: 4
              }} />
              
              {/* Line Number */}
              <div style={{ 
                textAlign: 'right', 
                paddingRight: 12, 
                color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)', 
                userSelect: 'none',
                fontSize: 11
              }}>
                {line.lineNum}
              </div>
              
              {/* Execution Pointer */}
              <div style={{ 
                color: '#ffcc00', 
                fontSize: 10, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                {isActive ? '▶' : ''}
              </div>
              
              {/* Code */}
              <div 
                style={{ 
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', 
                  whiteSpace: 'pre',
                  paddingLeft: 8,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                dangerouslySetInnerHTML={{ __html: highlightSyntax(line.code) }}
              />
            </div>
          );
        })}
      </div>

      {/* Instruction Decoder (Bottom Panel) */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div className="label" style={{ marginBottom: 4 }}>Active Instruction (SASS/PTX)</div>
          <div className="data" style={{ color: 'var(--accent-blue)', fontSize: 13, background: 'var(--bg-base)', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
            {cycle.instruction}
          </div>
        </div>
        <div>
          <div className="label" style={{ marginBottom: 4 }}>Micro-ops & Pipeline</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Latency: <span className="data" style={{ color: 'var(--accent-amber)' }}>{cycle.pipeline_metrics.total_latency} cy</span>
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Stalls: <span className="data" style={{ color: 'var(--accent-red)' }}>{cycle.pipeline_metrics.bubble_cycles} cy</span>
            </span>
          </div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>
            {cycle.description}
          </div>
        </div>
      </div>
    </div>
  );
}