/**
 * SIPJAM - Google Apps Script Webhook untuk Upload Foto & Dokumen ke Google Drive
 *
 * STRUKTUR FOLDER OTOMATIS DI GOOGLE DRIVE:
 * SIPJAM/
 * ├── Presensi_Guru/
 * │   ├── <Nama Guru 1>/
 * │   └── <Nama Guru 2>/
 * ├── Presensi_DinasLuar/
 * │   ├── <Nama Guru 1>/
 * │   └── <Nama Guru 2>/
 * ├── Jurnal_KBM/
 * │   ├── <Nama Guru 1>/
 * │   └── <Nama Guru 2>/
 * ├── Jurnal_Kegiatan/
 * │   ├── <Nama Guru 1>/
 * │   └── <Nama Guru 2>/
 * ├── Laporan_Piket/
 * │   ├── <Nama Guru 1>/
 * │   └── <Nama Guru 2>/
 * └── Perangkat_Pembelajaran/
 *     ├── <Nama Guru 1>/
 *     └── <Nama Guru 2>/
 *
 * PANDUAN PEMASANGAN / UPDATE DI GOOGLE APPS SCRIPT:
 * 1. Buka https://script.google.com/ pada akun Google Drive penyimpanan SIPJAM.
 * 2. Buka project "SIPJAM Upload Webhook" (atau klik "New Project").
 * 3. Hapus seluruh isi default, lalu tempel (paste) kode di bawah ini.
 * 4. Klik "Deploy" -> "Manage deployments" -> klik ikon Edit (pensil) -> pilih Version: "New version" -> klik "Deploy"
 *    (atau "Deploy" -> "New deployment" -> tipe "Web app", Execute as: "Me", Who has access: "Anyone").
 */

const ROOT_FOLDER_NAME = "SIPJAM";

const DEFAULT_FEATURE_FOLDERS = [
  "Presensi_Guru",
  "Presensi_DinasLuar",
  "Jurnal_KBM",
  "Jurnal_Kegiatan",
  "Laporan_Piket",
  "Perangkat_Pembelajaran"
];

function normalizeFolderFitur(rawFitur) {
  const clean = (rawFitur || "Umum").toString().trim();
  if (!clean) return "Umum";
  const lower = clean.toLowerCase().replace(/[\s_-]+/g, "_");
  if (lower === "presensi" || lower === "presensi_guru") return "Presensi_Guru";
  if (lower === "presensi_dinasluar" || lower === "presensi_dinas_luar" || lower === "dinas_luar") return "Presensi_DinasLuar";
  if (lower === "jurnal_kbm" || lower === "jurnal") return "Jurnal_KBM";
  if (lower === "jurnal_kegiatan") return "Jurnal_Kegiatan";
  if (lower === "piket" || lower === "laporan_piket") return "Laporan_Piket";
  if (lower === "dokumen" || lower === "perangkat_pembelajaran" || lower === "bank_dokumen") return "Perangkat_Pembelajaran";
  return clean.replace(/\s+/g, "_");
}

function normalizeNamaGuru(rawNama) {
  const clean = (rawNama || "Guru_Umum").toString().replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
  return clean || "Guru_Umum";
}

function ensureDefaultStructure(rootFolder, daftarGuru) {
  const teachers = Array.isArray(daftarGuru)
    ? daftarGuru.map(normalizeNamaGuru).filter(Boolean)
    : [];

  for (let i = 0; i < DEFAULT_FEATURE_FOLDERS.length; i++) {
    const featureFolder = getOrCreateFolder(rootFolder, DEFAULT_FEATURE_FOLDERS[i]);
    for (let j = 0; j < teachers.length; j++) {
      getOrCreateFolder(featureFolder, teachers[j]);
    }
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Payload kosong"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(e.postData.contents);

    // 1. Ambil atau buat folder utama "SIPJAM"
    const rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);

    // Pastikan seluruh folder fitur standar tersedia di dalam folder SIPJAM
    ensureDefaultStructure(rootFolder, data.daftarGuru);

    // Jika request hanya untuk sinkronisasi struktur folder guru tanpa upload file
    if (data.action === "sync_folders") {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Struktur folder SIPJAM -> Fitur -> Nama Guru berhasil disinkronkan.",
        rootFolder: ROOT_FOLDER_NAME,
        featureFolders: DEFAULT_FEATURE_FOLDERS
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const filename = data.filename || ("upload_" + new Date().getTime() + ".jpg");
    const mimeType = data.mimeType || "image/jpeg";
    const base64Data = data.base64Data;
    const folderFitur = normalizeFolderFitur(data.folderFitur);
    const namaGuru = normalizeNamaGuru(data.namaGuru || data.guruFolder || data.subFolder);

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

    // 2. Ambil atau buat subfolder fitur di dalam SIPJAM (Presensi_Guru, Jurnal_KBM, Laporan_Piket, dll.)
    const featureFolder = getOrCreateFolder(rootFolder, folderFitur);

    // 3. Ambil atau buat subfolder nama masing-masing guru di dalam masing-masing folder fitur
    const guruFolder = getOrCreateFolder(featureFolder, namaGuru);

    // 4. Simpan file ke dalam folder guru pada fitur terkait: SIPJAM/<folderFitur>/<namaGuru>/<filename>
    const file = guruFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // URL langsung untuk preview/view
    const directUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      url: directUrl,
      fileId: file.getId(),
      folderPath: ROOT_FOLDER_NAME + "/" + folderFitur + "/" + namaGuru
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  ensureDefaultStructure(rootFolder, []);
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Webhook SIPJAM Google Drive Aktif dan Siap Digunakan.",
    rootFolder: ROOT_FOLDER_NAME,
    featureFolders: DEFAULT_FEATURE_FOLDERS
  })).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent.createFolder(name);
}
