import { useState } from "react";

interface ControlPanelProps {
  onRunSimulation: (params: any) => void;
  isRunning: boolean;
}

export function ControlPanel({
  onRunSimulation,
  isRunning,
}: ControlPanelProps) {
  const [hardwareProfile, setHardwareProfile] = useState("A100_80GB");
  const [M, setM] = useState(1024);
  const [N, setN] = useState(1024);
  const [K, setK] = useState(1024);
  const [BLOCK_SIZE, setBLOCK_SIZE] = useState(128);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRunSimulation({ M, N, K, BLOCK_SIZE, hardware_profile: hardwareProfile });
  };

  return (
    <div
      style={{
        background: "#1e1e1e",
        padding: "1.5rem",
        borderRadius: "8px",
        color: "#fff",
        marginBottom: "1rem",
        border: "1px solid #333",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          color: "#00ffcc",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        ⚙️ Simulation Parameters
      </h3>
      <p style={{ color: "#888", fontSize: "0.85rem", marginTop: 0 }}>
        Adjust the matrix dimensions and Triton block size. The physics engine
        will calculate the exact cycle count, heat, and memory pressure.
      </p>
      <div style={{ gridColumn: "span 4" }}>
        <label
          style={{
            display: "block",
            fontSize: "0.8rem",
            color: "#aaa",
            marginBottom: "4px",
          }}
        >
          Target Hardware
        </label>
        <select
          value={hardwareProfile}
          onChange={(e) => setHardwareProfile(e.target.value)}
          style={inputStyle}
        >
          <option value="A100_80GB">NVIDIA A100 80GB (Data Center)</option>
          <option value="RTX_4090">NVIDIA RTX 4090 24GB (Consumer)</option>
          <option value="RTX_3090">NVIDIA RTX 3090 24GB (Consumer)</option>
          <option value="T4_16GB">NVIDIA T4 16GB (Edge/Server)</option>
        </select>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          alignItems: "end",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              color: "#aaa",
              marginBottom: "4px",
            }}
          >
            Matrix M
          </label>
          <input
            type="number"
            value={M}
            onChange={(e) => setM(Number(e.target.value))}
            style={inputStyle}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              color: "#aaa",
              marginBottom: "4px",
            }}
          >
            Matrix N
          </label>
          <input
            type="number"
            value={N}
            onChange={(e) => setN(Number(e.target.value))}
            style={inputStyle}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              color: "#aaa",
              marginBottom: "4px",
            }}
          >
            Matrix K
          </label>
          <input
            type="number"
            value={K}
            onChange={(e) => setK(Number(e.target.value))}
            style={inputStyle}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              color: "#aaa",
              marginBottom: "4px",
            }}
          >
            BLOCK_SIZE
          </label>
          <select
            value={BLOCK_SIZE}
            onChange={(e) => setBLOCK_SIZE(Number(e.target.value))}
            style={inputStyle}
          >
            <option value={64}>64</option>
            <option value={128}>128</option>
            <option value={256}>256</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isRunning}
          style={{
            gridColumn: "span 4",
            padding: "0.75rem",
            background: isRunning ? "#555" : "#00ffcc",
            color: isRunning ? "#aaa" : "#000",
            border: "none",
            borderRadius: "4px",
            fontWeight: "bold",
            cursor: isRunning ? "not-allowed" : "pointer",
            fontSize: "1rem",
            marginTop: "0.5rem",
          }}
        >
          {isRunning ? "Simulating..." : "Compile & Run Simulation"}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem",
  background: "#2d2d2d",
  border: "1px solid #444",
  borderRadius: "4px",
  color: "#fff",
  fontSize: "1rem",
};
