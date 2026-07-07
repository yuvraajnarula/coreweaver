import { useState, useEffect } from 'react';

const STEPS = [
  {
    targetId: 'tour-ai-compiler',
    title: '1. AI Hardware Compiler',
    description: 'Start by describing your AI workload in plain English. Our LLM Agent will parse your intent and extract exact CUDA/Triton parameters.',
    position: 'bottom'
  },
  {
    targetId: 'tour-control-panel',
    title: '2. Manual Configuration',
    description: 'Prefer exact control? Manually define matrix dimensions, threadblock sizes, and toggle micro-architectural features like async copy.',
    position: 'bottom'
  },
  {
    targetId: 'tour-run-button',
    title: '3. Launch the Physics Engine',
    description: 'Compile and run to stream the simulation. The timeline will populate, and the profiler canvas will activate cycle-by-cycle.',
    position: 'top'
  },
  {
    targetId: 'tour-docs-button',
    title: '4. Documentation & Sharing',
    description: 'Access the full architecture guide anytime here. You can also generate enterprise share links for your team.',
    position: 'bottom'
  }
];

export function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      const el = document.getElementById(STEPS[currentStep].targetId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, [currentStep]);

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem('coreweaver_onboarded', 'true');
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('coreweaver_onboarded', 'true');
    onComplete();
  };

  if (!targetRect) return null;

  // Calculate tooltip position
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1001,
    width: 320,
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-strong)',
    borderRadius: 8,
    padding: 16,
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  };

  if (step.position === 'bottom') {
    tooltipStyle.top = targetRect.bottom + 16;
    tooltipStyle.left = targetRect.left;
  } else {
    tooltipStyle.bottom = window.innerHeight - targetRect.top + 16;
    tooltipStyle.left = targetRect.left;
  }

  // Ensure it doesn't go off-screen right
  if (tooltipStyle.left! + 320 > window.innerWidth) {
    tooltipStyle.left = window.innerWidth - 340;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'none' }}>
      {/* Spotlight Highlight */}
      {/* The massive box-shadow creates the dimmed overlay effect around the target */}
      <div 
        style={{
          position: 'fixed',
          top: targetRect.top - 6,
          left: targetRect.left - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
          border: '2px solid var(--accent-blue)',
          borderRadius: 10,
          boxShadow: '0 0 0 9999px rgba(9, 9, 11, 0.85), 0 0 15px rgba(59, 130, 246, 0.4)',
          zIndex: 1000,
          pointerEvents: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      />

      {/* Tooltip */}
      <div style={tooltipStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span className="label" style={{ color: 'var(--accent-blue)', fontSize: 10 }}>
            STEP {currentStep + 1} / {STEPS.length}
          </span>
          <button 
            onClick={handleSkip}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 11 }}
          >
            Skip Tour
          </button>
        </div>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          {step.title}
        </h3>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 20 }}>
          {step.description}
        </p>
        <button 
          onClick={handleNext}
          className="btn btn-primary"
          style={{ width: '100%', padding: '10px 0', fontSize: 12, fontWeight: 600 }}
        >
          {isLast ? 'Start Building' : 'Next'}
        </button>
      </div>
    </div>
  );
}