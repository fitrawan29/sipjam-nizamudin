/**
 * SIPJAM - Google Apps Script Webhook untuk Upload Foto ke Google Drive
 * 
 * PANDUAN PEMASANGAN (1 KALI PER SEKOLAH):
 * 1. Buka akun Google milik sekolah (Drive 15 GB gratis).
 * 2. Masuk ke https://script.google.com/
 * 3. Klik "New Project" (Beri nama misal: "SIPJAM Upload Webhook").
 * 4. Hapus seluruh isi default, lalu paste kode di bawah ini.
 * 5. Klik "Deploy" -> "New deployment".
 * 6. Pilih tipe: "Web app".
 *    - Description: "SIPJAM Drive Webhook"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (PENTING! Agar aplikasi Next.js bisa mengunggah).
 * 7. Klik Deploy -> Berikan izin (Review Permissions -> Advanced -> Go to ...).
 * 8. Salin "Web App URL" yang dihasilkan (berakhiran /exec).
 * 9. Pasang URL tersebut di:
 *    - Vercel Environment Variable: NEXT_PUBLIC_DRIVE_UPLOAD_WEBHOOK_URL
 *    - ATAU di tabel pengaturan sekolah (email_tujuan_upload / drive webhook).
 */

const ROOT_FOLDER_NAME = "SIPJAM_UPLOADS";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Payload kosong"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(e.postData.contents);
    const filename = data.filename || ("upload_" + new Date().getTime() + ".jpg");
    const mimeType = data.mimeType || "image/jpeg";
    const base64Data = data.base64Data;
    const folderFitur = data.folderFitur || "Umum";

    if (!base64Data) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Data base64 tidak ditemukan"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Ekstrak string base64 murni jika mengandung header data:image/...;base64,
    const cleanBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
    const decodedBytes = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(decodedBytes, mimeType, filename);

    // Ambil atau buat folder utama
    const rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
    // Ambil atau buat subfolder fitur (misal: "Presensi_Guru", "Jurnal_KBM")
    const targetFolder = getOrCreateFolder(rootFolder, folderFitur);

    // Simpan file
    const file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // URL langsung untuk preview/view
    const directUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      url: directUrl,
      fileId: file.getId()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Webhook SIPJAM Google Drive Aktif dan Siap Digunakan.")
    .setMimeType(ContentService.MimeType.TEXT);
}

function getOrCreateFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent.createFolder(name);
}
