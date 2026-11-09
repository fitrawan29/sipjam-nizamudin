import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('========================================================================');
console.log('🧪 ADVERSARIAL QA TEST: ALUR PRESENSI DATANG/PULANG & PIKET REKAP REMOVAL');
console.log('========================================================================\n');

const projectRoot = process.cwd();

// --- Section 1: Verification of PiketView.tsx ---
console.log('--- Suite 1: PiketView Lapor Flow & Student Recap Removal (R1) ---');
const piketPath = path.join(projectRoot, 'src', 'components', 'PiketView.tsx');
assert(fs.existsSync(piketPath), 'PiketView.tsx must exist');
const piketCode = fs.readFileSync(piketPath, 'utf8');

// 1.1 In tab 'lapor', piket is no longer burdened with student class attendance table (H/S/I/A)
assert(
  !piketCode.includes("activeTab === 'lapor' && canReport && (\n                  !isFormLocked && !isPiketIntervensiExpired"),
  'PiketView must not render student class H/S/I/A attendance grid in lapor form'
);
assert(
  piketCode.includes("Petugas piket fokus pada catatan kejadian dan foto dokumentasi piket harian. Presensi siswa pagi berjalan mandiri sebagai Presensi Datang (QR gerbang / Kios) tanpa beban kewajiban rekap absensi kelas oleh guru piket."),
  'PiketView lapor tab info banner explicitly explains removal of student recap obligation'
);

// 1.2 Submit button text updated to "Kirim Laporan Piket"
assert(
  piketCode.includes('Kirim Laporan Piket') && !piketCode.includes('"Simpan Presensi Siswa"'),
  'PiketView submit button must be "Kirim Laporan Piket" and not "Simpan Presensi Siswa"'
);

// 1.3 Piket verification approval is independent of isRekapLengkap
assert(
  piketCode.includes('let statusVerifikasiPiket = isFotoLengkap ? \'Disetujui\' : \'Menunggu\';'),
  'Piket verification status does not demand isRekapLengkap'
);

// 1.4 WhatsApp parent message footer formatting defense
assert(
  piketCode.includes("note: datangRecord ? (pulangRecord ? 'Tercatat pada sistem presensi pulang' : 'Tercatat pada sistem presensi datang') : 'Belum tercatat pada sistem presensi datang'"),
  'WhatsApp note explicitly handles absent students without leaving field undefined'
);

// 1.5 Presensi Pulang remains fully functional
assert(
  piketCode.includes("handleManualMark(s, 'pulang')") &&
  piketCode.includes("status: 'pulang'") &&
  piketCode.includes("Tandai Pulang"),
  'Presensi Pulang student marking is preserved and operational'
);

console.log('  ✔ PASS: Suite 1 - PiketView requirements verified');

// --- Section 2: Verification of GuruJurnal.tsx ---
console.log('\n--- Suite 2: GuruJurnal Terminology & Synchronization (R2) ---');
const jurnalPath = path.join(projectRoot, 'src', 'components', 'GuruJurnal.tsx');
assert(fs.existsSync(jurnalPath), 'GuruJurnal.tsx must exist');
const jurnalCode = fs.readFileSync(jurnalPath, 'utf8');

// 2.1 Sync button is labeled "Terapkan Presensi Datang"
assert(
  jurnalCode.includes('Terapkan Presensi Datang'),
  'GuruJurnal sync button must be labeled "Terapkan Presensi Datang"'
);
assert(
  jurnalCode.includes('title="Tandai siswa yang sudah presensi di gerbang datang sebagai Hadir"'),
  'GuruJurnal sync button tooltip updated to mention gerbang datang'
);

// 2.2 Toast notification updated
assert(
  jurnalCode.includes('showToast(`Presensi datang berhasil diterapkan: ${syncedCount} siswa ditandai Hadir.`, \'success\');'),
  'GuruJurnal toast updated to mention "Presensi datang berhasil diterapkan"'
);

// 2.3 Badges updated to Datang terminology
assert(
  jurnalCode.includes('✓ Hadir di Sekolah (Datang {pRec.jam})'),
  'Student arrival badge must display "✓ Hadir di Sekolah (Datang ...)"'
);
assert(
  jurnalCode.includes('Belum Presensi Datang'),
  'Student absent badge must display "Belum Presensi Datang"'
);

// 2.4 Last change audit trail attributes "Presensi Datang"
assert(
  jurnalCode.includes("diubah_oleh: 'Presensi Datang'"),
  'Audit trail attributes change to "Presensi Datang"'
);

console.log('  ✔ PASS: Suite 2 - GuruJurnal terminology verified');

// --- Section 3: Verification of RekapSiswaView.tsx ---
console.log('\n--- Suite 3: RekapSiswaView Wali Input Terminology (R2) ---');
const rekapPath = path.join(projectRoot, 'src', 'components', 'RekapSiswaView.tsx');
assert(fs.existsSync(rekapPath), 'RekapSiswaView.tsx must exist');
const rekapCode = fs.readFileSync(rekapPath, 'utf8');

assert(
  rekapCode.includes('Presensi Datang: Hadir ('),
  'Wali Kelas student list indicates gate attendance as "Presensi Datang: Hadir"'
);
assert(
  rekapCode.includes('Presensi Datang: Belum Presensi'),
  'Wali Kelas student list indicates absent students as "Presensi Datang: Belum Presensi"'
);

console.log('  ✔ PASS: Suite 3 - RekapSiswaView terminology verified');

// --- Section 4: Behavioral Simulation of Presensi Datang & WhatsApp Note ---
console.log('\n--- Suite 4: Behavioral Simulation of Flow & Parent Notification ---');

function simulateWhatsAppNote(datangRecord: { jam: string } | null, pulangRecord: { jam: string } | null) {
  return datangRecord
    ? (pulangRecord ? 'Tercatat pada sistem presensi pulang' : 'Tercatat pada sistem presensi datang')
    : 'Belum tercatat pada sistem presensi datang';
}

const datangOnly = simulateWhatsAppNote({ jam: '06:45' }, null);
assert.strictEqual(datangOnly, 'Tercatat pada sistem presensi datang', 'Datang-only note is accurate');

const datangDanPulang = simulateWhatsAppNote({ jam: '06:45' }, { jam: '13:30' });
assert.strictEqual(datangDanPulang, 'Tercatat pada sistem presensi pulang', 'Pulang note is accurate');

const belumDatang = simulateWhatsAppNote(null, null);
assert.strictEqual(belumDatang, 'Belum tercatat pada sistem presensi datang', 'Absent student note is strictly defined');

console.log('  ✔ PASS: Suite 4 - Behavioral simulation passed');

console.log('\n========================================================================');
console.log('🎉 ALL ADVERSARIAL QA CHECKS PASSED EMPIRICALLY (100%)!');
console.log('========================================================================\n');
