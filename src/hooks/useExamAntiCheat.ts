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
  isFullscreenSupported,
  triggerFullscreen,
  triggerExitFullscreen,
  clearExamSecurityState,
  getExamSecurityStorageKey,
  saveExamSecurityState,
  loadExamProgress,
  saveExamProgress
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
  const [isSimulatedFullscreen, setIsSimulatedFullscreen] = useState<boolean>(false);
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

  const isTerminatingRef = useRef(false);
  const isSimulatedFullscreenRef = useRef(false);

  // Process a violation trigger
  const triggerViolation = useCallback(
    (type: ViolationType, details?: string) => {
      if (!isActive || stateRef.current.isLocked || isTerminatingRef.current) return;

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

  // Check if previous session was abruptly interrupted while ongoing (browser close/reload)
  useEffect(() => {
    const saved = loadExamProgress(examId, studentId);
    if (saved?.isOngoing && !stateRef.current.isLocked) {
      saveExamProgress({
        ...saved,
        isOngoing: false,
        lastUpdatedAt: new Date().toISOString()
      });
      const { nextState, isNowLocked } = evaluateSecurityViolation(
        stateRef.current,
        'WINDOW_BLUR',
        'Sesi ujian terputus atau halaman dimuat ulang saat ujian aktif.'
      );
      setSecurityState(nextState);
      if (isNowLocked) {
        setIsBlocked(true);
        onLockoutRef.current?.(nextState);
      }
    }
  }, [examId, studentId]);

  // Re-enter fullscreen and dismiss warning modal (if not locked)
  const resumeFullscreen = useCallback(async () => {
    if (stateRef.current.isLocked) return;
    const targetElement = (typeof document !== 'undefined' ? document.documentElement : undefined) || containerRef?.current || undefined;
    let success = false;
    if (isFullscreenSupported()) {
      success = await triggerFullscreen(targetElement);
    }
    if (!success) {
      // Platform fallback (iPad/Safari/WebViews where triggerFullscreen fails or is unsupported)
      isSimulatedFullscreenRef.current = true;
      setIsSimulatedFullscreen(true);
      success = true;
    }
    if (success || isCurrentlyFullscreen(isSimulatedFullscreenRef.current)) {
      setIsFullscreen(true);
      setIsBlocked(false);
      setViolationModalOpen(false);
      setActiveViolation(null);
    }
  }, [containerRef]);

  // Request fullscreen explicitly (e.g. "Mulai Ujian")
  const startExamFullscreen = useCallback(async () => {
    isTerminatingRef.current = false;
    const targetElement = (typeof document !== 'undefined' ? document.documentElement : undefined) || containerRef?.current || undefined;
    let success = false;
    if (isFullscreenSupported()) {
      success = await triggerFullscreen(targetElement);
    }
    if (!success) {
      // Graceful simulated fullscreen fallback on mobile / WebViews or when native fullscreen rejects
      isSimulatedFullscreenRef.current = true;
      setIsSimulatedFullscreen(true);
      setIsFullscreen(true);
      return true;
    }
    const active = isCurrentlyFullscreen(isSimulatedFullscreenRef.current);
    setIsFullscreen(active);
    return success || active;
  }, [containerRef]);

  // Safe exit fullscreen that suppresses spurious FULLSCREEN_EXIT violation on submit
  const safeExitFullscreen = useCallback(async () => {
    isTerminatingRef.current = true;
    isSimulatedFullscreenRef.current = false;
    setIsSimulatedFullscreen(false);
    const res = await triggerExitFullscreen();
    setIsFullscreen(false);
    return res;
  }, []);

  // Dismiss modal for non-fullscreen violations
  const dismissModal = useCallback(() => {
    if (stateRef.current.isLocked) return;
    if (!isCurrentlyFullscreen(isSimulatedFullscreenRef.current)) {
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
      const active = isCurrentlyFullscreen(isSimulatedFullscreenRef.current);
      setIsFullscreen(active);
      if (!active && isActive && !stateRef.current.isLocked && !isTerminatingRef.current) {
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

    // 6. Keydown shortcuts (Devtools, Print, Save, Copy/Paste, Reload, Navigation)
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetIsEditable = isInputOrTextarea(e.target);
      const key = e.key ? e.key.toLowerCase() : '';
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // Prevent page reload shortcuts (F5, Ctrl+R, Cmd+R)
      if (e.key === 'F5' || e.keyCode === 116 || (isCtrlOrMeta && key === 'r')) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation('WINDOW_BLUR', 'Percobaan memuat ulang (reload) halaman ujian.');
        return;
      }

      // Prevent browser history navigation shortcuts (Alt+ArrowLeft / Alt+ArrowRight)
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation('WINDOW_BLUR', 'Percobaan navigasi riwayat browser (Back/Forward).');
        return;
      }

      // Prevent backspace navigation outside inputs
      if (e.key === 'Backspace' && !targetIsEditable) {
        e.preventDefault();
      }

      // DevTools shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, Mac Option)
      if (isDevToolsShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation('DEVTOOLS_SHORTCUT', `Shortcut ditekan: ${e.key || 'DevTools'}`);
        return;
      }

      // Copy/Paste/Print/Save/Find shortcuts
      if (isRestrictedCopyPasteShortcut(e, targetIsEditable)) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation('CLIPBOARD_ATTEMPT', `Shortcut terlarang: ${e.ctrlKey || e.metaKey ? 'Ctrl/Cmd+' : ''}${e.key.toUpperCase()}`);
        return;
      }

      // Escape key when in fullscreen: browser will exit fullscreen; fullscreenchange handles violation
      if (e.key === 'Escape' || e.keyCode === 27) {
        // Intentionally passive
      }
    };

    // 7. Page leave / reload prevention (beforeunload)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isTerminatingRef.current) return;
      e.preventDefault();
      e.returnValue = 'Ujian sedang berlangsung! Keluar dari halaman dapat menyebabkan jawaban terhenti.';
      return e.returnValue;
    };

    // 8. Prevent print dialog
    const handleBeforePrint = () => {
      triggerViolation('CLIPBOARD_ATTEMPT', 'Mencoba mencetak atau menyimpan dokumen ujian (print/PDF).');
    };

    // 9. Text Selection & Drag/Drop prevention
    const handleSelectStart = (e: Event) => {
      if (!isInputOrTextarea(e.target)) {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      triggerViolation('CLIPBOARD_ATTEMPT', 'Mencoba menarik dan melepas (drag and drop) konten ke dalam ujian.');
    };

    // 10. Window resize check for desktop fullscreen exit
    const handleResize = () => {
      if (isTerminatingRef.current) return;
      // Ignore virtual keyboard resizes while student is editing an input or textarea
      if (typeof document !== 'undefined' && isInputOrTextarea(document.activeElement)) {
        return;
      }
      if (isFullscreenSupported() && !isSimulatedFullscreenRef.current) {
        const active = isCurrentlyFullscreen(false);
        if (!active && isFullscreen && !stateRef.current.isLocked) {
          setIsFullscreen(false);
          triggerViolation('FULLSCREEN_EXIT', 'Jendela aplikasi keluar dari mode layar penuh.');
          setIsBlocked(true);
        }
      }
    };

    // 11. Cross-tab & storage tampering detection
    const handleStorage = (e: StorageEvent) => {
      const securityKey = getExamSecurityStorageKey(examId, studentId);
      if (e.key === securityKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as ExamSessionSecurityState;
          if (parsed.violationCount < stateRef.current.violationCount) {
            saveExamSecurityState(stateRef.current);
            triggerViolation('WINDOW_BLUR', 'Terdeteksi manipulasi penyimpanan sesi ujian.');
          } else if (parsed.isLocked && !stateRef.current.isLocked) {
            setSecurityState(parsed);
            setIsBlocked(true);
          }
        } catch (_) {}
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
    window.addEventListener('beforeunload', handleBeforeUnload);

    window.addEventListener('beforeprint', handleBeforePrint);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('drop', handleDrop);
    window.addEventListener('resize', handleResize);
    window.addEventListener('storage', handleStorage);

    // Initial fullscreen state check
    setIsFullscreen(isCurrentlyFullscreen(isSimulatedFullscreenRef.current));

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
      window.removeEventListener('beforeunload', handleBeforeUnload);

      window.removeEventListener('beforeprint', handleBeforePrint);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('drop', handleDrop);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isActive, triggerViolation, isFullscreen, examId, studentId]);

  return {
    securityState,
    isFullscreen,
    isSimulatedFullscreen,
    isBlocked,
    activeViolation,
    violationModalOpen,
    startExamFullscreen,
    resumeFullscreen,
    dismissModal,
    resetExamSecurity,
    triggerExitFullscreen: safeExitFullscreen
  };
}
