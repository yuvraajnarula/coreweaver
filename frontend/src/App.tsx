import { useEffect, useState } from "react";
import { useSimulationStore } from "./store";
import "./App.css";
import { MemoryGrid } from "./MemoryGrid";
import { MicroSRAMView } from "./MicroSRAMView";

function App() {
  const {
    currentCycleIndex,
    totalCycles,
    timeline,
    setCurrentCycleIndex,
    isPlaying,
    play,
    pause,
  } = useSimulationStore();

  const currentCycle = timeline[currentCycleIndex];
  const [showMicroView, setShowMicroView] = useState(false);

  useEffect(() => {
    let interval: number | undefined;

    if (isPlaying && currentCycleIndex < totalCycles - 1) {
      interval = window.setInterval(() => {
        setCurrentCycleIndex(currentCycleIndex + 1);
      }, 1000);
    } else if (isPlaying && currentCycleIndex === totalCycles - 1) {
      pause();
    }

    return () => clearInterval(interval);
  }, [isPlaying, currentCycleIndex, totalCycles, setCurrentCycleIndex, pause]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentCycleIndex(Number(e.target.value));
  };

  const progress = ((currentCycleIndex + 1) / totalCycles) * 100;

  const goPrev = () => {
    setCurrentCycleIndex(Math.max(0, currentCycleIndex - 1));
  };

  const goNext = () => {
    setCurrentCycleIndex(Math.min(totalCycles - 1, currentCycleIndex + 1));
  };

  if (!currentCycle) {
    return (
      <div className="app">
        <div className="card">Loading simulation...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
          <h1>CoreWeaver</h1>
          <p className="subtitle">LLM Kernel Odyssey</p>
        </div>
        <div className="kernel-badge">mock_2x2_matmul</div>
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
                  key={cycle.cycle}
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
          {/* 1. CYCLE DETAILS CARD */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2>Cycle {currentCycle.cycle}</h2>
                <p className="muted">Active execution state</p>
              </div>
              
              {/* 👇 ADDED: The Zoom Button next to the Active badge 👇 */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  className="button primary" 
                  onClick={() => setShowMicroView(true)}
                >
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

          {/* 2. HARDWARE STATE CARD */}
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

          {/* 👇 MOVED: Memory Grid is now inside the content section, below the cards 👇 */}
          <MemoryGrid />
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
          max={totalCycles - 1}
          value={currentCycleIndex}
          onChange={handleSliderChange}
        />
      </footer>

      {/* 3. MICRO SRAM MODAL */}
      {showMicroView && (
        <MicroSRAMView onClose={() => setShowMicroView(false)} />
      )}
    </div>
  );
}

export default App;