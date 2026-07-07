import { useState, useEffect } from "react";
import { useSimulationStore } from "./store";
import { useSimulationSocket } from "./hooks/useSimulationSocket";

import { MemoryGrid } from "./components/MemoryGrid";
import { MicroSRAMView } from "./components/MicroSRAMView";
import { CodeView } from "./components/CodeView";
import { TokenStream } from "./components/TokenStream";
import { ControlPanel } from "./components/ControlPanel";
import { CrashScreen } from "./components/CrashScreen";
import { RooflineChart } from "./components/RooflineChart";
import { PipelineGantt } from './components/PipelineGantt';
import { AICommandBar } from './components/AICommandBar';
import { ComparisonView } from './components/ComparisionView';
import { SiliconTelemetry } from './components/SiliconTelemetry';
import { WarpDivergenceView } from './components/WarpDivergence';
import { ModernExecutionView } from './components/ModernExecutionView';
import { FinOpsDashboard } from './components/FinOpsDashboard';
import { WorkflowToolbar } from './components/WorkflowToolbar';
import { AIOptimizationAgent } from './components/AIOptimizationAgent';
import { CUPTITable } from './components/CUPTITable';

import { OnboardingTour } from './components/OnboardingTour';
import { HowItWorksModal } from './components/HowItWorks';
import { ArchitectureBuilder } from './components/ArchitectureBuilder';

const DEFAULT_PARAMS = {
  M: 1024, N: 1024, K: 1024, BLOCK_SIZE: 128, hardware_profile: 'A100_80GB',
  enable_divergence: false, coalesced_memory: true,
  enable_async_copy: false, enable_fusion: false
};

type CanvasTab = 'execution' | 'silicon' | 'analysis';

function App() {
  const { sendConfig } = useSimulationSocket();
  const {
    totalCycles, timeline, currentCycleIndex, setCurrentCycleIndex,
    isPlaying, play, pause, metadata, comparisonResult
  } = useSimulationStore();

  const [isRunning, setIsRunning] = useState(false);
  const [simParams, setSimParams] = useState(DEFAULT_PARAMS);
  const [activeTab, setActiveTab] = useState<CanvasTab>('execution');
  const [showConfig, setShowConfig] = useState(false);
  const [isResolvingLink, setIsResolvingLink] = useState(false);
  const [showMicroView, setShowMicroView] = useState(false);
  const [baselineConfig, setBaselineConfig] = useState<any | null>(null);
  
  const [showTour, setShowTour] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showArchBuilder, setShowArchBuilder] = useState(false);
  
  const currentCycle = timeline[currentCycleIndex];

  useEffect(() => {
    const hasOnboarded = localStorage.getItem('coreweaver_onboarded');
    if (!hasOnboarded) {
      setTimeout(() => setShowTour(true), 500);
    }
  }, []);

  // URL Resolution Logic
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const sid = searchParams.get('sid');
    if (sid) {
      setIsResolvingLink(true);
      fetch(`http://localhost:8000/api/share/${sid}`)
        .then(res => res.json())
        .then(data => {
          setSimParams(data.params);
          window.history.replaceState({}, '', window.location.pathname);
          setTimeout(() => {
            sendConfig(data.params);
            setIsRunning(true);
            setTimeout(() => setIsRunning(false), 80000);
          }, 100);
        })
        .catch(() => window.history.replaceState({}, '', window.location.pathname))
        .finally(() => setIsResolvingLink(false));
    }
  }, []);

  const handleRunSimulation = (params: any) => {
    setIsRunning(true);
    sendConfig(params);
    setTimeout(() => setIsRunning(false), 80000);
  };

  const handleAICompile = (aiParams: any) => {
    setSimParams(aiParams);
    setTimeout(() => {
      handleRunSimulation(aiParams);
    }, 100);
  };

  const handleSetBaseline = () => {
    setBaselineConfig(simParams);
  };

  const handleRunComparison = async () => {
    if (!baselineConfig) return;
    setIsRunning(true);
    try {
      const response = await fetch('http://localhost:8000/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_a: baselineConfig, config_b: simParams }),
      });
      const data = await response.json();
      useSimulationStore.getState().setComparisonResult(data);
    } catch (err) {
      console.error("Comparison failed", err);
    } finally {
      setIsRunning(false);
    }
  };

  const progress = totalCycles === 0 ? 0 : ((currentCycleIndex + 1) / totalCycles) * 100;

  if (isResolvingLink) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-base)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="label" style={{ marginBottom: 8 }}>Resolving Session</div>
          <div style={{ fontSize: 16 }}>Fetching parameters from backend...</div>
        </div>
      </div>
    );
  }

  // Initial Idle State
  if (!currentCycle) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
        <TopBar 
          isRunning={isRunning} 
          metadata={metadata} 
          onRun={() => handleRunSimulation(simParams)} 
          onToggleConfig={() => setShowConfig(!showConfig)}
          onToggleDocs={() => setShowDocs(true)}
          onToggleArchBuilder={() => setShowArchBuilder(true)} // 🚀 Pass handler
        />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: 800, padding: 'var(--space-8)' }}>
            <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 'var(--space-2)' }}>CoreWeaver</h1>
            <p style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-8)' }}>LLM Kernel Physics Engine</p>
            
            {showConfig && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                <WorkflowToolbar params={simParams} setParams={setSimParams} onRunSimulation={handleRunSimulation} />
                
                <div id="tour-ai-compiler">
                  <AICommandBar onParamsExtracted={handleAICompile} />
                </div>

                <div id="tour-control-panel">
                  <ControlPanel 
                    onRunSimulation={handleRunSimulation} 
                    isRunning={isRunning} 
                    params={simParams} 
                    setParams={setSimParams}
                    onSetBaseline={handleSetBaseline}
                    onRunComparison={handleRunComparison}
                    hasBaseline={!!baselineConfig}
                  />
                </div>
              </div>
            )}
            
            {!showConfig && (
              <button className="btn btn-primary" onClick={() => setShowConfig(true)} style={{ padding: '12px 24px', fontSize: 14 }}>
                Configure & Compile Kernel
              </button>
            )}

            {(metadata?.status === 'OOM_ERROR' || metadata?.status === 'INVALID_CONFIG') && <CrashScreen />}
          </div>
        </div>

        {showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}
        {showDocs && <HowItWorksModal onClose={() => setShowDocs(false)} />}
        {showArchBuilder && <ArchitectureBuilder onClose={() => setShowArchBuilder(false)} onSave={(arch) => { console.log("Tape-out custom architecture:", arch); setShowArchBuilder(false); }} />}
      </div>
    );
  }

  // Active Profiling State (The 4-Zone Workspace)
  return (
    <div style={{ height: '100vh', display: 'grid', gridTemplateRows: '48px 1fr', background: 'var(--bg-base)' }}>
      {/* 1. Top Bar */}
      <TopBar 
        isRunning={isRunning} 
        metadata={metadata} 
        onRun={() => handleRunSimulation(simParams)} 
        onToggleConfig={() => setShowConfig(!showConfig)}
        isProfiling={true}
        progress={progress}
        currentCycle={currentCycleIndex}
        totalCycles={totalCycles}
        isPlaying={isPlaying}
        onPlayPause={() => isPlaying ? pause() : play()}
        onStep={(dir) => setCurrentCycleIndex(Math.max(0, Math.min(totalCycles - 1, currentCycleIndex + dir)))}
        onZoomSram={() => setShowMicroView(true)}
        onToggleDocs={() => setShowDocs(true)}
        onToggleArchBuilder={() => setShowArchBuilder(true)} // 🚀 Pass handler
      />

      {/* 2, 3, 4. The Workspace Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 340px', overflow: 'hidden' }}>
        
        {/* Left Rail */}
        <aside style={{ borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Session Config</div>
            <div className="data" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {simParams.hardware_profile} • {simParams.M}x{simParams.N}x{simParams.K}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-2)' }}>
            <div className="label" style={{ padding: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>Execution Timeline</div>
            {timeline.map((cycle, index) => (
              <button
                key={index}
                onClick={() => setCurrentCycleIndex(index)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  color: index === currentCycleIndex ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  background: index === currentCycleIndex ? 'var(--bg-elevated)' : 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s'
                }}
              >
                <span>CY {String(cycle.cycle).padStart(4, '0')}</span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{cycle.instruction.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Center Canvas */}
        <main style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 var(--space-4)' }}>
            {(['execution', 'silicon', 'analysis'] as CanvasTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 16px',
                  fontSize: 12,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--text-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
            {activeTab === 'execution' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <Panel title="Token Stream" subtitle="LLM generation output">
                  <TokenStream />
                </Panel>
                <Panel title="Modern Execution" subtitle="Macro-state telemetry">
                  <ModernExecutionView />
                </Panel>
                <Panel title="Pipeline Gantt" subtitle="Instruction-level scheduling">
                  <PipelineGantt />
                </Panel>
                <Panel title="Warp Divergence" subtitle="Control flow analysis">
                  <WarpDivergenceView />
                </Panel>
              </div>
            )}
            {activeTab === 'silicon' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <Panel title="Silicon Telemetry" subtitle="Thermal & Power (Infrared)">
                  <SiliconTelemetry />
                </Panel>
                <Panel title="Memory Grid" subtitle="Bus routing & traffic">
                  <MemoryGrid />
                </Panel>
              </div>
            )}
            {activeTab === 'analysis' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <Panel title="Roofline Model" subtitle="Compute vs Memory bounds">
                  <RooflineChart />
                </Panel>
                <Panel title="CUPTI Counters" subtitle="Hardware performance counters">
                  <CUPTITable />
                </Panel>
                <Panel title="FinOps" subtitle="Cost & efficiency metrics">
                  <FinOpsDashboard />
                </Panel>
              </div>
            )}
            {comparisonResult && <ComparisonView />}
          </div>
        </main>

        {/* Right Inspector */}
        <aside style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, minHeight: 0, borderBottom: '1px solid var(--border-subtle)' }}>
            <AIOptimizationAgent />
          </div>
          <div style={{ height: '40%', borderTop: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <CodeView />
          </div>
        </aside>
      </div>

      {/* Micro SRAM Modal Overlay */}
      {showMicroView && (
        <MicroSRAMView onClose={() => setShowMicroView(false)} />
      )}

      {showDocs && <HowItWorksModal onClose={() => setShowDocs(false)} />}

      {showArchBuilder && <ArchitectureBuilder onClose={() => setShowArchBuilder(false)} onSave={(arch) => { console.log("Tape-out custom architecture:", arch); setShowArchBuilder(false); }} />}
    </div>
  );
}

// Sub-components
function TopBar({ isRunning, metadata, onRun, onToggleConfig, isProfiling, progress, currentCycle, totalCycles, isPlaying, onPlayPause, onStep, onZoomSram, onToggleDocs, onToggleArchBuilder }: any) {
  return (
    <header style={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
      padding: '0 var(--space-4)', borderBottom: '1px solid var(--border-subtle)', 
      background: 'var(--bg-panel)', zIndex: 10 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: isRunning ? 'var(--accent-green)' : 'var(--text-tertiary)' }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>CoreWeaver</span>
        </div>
        
        {isProfiling && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button className="btn" onClick={() => onStep(-1)} style={{ padding: '4px 8px' }}>◀</button>
            <button className="btn btn-primary" onClick={onPlayPause} style={{ padding: '4px 12px' }}>
              {isPlaying ? '❚❚' : '▶'}
            </button>
            <button className="btn" onClick={() => onStep(1)} style={{ padding: '4px 8px' }}>▶</button>
            
            <div style={{ width: 200, height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden', marginLeft: 'var(--space-2)' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--text-primary)', transition: 'width 0.1s linear' }} />
            </div>
            <span className="data" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {String(currentCycle).padStart(4, '0')} / {String(totalCycles).padStart(4, '0')}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {isProfiling && (
          <button className="btn" onClick={onZoomSram}>
            SRAM Zoom
          </button>
        )}
        
        <button className="btn" onClick={onToggleArchBuilder} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12 }}>⬡</span> Design Silicon
        </button>

        <button id="tour-docs-button" className="btn" onClick={onToggleDocs} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>?</span> Docs
        </button>

        {metadata?.status === 'OOM_ERROR' && <span className="data" style={{ color: 'var(--accent-red)', fontSize: 11 }}>● CUDA OOM</span>}
        {metadata?.status === 'SUCCESS_WITH_THROTTLE' && <span className="data" style={{ color: 'var(--accent-amber)', fontSize: 11 }}>● THERMAL THROTTLE</span>}
        
        <button className="btn" onClick={onToggleConfig}>
          {isProfiling ? 'Edit Config' : 'Configure'}
        </button>
        
        {!isProfiling && (
          <button id="tour-run-button" className="btn btn-primary" onClick={onRun} disabled={isRunning}>
            {isRunning ? 'Compiling...' : 'Compile & Run'}
          </button>
        )}
      </div>
    </header>
  );
}

function Panel({ title, subtitle, children }: { title: string, subtitle: string, children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
          <div className="label" style={{ marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ padding: 'var(--space-4)' }}>
        {children}
      </div>
    </div>
  );
}

export default App;