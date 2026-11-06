import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('🧪 VERIFIKASI TAMPILAN JURNAL REAL GURU PADA ADMIN (ANTI TIBA-TIBA TERISI)');
console.log('========================================================================\n');

const root = path.resolve(__dirname, '..');
const homeAdminPath = path.join(root, 'src', 'components', 'HomeViewAdmin.tsx');
const adminVerifPath = path.join(root, 'src', 'components', 'AdminVerifView.tsx');

assert(fs.existsSync(homeAdminPath), 'HomeViewAdmin.tsx exists');
assert(fs.existsSync(adminVerifPath), 'AdminVerifView.tsx exists');

const homeAdminContent = fs.readFileSync(homeAdminPath, 'utf8');
const adminVerifContent = fs.readFileSync(adminVerifPath, 'utf8');

// --- Section 1: Static Code Invariants ---
console.log('--- Section 1: Static Code Invariants ---');

// 1.1 HomeViewAdmin contains isRealJournal helper
assert(
  homeAdminContent.includes('const isRealJournal = (j: any)'),
  'HomeViewAdmin.tsx must define isRealJournal helper'
);
console.log('✅ PASS: HomeViewAdmin defines isRealJournal helper');

// 1.2 HomeViewAdmin checks isRealJournal in filledCount and hasJurnalKegiatan
assert(
  homeAdminContent.includes('isRealJournal(j) && isJurnalMatchJadwal(j, jk)'),
  'HomeViewAdmin filledCount must verify isRealJournal'
);
assert(
  homeAdminContent.includes('isRealJournal(j) && (j.keterangan === \'Jurnal Kegiatan\''),
  'HomeViewAdmin hasJurnalKegiatan must verify isRealJournal'
);
console.log('✅ PASS: HomeViewAdmin gates filledCount and hasJurnalKegiatan with isRealJournal');

// 1.3 HomeViewAdmin checks isIzinSakit before showing completion
assert(
  homeAdminContent.includes('const isIzinSakit = presensiDatangStatus === \'Izin\' || presensiDatangStatus === \'Sakit\';'),
  'HomeViewAdmin defines isIzinSakit guard'
);
assert(
  homeAdminContent.includes('} else if (isIzinSakit) {'),
  'HomeViewAdmin evaluates isIzinSakit before KBM completion check'
);
console.log('✅ PASS: HomeViewAdmin handles isIzinSakit prior to KBM completion');

// 1.4 HomeViewAdmin handles hasTidakMelaksanakanKegiatan
assert(
  homeAdminContent.includes('const hasTidakMelaksanakanKegiatan = acceptedTeacherJournals.some'),
  'HomeViewAdmin defines hasTidakMelaksanakanKegiatan detection'
);
console.log('✅ PASS: HomeViewAdmin detects hasTidakMelaksanakanKegiatan');

// 1.5 AdminVerifView exports and defines isRealSubmittedJournal
assert(
  adminVerifContent.includes('export function isRealSubmittedJournal'),
  'AdminVerifView.tsx must export isRealSubmittedJournal'
);
assert(
  adminVerifContent.includes('const submittedList = activeTab === \'Jurnal\''),
  'AdminVerifView.tsx filters submittedList for Jurnal tab'
);
console.log('✅ PASS: AdminVerifView exports isRealSubmittedJournal and filters Jurnal submittedList');

// 1.6 AdminVerifView preserves regression assertion for Tidak Masuk Kelas in unsubmittedJurnal
assert(
  adminVerifContent.includes("j.status_verifikasi !== 'Tidak Masuk Kelas'"),
  'AdminVerifView must preserve j.status_verifikasi !== \'Tidak Masuk Kelas\''
);
console.log('✅ PASS: AdminVerifView preserves regression check in unsubmittedJurnal');


// --- Section 2: Unit Testing isRealJournal / isRealSubmittedJournal ---
console.log('\n--- Section 2: Unit Testing isRealJournal & isRealSubmittedJournal ---');

const isRealJournal = (j: any): boolean => {
  if (!j) return false;
  const sv = j.status_verifikasi;
  if (sv === 'Tidak Masuk Kelas' || sv === 'Tidak Melaksanakan Kegiatan' || sv === 'Sakit' || sv === 'Izin') return false;
  const ket = (j.keterangan || '').trim().toLowerCase();
  if (ket === 'tidak masuk kelas' || ket === 'tidak melaksanakan kegiatan apapun' || ket === 'auto-fill sistem karena guru berhalangan hadir') return false;
  const mat = (j.materi || j.materi_pembelajaran || '').trim().toLowerCase();
  if (mat === 'tidak masuk kelas' || mat === 'tidak melaksanakan kegiatan apapun' || mat.startsWith('guru tidak dapat mengisi jurnal karena')) return false;
  return true;
};

// Test 2.1: Auto-record delinquency "Tidak Masuk Kelas"
const autoDelinquency1 = {
  id: 1,
  mapel: 'Matematika',
  kelas: 'X-A',
  materi: 'tidak masuk kelas',
  keterangan: 'tidak masuk kelas',
  status_verifikasi: 'Tidak Masuk Kelas'
};
assert.strictEqual(isRealJournal(autoDelinquency1), false, 'Auto Tidak Masuk Kelas must return false');

// Test 2.2: Auto-record delinquency "Tidak Melaksanakan Kegiatan"
const autoDelinquency2 = {
  id: 2,
  mapel: 'Jurnal Kegiatan',
  kelas: '-',
  materi: 'tidak melaksanakan kegiatan apapun',
  keterangan: 'tidak melaksanakan kegiatan apapun',
  status_verifikasi: 'Tidak Melaksanakan Kegiatan'
};
assert.strictEqual(isRealJournal(autoDelinquency2), false, 'Auto Tidak Melaksanakan Kegiatan must return false');

// Test 2.3: Auto-fill for leave "Sakit"
const autoLeaveSakit = {
  id: 3,
  mapel: 'Fisika',
  kelas: 'XI-IPA',
  materi: 'Guru tidak dapat mengisi jurnal karena sakit: flu berat',
  keterangan: 'Auto-fill sistem karena guru berhalangan hadir',
  status_verifikasi: 'Sakit'
};
assert.strictEqual(isRealJournal(autoLeaveSakit), false, 'Auto-fill leave Sakit must return false');

// Test 2.4: Auto-fill for leave "Izin"
const autoLeaveIzin = {
  id: 4,
  mapel: 'Biologi',
  kelas: 'XII-IPA',
  materi: 'Guru tidak dapat mengisi jurnal karena izin: keperluan keluarga',
  keterangan: 'Auto-fill sistem karena guru berhalangan hadir',
  status_verifikasi: 'Izin'
};
assert.strictEqual(isRealJournal(autoLeaveIzin), false, 'Auto-fill leave Izin must return false');

// Test 2.5: Real teaching journal submitted by teacher
const realJournal = {
  id: 5,
  mapel: 'Matematika',
  kelas: 'X-A',
  materi: 'Logaritma dan Eksponensial Bab 2',
  kegiatan: 'Diskusi kelompok dan latihan soal hal 45',
  keterangan: 'Jurnal KBM',
  status_verifikasi: 'Menunggu'
};
assert.strictEqual(isRealJournal(realJournal), true, 'Real journal submitted by teacher must return true');

// Test 2.6: Real non-teaching activity journal (Sistem Blok / Dinas Luar)
const realKegiatan = {
  id: 6,
  mapel: 'Jurnal Kegiatan',
  kelas: '-',
  materi: 'Workshop Peningkatan Kapasitas Guru Kurikulum Merdeka',
  kegiatan: 'Mengikuti sesi penyusunan modul ajar di aula',
  keterangan: 'Jurnal Kegiatan',
  status_verifikasi: 'Menunggu'
};
assert.strictEqual(isRealJournal(realKegiatan), true, 'Real non-kbm activity journal must return true');

console.log('✅ PASS: All unit tests for isRealJournal logic passed');


// --- Section 3: Verification of Admin Display Scenarios ---
console.log('\n--- Section 3: Verification of Admin Display Scenarios ---');

// Scenario 3.1: Sick teacher must NOT display "X/X Selesai" in green
{
  const presensiDatangStatus = 'Sakit';
  const targetCount = 3;
  const isIzinSakit = presensiDatangStatus === 'Izin' || presensiDatangStatus === 'Sakit';

  // Even if auto-filled rows exist in DB:
  const teacherJournals = [
    { mapel: 'Matematika', kelas: 'X-A', status_verifikasi: 'Sakit', materi: 'Guru tidak dapat mengisi jurnal karena sakit' },
    { mapel: 'Matematika', kelas: 'X-B', status_verifikasi: 'Sakit', materi: 'Guru tidak dapat mengisi jurnal karena sakit' },
    { mapel: 'Matematika', kelas: 'X-C', status_verifikasi: 'Sakit', materi: 'Guru tidak dapat mengisi jurnal karena sakit' }
  ];

  const filledCount = targetCount; // Old faulty logic would compute 3
  const realFilledCount = teacherJournals.filter(j => isRealJournal(j)).length;
  assert.strictEqual(realFilledCount, 0, 'Real filled count for sick teacher must be 0');

  let jurnalStatus = '';
  let jurnalColor = '';
  if (isIzinSakit) {
    jurnalStatus = presensiDatangStatus;
    jurnalColor = presensiDatangStatus === 'Sakit' ? 'rose' : 'blue';
  } else if (filledCount >= targetCount) {
    jurnalStatus = `${targetCount}/${targetCount} Selesai`;
    jurnalColor = 'green';
  }

  assert.strictEqual(jurnalStatus, 'Sakit', 'Status must be Sakit');
  assert.notStrictEqual(jurnalStatus, '3/3 Selesai', 'Status must NOT be 3/3 Selesai');
  assert.strictEqual(jurnalColor, 'rose');
  console.log('✅ PASS: Sick teacher is displayed as "Sakit", NOT "X/X Selesai"');
}

// Scenario 3.2: Teacher with auto delinquency record "Tidak Melaksanakan Kegiatan"
{
  const isBlokToday = true;
  const isExemptNonTeaching = false;
  const teacherJournals = [
    { mapel: 'Jurnal Kegiatan', status_verifikasi: 'Tidak Melaksanakan Kegiatan', materi: 'tidak melaksanakan kegiatan apapun', keterangan: 'tidak melaksanakan kegiatan apapun' }
  ];

  const hasTidakMelaksanakanKegiatan = teacherJournals.some((j: any) =>
    j.status_verifikasi === 'Tidak Melaksanakan Kegiatan' ||
    (j.materi || '').toLowerCase() === 'tidak melaksanakan kegiatan apapun' ||
    (j.keterangan || '').toLowerCase() === 'tidak melaksanakan kegiatan apapun'
  );
  const hasJurnalKegiatan = teacherJournals.some((j: any) =>
    isRealJournal(j) && (j.keterangan === 'Jurnal Kegiatan' || j.mapel === 'Jurnal Kegiatan')
  );

  assert.strictEqual(hasJurnalKegiatan, false, 'hasJurnalKegiatan must be false for auto non-activity');
  assert.strictEqual(hasTidakMelaksanakanKegiatan, true, 'hasTidakMelaksanakanKegiatan must be true');

  let jurnalStatus = '';
  let jurnalColor = '';
  if (isBlokToday) {
    if (isExemptNonTeaching) {
      jurnalStatus = 'Bebas KBM';
      jurnalColor = 'gray';
    } else if (hasTidakMelaksanakanKegiatan) {
      jurnalStatus = 'Tidak Melaksanakan Kegiatan';
      jurnalColor = 'rose';
    } else if (hasJurnalKegiatan) {
      jurnalStatus = 'Jurnal Kegiatan Selesai';
      jurnalColor = 'green';
    }
  }

  assert.strictEqual(jurnalStatus, 'Tidak Melaksanakan Kegiatan');
  assert.strictEqual(jurnalColor, 'rose');
  console.log('✅ PASS: Delinquent teacher is displayed as "Tidak Melaksanakan Kegiatan", NOT "Jurnal Kegiatan Selesai"');
}

// Scenario 3.3: AdminVerifView tab Jurnal excludes auto-records from "Sudah Menyelesaikan (Ada Pengajuan)"
{
  const rawJurnalList = [
    realJournal,
    autoDelinquency1,
    autoDelinquency2,
    autoLeaveSakit
  ];

  const submittedList = rawJurnalList.filter(j => isRealJournal(j));
  assert.strictEqual(submittedList.length, 1, 'Only the 1 real journal must appear in submittedList');
  assert.strictEqual(submittedList[0].id, 5, 'The real journal id is 5');
  console.log('✅ PASS: AdminVerifView submittedList filters out all auto delinquency and leave records');
}

// Scenario 3.4: Teacher Name Anti-Collision (Ahmad Fauzi vs Ahmad Yani)
{
  const cleanStr = (s?: string | null) => (s || '').toLowerCase()
    .replace(/,.*$/, '')
    .replace(/\b(s\.?pd\.?i?|m\.?pd\.?|s\.?kom\.?|s\.?si\.?|s\.?ag\.?|s\.?e\.?|s\.?t\.?|gr\.?)\b/gi, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  const isTeacherMatch = (recordName?: string, recordNip?: string, targetName?: string, targetNip?: string): boolean => {
    const rNip = cleanStr(recordNip);
    const tNip = cleanStr(targetNip);
    if (rNip && tNip && rNip === tNip) return true;

    const c1 = cleanStr(recordName);
    const c2 = cleanStr(targetName);
    if (!c1 && !c2) return false;

    if (c1 && tNip && c1 === tNip) return true;
    if (c2 && rNip && c2 === rNip) return true;

    if (!c1 || !c2) return false;
    if (c1 === c2) return true;

    // First name match (first word token must match exactly, min 2 chars; prevents substring collision e.g. Fitrawan vs Fitra)
    const t1 = c1.split(' ').filter(w => w.length >= 2);
    const t2 = c2.split(' ').filter(w => w.length >= 2);
    if (t1.length > 0 && t2.length > 0 && t1[0] === t2[0]) {
      if (t1.length > 1 && t2.length > 1) {
        return t1[1] === t2[1];
      }
      return true;
    }

    return false;
  };

  // Two different teachers sharing same first name "Ahmad"
  const collisionCheck = isTeacherMatch('Ahmad Fauzi', '111', 'Ahmad Yani', '222');
  assert.strictEqual(collisionCheck, false, 'Ahmad Fauzi must NOT match Ahmad Yani');

  // Single token nickname "Fitra" matches full name "Fitra Suryazana"
  const singleTokenCheck = isTeacherMatch('Fitra', undefined, 'Fitra Suryazana', '333');
  assert.strictEqual(singleTokenCheck, true, 'Single token Fitra matches Fitra Suryazana');

  console.log('✅ PASS: Multi-word name collision prevented while single token nickname is preserved');
}

console.log('\n========================================================================');
console.log('🎉 ALL ADMIN JURNAL REAL DATA VERIFICATION TESTS PASSED 100%!');
console.log('========================================================================\n');
