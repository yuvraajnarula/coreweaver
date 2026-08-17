// WorkflowToolbar.tsx - Enterprise Workflow Controls with Lucide Icons
import { useRef, useState } from "react";
import { useSimulationStore } from "../store";
import { CIRegressionView } from "./CICDRegressionView";
import { Share2, Download, Activity, FileUp, Check } from 'lucide-react';

interface WorkflowToolbarProps {
  params: any;
  setParams: (params: any) => void;
  onRunSimulation: (params: any) => void;
}

export function WorkflowToolbar({
  params,
  setParams,
  onRunSimulation,
}: WorkflowToolbarProps) {
  const {
    timeline,
    metadata,
    memoryBreakdown,
    rooflineMetrics,
    finopsMetrics,
  } = useSimulationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCICheck, setShowCICheck] = useState(false);

  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  const handleExport = () => {
    const exportData = {
      timeline,
      metadata,
      memoryBreakdown,
      rooflineMetrics,
      finopsMetrics,
      params,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coreweaver_trace_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    setIsGeneratingLink(true);
    setShareMessage("");

    try {
      const response = await fetch("http://localhost:8000/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params }),
      });

      if (!response.ok) throw new Error("Failed to generate link");

      const data = await response.json();
      const shareUrl = `${window.location.origin}?sid=${data.share_id}`;

      await navigator.clipboard.writeText(shareUrl);

      const ttlMinutes = Math.floor(data.ttl_seconds / 60);
      setShareMessage(`Copied! Expires in ${ttlMinutes}m`);

      setTimeout(() => setShareMessage(""), 4000);
    } catch {
      // Fallback client URL parameter sharing
      const shareParams = encodeURIComponent(JSON.stringify(params));
      const fallbackUrl = `${window.location.origin}?config=${shareParams}`;
      await navigator.clipboard.writeText(fallbackUrl);
      setShareMessage("Direct link copied to clipboard!");
      setTimeout(() => setShareMessage(""), 4000);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleImportTrace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);

        if (json.simParams || json.params) {
          const importedParams = json.simParams || json.params;
          setParams(importedParams);
          setTimeout(() => onRunSimulation(importedParams), 100);
          alert("PyTorch / CoreWeaver Trace imported and simulation started.");
        } else {
          alert('Invalid Trace File: Missing "simParams" or "params" object.');
        }
      } catch {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadMockTrace = () => {
    const mockTrace = {
      version: "1.0",
      simParams: {
        M: 8192,
        N: 8192,
        K: 4096,
        BLOCK_SIZE: 256,
        hardware_profile: "RTX_4090",
        enable_divergence: false,
        coalesced_memory: true,
        enable_async_copy: true,
        enable_fusion: true,
      },
    };
    const blob = new Blob([JSON.stringify(mockTrace, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mock_pytorch_trace.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        background: "var(--bg-panel)",
        borderRadius: "8px",
        padding: "12px 16px",
        border: "1px solid var(--border-subtle)",
        display: "flex",
        gap: "10px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{ color: "var(--text-tertiary)", fontSize: "11px", fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}
      >
        Enterprise Workflow:
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button
          onClick={handleShare}
          disabled={isGeneratingLink}
          className="btn"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}
        >
          <Share2 size={12} color="var(--accent-blue)" />
          <span>{isGeneratingLink ? "Generating..." : "Generate Share Link"}</span>
        </button>
        {shareMessage && (
          <span
            style={{
              fontSize: "11px",
              color: "var(--accent-green)",
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Check size={11} />
            {shareMessage}
          </span>
        )}
      </div>

      <button
        onClick={handleExport}
        disabled={timeline.length === 0}
        className="btn"
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}
      >
        <Download size={12} color="var(--accent-green)" />
        <span>Export Telemetry (JSON)</span>
      </button>

      <button 
        onClick={() => setShowCICheck(true)} 
        className="btn"
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}
      >
        <Activity size={12} color="var(--accent-amber)" />
        <span>Run CI Regression Check</span>
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}
        >
          <FileUp size={12} color="#c084fc" />
          <span>Import PyTorch Trace</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".json"
          onChange={handleImportTrace}
          style={{ display: "none" }}
        />
        <button
          onClick={downloadMockTrace}
          className="btn"
          style={{
            fontSize: "10px",
            padding: "4px 8px",
            color: "var(--text-tertiary)"
          }}
        >
          (Sample Mock)
        </button>
      </div>

      {showCICheck && <CIRegressionView currentParams={params} onClose={() => setShowCICheck(false)} />}
    </div>
  );
}
