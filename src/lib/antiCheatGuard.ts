/**
 * src/lib/antiCheatGuard.ts
 * Core security engine for Student Exam anti-cheating mechanisms in SIPJAM.
 * Enforces fullscreen, prevents tab/window switching, blocks devtools/copy-paste shortcuts,
 * suppresses clipboard/contextmenu events, and tracks tamper-resistant exam session integrity.
 */

export type ViolationType =
  | 'TAB_SWITCH'
  | 'WINDOW_BLUR'
  | 'FULLSCREEN_EXIT'
  | 'CLIPBOARD_ATTEMPT'
  | 'DEVTOOLS_SHORTCUT'
  | 'CONTEXT_MENU';

export interface ViolationRecord {
  id: string;
  type: ViolationType;
  message: string;
  timestamp: string;
  details?: string;
}

export interface ExamSessionSecurityState {
  examId: string;
  studentId: string;
  violationCount: number;
  maxViolations: number;
  isLocked: boolean;
  isFullscreen: boolean;
  violations: ViolationRecord[];
  startedAt: string;
  lastViolationAt?: string;
  lockoutReason?: string;
}

export const DEFAULT_MAX_VIOLATIONS = 3;
export const VIOLATION_COOLDOWN_MS = 600; // Debounce rapid consecutive window events (blur + visibilitychange)

export const VIOLATION_DESCRIPTIONS: Record<ViolationType, string> = {
  TAB_SWITCH: 'Terdeteksi berpindah tab browser saat ujian berlangsung.',
  WINDOW_BLUR: 'Fokus jendela aplikasi ujian terputus (membuka aplikasi lain atau klik di luar browser).',
  FULLSCREEN_EXIT: 'Meninggalkan mode layar penuh (fullscreen) sebelum ujian diserahkan.',
  CLIPBOARD_ATTEMPT: 'Percobaan menyalin (copy), memotong (cut), atau menempel (paste) konten ujian.',
  DEVTOOLS_SHORTCUT: 'Percobaan membuka alat pengembang (Developer Tools) atau inspeksi kode ujian.',
  CONTEXT_MENU: 'Percobaan membuka menu konteks (klik kanan) pada halaman ujian.'
};

/**
 * Storage key helper for persisting student exam security state across reloads
 */
export function getExamSecurityStorageKey(examId: string, studentId: string): string {
  const cleanExamId = (examId || 'general').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanStudentId = (studentId || 'anonymous').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `sipjam_exam_security_${cleanExamId}_${cleanStudentId}`;
}

/**
 * Load persisted exam security state
 */
export function loadExamSecurityState(examId: string, studentId: string): ExamSessionSecurityState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getExamSecurityStorageKey(examId, studentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.violationCount === 'number') {
      return parsed as ExamSessionSecurityState;
    }
  } catch (err) {
    console.warn('[antiCheatGuard] Failed to parse stored security state:', err);
  }
  return null;
}

/**
 * Save exam security state to storage
 */
export function saveExamSecurityState(state: ExamSessionSecurityState): void {
  if (typeof window === 'undefined' || !state) return;
  try {
    localStorage.setItem(getExamSecurityStorageKey(state.examId, state.studentId), JSON.stringify(state));
  } catch (err) {
    console.warn('[antiCheatGuard] Failed to save security state:', err);
  }
}

/**
 * Clear exam security state upon genuine exam completion
 */
export function clearExamSecurityState(examId: string, studentId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getExamSecurityStorageKey(examId, studentId));
  } catch (_) {}
}

export interface ExamAnswerProgress {
  examId: string;
  studentId: string;
  currentQuestionIndex: number;
  answers: Record<number, string>;
  doubtful: Record<number, boolean>;
  timeRemaining: number;
  lastUpdatedAt: string;
  isOngoing?: boolean;
}

export function getExamProgressStorageKey(examId: string, studentId: string): string {
  const cleanExamId = (examId || 'general').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanStudentId = (studentId || 'anonymous').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `sipjam_exam_progress_${cleanExamId}_${cleanStudentId}`;
}

export function loadExamProgress(examId: string, studentId: string): ExamAnswerProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getExamProgressStorageKey(examId, studentId));
    if (!raw) return null;
    return JSON.parse(raw) as ExamAnswerProgress;
  } catch (err) {
    console.warn('[antiCheatGuard] Failed to parse stored progress:', err);
  }
  return null;
}

export function saveExamProgress(progress: ExamAnswerProgress): void {
  if (typeof window === 'undefined' || !progress) return;
  try {
    localStorage.setItem(getExamProgressStorageKey(progress.examId, progress.studentId), JSON.stringify(progress));
  } catch (err) {
    console.warn('[antiCheatGuard] Failed to save progress:', err);
  }
}

export function clearExamProgress(examId: string, studentId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getExamProgressStorageKey(examId, studentId));
  } catch (_) {}
}

/**
 * Initialize new or restored exam security state
 */
export function initExamSecurityState(params: {
  examId: string;
  studentId: string;
  maxViolations?: number;
}): ExamSessionSecurityState {
  const existing = loadExamSecurityState(params.examId, params.studentId);
  if (existing) {
    // If existing session was already locked, retain lockout
    return existing;
  }

  const newState: ExamSessionSecurityState = {
    examId: params.examId,
    studentId: params.studentId,
    violationCount: 0,
    maxViolations: params.maxViolations || DEFAULT_MAX_VIOLATIONS,
    isLocked: false,
    isFullscreen: false,
    violations: [],
    startedAt: new Date().toISOString()
  };

  saveExamSecurityState(newState);
  return newState;
}

/**
 * Record a security violation with debounce protection for grouped events
 */
export function evaluateSecurityViolation(
  currentState: ExamSessionSecurityState,
  type: ViolationType,
  details?: string
): {
  nextState: ExamSessionSecurityState;
  newViolation: ViolationRecord;
  isNowLocked: boolean;
  isCountIncremented: boolean;
} {
  const now = new Date();
  const nowIso = now.toISOString();

  // Cooldown check for rapid consecutive events (e.g. blur followed immediately by visibilitychange)
  let shouldIncrementCount = true;
  if (currentState.lastViolationAt) {
    const lastTime = new Date(currentState.lastViolationAt).getTime();
    const elapsed = now.getTime() - lastTime;
    if (elapsed < VIOLATION_COOLDOWN_MS) {
      // Cooldown active: log the record, but do not increment counter again in the same blur wave
      shouldIncrementCount = false;
    }
  }

  const newViolation: ViolationRecord = {
    id: `viol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    message: VIOLATION_DESCRIPTIONS[type] || 'Pelanggaran keamanan ujian terdeteksi.',
    timestamp: nowIso,
    details
  };

  const nextCount = shouldIncrementCount
    ? currentState.violationCount + 1
    : currentState.violationCount;

  const isNowLocked = nextCount >= currentState.maxViolations || currentState.isLocked;

  const nextState: ExamSessionSecurityState = {
    ...currentState,
    violationCount: nextCount,
    isLocked: isNowLocked,
    violations: [...currentState.violations, newViolation],
    lastViolationAt: nowIso,
    lockoutReason: isNowLocked
      ? `Ujian terkunci otomatis karena telah mencapai batas maksimal (${currentState.maxViolations}) pelanggaran keamanan.`
      : currentState.lockoutReason
  };

  saveExamSecurityState(nextState);

  return {
    nextState,
    newViolation,
    isNowLocked,
    isCountIncremented: shouldIncrementCount
  };
}

/**
 * Detect devtools inspection shortcuts
 * Covers F12, Ctrl+Shift+I/J/C/K/E/M/Z, Shift+F9, Ctrl+U, and Mac Cmd+Option+I/J/C/U/K equivalents
 */
export function isDevToolsShortcut(e: KeyboardEvent): boolean {
  const key = e.key ? e.key.toLowerCase() : '';
  const isCtrlOrMeta = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;
  const isAlt = e.altKey;

  // F12 key
  if (e.key === 'F12' || e.keyCode === 123) {
    return true;
  }

  // Firefox Storage Inspector (Shift+F9)
  if (isShift && (e.key === 'F9' || e.keyCode === 120)) {
    return true;
  }

  // Ctrl+Shift+I / J / C / K / E / M (DevTools inspector, console, style editor, device mode across browsers)
  // Note: key 'z' is intentionally excluded because Ctrl+Shift+Z is standard Redo in text editing
  if (isCtrlOrMeta && isShift && (key === 'i' || key === 'j' || key === 'c' || key === 'k' || key === 'e' || key === 'm')) {
    return true;
  }

  // Mac Safari / Chrome / Edge Option shortcuts (Cmd+Option+I/J/C/U/K)
  if (isCtrlOrMeta && isAlt && (key === 'i' || key === 'j' || key === 'c' || key === 'u' || key === 'k')) {
    return true;
  }

  // Ctrl+U / Cmd+U (View source)
  if (isCtrlOrMeta && key === 'u') {
    return true;
  }

  return false;
}

/**
 * Detect copy/paste/cut/print/save shortcuts that allow question leak or external answer injection
 * Includes OS clipboard equivalents (Ctrl+Insert, Shift+Insert, Shift+Delete), Screenshots, and Find (Ctrl+F/G, F3)
 */
export function isRestrictedCopyPasteShortcut(e: KeyboardEvent, isTargetEditable = false): boolean {
  const key = e.key ? e.key.toLowerCase() : '';
  const isCtrlOrMeta = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;

  // PrintScreen (OS Screenshot)
  if (e.key === 'PrintScreen' || e.keyCode === 44 || key === 'printscreen') {
    return true;
  }

  // Shift+Insert (OS Paste)
  if (isShift && (key === 'insert' || e.keyCode === 45)) {
    return true;
  }

  // Shift+Delete outside editable (OS Cut)
  if (isShift && (key === 'delete' || e.keyCode === 46) && !isTargetEditable) {
    return true;
  }

  // F3 (Browser find-in-page)
  if (e.key === 'F3' || e.keyCode === 114) {
    return true;
  }

  // Mac screenshot shortcuts (Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5, Cmd+Shift+6)
  if (isCtrlOrMeta && isShift && (key === '3' || key === '4' || key === '5' || key === '6')) {
    return true;
  }

  // Address bar shortcut (Alt+D)
  if (e.altKey && key === 'd') {
    return true;
  }

  if (!isCtrlOrMeta) return false;

  // Ctrl+Insert (OS Copy)
  if (key === 'insert' || e.keyCode === 45) {
    return true;
  }

  // Prevent Print (Ctrl+P) and Save (Ctrl+S) everywhere
  if (key === 'p' || key === 's') {
    return true;
  }

  // Prevent Copy (Ctrl+C), Paste (Ctrl+V), Cut (Ctrl+X)
  if (key === 'c' || key === 'v' || key === 'x') {
    return true;
  }

  // Prevent Find in page (Ctrl+F, Ctrl+G)
  if (key === 'f' || key === 'g') {
    return true;
  }

  // Prevent opening new tab / new window / history / close tab / downloads / open file / bookmarks / address bar
  // (Ctrl+T, Ctrl+N, Ctrl+H, Ctrl+W, Ctrl+J, Ctrl+O, Ctrl+D, Ctrl+L)
  if (
    key === 't' ||
    key === 'n' ||
    key === 'h' ||
    key === 'w' ||
    key === 'j' ||
    key === 'o' ||
    key === 'd' ||
    key === 'l'
  ) {
    return true;
  }

  // Select all (Ctrl+A) is only blocked when NOT inside an editable text element
  if (key === 'a' && !isTargetEditable) {
    return true;
  }

  return false;
}

/**
 * Check if the active element is an input or textarea allowing genuine student answering
 */
export function isInputOrTextarea(target: EventTarget | null | any): boolean {
  if (!target) return false;
  if (typeof HTMLElement !== 'undefined' && !(target instanceof HTMLElement)) return false;
  const tagName = typeof target.tagName === 'string' ? target.tagName.toLowerCase() : '';
  if (tagName === 'input' || tagName === 'textarea') return true;
  if (Boolean(target.isContentEditable)) return true;
  return false;
}

/**
 * Check if the browser environment supports the Fullscreen API
 */
export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  return Boolean(
    doc.fullscreenEnabled ||
    doc.webkitFullscreenEnabled ||
    doc.mozFullScreenEnabled ||
    doc.msFullscreenEnabled ||
    Boolean(
      doc.documentElement &&
      (doc.documentElement.requestFullscreen ||
       doc.documentElement.webkitRequestFullscreen ||
       doc.documentElement.mozRequestFullScreen ||
       doc.documentElement.msRequestFullscreen)
    )
  );
}

/**
 * Check if current document is genuinely in fullscreen (or simulated fullscreen on mobile/webview)
 */
export function isCurrentlyFullscreen(isSimulated = false): boolean {
  if (isSimulated) return true;
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

/**
 * Safely request fullscreen across browser implementations
 */
export async function triggerFullscreen(element?: HTMLElement): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const target = element || document.documentElement;
  try {
    if (target.requestFullscreen) {
      await target.requestFullscreen();
      return true;
    } else if ((target as any).webkitRequestFullscreen) {
      await (target as any).webkitRequestFullscreen();
      return true;
    } else if ((target as any).mozRequestFullScreen) {
      await (target as any).mozRequestFullScreen();
      return true;
    } else if ((target as any).msRequestFullscreen) {
      await (target as any).msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('[antiCheatGuard] Fullscreen request rejected or unsupported:', err);
  }
  return false;
}

/**
 * Safely exit fullscreen across browser implementations
 */
export async function triggerExitFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  try {
    if (!isCurrentlyFullscreen()) return true;
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
      return true;
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
      return true;
    } else if (doc.mozCancelFullScreen) {
      await doc.mozCancelFullScreen();
      return true;
    } else if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('[antiCheatGuard] Exit fullscreen error:', err);
  }
  return false;
}
