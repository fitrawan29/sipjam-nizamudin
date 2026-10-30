'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ViolationType,
  ViolationRecord,
  ExamSessionSecurityState,
  initExamSecurityState,
  evaluateSecurityViolation,
  isDevToolsShortcut,
  isRestrictedCopyPasteShortcut,
  isInputOrTextarea,
  isCurrentlyFullscreen,
  triggerFullscreen,
  triggerExitFullscreen,
  clearExamSecurityState
} from '@/lib/antiCheatGuard';

export interface UseExamAntiCheatOptions {
  examId: string;
  studentId: string;
  isActive: boolean;
  maxViolations?: number;
  onViolation?: (violation: ViolationRecord, state: ExamSessionSecurityState) => void;
  onLockout?: (state: ExamSessionSecurityState) => void;
  containerRef?: React.RefObject<HTMLElement | null>;
}

export function useExamAntiCheat({
  examId,
  studentId,
  isActive,
  maxViolations = 3,
  onViolation,
  onLockout,
  containerRef
}: UseExamAntiCheatOptions) {
  const [securityState, setSecurityState] = useState<ExamSessionSecurityState>(() =>
    initExamSecurityState({ examId, studentId, maxViolations })
  );

  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => isCurrentlyFullscreen());
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [activeViolation, setActiveViolation] = useState<ViolationRecord | null>(null);
  const [violationModalOpen, setViolationModalOpen] = useState<boolean>(false);

  // Keep latest state & callbacks in refs for event listeners
  const stateRef = useRef(securityState);
  stateRef.current = securityState;

  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;

  const onLockoutRef = useRef(onLockout);
  onLockoutRef.current = onLockout;

  // Process a violation trigger
  const triggerViolation = useCallback(
    (type: ViolationType, details?: string) => {
      if (!isActive || stateRef.current.isLocked) return;

      const { nextState, newViolation, isNowLocked, isCountIncremented } = evaluateSecurityViolation(
        stateRef.current,
        type,
        details
      );

      setSecurityState(nextState);

      if (isCountIncremented || type === 'FULLSCREEN_EXIT') {
        setActiveViolation(newViolation);
        setViolationModalOpen(true);
        if (type === 'FULLSCREEN_EXIT') {
          setIsBlocked(true);
        }
      }

      onViolationRef.current?.(newViolation, nextState);

      if (isNowLocked) {
        setIsBlocked(true);
        onLockoutRef.current?.(nextState);
      }
    },
    [isActive]
  );

  // Re-enter fullscreen and dismiss warning modal (if not locked)
  const resumeFullscreen = useCallback(async () => {
    if (stateRef.current.isLocked) return;
    const targetElement = containerRef?.current || undefined;
    const success = await triggerFullscreen(targetElement);
    if (success || isCurrentlyFullscreen()) {
      setIsFullscreen(true);
      setIsBlocked(false);
      setViolationModalOpen(false);
      setActiveViolation(null);
    }
  }, [containerRef]);

  // Request fullscreen explicitly (e.g. "Mulai Ujian")
  const startExamFullscreen = useCallback(async () => {
    const targetElement = containerRef?.current || undefined;
    const success = await triggerFullscreen(targetElement);
    setIsFullscreen(isCurrentlyFullscreen());
    return success;
  }, [containerRef]);

  // Dismiss modal for non-fullscreen violations
  const dismissModal = useCallback(() => {
    if (stateRef.current.isLocked) return;
    if (!isCurrentlyFullscreen()) {
      // Must restore fullscreen first
      resumeFullscreen();
      return;
    }
    setViolationModalOpen(false);
    setActiveViolation(null);
    setIsBlocked(false);
  }, [resumeFullscreen]);

  // Reset/Clear exam session
  const resetExamSecurity = useCallback(() => {
    clearExamSecurityState(examId, studentId);
    const fresh = initExamSecurityState({ examId, studentId, maxViolations });
    setSecurityState(fresh);
    setIsBlocked(false);
    setViolationModalOpen(false);
    setActiveViolation(null);
  }, [examId, studentId, maxViolations]);

  // DOM Event Listeners when exam is active
  useEffect(() => {
    if (!isActive) return;

    // 1. Visibility change (tab switch, minimize)
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        triggerViolation('TAB_SWITCH', 'Tab browser disembunyikan atau berganti ke tab lain.');
      }
    };

    // 2. Window blur (focus lost to another application or OS window)
    const handleWindowBlur = () => {
      // Only record blur if document is not already hidden (to prevent duplicate count)
      if (!document.hidden) {
        triggerViolation('WINDOW_BLUR', 'Fokus jendela aplikasi ujian berpindah.');
      }
    };

    // 3. Fullscreen change
    const handleFullscreenChange = () => {
      const active = isCurrentlyFullscreen();
      setIsFullscreen(active);
      if (!active && isActive && !stateRef.current.isLocked) {
        triggerViolation('FULLSCREEN_EXIT', 'Pengguna keluar dari mode layar penuh.');
        setIsBlocked(true);
      }
    };

    // 4. Clipboard events (copy, cut, paste)
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerViolation('CLIPBOARD_ATTEMPT', 'Mencoba menyalin teks (copy).');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerViolation('CLIPBOARD_ATTEMPT', 'Mencoba memotong teks (cut).');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerViolation('CLIPBOARD_ATTEMPT', 'Mencoba menempelkan teks (paste).');
    };

    // 5. Context menu (Right-click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerViolation('CONTEXT_MENU', 'Mencoba membuka menu klik kanan.');
    };

    // 6. Keydown shortcuts (Devtools, Print, Save, Copy/Paste)
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetIsEditable = isInputOrTextarea(e.target);

      // DevTools shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U)
      if (isDevToolsShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation('DEVTOOLS_SHORTCUT', `Shortcut ditekan: ${e.key || 'DevTools'}`);
        return;
      }

      // Copy/Paste/Print/Save shortcuts
      if (isRestrictedCopyPasteShortcut(e, targetIsEditable)) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation('CLIPBOARD_ATTEMPT', `Shortcut terlarang: Ctrl/Cmd + ${e.key.toUpperCase()}`);
        return;
      }

      // Escape key when in fullscreen: prevent default or track exit
      if (e.key === 'Escape' || e.keyCode === 27) {
        // Browser may still exit fullscreen; fullscreenchange listener handles the violation
      }
    };

    // Attach listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('cut', handleCut, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('keydown', handleKeyDown, true);

    // Initial fullscreen state check
    setIsFullscreen(isCurrentlyFullscreen());

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);

      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('cut', handleCut, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isActive, triggerViolation]);

  return {
    securityState,
    isFullscreen,
    isBlocked,
    activeViolation,
    violationModalOpen,
    startExamFullscreen,
    resumeFullscreen,
    dismissModal,
    resetExamSecurity,
    triggerExitFullscreen
  };
}
