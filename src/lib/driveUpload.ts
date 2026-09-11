const DRIVE_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxYQXyTxV2DPiOQ5WDYSs_vgYuxHobCSTTrxIuE7WxUqfi6IgWGEsWYgZq6T6hxRNc/exec';

export async function uploadToDrive(file: File, namaGuru: string, folderFitur: string, prefix: string = 'Upload'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const timestamp = new Date().getTime();
      const filename = `${prefix}_${timestamp}_${file.name}`;

      try {
        const response = await fetch(DRIVE_WEBHOOK_URL, {
          method: 'POST',
          body: JSON.stringify({
            filename: filename,
            mimeType: file.type,
            base64Data: base64Data,
            namaGuru: namaGuru,
            folderFitur: folderFitur
          }),
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
