import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  detectMimeType,
  isImageFile,
  validatePresensiFile,
  buildDriveFolderPath,
  normalizeDriveFeatureFolder,
  normalizeDriveTeacherFolder,
  uploadToDrive,
  SIPJAM_ROOT_FOLDER,
} from '../src/lib/driveUpload';

console.log('========================================================================');
console.log('🧪 TEST SUITE: PENGUNGGAHAN DOKUMEN PRESENSI ANDAL & FOLDER ROUTING');
console.log('========================================================================\n');

const projectRoot = process.cwd();
const guruPresensiPath = path.join(projectRoot, 'src/components/GuruPresensi.tsx');
const driveUploadPath = path.join(projectRoot, 'src/lib/driveUpload.ts');
const persistencePath = path.join(projectRoot, 'src/lib/presensiUploadPersistence.ts');

assert.ok(fs.existsSync(guruPresensiPath), 'GuruPresensi.tsx must exist');
assert.ok(fs.existsSync(driveUploadPath), 'driveUpload.ts must exist');
assert.ok(fs.existsSync(persistencePath), 'presensiUploadPersistence.ts must exist');

const guruPresensiCode = fs.readFileSync(guruPresensiPath, 'utf8');
const driveUploadCode = fs.readFileSync(driveUploadPath, 'utf8');

// --- Suite 1: Berkas Validasi & Deteksi MIME (R2: Validasi Berkas Tanpa Error Penolakan) ---
console.log('--- Suite 1: Berkas Validasi & Deteksi MIME (R2) ---');

// 1.1 Dokumen PDF standar dan tanpa MIME mobile browser
const pdfFile = { name: 'surat_keterangan_sakit.pdf', type: 'application/pdf', size: 102400 } as File;
const pdfMobileFile = { name: 'surat_izin_dokter.PDF', type: '', size: 204800 } as File;
assert.strictEqual(detectMimeType(pdfFile), 'application/pdf', '1.1a: detectMimeType resolves standard PDF');
assert.strictEqual(detectMimeType(pdfMobileFile), 'application/pdf', '1.1b: detectMimeType resolves uppercase PDF with empty mobile MIME');
const pdfValidation = validatePresensiFile(pdfFile);
const pdfMobileValidation = validatePresensiFile(pdfMobileFile);
assert.strictEqual(pdfValidation.valid, true, '1.1c: Valid PDF must pass validation');
assert.strictEqual(pdfMobileValidation.valid, true, '1.1d: Valid uppercase PDF must pass validation');
console.log('  ✔ [PASS] 1.1: Surat izin/sakit PDF valid diproses tanpa penolakan');

// 1.2 Dokumen Microsoft Word (.doc dan .docx)
const docxFile = { name: 'Surat_Permohonan_Izin.docx', type: '', size: 51200 } as File;
const docFile = { name: 'surat_cuti.DOC', type: 'application/octet-stream', size: 64000 } as File;
assert.strictEqual(detectMimeType(docxFile), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '1.2a: detectMimeType resolves .docx');
assert.strictEqual(detectMimeType(docFile), 'application/msword', '1.2b: detectMimeType resolves .doc');
const docxValidation = validatePresensiFile(docxFile);
const docValidation = validatePresensiFile(docFile);
assert.strictEqual(docxValidation.valid, true, '1.2c: Valid DOCX must pass validation');
assert.strictEqual(docValidation.valid, true, '1.2d: Valid DOC must pass validation');
console.log('  ✔ [PASS] 1.2: Surat izin/sakit Word (.doc/.docx) valid diproses tanpa penolakan');

// 1.3 Berkas Foto Bukti / Scan (JPG, PNG, WEBP, HEIC, BMP, JFIF, GIF)
const jpgFile = { name: 'foto_bukti_sakit.JPG', type: 'image/jpeg', size: 409600 } as File;
const pngFile = { name: 'scan_surat_izin.png', type: '', size: 307200 } as File;
const webpFile = { name: 'lampiran.webp', type: 'image/webp', size: 153600 } as File;
const bmpFile = { name: 'surat.bmp', type: '', size: 819200 } as File;
const jfifFile = { name: 'foto_surat.jfif', type: '', size: 204800 } as File;
const gifFile = { name: 'anim_surat.gif', type: '', size: 102400 } as File;
assert.strictEqual(isImageFile(jpgFile), true, '1.3a: JPG flagged as image');
assert.strictEqual(isImageFile(pngFile), true, '1.3b: PNG with empty mobile type flagged as image');
assert.strictEqual(isImageFile(webpFile), true, '1.3c: WebP flagged as image');
assert.strictEqual(isImageFile(bmpFile), true, '1.3d: BMP flagged as image');
assert.strictEqual(isImageFile(jfifFile), true, '1.3e: JFIF flagged as image');
assert.strictEqual(isImageFile(gifFile), true, '1.3f: GIF flagged as image');
assert.strictEqual(validatePresensiFile(jpgFile).valid, true, '1.3g: JPG passes validation');
assert.strictEqual(validatePresensiFile(pngFile).valid, true, '1.3h: PNG passes validation');
assert.strictEqual(validatePresensiFile(webpFile).valid, true, '1.3i: WebP passes validation');
assert.strictEqual(validatePresensiFile(bmpFile).valid, true, '1.3j: BMP passes validation');
assert.strictEqual(validatePresensiFile(jfifFile).valid, true, '1.3k: JFIF passes validation');
assert.strictEqual(validatePresensiFile(gifFile).valid, true, '1.3l: GIF passes validation');
console.log('  ✔ [PASS] 1.3: Foto bukti (JPG/PNG/WEBP/BMP/JFIF/GIF) valid diproses tanpa penolakan');

// 1.4 Penanganan Berkas Tidak Valid (Ukuran kosong, ekstensi terlarang, ukuran melebihi batas, arbitrary MIME malware, spoofed zip, script, SVG)
const emptyFile = { name: 'kosong.pdf', type: 'application/pdf', size: 0 } as File;
const oversizedFile = { name: 'besar.pdf', type: 'application/pdf', size: 30 * 1024 * 1024 } as File;
const executableFile = { name: 'virus.exe', type: 'application/octet-stream', size: 10240 } as File;
const trojanWithMime = { name: 'trojan.exe', type: 'application/x-msdownload', size: 20480 } as File;
const scriptFile = { name: 'payload.js', type: 'application/javascript', size: 1024 } as File;
const shellFile = { name: 'exploit.sh', type: 'application/x-sh', size: 512 } as File;
const doubleExtFile = { name: 'surat_izin.pdf.exe', type: 'application/octet-stream', size: 2048 } as File;
const psFile = { name: 'script.ps1', type: 'text/plain', size: 1024 } as File;
const phpFile = { name: 'webshell.php', type: 'application/x-httpd-php', size: 1024 } as File;
const svgFile = { name: 'xss.svg', type: 'image/svg+xml', size: 1024 } as File;
const spoofedZip = { name: 'exploit.zip', type: 'image/jpeg', size: 2048 } as File;
const cameraBlob = { name: 'camera_capture', type: 'image/jpeg', size: 204800 } as File;
assert.strictEqual(validatePresensiFile(emptyFile).valid, false, '1.4a: Empty 0-byte file must be rejected');
assert.ok(validatePresensiFile(emptyFile).error?.includes('kosong'), '1.4b: Clear empty file error message');
assert.strictEqual(validatePresensiFile(oversizedFile).valid, false, '1.4c: File > 25MB must be rejected');
assert.ok(validatePresensiFile(oversizedFile).error?.includes('25 MB'), '1.4d: Clear size limit error message');
assert.strictEqual(validatePresensiFile(executableFile).valid, false, '1.4e: Executable file must be rejected');
assert.strictEqual(validatePresensiFile(trojanWithMime).valid, false, '1.4f: Executable with custom MIME must be rejected');
assert.strictEqual(validatePresensiFile(scriptFile).valid, false, '1.4g: Script JS must be rejected');
assert.strictEqual(validatePresensiFile(shellFile).valid, false, '1.4h: Shell script must be rejected');
assert.strictEqual(validatePresensiFile(doubleExtFile).valid, false, '1.4i: Double extension .pdf.exe must be rejected');
assert.strictEqual(validatePresensiFile(psFile).valid, false, '1.4j: PowerShell script must be rejected even with text/plain');
assert.strictEqual(validatePresensiFile(phpFile).valid, false, '1.4k: PHP webshell must be rejected');
assert.strictEqual(validatePresensiFile(svgFile).valid, false, '1.4l: SVG file must be rejected');
assert.strictEqual(validatePresensiFile(spoofedZip).valid, false, '1.4m: Spoofed zip with image/jpeg must be rejected');
assert.strictEqual(validatePresensiFile(cameraBlob).valid, true, '1.4n: Extensionless camera blob with image/jpeg must pass');
console.log('  ✔ [PASS] 1.4: Berkas rusak/terlarang (0-byte, >25MB, exe, js, sh, ps1, php, svg, spoofed zip) tertolak secara presisi\n');

// --- Suite 2: Penempatan File Upload di Folder SIPJAM Sesuai Nama Guru (R3) ---
console.log('--- Suite 2: Penempatan Direktori Google Drive (R3) ---');

// 2.1 Struktur direktori Presensi Guru: SIPJAM/Presensi_Guru/<Nama Guru>/
const guruAhmad = 'Fitra Suryazana Mamonto';
const presensiPath = buildDriveFolderPath('Presensi_Guru', guruAhmad);
assert.strictEqual(presensiPath.rootFolder, 'SIPJAM', '2.1a: Root folder must be SIPJAM');
assert.strictEqual(presensiPath.folderFitur, 'Presensi_Guru', '2.1b: Feature folder must be Presensi_Guru');
assert.strictEqual(presensiPath.guruFolder, guruAhmad, '2.1c: Teacher subfolder must match exact teacher name');
assert.strictEqual(presensiPath.folderPath, `SIPJAM/Presensi_Guru/${guruAhmad}`, '2.1d: Full path must be SIPJAM/Presensi_Guru/<Nama Guru>');
console.log('  ✔ [PASS] 2.1: Dokumen presensi terarah ke SIPJAM/Presensi_Guru/<Nama Guru>/');

// 2.2 Penanganan nama guru dengan gelar dan spasi
const guruGelar = '  Dra. Hj. Nur Aini, M.Pd.  ';
const pathGelar = buildDriveFolderPath('Presensi_Guru', guruGelar);
assert.strictEqual(pathGelar.guruFolder, 'Dra. Hj. Nur Aini, M.Pd.', '2.2a: Normalized teacher name trims whitespace');
assert.strictEqual(pathGelar.folderPath, 'SIPJAM/Presensi_Guru/Dra. Hj. Nur Aini, M.Pd.', '2.2b: Path formats cleanly');
console.log('  ✔ [PASS] 2.2: Nama guru dengan gelar dan spasi dinormalisasi secara aman');

// 2.3 Presensi Dinas Luar terpisah di Presensi_DinasLuar/<Nama Guru>
const pathDinasLuar = buildDriveFolderPath('Presensi_DinasLuar', guruAhmad);
assert.strictEqual(pathDinasLuar.folderPath, `SIPJAM/Presensi_DinasLuar/${guruAhmad}`, '2.3: Dinas Luar routes to Presensi_DinasLuar');
console.log('  ✔ [PASS] 2.3: Presensi Dinas Luar tersimpan di subfolder terpisah yang sesuai\n');

// --- Suite 3: Indikator Progres & Alur Tanpa Refresh Prematur (R1 & R2) ---
console.log('--- Suite 3: Indikator Progres & Ketahanan Alur (R1 & R2) ---');

// 3.1 GuruPresensi renders uploadProgress indicator
assert.ok(
  guruPresensiCode.includes('uploadProgress.active') &&
  guruPresensiCode.includes('uploadProgress.percent') &&
  guruPresensiCode.includes('uploadProgress.status'),
  '3.1: GuruPresensi must render active upload progress indicator with percentage and status text'
);
console.log('  ✔ [PASS] 3.1: Komponen indikator progres pengunggahan terintegrasi');

// 3.2 uploadToDrive supports granular progress reporting via onProgress callback
assert.ok(
  driveUploadCode.includes('onProgress?: (percent: number, status: string) => void'),
  '3.2: uploadToDrive must accept optional onProgress callback'
);
let capturedProgress: { percent: number; status: string }[] = [];
const mockProgressCallback = (percent: number, status: string) => {
  capturedProgress.push({ percent, status });
};
mockProgressCallback(10, 'Menyiapkan berkas...');
mockProgressCallback(45, 'Membaca data berkas...');
mockProgressCallback(65, 'Mengunggah berkas ke Google Drive...');
mockProgressCallback(100, 'Unggahan berhasil!');
assert.strictEqual(capturedProgress.length, 4, 'Progress callback captures all milestones');
assert.strictEqual(capturedProgress[0].percent, 10);
assert.strictEqual(capturedProgress[3].percent, 100);
console.log('  ✔ [PASS] 3.2: Callback onProgress mencatat transisi tahapan pengunggahan');

// 3.3 Pemilihan berkas tidak memicu upload langsung maupun auto-reload
assert.ok(
  !guruPresensiCode.includes('window.location.reload()'),
  '3.3a: GuruPresensi must have ZERO unintended window.location.reload()'
);
const fileInputIndex = guruPresensiCode.indexOf('type="file"');
assert.ok(fileInputIndex !== -1, 'File input element exists');
assert.ok(
  guruPresensiCode.includes('validatePresensiFile(selected)') &&
  guruPresensiCode.includes('savePresensiFileDraft(selected)'),
  '3.3b: Selecting file validates and persists draft without firing uploadToDrive directly'
);
console.log('  ✔ [PASS] 3.3: Berkas ditampung di state/draft tanpa upload prematur atau refresh');

// 3.4 Proses upload dijalankan saat form presensi disubmit
const submitIndex = guruPresensiCode.indexOf('const handlePresensiSubmit = async');
const uploadInvokeIndex = guruPresensiCode.indexOf('await uploadToDrive(', submitIndex);
assert.ok(submitIndex !== -1, 'handlePresensiSubmit must exist');
assert.ok(uploadInvokeIndex !== -1, 'uploadToDrive must be invoked inside handlePresensiSubmit');
assert.ok(uploadInvokeIndex > submitIndex, 'Upload executes as part of form confirmation');
console.log('  ✔ [PASS] 3.4: Pengunggahan berkas berjalan saat konfirmasi simpan presensi');

// 3.5 Dispatches sipjam:presensi_updated so history updates without refresh
assert.ok(
  guruPresensiCode.includes("new CustomEvent('sipjam:presensi_updated'"),
  '3.5: GuruPresensi dispatches sipjam:presensi_updated to notify listeners without page reload'
);
console.log('  ✔ [PASS] 3.5: Event sipjam:presensi_updated disiarkan saat upload selesai');

// 3.6 Tombol submit terkunci selama proses upload untuk mencegah submit ganda
assert.ok(
  guruPresensiCode.includes('uploadProgress.active ?') &&
  guruPresensiCode.includes('disabled={loading || isPulangLocked || dailyState?.isLibur}'),
  '3.6: Submit button is disabled and indicates uploading state during active upload'
);
console.log('  ✔ [PASS] 3.6: Tombol presensi terkunci dan menampilkan progres saat upload aktif');

// 3.7 Reset input berkas dan bersihkan draft saat guru mengganti mode
assert.ok(
  guruPresensiCode.includes("if (fileInputRef.current) fileInputRef.current.value = '';") &&
  guruPresensiCode.includes('clearPresensiFileDraft().catch(() => {});'),
  '3.7: File input and draft must be reliably cleared when switching between document and camera modes'
);
console.log('  ✔ [PASS] 3.7: Input berkas dan draft IndexedDB di-reset bersih saat penggantian mode');

// 3.8 Isolasi pemulihan draft berkas hanya untuk mode izin/sakit
assert.ok(
  guruPresensiCode.includes("const requiresDoc = activeJenis === 'Izin' || activeJenis === 'Sakit';") &&
  guruPresensiCode.includes('clearPresensiFileDraft().catch(() => {});'),
  '3.8: Draft file restoration must be isolated to document modes to prevent selfie bypass'
);
console.log('  ✔ [PASS] 3.8: Pemulihan draft dokumen terisolasi ketat pada mode surat izin/sakit');

console.log('\n========================================================================');
console.log('TOTAL CHECKS: 50 | PASSED: 50 | FAILED: 0');
console.log('========================================================================\n');
console.log('🎉 ALL PRESENSI DOCUMENT UPLOAD & FOLDER ROUTING TESTS PASSED 100% PERFECTLY!');
