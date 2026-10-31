import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 TEST SUITE: VERIFIKASI DOKUMEN KONSEKUENSI PELANGGARAN SIPJAM');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message || err);
    failed++;
  }
}

const root = path.resolve(__dirname, '..');
const docPath = path.join(root, 'docs', 'KONSEKUENSI_PELANGGARAN.md');

// 1. File existence and location check
runTest('1.1: Dokumen resmi tersimpan tepat di docs/KONSEKUENSI_PELANGGARAN.md', () => {
  assert(fs.existsSync(docPath), 'File docs/KONSEKUENSI_PELANGGARAN.md harus ada');
  const stat = fs.statSync(docPath);
  assert(stat.size > 2000, `Ukuran dokumen harus komprehensif (saat ini ${stat.size} bytes)`);
});

const content = fs.readFileSync(docPath, 'utf8');

// 2. Definisi pelanggaran untuk 3 kategori utama
runTest('2.1: Dokumen memuat definisi pelanggaran kategori Tiket (Piket, Izin, Penugasan)', () => {
  assert(
    content.includes('Kategori 1') && content.includes('Kelalaian Pengisian Tiket'),
    'Harus memuat sub-bagian Kategori 1: Kelalaian Pengisian Tiket'
  );
  assert(content.toLowerCase().includes('tiket piket'), 'Harus menyebutkan tiket/laporan piket');
  assert(content.toLowerCase().includes('tiket izin') || content.toLowerCase().includes('sakit'), 'Harus menyebutkan tiket izin/sakit');
  assert(content.toLowerCase().includes('dinas luar'), 'Harus menyebutkan dinas luar');
  assert(content.toLowerCase().includes('inval') || content.toLowerCase().includes('penugasan'), 'Harus menyebutkan tiket inval/penugasan');
});

runTest('2.2: Dokumen memuat definisi pelanggaran kategori Jurnal KBM', () => {
  assert(
    content.includes('Kategori 2') && content.includes('Jurnal KBM'),
    'Harus memuat sub-bagian Kategori 2: Jurnal KBM'
  );
  assert(content.includes('Kurikulum Merdeka'), 'Harus menyebutkan standar Kurikulum Merdeka');
  assert(content.toLowerCase().includes('pulang cepat'), 'Harus menjelaskan indikasi pulang cepat tanpa mengajar');
});

runTest('2.3: Dokumen memuat definisi pelanggaran kategori Jurnal Kegiatan', () => {
  assert(
    content.includes('Kategori 3') && content.includes('Jurnal Kegiatan'),
    'Harus memuat sub-bagian Kategori 3: Jurnal Kegiatan'
  );
  assert(content.includes('Sistem Blok'), 'Harus menyebutkan Sistem Blok');
});

// 3. Matriks konsekuensi administratif bertingkat
runTest('3.1: Skema sanksi administratif memuat Teguran Lisan', () => {
  assert(content.includes('Teguran Lisan'), 'Harus memuat tahap Teguran Lisan');
});

runTest('3.2: Skema sanksi administratif memuat Surat Peringatan Tertulis (SP 1, SP 2, SP 3)', () => {
  assert(content.includes('Surat Peringatan Pertama') || content.includes('SP 1'), 'Harus memuat SP 1');
  assert(content.includes('Surat Peringatan Kedua') || content.includes('SP 2'), 'Harus memuat SP 2');
  assert(content.includes('Surat Peringatan Ketiga') || content.includes('SP 3'), 'Harus memuat SP 3');
});

runTest('3.3: Skema sanksi administratif memuat evaluasi/penangguhan insentif dan honor', () => {
  assert(
    content.toLowerCase().includes('penangguhan') || content.toLowerCase().includes('pemotongan'),
    'Harus memuat ketentuan penangguhan/pemotongan'
  );
  assert(content.toLowerCase().includes('insentif'), 'Harus menyebutkan evaluasi/penangguhan insentif');
  assert(content.toLowerCase().includes('honor'), 'Harus menyebutkan evaluasi/penangguhan honor');
});

runTest('3.4: Skema sanksi administratif memuat pemanggilan Pimpinan Sekolah dan Yayasan/Dinas', () => {
  assert(
    content.toLowerCase().includes('pemanggilan pimpinan') || content.toLowerCase().includes('pemanggilan resmi oleh dewan pembina yayasan'),
    'Harus memuat tahap pemanggilan pimpinan/yayasan'
  );
  assert(content.includes('Yayasan') || content.includes('Dinas Pendidikan'), 'Harus menyebutkan Yayasan atau Dinas Pendidikan');
});

// 4. Batas waktu toleransi (cut-off) dan wewenang verifikasi
runTest('4.1: Dokumen mencantumkan tabel batas waktu toleransi pengisian (cut-off)', () => {
  assert(content.toLowerCase().includes('cut-off'), 'Harus mencantumkan istilah cut-off');
  assert(content.includes('Batas Waktu Pengisian'), 'Harus memuat kolom batas waktu pengisian');
  assert(content.includes('Toleransi'), 'Harus memuat batas toleransi');
});

runTest('4.2: Dokumen menetapkan pihak yang berwenang memverifikasi dan merekapitulasi', () => {
  assert(content.toLowerCase().includes('guru piket'), 'Harus menetapkan peran guru piket');
  assert(content.toLowerCase().includes('kurikulum') || content.toLowerCase().includes('waka kurikulum'), 'Harus menetapkan peran tim kurikulum');
  assert(content.toLowerCase().includes('kepala sekolah'), 'Harus menetapkan peran kepala sekolah');
  assert(content.toLowerCase().includes('administrator') || content.toLowerCase().includes('admin'), 'Harus menetapkan peran administrator');
});

// 5. Prosedur klarifikasi, keberatan, dan pengajuan dispensasi
runTest('5.1: Dokumen memuat prosedur resmi klarifikasi atau dispensasi teknis/darurat', () => {
  assert(
    content.toLowerCase().includes('klarifikasi') && content.toLowerCase().includes('dispensasi'),
    'Harus memuat mekanisme klarifikasi dan dispensasi'
  );
  assert(
    content.toLowerCase().includes('force majeure') || content.toLowerCase().includes('keadaan darurat') || content.toLowerCase().includes('gangguan'),
    'Harus memuat kriteria kendala teknis / keadaan darurat sah'
  );
  assert(
    content.includes('2 x 24 jam') || content.includes('2x24 jam'),
    'Harus memuat batasan waktu pengajuan keberatan yang wajar (2 x 24 jam)'
  );
});

runTest('5.2: Dokumen memuat tata cara pemutihan/reset status oleh Administrator', () => {
  assert(
    content.includes('Reset Status') || content.toLowerCase().includes('reset status'),
    'Harus memuat prosedur Reset Status di Pusat Verifikasi'
  );
});

// 6. Matriks komparatif per kategori
runTest('6.1: Dokumen menyediakan tabel matriks untuk ketiga kategori kelalaian', () => {
  assert(content.includes('Matriks Sanksi Kelalaian Pengisian Tiket'), 'Harus ada tabel matriks tiket');
  assert(content.includes('Matriks Sanksi Kelalaian Pengisian Jurnal KBM'), 'Harus ada tabel matriks jurnal KBM');
  assert(content.includes('Matriks Sanksi Kelalaian Pengisian Jurnal Kegiatan'), 'Harus ada tabel matriks jurnal kegiatan');
});

// 7. Pengujian Robustness & Edge Cases Tambahan (Reviewer Round 1)
runTest('7.1: Dokumen memuat Klausul Perpanjangan Otomatis Dispensasi (Extended Force Majeure > 2x24 jam)', () => {
  assert(
    content.toLowerCase().includes('extended force majeure') || content.toLowerCase().includes('perpanjangan otomatis waktu dispensasi'),
    'Harus memuat klausul Extended Force Majeure'
  );
  assert(
    content.includes('2 x 24 jam') && content.includes('dinyatakan kembali normal secara resmi oleh Kepala Sekolah'),
    'Batas waktu dispensasi harus otomatis diperpanjang hingga layanan pulih'
  );
});

runTest('7.2: Dokumen memuat harmonisasi regulasi kepegawaian ASN/PPPK (PP 94/2021 & Dapodik) dan Yayasan (PKWT)', () => {
  assert(
    content.includes('PP Nomor 94 Tahun 2021') || content.includes('PP 94/2021'),
    'Harus mengacu pada PP Disiplin PNS bagi guru ASN'
  );
  assert(content.includes('Dapodik') || content.includes('SIMPATIKA'), 'Harus menyelaraskan jam KBM ke Dapodik/SIMPATIKA');
  assert(content.includes('Permendikbudristek Nomor 45 Tahun 2023') || content.includes('Permendikbudristek'), 'Harus merujuk regulasi tunjangan sertifikasi Kemendikbudristek');
  assert(content.includes('Badan Kepegawaian Daerah') || content.includes('BKD'), 'Harus menyebutkan BKD untuk sanksi ASN');
});

runTest('7.3: Dokumen memuat kelalaian Tiket Izin Terlambat di definisi dan matriks sanksi', () => {
  assert(content.includes('Kelalaian Tiket Izin Terlambat'), 'Harus memuat definisi tiket izin terlambat');
  assert(content.includes('Tidak Mengisi Tiket Izin Terlambat'), 'Harus memuat sanksi tiket izin terlambat di tabel matriks');
});

runTest('7.4: Dokumen memuat spesifikasi zona waktu operasional sekolah (WITA/WIB/WIT)', () => {
  assert(content.includes('WITA') && content.includes('WIB/WIT'), 'Harus memuat rujukan zona waktu operasional sekolah');
});

runTest('7.5: Dokumen merujuk ke path komponen yang valid dan terbukti ada di repositori', () => {
  assert(
    content.includes('src/components/AdminVerifView.tsx'),
    'Harus merujuk ke file AdminVerifView.tsx yang benar'
  );
  assert(
    !content.includes('src/components/AdminVerifikasiView.tsx'),
    'Tidak boleh merujuk ke file fiktif AdminVerifikasiView.tsx'
  );
  const targetComponent = path.join(root, 'src', 'components', 'AdminVerifView.tsx');
  assert(fs.existsSync(targetComponent), 'Komponen AdminVerifView.tsx harus ada di filesystem');
});

runTest('7.6: Dokumen menyediakan rangkaian kode SOP baku (SOP-SIPJAM) dan format formulir fisik (F-SIPJAM)', () => {
  assert(content.includes('SOP-SIPJAM-01'), 'Harus memuat kode SOP-SIPJAM-01');
  assert(content.includes('SOP-SIPJAM-02'), 'Harus memuat kode SOP-SIPJAM-02');
  assert(content.includes('SOP-SIPJAM-03'), 'Harus memuat kode SOP-SIPJAM-03');
  assert(content.includes('SOP-SIPJAM-04'), 'Harus memuat kode SOP-SIPJAM-04');
  assert(content.includes('Formulir F-SIPJAM-01'), 'Harus memuat template Formulir F-SIPJAM-01');
  assert(content.includes('Formulir F-SIPJAM-02'), 'Harus memuat template Formulir F-SIPJAM-02 (Berita Acara)');
});

console.log(`\n====================================================================`);
console.log(`🏁 FINISHED: Passed: ${passed}, Failed: ${failed}`);
console.log(`====================================================================\n`);

if (failed > 0) {
  process.exit(1);
}
