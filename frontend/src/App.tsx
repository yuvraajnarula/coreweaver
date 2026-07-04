import { useState } from "react";
import { useSimulationStore } from "./store";
import { useSimulationSocket } from "./hooks/useSimulationSocket";
import "./App.css";
import { MemoryGrid } from "./MemoryGrid";
import { MicroSRAMView } from "./MicroSRAMView";
import { CodeView } from "./CodeView";
import { TokenStream } from "./TokenStream";
import { ControlPanel } from "./ControlPanel";
import { CrashScreen } from "./CrashScreen"; 
import { RooflineChart } from "./RooflineChart";
import { PipelineGantt } from './PipelineGantt';
import { AICommandBar } from './AICommandBar'; // 👈 1. IMPORT AI BAR

function App() {
  const { sendConfig } = useSimulationSocket();
  
  const { 
    totalCycles, 
    timeline, 
    currentCycleIndex, 
    setCurrentCycleIndex, 
    isPlaying, 
    play, 
    pause,
    metadata 
  } = useSimulationStore();
  
  const [isRunning, setIsRunning] = useState(false);
  const [showMicroView, setShowMicroView] = useState(false);

  // 👇 2. CRITICAL: The state that holds the parameters for the Control Panel
  const [simParams, setSimParams] = useState({
    M: 1024, N: 1024, K: 1024, BLOCK_SIZE: 128, hardware_profile: 'A100_80GB'
  });

  const currentCycle = timeline[currentCycleIndex];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentCycleIndex(Number(e.target.value));
  };

  const progress = totalCycles === 0 ? 0 : ((currentCycleIndex + 1) / totalCycles) * 100;

  const goPrev = () => setCurrentCycleIndex(Math.max(0, currentCycleIndex - 1));
  const goNext = () => setCurrentCycleIndex(Math.min(totalCycles - 1, currentCycleIndex + 1));

  const handleRunSimulation = (params: any) => {
    setIsRunning(true);
    sendConfig(params);
    setTimeout(() => setIsRunning(false), 80000); 
  };

  // 👇 3. CRITICAL: The function the AI calls when it extracts parameters
  const handleAICompile = (aiParams: any) => {
    setSimParams(aiParams); // Update the UI inputs instantly
    
    // Automatically trigger the simulation after a tiny delay so the UI updates
    setTimeout(() => {
      handleRunSimulation(aiParams);
    }, 100);
  };

  // 🛑 IDLE OR ERROR STATE
  if (!currentCycle) {
    return (
      <div className="app">
        <header className="topbar">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
            <h1>CoreWeaver</h1>
            <p className="subtitle">LLM Kernel Odyssey</p>
          </div>
          <div className="kernel-badge">
            {metadata?.status === 'OOM_ERROR' ? 'CUDA OOM Error' : 
             metadata?.status === 'INVALID_CONFIG' ? 'CUDA Config Error' : 
             'Physics Engine Idle'}
          </div>
        </header>
        
        <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '1rem' }}>
           {/* 👇 4. ADD AI BAR HERE SO IT SHOWS ON IDLE/ERROR SCREENS TOO */}
           <AICommandBar onParamsExtracted={handleAICompile} />

           <ControlPanel 
             onRunSimulation={handleRunSimulation} 
             isRunning={isRunning} 
             params={simParams}       // 👈 PASS STATE DOWN
             setParams={setSimParams} // 👈 PASS SETTER DOWN
           />

           {(metadata?.status === 'OOM_ERROR' || metadata?.status === 'INVALID_CONFIG') ? (
             <CrashScreen />
           ) : (
             <div className="card" style={{ textAlign: 'center', padding: '3rem', marginTop: '2rem' }}>
               <h2 style={{ color: '#00ffcc' }}>⚡ Engine Connected & Idle</h2>
               <p style={{ color: '#888' }}>The physics engine is ready. Use the AI Compiler above or configure parameters manually, then click "Compile & Run".</p>
             </div>
           )}
        </div>
      </div>
    );
  }

  // 🟢 ACTIVE STATE
  return (
    <div className="app">
      <header className="topbar">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
          <h1>CoreWeaver</h1>
          <p className="subtitle">LLM Kernel Odyssey</p>
        </div>
        <div className="kernel-badge">
          {metadata?.status === 'SUCCESS_WITH_THROTTLE' ? 'Throttled' : 'Parameterized Engine'}
        </div>
      </header>

      <section className="progress-card">
        <div className="progress-meta">
          <span>Cycle Progress</span>
          <span>{currentCycleIndex + 1} / {totalCycles}</span>
        </div>
        <div className="progress-wrapper">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <main className="layout">
        <aside className="sidebar">
          <div className="card">
            <div className="card-header">
              <h3>Timeline</h3>
            </div>
            <div className="timeline-list">
              {timeline.map((cycle, index) => (
                <button
                  key={index}
                  className={`timeline-item ${index === currentCycleIndex ? "active" : ""}`}
                  onClick={() => setCurrentCycleIndex(index)}
                >
                  <span>Cycle {cycle.cycle}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="content">
          {/* 👇 5. ADD AI BAR AT THE TOP OF THE DASHBOARD */}
          <AICommandBar onParamsExtracted={handleAICompile} />

          <ControlPanel 
            onRunSimulation={handleRunSimulation} 
            isRunning={isRunning} 
            params={simParams}       // 👈 PASS STATE DOWN
            setParams={setSimParams} // 👈 PASS SETTER DOWN
          />
          
          <TokenStream />

          <div className="card">
            <div className="card-header">
              <div>
                <h2>Cycle {currentCycle.cycle}</h2>
                <p className="muted">Active execution state</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="button primary" onClick={() => setShowMicroView(true)}>
                  🔬 Zoom SRAM
                </button>
                <span className="badge outline">Active</span>
              </div>
            </div>
            <div className="separator" />
            <div className="field">
              <label>Instruction</label>
              <code className="code-block">{currentCycle.instruction}</code>
            </div>
            <div className="field-desc">
              <label>Description</label>
              <p>{currentCycle.description}</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Hardware State</h3>
            </div>
            <div className="separator" />
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Temperature</span>
                <span className={`badge ${currentCycle.hardware_state.current_temperature > 90 ? "destructive" : "secondary"}`}>
                  {currentCycle.hardware_state.current_temperature}°C
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Clock Speed</span>
                <span className="stat-value">{currentCycle.hardware_state.clock_speed_mhz} MHz</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Bank Conflict</span>
                <span className={`badge ${currentCycle.hardware_state.bank_conflict ? "destructive" : "secondary"}`}>
                  {currentCycle.hardware_state.bank_conflict ? "Conflict" : "Clear"}
                </span>
              </div>
            </div>
            {currentCycle.hardware_state.conflict_details && (
              <div className="alert">
                {currentCycle.hardware_state.conflict_details}
              </div>
            )}
          </div>

          <MemoryGrid />
          <CodeView />
          <RooflineChart />
          <PipelineGantt />
        </section>
      </main>

      <footer className="playback-bar">
        <button className="button" onClick={goPrev}>Prev</button>
        <button className="button primary" onClick={isPlaying ? pause : play}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button className="button" onClick={goNext}>Next</button>
        <input
          className="slider"
          type="range"
          min="0"
          max={Math.max(0, totalCycles - 1)}
          value={currentCycleIndex}
          onChange={handleSliderChange}
          disabled={totalCycles === 0}
        />
      </footer>

      {showMicroView && (
        <MicroSRAMView onClose={() => setShowMicroView(false)} />
      )}
    </div>
  );
}

export default App;