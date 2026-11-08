import { supabase } from './supabaseClient';

const DRIVE_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_DRIVE_UPLOAD_WEBHOOK_URL ||
  'https://script.google.com/macros/s/AKfycbxYQXyTxV2DPiOQ5WDYSs_vgYuxHobCSTTrxIuE7WxUqfi6IgWGEsWYgZq6T6hxRNc/exec';

let cachedTargetEmail: string | null = null;
let lastEmailFetch = 0;

/**
 * Retrieves the configured target email from settings with in-memory TTL caching
 */
async function getTargetEmail(): Promise<string | undefined> {
  const now = Date.now();
  if (cachedTargetEmail && (now - lastEmailFetch < 60000)) {
    return cachedTargetEmail;
  }
  try {
    const { data } = await supabase
      .from('pengaturan')
      .select('key, value, email_tujuan_upload')
      .or('key.eq.email_tujuan_upload,email_tujuan_upload.not.is.null')
      .limit(1);

    if (data && data.length > 0) {
      const email =
        data[0].email_tujuan_upload ||
        (data[0].key === 'email_tujuan_upload' ? data[0].value : null);
      if (email) {
        cachedTargetEmail = email;
        lastEmailFetch = now;
        return email;
      }
    }
  } catch {
    // Non-blocking fallback if offline or during local testing
  }
  return undefined;
}


export function detectMimeType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type;
  }
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.heic')) return 'image/heic';
  if (name.endsWith('.heif')) return 'image/heif';
  return file.type || 'application/octet-stream';
}

export function isImageFile(file: File): boolean {
  const mime = detectMimeType(file);
  if (mime.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|bmp|gif)$/i.test(file.name || '');
}

async function compressImage(file: File, maxWidth = 1600, quality = 0.7): Promise<File> {
  if (!isImageFile(file)) return file;
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Force 'image/jpeg' so canvas compresses reliably (PNG ignores quality in canvas.toBlob)
        const targetType = 'image/jpeg';
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const baseName = (file.name || 'image').replace(/\.[^/.]+$/, "");
          const newName = `${baseName}.jpg`;
          const compressedFile = new File([blob], newName, {
            type: targetType,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, targetType, quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

export const SIPJAM_ROOT_FOLDER = 'SIPJAM';

export const SIPJAM_FEATURE_FOLDERS = [
  'Presensi_Guru',
  'Presensi_DinasLuar',
  'Jurnal_KBM',
  'Jurnal_Kegiatan',
  'Laporan_Piket',
  'Perangkat_Pembelajaran',
] as const;

export function normalizeDriveFeatureFolder(rawFitur: string): string {
  const clean = (rawFitur || 'Umum').trim();
  if (!clean) return 'Umum';
  const lower = clean.toLowerCase().replace(/[\s_-]+/g, '_');
  if (lower === 'presensi' || lower === 'presensi_guru') return 'Presensi_Guru';
  if (lower === 'presensi_dinasluar' || lower === 'presensi_dinas_luar' || lower === 'dinas_luar') return 'Presensi_DinasLuar';
  if (lower === 'jurnal_kbm' || lower === 'jurnal') return 'Jurnal_KBM';
  if (lower === 'jurnal_kegiatan') return 'Jurnal_Kegiatan';
  if (lower === 'piket' || lower === 'laporan_piket') return 'Laporan_Piket';
  if (lower === 'dokumen' || lower === 'perangkat_pembelajaran' || lower === 'bank_dokumen') return 'Perangkat_Pembelajaran';
  return clean.replace(/\s+/g, '_');
}

export function normalizeDriveTeacherFolder(rawNama: string): string {
  const clean = (rawNama || 'Guru_Umum').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
  return clean || 'Guru_Umum';
}

export function buildDriveFolderPath(folderFitur: string, namaGuru: string) {
  const normalizedFitur = normalizeDriveFeatureFolder(folderFitur);
  const normalizedGuru = normalizeDriveTeacherFolder(namaGuru);
  return {
    rootFolder: SIPJAM_ROOT_FOLDER,
    folderFitur: normalizedFitur,
    guruFolder: normalizedGuru,
    folderPath: `${SIPJAM_ROOT_FOLDER}/${normalizedFitur}/${normalizedGuru}`,
  };
}

export async function uploadToDrive(
  originalFile: File,
  namaGuru: string,
  folderFitur: string,
  prefix: string = 'Upload',
  targetEmail?: string
): Promise<string> {
  let resolvedEmail = targetEmail;
  const file = typeof window !== 'undefined' ? await compressImage(originalFile) : originalFile;
  if (!resolvedEmail) {
    resolvedEmail = await getTargetEmail();
  }

  const { rootFolder, folderFitur: normalizedFitur, guruFolder, folderPath } = buildDriveFolderPath(folderFitur, namaGuru);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const timestamp = new Date().getTime();
      const filename = `${prefix}_${timestamp}_${file.name}`;

      const effectiveMime = detectMimeType(file);

      try {
        const payload: Record<string, any> = {
          filename: filename,
          mimeType: effectiveMime,
          base64Data: base64Data,
          rootFolder: rootFolder,
          namaGuru: guruFolder,
          guruFolder: guruFolder,
          subFolder: guruFolder,
          folderFitur: normalizedFitur,
          folderPath: folderPath,
        };

        // Include target email in payload for Google Apps Script routing
        if (resolvedEmail) {
          payload.targetEmail = resolvedEmail;
          payload.email_tujuan_upload = resolvedEmail;
        }

        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 60000) : null;

        let response: Response;
        try {
          response = await fetch(DRIVE_WEBHOOK_URL, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify(payload),
            signal: controller?.signal,
          });
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }

        const rawText = await response.text();
        let json: any = {};
        try {
          json = JSON.parse(rawText);
        } catch {
          const match = rawText.match(/https:\/\/drive\.google\.com\/[^\s"']+/);
          if (match) {
            json = { success: true, url: match[0] };
          }
        }

        if (json.success && json.url) {
          resolve(json.url);
        } else {
          reject(new Error(json.error || json.message || 'Gagal mengupload file ke Google Drive.'));
        }
      } catch (err: any) {
        reject(new Error('Koneksi terputus saat mengupload file: ' + err.message));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}
