// OnboardingTour.tsx - Interactive Onboarding Tour with Lucide Icons
import { useState, useEffect } from 'react';
import { Sparkles, X, ChevronRight, Check } from 'lucide-react';

const STEPS = [
  {
    targetId: 'tour-ai-compiler',
    title: '1. AI Hardware Compiler',
    description: 'Start by describing your AI workload in plain English. Our LLM Agent parses your prompt and extracts exact CUDA/Triton parameters.',
    position: 'bottom'
  },
  {
    targetId: 'tour-control-panel',
    title: '2. Manual Hardware Configuration',
    description: 'Prefer exact micro-architectural control? Define matrix dimensions, threadblock sizes, and toggle features like async copy and kernel fusion.',
    position: 'bottom'
  },
  {
    targetId: 'tour-run-button',
    title: '3. Launch the Physics Engine',
    description: 'Compile and run to stream the simulation. The timeline will populate, activating cycle-by-cycle hardware telemetry.',
    position: 'top'
  },
  {
    targetId: 'tour-guide-button',
    title: '4. Interactive Architecture Guide',
    description: 'Access 11 structured hardware lessons and hands-on lab experiments anytime through Guide Mode.',
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
      } else {
        // Fallback rect if target element is not rendered
        setTargetRect(new DOMRect(window.innerWidth / 2 - 170, window.innerHeight / 2 - 100, 340, 200));
      }
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [currentStep]);

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLast) {
      localStorage.setItem('coreweaver_onboarded', 'true');
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem('coreweaver_onboarded', 'true');
    onComplete();
  };

  // Calculate tooltip position safely
  const tooltipWidth = 340;
  let top = targetRect ? targetRect.bottom + 14 : window.innerHeight / 2;
  let left = targetRect ? Math.max(16, targetRect.left) : window.innerWidth / 2 - tooltipWidth / 2;

  if (left + tooltipWidth > window.innerWidth - 16) {
    left = window.innerWidth - tooltipWidth - 16;
  }

  if (step.position === 'top' && targetRect) {
    top = Math.max(16, targetRect.top - 180);
  }

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 9999, 
        pointerEvents: 'auto',
        background: 'transparent'
      }}
    >
      {/* Dimmed Backdrop */}
      <div 
        onClick={handleSkip}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(3px)',
          zIndex: 9999
        }}
      />

      {/* Target Highlight Box */}
      {targetRect && (
        <div 
          style={{
            position: 'fixed',
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            border: '2px solid var(--accent-blue)',
            borderRadius: 8,
            boxShadow: '0 0 25px rgba(59, 130, 246, 0.5), inset 0 0 15px rgba(59, 130, 246, 0.2)',
            zIndex: 10000,
            pointerEvents: 'none',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      )}

      {/* Interactive Tooltip Card */}
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top,
          left,
          width: tooltipWidth,
          zIndex: 10001,
          pointerEvents: 'auto',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-strong)',
          borderRadius: 10,
          padding: 18,
          boxShadow: '0 20px 40px rgba(0,0,0,0.8), 0 0 1px rgba(255,255,255,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} color="var(--accent-blue)" />
            <span className="label" style={{ color: 'var(--accent-blue)', fontSize: 10, fontWeight: 700 }}>
              STEP {currentStep + 1} OF {STEPS.length}
            </span>
          </div>
          <button 
            onClick={handleSkip}
            className="btn"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-tertiary)', 
              cursor: 'pointer', 
              fontSize: 11,
              padding: '2px 6px',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>Skip Tour</span>
            <X size={12} />
          </button>
        </div>

        {/* Content */}
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            {step.title}
          </h3>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {step.description}
          </p>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          {/* Step Dots */}
          <div style={{ display: 'flex', gap: 5 }}>
            {STEPS.map((_, i) => (
              <div 
                key={i}
                style={{
                  width: i === currentStep ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === currentStep ? 'var(--accent-blue)' : 'var(--border-default)',
                  transition: 'all 0.2s'
                }}
              />
            ))}
          </div>

          <button 
            onClick={handleNext}
            className="btn btn-primary"
            style={{ 
              padding: '7px 14px', 
              fontSize: 12, 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>{isLast ? 'Start Building' : 'Next Step'}</span>
            {isLast ? <Check size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}