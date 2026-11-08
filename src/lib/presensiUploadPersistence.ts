import { uploadToDrive, detectMimeType } from './driveUpload';
import { supabase } from './supabaseClient';
import { getWitaDateStr } from './wita';

function addDaysToDateStr(dateStr: string, days: number): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
}

const DB_NAME = 'sipjam_presensi_db';
const DB_VERSION = 1;
const STORE_DRAFT = 'file_draft';
const STORE_PENDING = 'pending_uploads';

export interface PendingUploadTask {
  id: string; // presensiId
  blob: Blob | ArrayBuffer;
  name: string;
  mimeType: string;
  teacherName: string;
  folderName: string;
  prefix: string;
  tanggalMulai?: string;
  durasiHari?: number;
  currentJenis?: string;
  detailIzin?: string;
  keterangan?: string;
  createdAt: number;
  retryCount?: number;
}

interface StoredDraftFile {
  key: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  blob: Blob | ArrayBuffer;
  savedAt: number;
}

/**
 * Open or upgrade the IndexedDB instance with stores for file drafts and pending uploads.
 */
function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_DRAFT)) {
          db.createObjectStore(STORE_DRAFT, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_PENDING)) {
          db.createObjectStore(STORE_PENDING, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('[presensiPersistence] Failed to open IndexedDB:', request.error);
        resolve(null);
      };
    } catch (e) {
      console.warn('[presensiPersistence] IndexedDB open error:', e);
      resolve(null);
    }
  });
}

/**
 * Persist the selected document file draft into IndexedDB.
 * Survives mobile browser background unloads, F5, and pull-to-refresh swipe down.
 */
export async function savePresensiFileDraft(file: File): Promise<void> {
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_DRAFT, 'readwrite');
      const store = tx.objectStore(STORE_DRAFT);
      const record: StoredDraftFile = {
        key: 'current_file_draft',
        name: file.name,
        type: detectMimeType(file),
        size: file.size,
        lastModified: file.lastModified || Date.now(),
        blob: file,
        savedAt: Date.now(),
      };
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Restore the drafted document file across reloads (F5, mobile pull-to-refresh swipe down).
 */
export async function getPresensiFileDraft(): Promise<File | null> {
  const db = await openDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_DRAFT, 'readonly');
      const store = tx.objectStore(STORE_DRAFT);
      const req = store.get('current_file_draft');

      req.onsuccess = () => {
        const record = req.result as StoredDraftFile | undefined;
        if (!record || !record.blob) {
          return resolve(null);
        }

        // Draft expires after 24 hours to prevent stale files from haunting the user
        if (Date.now() - record.savedAt > 24 * 60 * 60 * 1000) {
          clearPresensiFileDraft();
          return resolve(null);
        }

        try {
          const mime = record.type || 'application/octet-stream';
          const restoredFile = new File([record.blob], record.name, {
            type: mime,
            lastModified: record.lastModified || Date.now(),
          });
          resolve(restoredFile);
        } catch {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Clear the document file draft after successful submission or upon user cancellation.
 */
export async function clearPresensiFileDraft(): Promise<void> {
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_DRAFT, 'readwrite');
      const store = tx.objectStore(STORE_DRAFT);
      store.delete('current_file_draft');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Queue a pending upload task into persistent IndexedDB.
 * Ensures uploads that were in-flight when the user swiped down / pressed F5 survive and complete.
 */
export async function queuePendingUpload(task: PendingUploadTask): Promise<void> {
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_PENDING, 'readwrite');
      const store = tx.objectStore(STORE_PENDING);
      store.put(task);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Remove a completed pending upload task.
 */
export async function removePendingUpload(presensiId: string): Promise<void> {
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_PENDING, 'readwrite');
      const store = tx.objectStore(STORE_PENDING);
      store.delete(presensiId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Read all pending upload tasks.
 */
export async function getPendingUploads(): Promise<PendingUploadTask[]> {
  const db = await openDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_PENDING, 'readonly');
      const store = tx.objectStore(STORE_PENDING);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as PendingUploadTask[]) || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

let isProcessingPending = false;

/**
 * Process any pending uploads that were interrupted by a page reload (F5 or swipe down).
 * Uploads file to Google Drive, updates presensi_guru & jurnal_pembelajaran, and cleans up.
 */
export async function processPendingUploads(): Promise<{ processed: number; succeeded: number }> {
  if (isProcessingPending) return { processed: 0, succeeded: 0 };
  isProcessingPending = true;

  try {
    const tasks = await getPendingUploads();
    if (tasks.length === 0) {
      return { processed: 0, succeeded: 0 };
    }

    let succeeded = 0;

    for (const task of tasks) {
      try {
        // Construct File from stored Blob/ArrayBuffer
        const mime = task.mimeType || 'application/octet-stream';
        const file = new File([task.blob], task.name, { type: mime, lastModified: task.createdAt });

        // Execute uploadToDrive
        const driveUrl = await uploadToDrive(file, task.teacherName, task.folderName, task.prefix);

        // Update presensi_guru with real Drive URL
        await supabase
          .from('presensi_guru')
          .update({ link_bukti: driveUrl })
          .eq('id', task.id);

        // Update multi-day journal records if applicable
        if (task.currentJenis === 'Sakit' || task.currentJenis === 'Izin' || task.currentJenis === 'Dinas Luar') {
          const startD = task.tanggalMulai || getWitaDateStr();
          const daysCount = task.durasiHari || 1;
          for (let dayOffset = 0; dayOffset < daysCount; dayOffset++) {
            const targetD = addDaysToDateStr(startD, dayOffset);
            await supabase
              .from('jurnal_pembelajaran')
              .update({ foto_kegiatan: driveUrl, link_bukti_foto: driveUrl })
              .eq('nama_guru', task.teacherName)
              .eq('tanggal', targetD)
              .in('status_verifikasi', ['Sakit', 'Izin', 'Dinas Luar']);
          }
        }

        // Successfully uploaded: remove from pending store
        await removePendingUpload(task.id);
        succeeded++;

        // Notify active UI listeners (e.g. HistoryView) to display fresh Drive link
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('sipjam:presensi_updated', {
              detail: { presensiId: task.id, url: driveUrl },
            })
          );
        }
      } catch (err: any) {
        console.warn(`[presensiPersistence] Failed to complete pending upload for ${task.id}:`, err);
        // Leave task for next manual refresh retry if retryCount < 3
        const retries = (task.retryCount || 0) + 1;
        if (retries >= 3) {
          await supabase
            .from('presensi_guru')
            .update({ link_bukti: 'gagal_upload' })
            .eq('id', task.id);
          await removePendingUpload(task.id);
        } else {
          task.retryCount = retries;
          await queuePendingUpload(task);
        }
      }
    }

    return { processed: tasks.length, succeeded };
  } finally {
    isProcessingPending = false;
  }
}
