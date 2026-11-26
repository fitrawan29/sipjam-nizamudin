'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TourStep,
  getStepsForRole,
  setTutorialCompleted,
} from './tutorialSteps';

export interface OnboardingTutorialProps {
  userRole: 'guru' | 'admin' | 'superadmin' | string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onEnsureSidebarOpen?: (open: boolean) => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  userRole,
  isOpen,
  onClose,
  onComplete,
  onEnsureSidebarOpen,
}) => {
  const steps = getStepsForRole(userRole);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [_isMeasuring, setIsMeasuring] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Reset step index to 0 whenever the tutorial opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  const currentStep: TourStep | undefined = steps[currentStepIndex];

  // Measure and update the target element's bounding rect
  const updateTargetRect = useCallback(() => {
    if (typeof window === 'undefined' || !currentStep) {
      setTargetRect(null);
      return;
    }

    const selector = '[data-tour~="' + currentStep.targetTourId + '"], [data-tour="' + currentStep.targetTourId + '"]';
    let element = document.querySelector(selector);

    if (!element && currentStep.targetSubTabId) {
      const cleanSub = currentStep.targetSubTabId.replace(/^tab-/, '');
      const subSelector = '[data-tour~="' + currentStep.targetSubTabId + '"], [data-tour="' + currentStep.targetSubTabId + '"], #tab-' + cleanSub + ', #' + cleanSub + ', [id$="' + cleanSub + '"]';
      element = document.querySelector(subSelector);
    }

    if (element) {
      try {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      } catch {
        // Fallback if scrollIntoView options are not supported in test environments
        if (typeof element.scrollIntoView === 'function') {
          element.scrollIntoView();
        }
      }
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) {
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right,
        });
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  // Handle step activation & sidebar synchronization
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    setIsMeasuring(true);

    if (currentStep.requiresSidebarOpen) {
      onEnsureSidebarOpen?.(true);
    } else {
      onEnsureSidebarOpen?.(false);
    }

    // Staggered multi-phase measurement for smooth CSS drawer slide animation
    updateTargetRect();
    const t1 = setTimeout(() => updateTargetRect(), 80);
    const t2 = setTimeout(() => {
      updateTargetRect();
      setIsMeasuring(false);
    }, 200);
    const t3 = setTimeout(() => {
      updateTargetRect();
      setIsMeasuring(false);
    }, 350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen, currentStepIndex, currentStep, onEnsureSidebarOpen, updateTargetRect]);

  // Recalculate rect on scroll and resize
  useEffect(() => {
    if (!isOpen) return;

    const handleResizeOrScroll = () => {
      updateTargetRect();
    };

    window.addEventListener('resize', handleResizeOrScroll, { passive: true });
    window.addEventListener('scroll', handleResizeOrScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, { capture: true });
    };
  }, [isOpen, updateTargetRect]);

  const handleSkip = () => {
    setTutorialCompleted(userRole);
    setCurrentStepIndex(0);
    onEnsureSidebarOpen?.(false);
    onClose();
  };

  const handleComplete = () => {
    setTutorialCompleted(userRole);
    setCurrentStepIndex(0);
    onEnsureSidebarOpen?.(false);
    onComplete();
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // Keyboard navigation (Escape to skip, Right to next, Left to prev)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, steps.length, userRole]);

  if (!isOpen || steps.length === 0 || !currentStep) {
    return null;
  }

  // Calculate clamped tooltip position for mobile and desktop
  const calculateTooltipStyle = (): React.CSSProperties => {
    if (typeof window === 'undefined' || !targetRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(92vw, 380px)',
        maxWidth: '380px',
        zIndex: 75,
      };
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 640;
    const tooltipWidth = isMobile ? Math.min(360, vw - 32) : 380;
    const measuredHeight = tooltipRef.current?.offsetHeight;
    const estimatedHeight = measuredHeight && measuredHeight > 50 ? measuredHeight : (currentStep.subTabs?.length ? 320 : 220);

    // On narrow screens (Mobile: 320px - 428px)
    if (isMobile) {
      const left = 16;
      // If there's room below the target
      if (targetRect.bottom + estimatedHeight + 16 <= vh) {
        return {
          position: 'fixed',
          top: `${Math.max(16, targetRect.bottom + 12)}px`,
          left: `${left}px`,
          width: `${vw - 32}px`,
          maxWidth: '380px',
          zIndex: 75,
        };
      }
      // If there's room above the target
      if (targetRect.top - estimatedHeight - 16 >= 0) {
        return {
          position: 'fixed',
          top: `${Math.max(16, targetRect.top - estimatedHeight - 12)}px`,
          left: `${left}px`,
          width: `${vw - 32}px`,
          maxWidth: '380px',
          zIndex: 75,
        };
      }
      // Default: dock to bottom with comfortable margin
      return {
        position: 'fixed',
        bottom: '20px',
        left: '16px',
        right: '16px',
        maxWidth: '380px',
        margin: '0 auto',
        zIndex: 75,
      };
    }

    // On Desktop & Tablet
    const placement = currentStep.placement || 'right';
    let top = targetRect.top;
    let left = targetRect.left;

    if (placement === 'right') {
      left = targetRect.right + 16;
      top = Math.max(16, Math.min(vh - estimatedHeight - 16, targetRect.top));
      // Collision with right screen edge -> flip to left or place below
      if (left + tooltipWidth > vw - 16) {
        if (targetRect.left - tooltipWidth - 16 >= 16) {
          left = targetRect.left - tooltipWidth - 16;
        } else {
          left = Math.max(16, Math.min(vw - tooltipWidth - 16, targetRect.left));
          top = Math.max(16, Math.min(vh - estimatedHeight - 16, targetRect.bottom + 16));
        }
      }
    } else if (placement === 'bottom') {
      top = targetRect.bottom + 14;
      left = Math.max(16, Math.min(vw - tooltipWidth - 16, targetRect.left));
      // Collision with bottom screen edge -> flip to top
      if (top + estimatedHeight > vh - 16) {
        top = Math.max(16, targetRect.top - estimatedHeight - 14);
      }
    } else if (placement === 'top') {
      top = targetRect.top - estimatedHeight - 14;
      left = Math.max(16, Math.min(vw - tooltipWidth - 16, targetRect.left));
      // Collision with top screen edge -> flip to bottom
      if (top < 16) {
        top = Math.max(16, Math.min(vh - estimatedHeight - 16, targetRect.bottom + 14));
      }
    } else if (placement === 'left') {
      left = targetRect.left - tooltipWidth - 16;
      top = Math.max(16, Math.min(vh - estimatedHeight - 16, targetRect.top));
      // Collision with left screen edge -> flip to right
      if (left < 16) {
        left = Math.max(16, Math.min(vw - tooltipWidth - 16, targetRect.right + 16));
      }
    } else if (placement === 'center') {
      top = Math.max(16, Math.min(vh - estimatedHeight - 16, targetRect.top + (targetRect.height - estimatedHeight) / 2));
      left = Math.max(16, Math.min(vw - tooltipWidth - 16, targetRect.left + (targetRect.width - tooltipWidth) / 2));
    }

    // Viewport bounds clamping safety net
    top = Math.max(16, Math.min(Math.max(16, vh - estimatedHeight - 16), top));
    left = Math.max(16, Math.min(Math.max(16, vw - tooltipWidth - 16), left));

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 75,
    };
  };

  const padding = 6;
  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <div className="onboarding-tutorial-container">
      {/* 1. Backdrop Overlay with Spotlight Mask Cutout (z-[60]) */}
      <svg
        className="fixed inset-0 w-full h-full z-[60] pointer-events-auto transition-opacity duration-300"
        style={{ width: '100vw', height: '100vh' }}
      >
        <defs>
          <mask id="sipjam-onboarding-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.left - padding)}
                y={Math.max(0, targetRect.top - padding)}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="14"
                ry="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.65)"
          mask="url(#sipjam-onboarding-mask)"
        />
      </svg>

      {/* 2. Dynamic Spotlight Frame Box (z-[70]) */}
      {targetRect && (
        <div
          data-testid="spotlight-box"
          className="fixed pointer-events-none z-[70] transition-all duration-300 ease-out rounded-xl border-2 border-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.55)] ring-4 ring-teal-400/20"
          style={{
            top: `${Math.max(0, targetRect.top - padding)}px`,
            left: `${Math.max(0, targetRect.left - padding)}px`,
            width: `${targetRect.width + padding * 2}px`,
            height: `${targetRect.height + padding * 2}px`,
          }}
        />
      )}

      {/* 3. Floating Tooltip Popover Card (z-[75]) */}
      <div
        ref={tooltipRef}
        data-testid="tooltip-card"
        style={calculateTooltipStyle()}
        className="neu-card rounded-2xl p-5 transition-all duration-300 ease-out animate-fadeIn max-h-[calc(100vh-32px)] overflow-y-auto custom-scroll"
      >
        {/* Top Header: Badge, Progress Dots, & Close Button */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="neu-inset px-2.5 py-1 text-[11px] font-bold rounded-full text-[#0F766E] dark:text-teal-300 flex items-center gap-1.5">
              <i className="fa-solid fa-sparkles text-amber-500"></i>
              {`Langkah ${currentStepIndex + 1} dari ${steps.length}`}
            </span>
            <div className="flex items-center gap-1">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStepIndex
                      ? 'w-4 bg-[#0F766E] dark:bg-teal-400'
                      : idx < currentStepIndex
                      ? 'w-1.5 bg-teal-500/70'
                      : 'w-1.5 bg-slate-400/50 dark:bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="neu-btn w-7 h-7 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center justify-center"
            title="Tutup tutorial"
            aria-label="Tutup tutorial"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Title and Description */}
        <div className="mb-3">
          <h4 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
            {currentStep.title}
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Consolidated Sub-Tabs Indicator (ClayTabs Pointer) */}
        {currentStep.subTabs && currentStep.subTabs.length > 0 && (
          <div data-testid="subtab-pointer" className="mb-4 pt-2.5 border-t border-slate-300/60 dark:border-slate-700/60">
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
              <span className="text-[11px] font-bold text-[#0F766E] dark:text-teal-300 flex items-center gap-1.5 shrink-0">
                <i className="fa-solid fa-layer-group text-xs"></i>
                <span>Sub-Tab Terpadu (ClayTabs):</span>
              </span>
              {currentStep.activeSubTab && (
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium shrink-0">
                  Fokus: <strong className="font-bold">{currentStep.activeSubTab}</strong>
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentStep.subTabs.map((tab, idx) => {
                const isActive = currentStep.activeSubTab === tab;
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                      isActive
                        ? 'neu-inset text-[#0F766E] dark:text-teal-300 border border-[#0F766E]/30 dark:border-teal-400/30'
                        : 'neu-card-sm text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <i className={`fa-solid ${isActive ? 'fa-circle-dot text-[#0F766E] dark:text-teal-400' : 'fa-circle text-slate-400 dark:text-slate-600'} text-[7px]`}></i>
                    {tab}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Actions: Skip, Previous, Next / Finish */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-300/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer"
          >
            Lewati
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="neu-btn neu-btn-secondary px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <i className="fa-solid fa-arrow-left text-[10px]"></i>
                Kembali
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="neu-btn neu-btn-primary px-4 py-1.5 min-h-[36px] text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              {isLastStep ? (
                <>
                  Selesai
                  <i className="fa-solid fa-check text-[10px]"></i>
                </>
              ) : (
                <>
                  Lanjut
                  <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
