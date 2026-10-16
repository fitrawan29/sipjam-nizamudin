/**
 * Utility functions for local draft auto-saving and offline resilience
 * Conforms to Ponytail principles: minimal diff, standard web storage, zero dependencies.
 */

export const JURNAL_DRAFT_KEY = 'sipjam_jurnal_autosave';

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
  } catch {
    // In restricted iframe or storage disabled
  }
  return null;
}

/**
 * Returns a unique scoped key for gradebook drafts.
 * Format: sipjam_gradebook_draft_{sekolahId}_{mapel}_{kelas}_{tpId}
 */
export function getGradebookDraftKey(
  sekolahId: string | null | undefined,
  mapel: string,
  kelas: string,
  tpId: string | null | undefined
): string {
  const safeSekolah = (sekolahId && sekolahId.trim()) ? sekolahId.trim() : 'default';
  const safeMapel = (mapel && mapel.trim()) ? mapel.trim() : 'mapel';
  const safeKelas = (kelas && kelas.trim()) ? kelas.trim() : 'kelas';
  const safeTp = (tpId && tpId.trim()) ? tpId.trim() : 'all';
  return `sipjam_gradebook_draft_${safeSekolah}_${safeMapel}_${safeKelas}_${safeTp}`;
}

/**
 * Safely saves gradebook dirty scores to localStorage.
 */
export function saveGradebookDraft(
  key: string,
  scores: Record<string, Record<string, number | null>>
): void {
  try {
    const storage = getStorage();
    if (!storage || !key) return;
    const payload = {
      scores,
      savedAt: new Date().toISOString(),
    };
    storage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.warn('[draftStorage] Failed to save gradebook draft:', err);
  }
}

/**
 * Safely loads gradebook scores from localStorage. Returns null if missing or corrupted.
 */
export function loadGradebookDraft(
  key: string
): Record<string, Record<string, number | null>> | null {
  try {
    const storage = getStorage();
    if (!storage || !key) return null;
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    if ('scores' in parsed) {
      if (parsed.scores && typeof parsed.scores === 'object' && !Array.isArray(parsed.scores)) {
        return parsed.scores as Record<string, Record<string, number | null>>;
      }
      return null;
    }
    if (Array.isArray(parsed)) return null;
    return parsed as Record<string, Record<string, number | null>>;
  } catch (err) {
    console.warn('[draftStorage] Failed to load gradebook draft:', err);
    return null;
  }
}

/**
 * Removes gradebook draft from localStorage.
 */
export function clearGradebookDraft(key: string): void {
  try {
    const storage = getStorage();
    if (!storage || !key) return;
    storage.removeItem(key);
  } catch (err) {
    console.warn('[draftStorage] Failed to clear gradebook draft:', err);
  }
}

/**
 * Safely saves the Guru Jurnal form draft to localStorage.
 */
export function saveJurnalDraft(draft: any): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(JURNAL_DRAFT_KEY, JSON.stringify(draft));
  } catch (err) {
    console.warn('[draftStorage] Failed to save jurnal draft:', err);
  }
}

/**
 * Safely loads the Guru Jurnal form draft from localStorage.
 */
export function loadJurnalDraft(): any | null {
  try {
    const storage = getStorage();
    if (!storage) return null;
    const raw = storage.getItem(JURNAL_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[draftStorage] Failed to load jurnal draft:', err);
    return null;
  }
}

/**
 * Removes the Guru Jurnal form draft from localStorage.
 */
export function clearJurnalDraft(): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.removeItem(JURNAL_DRAFT_KEY);
  } catch (err) {
    console.warn('[draftStorage] Failed to clear jurnal draft:', err);
  }
}
