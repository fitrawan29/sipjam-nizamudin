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
  } catch (err) {
    // Non-blocking fallback if offline or during local testing
  }
  return undefined;
}


async function compressImage(file: File, maxWidth = 1600, quality = 0.7): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  
  return new Promise((resolve, reject) => {
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
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, file.type, quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
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

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const timestamp = new Date().getTime();
      const filename = `${prefix}_${timestamp}_${file.name}`;

      try {
        const payload: Record<string, any> = {
          filename: filename,
          mimeType: file.type,
          base64Data: base64Data,
          namaGuru: namaGuru,
          folderFitur: folderFitur
        };

        // Include target email in payload for Google Apps Script routing
        if (resolvedEmail) {
          payload.targetEmail = resolvedEmail;
          payload.email_tujuan_upload = resolvedEmail;
        }

        const response = await fetch(DRIVE_WEBHOOK_URL, {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        const json = await response.json();
        if (json.success && json.url) {
          resolve(json.url);
        } else {
          reject(new Error(json.error || 'Gagal mengupload file ke Google Drive.'));
        }
      } catch (err: any) {
        reject(new Error('Koneksi terputus saat mengupload file: ' + err.message));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}
