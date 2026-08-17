// App.tsx - CoreWeaver Enterprise GPU Simulator Workspace with Lucide Icons
import { useState, useEffect } from "react";
import { useSimulationStore } from "./store";
import { useSimulationSocket } from "./hooks/useSimulationSocket";
import { exportToJSON } from "./utils/exportTrace"; 
import { runClientSimulation } from "./utils/clientSimulator";
import { STORY_PRESETS } from "./utils/storyPresets";

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

import { StoryCheckpointBar } from './components/StoryCheckpointBar';
import { StoryNarrativeCard } from './components/StoryNarrativeCard';
import { GuideModeModal } from './components/GuideMode';
import { OnboardingTour } from './components/OnboardingTour';
import { HowItWorksModal } from './components/HowItWorks';
import { ArchitectureBuilder } from './components/ArchitectureBuilder';

import { 
  Play, Pause, SkipBack, SkipForward, Download, Cpu, 
  HelpCircle, GraduationCap, Sliders, 
  Maximize2, Flag, AlertTriangle 
} from 'lucide-react';

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
    isPlaying, play, pause, playbackSpeed, setPlaybackSpeed,
    metadata, comparisonResult, loadFullSimulation,
    rooflineMetrics, finopsMetrics, connectionStatus,
    guideModeOpen, setGuideMode, simParams, setSimParams
  } = useSimulationStore();

  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<CanvasTab>('execution');
  const [showConfig, setShowConfig] = useState(false);
  const [isResolvingLink, setIsResolvingLink] = useState(false);
  const [showMicroView, setShowMicroView] = useState(false);
  const [baselineConfig, setBaselineConfig] = useState<any | null>(null);
  
  const [showTour, setShowTour] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showArchBuilder, setShowArchBuilder] = useState(false);

  const currentCycle = timeline[currentCycleIndex];

  // Playback interval timer loop
  useEffect(() => {
    let interval: number | undefined;

    if (isPlaying && totalCycles > 0) {
      const delayMs = Math.max(80, Math.floor(800 / playbackSpeed));
      interval = window.setInterval(() => {
        const nextIdx = useSimulationStore.getState().currentCycleIndex + 1;
        if (nextIdx >= totalCycles) {
          pause();
        } else {
          setCurrentCycleIndex(nextIdx);
        }
      }, delayMs);
    }

    return () => clearInterval(interval);
  }, [isPlaying, totalCycles, playbackSpeed, pause, setCurrentCycleIndex]);

  // First-time Onboarding
  useEffect(() => {
    const hasOnboarded = localStorage.getItem('coreweaver_onboarded');
    if (!hasOnboarded) setTimeout(() => setShowTour(true), 500);
  }, []);

  // Share link resolution
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
          handleRunSimulation(data.params);
        })
        .catch(() => window.history.replaceState({}, '', window.location.pathname))
        .finally(() => setIsResolvingLink(false));
    }
  }, []);

  // Run simulation (with WebSocket + instant client-side fallback)
  const handleRunSimulation = (params: any) => {
    setIsRunning(true);
    setSimParams(params);

    if (connectionStatus === 'connected') {
      sendConfig(params);
      setTimeout(() => setIsRunning(false), 2000);
    } else {
      // Offline/Local deterministic client simulator fallback
      const result = runClientSimulation(params);
      loadFullSimulation(result);
      setIsRunning(false);
    }
  };

  const handleAICompile = (aiParams: any) => { 
    setSimParams(aiParams); 
    setTimeout(() => handleRunSimulation(aiParams), 100); 
  };
  
  const handleSetBaseline = () => setBaselineConfig(simParams);
  
  const handleRunComparison = async () => {
    if (!baselineConfig) return;
    setIsRunning(true);
    try {
      const response = await fetch('http://localhost:8000/api/compare', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_a: baselineConfig, config_b: simParams }),
      });
      const data = await response.json();
      useSimulationStore.getState().setComparisonResult(data);
    } catch {
      // Fallback comparison using client simulator
      const resA = runClientSimulation(baselineConfig);
      const resB = runClientSimulation(simParams);
      const cyclesA = resA.metadata.total_cycles;
      const cyclesB = resB.metadata.total_cycles;
      const gflopsA = resA.rooflineMetrics?.achieved_gflops || 0;
      const gflopsB = resB.rooflineMetrics?.achieved_gflops || 0;
      const verdict = gflopsB > gflopsA * 1.02 ? 'IMPROVEMENT' : gflopsA > gflopsB * 1.02 ? 'REGRESSION' : 'IDENTICAL';

      useSimulationStore.getState().setComparisonResult({
        metrics_a: {
          total_cycles: cyclesA,
          achieved_gflops: gflopsA,
          arithmetic_intensity: resA.rooflineMetrics?.arithmetic_intensity || 0,
          occupancy_pct: resA.occupancyMetrics?.occupancy_pct || 0,
          kernel_cost_usd: resA.finopsMetrics?.kernel_cost_usd || 0
        },
        metrics_b: {
          total_cycles: cyclesB,
          achieved_gflops: gflopsB,
          arithmetic_intensity: resB.rooflineMetrics?.arithmetic_intensity || 0,
          occupancy_pct: resB.occupancyMetrics?.occupancy_pct || 0,
          kernel_cost_usd: resB.finopsMetrics?.kernel_cost_usd || 0
        },
        verdict
      });
    } finally { 
      setIsRunning(false); 
    }
  };

  const handleExport = () => {
    if (timeline.length === 0 || !metadata) { alert("No simulation data to export"); return; }
    exportToJSON(timeline, metadata, rooflineMetrics, finopsMetrics);
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

  // Initial Idle State (Landing & Configuration Canvas)
  if (!currentCycle) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
        <TopBar 
          isRunning={isRunning} 
          metadata={metadata} 
          onRun={() => handleRunSimulation(simParams || DEFAULT_PARAMS)} 
          onToggleConfig={() => setShowConfig(!showConfig)} 
          onToggleDocs={() => setShowDocs(true)} 
          onToggleGuide={() => setGuideMode(true)}
          onToggleArchBuilder={() => setShowArchBuilder(true)} 
          connectionStatus={connectionStatus} 
        />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', padding: '32px 16px' }}>
          <div style={{ width: '100%', maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Hero Header */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  CoreWeaver
                </h1>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--accent-blue)', fontWeight: 600 }}>
                  v2.0 • Silicon Physics Engine
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
                Mathematically rigorous, cycle-by-cycle AI GPU architecture simulator. Bridge the gap between PyTorch / Triton software and silicon physics.
              </p>
            </div>

            {/* Quick Interactive Story Presets */}
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Flag size={14} color="var(--accent-blue)" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Quick Story Scenarios</div>
                    <div className="label" style={{ marginTop: 2 }}>One-click interactive architectural storylines</div>
                  </div>
                </div>
                <button 
                  id="tour-guide-button"
                  className="btn" 
                  onClick={() => setGuideMode(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-blue)', borderColor: 'rgba(59, 130, 246, 0.3)' }}
                >
                  <GraduationCap size={14} />
                  <span>Open Guide Mode</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                {STORY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSimParams(preset.params);
                      const res = runClientSimulation(preset.params);
                      loadFullSimulation(res);
                    }}
                    style={{
                      padding: '12px 14px',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 8,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-blue)';
                      e.currentTarget.style.background = 'var(--bg-elevated)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-default)';
                      e.currentTarget.style.background = 'var(--bg-base)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{preset.name}</span>
                      <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--bg-elevated)', color: 'var(--accent-blue)', fontWeight: 600 }}>
                        {preset.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                      {preset.subtitle}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Workflow & AI Compiler */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <WorkflowToolbar params={simParams || DEFAULT_PARAMS} setParams={setSimParams} onRunSimulation={handleRunSimulation} />
              <div id="tour-ai-compiler"><AICommandBar onParamsExtracted={handleAICompile} /></div>
              
              <div id="tour-control-panel">
                <ControlPanel 
                  onRunSimulation={handleRunSimulation} 
                  isRunning={isRunning} 
                  params={simParams || DEFAULT_PARAMS} 
                  setParams={setSimParams} 
                  onSetBaseline={handleSetBaseline} 
                  onRunComparison={handleRunComparison} 
                  hasBaseline={!!baselineConfig} 
                />
              </div>
            </div>

            {(metadata?.status === 'OOM_ERROR' || metadata?.status === 'INVALID_CONFIG') && <CrashScreen />}
          </div>
        </div>

        {showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}
        {showDocs && <HowItWorksModal onClose={() => setShowDocs(false)} />}
        {guideModeOpen && <GuideModeModal onClose={() => setGuideMode(false)} onSetActiveTab={setActiveTab} />}
        {showArchBuilder && <ArchitectureBuilder onClose={() => setShowArchBuilder(false)} onSave={(arch) => { 
          const customParams = { ...(simParams || DEFAULT_PARAMS), hardware_profile: arch.name };
          setSimParams(customParams);
          const res = runClientSimulation(customParams, arch);
          loadFullSimulation(res);
          setShowArchBuilder(false); 
        }} />}
      </div>
    );
  }

  // Active Profiling State (The 4-Zone Interactive Hardware Workspace)
  return (
    <div style={{ height: '100vh', display: 'grid', gridTemplateRows: '48px 1fr', background: 'var(--bg-base)' }}>
      <TopBar 
        isRunning={isRunning} 
        metadata={metadata} 
        onRun={() => handleRunSimulation(simParams)} 
        onToggleConfig={() => setShowConfig(!showConfig)}
        isProfiling={true} 
        progress={progress} 
        currentCycle={currentCycleIndex + 1} 
        totalCycles={totalCycles}
        isPlaying={isPlaying} 
        playbackSpeed={playbackSpeed}
        onSetSpeed={(spd: number) => setPlaybackSpeed(spd)}
        onPlayPause={() => isPlaying ? pause() : play()}
        onStep={(dir: number) => setCurrentCycleIndex(Math.max(0, Math.min(totalCycles - 1, currentCycleIndex + dir)))}
        onZoomSram={() => setShowMicroView(true)} 
        onToggleDocs={() => setShowDocs(true)}
        onToggleGuide={() => setGuideMode(true)}
        onToggleArchBuilder={() => setShowArchBuilder(true)} 
        onExport={handleExport}
        connectionStatus={connectionStatus}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 340px', overflow: 'hidden' }}>
        
        {/* Left Sidebar: Session Config & Cycle Timeline */}
        <aside style={{ borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-panel)' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="label" style={{ marginBottom: 4 }}>Hardware Target</div>
            <div className="data" style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>
              {simParams?.hardware_profile || metadata?.hardware_profile}
            </div>
            <div className="data" style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {simParams?.M}x{simParams?.N}x{simParams?.K} • Block {simParams?.BLOCK_SIZE}
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
            <div className="label" style={{ padding: '6px 8px', marginBottom: 2 }}>Cycle Execution Log</div>
            {timeline.map((cycle, index) => {
              const isSelected = index === currentCycleIndex;
              const isConflict = cycle.hardware_state.bank_conflict;
              const isStall = cycle.instruction === 'STALL_THERMAL';
              const isMMA = cycle.instruction === 'MMA_SYNC';
              
              return (
                <button 
                  key={index} 
                  onClick={() => {
                    pause();
                    setCurrentCycleIndex(index);
                  }} 
                  style={{
                    width: '100%', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '5px 8px', 
                    fontSize: 11, 
                    fontFamily: 'var(--font-mono)',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                    border: 'none', 
                    borderRadius: 4, 
                    cursor: 'pointer', 
                    textAlign: 'left',
                    borderLeft: isSelected ? '2px solid var(--accent-blue)' : '2px solid transparent',
                    transition: 'all 0.1s'
                  }}
                >
                  <span style={{ fontWeight: isSelected ? 600 : 400 }}>
                    CY {String(cycle.cycle).padStart(3, '0')}
                  </span>
                  <span style={{ 
                    fontSize: 10, 
                    color: isStall ? 'var(--accent-amber)' : isConflict ? 'var(--accent-red)' : isMMA ? 'var(--accent-green)' : 'var(--text-tertiary)' 
                  }}>
                    {cycle.instruction.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center Main Profiler Canvas */}
        <main style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Top Checkpoint Milestone Bar */}
          <div style={{ padding: '10px 16px 0 16px' }}>
            <StoryCheckpointBar />
          </div>

          {/* Canvas Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 16px', marginTop: 8 }}>
            {(['execution', 'silicon', 'analysis'] as CanvasTab[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '10px 16px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-tertiary)',
                background: 'transparent', border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--text-primary)' : '2px solid transparent',
                cursor: 'pointer'
              }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Active Canvas Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            
            {/* Story Physics Narrative HUD */}
            <StoryNarrativeCard />

            {activeTab === 'execution' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Panel title="Token Stream" subtitle="Cycle-by-cycle LLM generation output"><TokenStream /></Panel>
                <Panel title="Modern Execution (TMA & Fusion)" subtitle="Asynchronous memory overlap & FlashAttention fusion"><ModernExecutionView /></Panel>
                <Panel title="Pipeline Gantt" subtitle="Instruction-level scheduling with true physical latencies"><PipelineGantt /></Panel>
                <Panel title="Warp Divergence" subtitle="SIMT branch serialization analysis"><WarpDivergenceView /></Panel>
              </div>
            )}
            
            {activeTab === 'silicon' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Panel title="Silicon Telemetry" subtitle="Infrared Thermal Hotspots & Diffusion (90°C Bounded)"><SiliconTelemetry /></Panel>
                <Panel title="Memory Grid" subtitle="32-Bank Shared Memory bus routing & conflicts"><MemoryGrid /></Panel>
              </div>
            )}
            
            {activeTab === 'analysis' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Panel title="Roofline Model" subtitle="Logarithmic Arithmetic Intensity vs GFLOPS"><RooflineChart /></Panel>
                <Panel title="CUPTI Hardware Counters" subtitle="Nsight Compute profiling emulation table"><CUPTITable /></Panel>
                <Panel title="FinOps Cloud Cost" subtitle="Wall-clock time & million-run cloud billing estimator"><FinOpsDashboard /></Panel>
              </div>
            )}

            {comparisonResult && <ComparisonView />}
          </div>
        </main>

        {/* Right Sidebar: AI Inspector & Code View */}
        <aside style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-panel)' }}>
          <div style={{ flex: 1, minHeight: 0, borderBottom: '1px solid var(--border-subtle)' }}>
            <AIOptimizationAgent />
          </div>
          <div style={{ height: '45%', borderTop: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <CodeView />
          </div>
        </aside>
      </div>

      {showMicroView && <MicroSRAMView onClose={() => setShowMicroView(false)} />}
      {showDocs && <HowItWorksModal onClose={() => setShowDocs(false)} />}
      {guideModeOpen && <GuideModeModal onClose={() => setGuideMode(false)} onSetActiveTab={setActiveTab} />}
      {showArchBuilder && <ArchitectureBuilder onClose={() => setShowArchBuilder(false)} onSave={(arch) => { 
        const customParams = { ...(simParams || DEFAULT_PARAMS), hardware_profile: arch.name };
        setSimParams(customParams);
        const res = runClientSimulation(customParams, arch);
        loadFullSimulation(res);
        setShowArchBuilder(false); 
      }} />}
    </div>
  );
}

// TOPBAR WITH LUCIDE ICONS
function TopBar({ 
  isRunning, metadata, onRun, onToggleConfig, isProfiling, progress, 
  currentCycle, totalCycles, isPlaying, playbackSpeed, onSetSpeed, onPlayPause, 
  onStep, onZoomSram, onToggleDocs, onToggleGuide, onToggleArchBuilder, onExport, connectionStatus 
}: any) {
  return (
    <header style={{ 
      position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
      padding: '0 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', zIndex: 10 
    }}>
      
      {/* Brand & Connection */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            width: 8, height: 8, borderRadius: '50%', 
            background: connectionStatus === 'connected' ? 'var(--accent-green)' : 'var(--text-tertiary)'
          }} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>CoreWeaver</span>
        </div>
        
        {/* Playback Controls in Profiling Mode */}
        {isProfiling && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
            <button className="btn" onClick={() => onStep(-1)} style={{ padding: '4px 7px' }} title="Previous Cycle">
              <SkipBack size={12} />
            </button>
            <button className="btn btn-primary" onClick={onPlayPause} style={{ padding: '4px 10px' }} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <button className="btn" onClick={() => onStep(1)} style={{ padding: '4px 7px' }} title="Next Cycle">
              <SkipForward size={12} />
            </button>
            
            {/* Speed Multipliers */}
            <div style={{ display: 'flex', background: 'var(--bg-base)', borderRadius: 4, padding: 1, border: '1px solid var(--border-subtle)' }}>
              {[0.5, 1, 2, 4].map(spd => (
                <button
                  key={spd}
                  onClick={() => onSetSpeed(spd)}
                  style={{
                    padding: '2px 6px',
                    fontSize: 10,
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: 3,
                    background: playbackSpeed === spd ? 'var(--bg-elevated)' : 'transparent',
                    color: playbackSpeed === spd ? 'var(--accent-blue)' : 'var(--text-tertiary)',
                    cursor: 'pointer'
                  }}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Scrubber Progress Bar */}
            <div style={{ width: 130, height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden', marginLeft: 4 }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--text-primary)', transition: 'width 0.1s linear' }} />
            </div>
            
            <span className="data" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              CY {String(currentCycle).padStart(2, '0')} / {String(totalCycles).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isProfiling && (
          <>
            <button className="btn" onClick={onZoomSram} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <Maximize2 size={12} />
              <span>SRAM Zoom</span>
            </button>
            <button className="btn" onClick={onExport} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <Download size={12} />
              <span>Export Trace</span>
            </button>
          </>
        )}
        
        {/* Guide Mode Toggle */}
        <button 
          id="tour-guide-button" 
          className="btn" 
          onClick={onToggleGuide} 
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-blue)', borderColor: 'rgba(59, 130, 246, 0.3)', fontSize: 11 }}
        >
          <GraduationCap size={13} />
          <span>Guide Mode</span>
        </button>

        {/* Silicon Design */}
        <button className="btn" onClick={onToggleArchBuilder} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
          <Cpu size={12} />
          <span>Design Silicon</span>
        </button>

        {/* Docs */}
        <button id="tour-docs-button" className="btn" onClick={onToggleDocs} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
          <HelpCircle size={12} />
          <span>Docs</span>
        </button>

        {metadata?.status === 'OOM_ERROR' && (
          <span className="data" style={{ color: 'var(--accent-red)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={12} /> CUDA OOM
          </span>
        )}
        {metadata?.status === 'SUCCESS_WITH_THROTTLE' && (
          <span className="data" style={{ color: 'var(--accent-amber)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={12} /> THERMAL THROTTLE
          </span>
        )}
        
        <button className="btn" onClick={onToggleConfig} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
          <Sliders size={12} />
          <span>{isProfiling ? 'Edit Config' : 'Configure'}</span>
        </button>
        
        {!isProfiling && (
          <button className="btn btn-primary" onClick={onRun} disabled={isRunning} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <Play size={12} />
            <span>{isRunning ? 'Compiling...' : 'Compile & Run'}</span>
          </button>
        )}
      </div>
    </header>
  );
}

function Panel({ title, subtitle, children }: { title: string, subtitle: string, children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
          <div className="label" style={{ marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ padding: '14px' }}>{children}</div>
    </div>
  );
}

export default App;