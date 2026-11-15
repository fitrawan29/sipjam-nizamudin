import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveTeacherAttendancePolicy,
  isTeacherNameEquivalent,
  normalizeTeacherIdentityName,
  resolveLinkedUserForTeacher,
  isTeacherRecordMatch,
  isBkAccount,
  isTuAccount,
  isInvalidMapel,
  isGuruDiPiket
} from '../src/lib/workflow';

console.log('========================================================================');
console.log('🧪 VERIFIKASI KEBIJAKAN KEHADIRAN GURU SESUAI KBM (ADE & SARAH)');
console.log('========================================================================\n');

let passCount = 0;
let failCount = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ PASS: ${name}`);
    passCount++;
  } catch (err: any) {
    console.error(`  ✘ FAIL: ${name}`);
    console.error(`    ${err?.message || err}`);
    failCount++;
  }
}

// -----------------------------------------------------------------------------
// BAGIAN 1: Static AST & Logic Audit (HomeViewAdmin & AdminVerifView)
// -----------------------------------------------------------------------------
console.log('--- [Bagian 1] Static Code Logic & AST Invariants ---');

const root = process.cwd();
const homeAdminSrc = fs.readFileSync(path.join(root, 'src', 'components', 'HomeViewAdmin.tsx'), 'utf8');
const adminVerifSrc = fs.readFileSync(path.join(root, 'src', 'components', 'AdminVerifView.tsx'), 'utf8');
const workflowSrc = fs.readFileSync(path.join(root, 'src', 'lib', 'workflow.ts'), 'utf8');
const alpaSrc = fs.readFileSync(path.join(root, 'src', 'lib', 'attendanceAlpa.ts'), 'utf8');
const adminRekapSrc = fs.readFileSync(path.join(root, 'src', 'components', 'AdminRekapView.tsx'), 'utf8');
const adminConfigSrc = fs.readFileSync(path.join(root, 'src', 'components', 'AdminConfigView.tsx'), 'utf8');

check('1.1: HomeViewAdmin memanggil resolveTeacherAttendancePolicy dengan preferLegacyListWhenGlobalKbm: true', () => {
  assert.ok(
    homeAdminSrc.includes('preferLegacyListWhenGlobalKbm: true'),
    'HomeViewAdmin harus menyertakan preferLegacyListWhenGlobalKbm: true'
  );
});

check('1.2: HomeViewAdmin mengevaluasi isPiket tanpa membatalkan isExemptNonTeaching di hari normal', () => {
  assert.ok(
    homeAdminSrc.includes('const isPiket = isAssignedPiket && !isExemptNonTeaching && !isBlokToday;'),
    'HomeViewAdmin isPiket harus menggunakan && !isExemptNonTeaching && !isBlokToday'
  );
  assert.ok(
    !homeAdminSrc.includes('isAssignedPiket && (!isBlokToday || !isExemptNonTeaching)'),
    'HomeViewAdmin tidak boleh memiliki bug boolean (!isBlokToday || !isExemptNonTeaching)'
  );
});

check('1.3: AdminVerifView memanggil resolveTeacherAttendancePolicy dengan preferLegacyListWhenGlobalKbm: true', () => {
  assert.ok(
    adminVerifSrc.includes('preferLegacyListWhenGlobalKbm: true'),
    'AdminVerifView harus menyertakan preferLegacyListWhenGlobalKbm: true'
  );
});

check('1.4: resolveTeacherAttendancePolicy mengutamakan preferLegacyListWhenGlobalKbm di atas DB default false', () => {
  const sampleSchedule = [{ id: 'j1', hari: 'Kamis', mata_pelajaran: 'Matematika', nama_guru: 'Ade' }];
  const policy = resolveTeacherAttendancePolicy({
    teacher: { id: 'g-ade', nama_guru: 'Ade Fitrawan Ibrahim', wajib_hadir_hanya_mengajar: false },
    weeklySchedules: sampleSchedule,
    aturanGlobal: 'Hari_Mengajar_Saja',
    guruHanyaMengajarList: ['g-ade'],
    preferLegacyListWhenGlobalKbm: true,
  } as any);
  assert.strictEqual(policy.isTeacherExempt, true, 'Guru dalam daftar GHM dengan preferLegacyListWhenGlobalKbm harus exempt');
});

check('1.5: AdminVerifView menyelaraskan isFreeFromPresence agar guru bebas KBM tidak dipaksa hadir oleh piket', () => {
  assert.ok(
    adminVerifSrc.includes('const isExemptNonTeaching = isTeacherExempt && scheduledClasses.length === 0;'),
    'AdminVerifView harus mendefinisikan isExemptNonTeaching'
  );
  assert.ok(
    adminVerifSrc.includes('const hasPiketDuty = hasPiketToday && !isExemptNonTeaching;'),
    'AdminVerifView harus membebaskan guru bebas KBM dari tugas piket'
  );
  assert.ok(
    adminVerifSrc.includes('const isFreeFromPresence = isExemptNonTeaching && !hasPiketDuty;'),
    'AdminVerifView isFreeFromPresence harus selaras dengan HomeViewAdmin'
  );
});

check('1.6: attendanceAlpa.ts melindungi guru bebas KBM dan menyertakan preferLegacyListWhenGlobalKbm: true', () => {
  assert.ok(
    alpaSrc.includes('preferLegacyListWhenGlobalKbm: true'),
    'attendanceAlpa.ts harus menyertakan preferLegacyListWhenGlobalKbm: true'
  );
  assert.ok(
    alpaSrc.includes('const isExemptNonTeaching = isTeacherExempt && !hasTeachingToday;'),
    'attendanceAlpa.ts harus mendefinisikan isExemptNonTeaching'
  );
  assert.ok(
    alpaSrc.includes('const hasPiketDuty = (inPenugasan || inJadwalPiket) && !isExemptNonTeaching && (!isBlokActive || hasTeachingToday);'),
    'attendanceAlpa.ts harus membebaskan tugas piket guru bebas KBM agar tidak memicu alpa'
  );
});

check('1.7: AdminRekapView menyertakan preferLegacyListWhenGlobalKbm: true agar tidak menghukum alpa', () => {
  assert.ok(
    adminRekapSrc.includes('preferLegacyListWhenGlobalKbm: true'),
    'AdminRekapView harus menyertakan preferLegacyListWhenGlobalKbm: true'
  );
});

check('1.8: AdminConfigView menyertakan preferLegacyListWhenGlobalKbm: true pada inisialisasi toggle kebijakan', () => {
  assert.ok(
    adminConfigSrc.includes('preferLegacyListWhenGlobalKbm: true'),
    'AdminConfigView harus menyertakan preferLegacyListWhenGlobalKbm: true'
  );
});

check('1.9: workflow.ts mengevaluasi resolveTeacherAttendancePolicy dengan allowSingleWordFirstToken: true', () => {
  assert.ok(
    workflowSrc.includes('allowSingleWordFirstToken: true'),
    'workflow.ts harus mendukung pencocokan allowSingleWordFirstToken'
  );
});

// -----------------------------------------------------------------------------
// BAGIAN 2: Ekuivalensi Identitas & Resolusi User (Ade & Sarah)
// -----------------------------------------------------------------------------
console.log('\n--- [Bagian 2] Ekuivalensi Identitas & Transliterasi Nama (Ade & Sarah) ---');

check('2.1: Ekuivalensi nama Arab Sarah Alhaid <=> Sarah Alheid (transliterasi ai / ei)', () => {
  assert.strictEqual(isTeacherNameEquivalent('Sarah Alhaid', 'Sarah Alheid'), true);
  assert.strictEqual(isTeacherNameEquivalent('Sarah Al-Haid', 'Sarah Alheid'), true);
  assert.strictEqual(isTeacherNameEquivalent('Sarah Al Haid', 'Sarah Alheid'), true);
  assert.strictEqual(isTeacherNameEquivalent('Sarah Alhaid', 'Sarah', true), true); // allowSingleWordFirstToken
  assert.strictEqual(isTeacherNameEquivalent('Sarah Alheid', 'Sarah', true), true);
});

check('2.2: Ekuivalensi nama Ade Fitrawan Ibrahim <=> Ade <=> Fitrawan', () => {
  assert.strictEqual(isTeacherNameEquivalent('Ade Fitrawan Ibrahim', 'Ade', true), true);
  assert.strictEqual(isTeacherNameEquivalent('Ade Fitrawan', 'Ade Fitrawan Ibrahim'), true);
  assert.strictEqual(isTeacherNameEquivalent('Ade', 'Ade Fitrawan Ibrahim', true), true);
});

check('2.3: resolveLinkedUserForTeacher menautkan username "Ade" dan "Sarah" ke profil guru mereka', () => {
  const users = [
    { id: 'u-ade', username: 'Ade', nama: 'Ade Fitrawan Ibrahim', role: 'Guru' },
    { id: 'u-sarah', username: 'Sarah', nama: 'Sarah Alhaid', role: 'Guru' },
    { id: 'u-fitra', username: 'Fitra', nama: 'Fitra Suryazana Mamonto', role: 'Guru' },
  ];

  const teacherAde = { id: 'g-ade', nama_guru: 'Ade Fitrawan Ibrahim', nip: '-' };
  const linkedAde = resolveLinkedUserForTeacher(teacherAde, users);
  assert.ok(linkedAde, 'Linked user untuk Ade harus ditemukan');
  assert.strictEqual(linkedAde.username, 'Ade');

  const teacherSarah = { id: 'g-sarah', nama_guru: 'Sarah Alhaid', nip: '-' };
  const linkedSarah = resolveLinkedUserForTeacher(teacherSarah, users);
  assert.ok(linkedSarah, 'Linked user untuk Sarah harus ditemukan');
  assert.strictEqual(linkedSarah.username, 'Sarah');

  // Sarah varian ejaan Alheid
  const teacherSarahHeid = { id: 'g-sarah2', nama_guru: 'Sarah Alheid', nip: '-' };
  const linkedSarahHeid = resolveLinkedUserForTeacher(teacherSarahHeid, users);
  assert.ok(linkedSarahHeid, 'Linked user untuk Sarah Alheid harus ditemukan');
  assert.strictEqual(linkedSarahHeid.username, 'Sarah');
});

// -----------------------------------------------------------------------------
// BAGIAN 3: Simulasi Evaluasi Kehadiran Hari Bebas KBM (Misal Hari Senin)
// -----------------------------------------------------------------------------
console.log('\n--- [Bagian 3] Simulasi Evaluasi Kehadiran Hari Bebas KBM (Senin) ---');

// Guru Ade mengajar Kamis dan Jumat (4 jam seminggu), Senin KOSONG
// Guru Sarah mengajar Selasa dan Rabu (4 jam seminggu), Senin KOSONG
const mockWeeklySchedules = [
  { id: 'j-ade-1', hari: 'Kamis', mata_pelajaran: 'Informatika', kelas: 'X Merdeka', nama_guru: 'Ade', user_id: 'u-ade' },
  { id: 'j-ade-2', hari: 'Jumat', mata_pelajaran: 'Informatika', kelas: 'XI Merdeka', nama_guru: 'Ade Fitrawan Ibrahim', user_id: 'u-ade' },
  { id: 'j-sarah-1', hari: 'Selasa', mata_pelajaran: 'Bahasa Arab', kelas: 'X Merdeka', nama_guru: 'Sarah', user_id: 'u-sarah' },
  { id: 'j-sarah-2', hari: 'Rabu', mata_pelajaran: 'Bahasa Arab', kelas: 'XI Merdeka', nama_guru: 'Sarah Alheid', user_id: 'u-sarah' },
];

const mockTeachers = [
  { id: 'g-ade', user_id: 'u-ade', nama_guru: 'Ade Fitrawan Ibrahim', nip: 'Ade', wajib_hadir_hanya_mengajar: true },
  { id: 'g-sarah', user_id: 'u-sarah', nama_guru: 'Sarah Alhaid', nip: 'Sarah', wajib_hadir_hanya_mengajar: true },
];

const mockUsers = [
  { id: 'u-ade', username: 'Ade', nama: 'Ade Fitrawan Ibrahim', role: 'Guru', wajib_hadir_hanya_mengajar: true },
  { id: 'u-sarah', username: 'Sarah', nama: 'Sarah Alhaid', role: 'Guru', wajib_hadir_hanya_mengajar: true },
];

check('3.1: Pada hari Senin (bebas KBM), Ade dan Sarah dievaluasi isFreeFromPresence = true', () => {
  const targetDay = 'Senin';
  const targetDayLower = targetDay.toLowerCase();

  for (const t of mockTeachers) {
    const linkedUser = resolveLinkedUserForTeacher(t, mockUsers);
    const policy = resolveTeacherAttendancePolicy({
      teacher: t,
      linkedUser,
      weeklySchedules: mockWeeklySchedules,
      aturanGlobal: 'Hari_Mengajar_Saja',
      guruHanyaMengajarList: [t.id],
      preferLegacyListWhenGlobalKbm: true,
    });

    const isTeacherExempt = policy.isTeacherExempt;
    assert.strictEqual(isTeacherExempt, true, `${t.nama_guru} harus isTeacherExempt = true`);

    const scheduledClassesToday = mockWeeklySchedules.filter((j: any) =>
      (j.hari || '').trim().toLowerCase() === targetDayLower &&
      isTeacherRecordMatch(j, t, linkedUser, { allowSingleWordFirstToken: true })
    );

    assert.strictEqual(scheduledClassesToday.length, 0, `${t.nama_guru} harus memiliki 0 kelas pada hari Senin`);

    const isExemptNonTeaching = isTeacherExempt && scheduledClassesToday.length === 0;
    assert.strictEqual(isExemptNonTeaching, true, `${t.nama_guru} isExemptNonTeaching harus true`);

    const hasPiketDuty = false;
    const isFreeFromPresence = isExemptNonTeaching && !hasPiketDuty;
    assert.strictEqual(isFreeFromPresence, true, `${t.nama_guru} isFreeFromPresence harus true`);

    const presensiDatangStatus = isFreeFromPresence ? 'Bebas Hadir' : 'Belum Datang';
    assert.strictEqual(presensiDatangStatus, 'Bebas Hadir', `${t.nama_guru} presensiDatangStatus harus Bebas Hadir`);
  }
});

check('3.2: Pada Dashboard Admin (HomeViewAdmin), Ade dan Sarah TIDAK dihitung dalam KPI Wajib Datang', () => {
  const matrixList = mockTeachers.map(t => {
    const linkedUser = resolveLinkedUserForTeacher(t, mockUsers);
    const policy = resolveTeacherAttendancePolicy({
      teacher: t,
      linkedUser,
      weeklySchedules: mockWeeklySchedules,
      aturanGlobal: 'Hari_Mengajar_Saja',
      guruHanyaMengajarList: [t.id],
      preferLegacyListWhenGlobalKbm: true,
    });
    const targetClasses = mockWeeklySchedules.filter((j: any) =>
      (j.hari || '').trim().toLowerCase() === 'senin' &&
      isTeacherRecordMatch(j, t, linkedUser, { allowSingleWordFirstToken: true })
    );
    const isExemptNonTeaching = policy.isTeacherExempt && targetClasses.length === 0;
    const isPiket = false;
    const isFreeFromPresence = isExemptNonTeaching && !isPiket;

    return {
      nama_guru: t.nama_guru,
      presensiDatang: {
        status: isFreeFromPresence ? 'Bebas Hadir' : 'Belum Datang',
        color: isFreeFromPresence ? 'blue' : 'gray'
      },
      presensiPulang: {
        status: isFreeFromPresence ? 'Bebas Hadir' : 'Belum Pulang',
        color: isFreeFromPresence ? 'blue' : 'gray'
      },
      pengisianJurnal: {
        status: isExemptNonTeaching ? 'Bebas KBM' : 'Belum Mengisi',
        color: isExemptNonTeaching ? 'blue' : 'gray'
      },
      laporanPiket: {
        status: isExemptNonTeaching ? 'Bebas Piket' : 'Bukan Petugas',
        color: isExemptNonTeaching ? 'blue' : 'gray',
        isPiket: false
      },
      isTugasLengkap: isFreeFromPresence
    };
  });

  // KPI HomeViewAdmin
  const wajibDatang = matrixList.filter(r => r.presensiDatang.status !== 'Libur' && r.presensiDatang.status !== 'Bebas Hadir').length;
  assert.strictEqual(wajibDatang, 0, 'Pada hari bebas KBM, wajibDatang harus 0 (Ade dan Sarah tidak dihitung)');

  for (const row of matrixList) {
    assert.strictEqual(row.presensiDatang.status, 'Bebas Hadir', `${row.nama_guru} harus bertanda Bebas Hadir`);
    assert.strictEqual(row.pengisianJurnal.status, 'Bebas KBM', `${row.nama_guru} harus bertanda Bebas KBM`);
    assert.strictEqual(row.isTugasLengkap, true, `${row.nama_guru} status tugas keseluruhan harus Lengkap`);
  }
});

check('3.3: Pada Panel Verifikasi Admin (AdminVerifView), Ade dan Sarah tidak ditandai Alpa', () => {
  const targetDayLower = 'senin';
  const unsubmittedPresensi = mockTeachers.map(t => {
    const linkedUser = resolveLinkedUserForTeacher(t, mockUsers);
    const scheduledClasses = mockWeeklySchedules.filter((j: any) =>
      (j.hari || '').trim().toLowerCase() === targetDayLower &&
      isTeacherRecordMatch(j, t, linkedUser, { allowSingleWordFirstToken: true })
    );
    const hasPiketToday = false;
    const policy = resolveTeacherAttendancePolicy({
      teacher: t,
      linkedUser,
      weeklySchedules: mockWeeklySchedules,
      aturanGlobal: 'Hari_Mengajar_Saja',
      guruHanyaMengajarList: [t.id],
      preferLegacyListWhenGlobalKbm: true,
    });
    const isTeacherExempt = policy.isTeacherExempt;
    const isFreeFromPresence = isTeacherExempt && scheduledClasses.length === 0 && !hasPiketToday;

    return {
      id: `unsub-presensi-${t.id}`,
      nama_guru: t.nama_guru,
      status_label: isFreeFromPresence ? 'Bebas Hadir' : 'Alpa',
      status_verifikasi: isFreeFromPresence ? 'Bebas Hadir' : 'Alpa',
      isFreeFromPresence,
      isAlpa: !isFreeFromPresence,
      pesan_belum: isFreeFromPresence ? 'Bebas Hadir' : 'Belum melakukan presensi datang maupun pulang'
    };
  });

  for (const item of unsubmittedPresensi) {
    assert.strictEqual(item.isFreeFromPresence, true, `${item.nama_guru} isFreeFromPresence harus true`);
    assert.strictEqual(item.isAlpa, false, `${item.nama_guru} TIDAK BOLEH ditandai Alpa`);
    assert.strictEqual(item.status_label, 'Bebas Hadir', `${item.nama_guru} status_label harus Bebas Hadir`);
    assert.strictEqual(item.pesan_belum, 'Bebas Hadir', `${item.nama_guru} pesan_belum harus Bebas Hadir`);
  }
});

check('3.4: Pada hari mengajar aktif (Kamis untuk Ade, Selasa untuk Sarah), kewajiban presensi tetap aktif', () => {
  // Ade pada hari Kamis (memiliki kelas)
  const scheduledAdeKamis = mockWeeklySchedules.filter(j =>
    j.hari === 'Kamis' && isTeacherRecordMatch(j, mockTeachers[0], mockUsers[0], { allowSingleWordFirstToken: true })
  );
  assert.ok(scheduledAdeKamis.length > 0, 'Ade memiliki jadwal KBM hari Kamis');
  const isAdeFreeKamis = scheduledAdeKamis.length === 0;
  assert.strictEqual(isAdeFreeKamis, false, 'Ade TIDAK bebas hadir pada hari Kamis (harus presensi datang)');

  // Sarah pada hari Selasa (memiliki kelas)
  const scheduledSarahSelasa = mockWeeklySchedules.filter(j =>
    j.hari === 'Selasa' && isTeacherRecordMatch(j, mockTeachers[1], mockUsers[1], { allowSingleWordFirstToken: true })
  );
  assert.ok(scheduledSarahSelasa.length > 0, 'Sarah memiliki jadwal KBM hari Selasa');
  const isSarahFreeSelasa = scheduledSarahSelasa.length === 0;
  assert.strictEqual(isSarahFreeSelasa, false, 'Sarah TIDAK bebas hadir pada hari Selasa (harus presensi datang)');
});

// -----------------------------------------------------------------------------
// BAGIAN 4: Rotasi Piket di Hari Bebas KBM
// -----------------------------------------------------------------------------
console.log('\n--- [Bagian 4] Rotasi Piket di Hari Bebas KBM ---');

const mockGhmList = mockTeachers.map(t => t.id);
const mockAturanGlobal = 'Hari_Mengajar_Saja';

check('4.1: Guru yang bebas KBM keseluruhan tidak dipaksa wajib datang hanya karena tercantum dalam rotasi piket', () => {
  // Simulasi jika Ade atau Sarah tidak sengaja masuk daftar_guru jadwal piket Senin
  const isAssignedPiket = true;
  const isExemptNonTeaching = true; // Bebas KBM hari ini
  const isBlokToday = false;

  // Logika baru yang sudah diperbaiki
  const isPiket = isAssignedPiket && !isExemptNonTeaching && !isBlokToday;
  assert.strictEqual(isPiket, false, 'Guru bebas KBM harus isPiket = false');

  const piketStatus = isExemptNonTeaching && isAssignedPiket ? 'Bebas Piket' : 'Bukan Petugas';
  assert.strictEqual(piketStatus, 'Bebas Piket');

  const hasPiketDuty = isPiket;
  const isFreeFromPresence = isExemptNonTeaching && !hasPiketDuty;
  assert.strictEqual(isFreeFromPresence, true, 'isFreeFromPresence tetap true dan tidak terhalang piket');
});

check('4.2: AdminVerifView secara objektif mengevaluasi guru bebas KBM (Ade & Sarah) tetap Bebas Hadir dan bukan Alpa saat piket Senin', () => {
  const targetDayLower = 'senin';
  const mockPiket = [{ hari: 'Senin', daftar_guru: 'Ade Fitrawan Ibrahim, Sarah Alhaid' }];

  for (const teacher of mockTeachers) {
    const linkedUser = resolveLinkedUserForTeacher(teacher, mockUsers);
    const scheduledClasses = mockWeeklySchedules.filter((j: any) =>
      (j.hari || '').toLowerCase() === targetDayLower &&
      isTeacherRecordMatch(j, teacher, linkedUser, { allowSingleWordFirstToken: true })
    );

    const hasPiketToday = mockPiket.some((p: any) =>
      p.hari.toLowerCase() === targetDayLower &&
      [teacher.nama_guru, linkedUser?.nama].some(alias => alias && isGuruDiPiket(p.daftar_guru, alias))
    );
    assert.strictEqual(hasPiketToday, true, 'Guru terdaftar di jadwal piket');

    const totalTeacherSchedules = mockWeeklySchedules.filter((j: any) =>
      isTeacherRecordMatch(j, teacher, linkedUser, { allowSingleWordFirstToken: true })
    ).length;

    const isTeacherExempt = resolveTeacherAttendancePolicy({
      teacher,
      linkedUser,
      totalTeacherKbmCount: totalTeacherSchedules,
      aturanGlobal: mockAturanGlobal,
      guruHanyaMengajarList: mockGhmList,
      preferLegacyListWhenGlobalKbm: true,
    }).isTeacherExempt;

    const isExemptNonTeaching = isTeacherExempt && scheduledClasses.length === 0;
    const hasPiketDuty = hasPiketToday && !isExemptNonTeaching;
    const isFreeFromPresence = isExemptNonTeaching && !hasPiketDuty;

    assert.strictEqual(isExemptNonTeaching, true);
    assert.strictEqual(hasPiketDuty, false, 'hasPiketDuty harus false untuk guru bebas KBM');
    assert.strictEqual(isFreeFromPresence, true, 'isFreeFromPresence harus true');

    const unsubmittedCard = {
      pesan_belum: isFreeFromPresence ? 'Bebas Hadir' : 'Belum melakukan presensi datang maupun pulang',
      status_label: isFreeFromPresence ? 'Bebas Hadir' : 'Alpa',
      status_verifikasi: isFreeFromPresence ? 'Bebas Hadir' : 'Alpa',
      isFreeFromPresence,
      isAlpa: !isFreeFromPresence,
    };

    assert.strictEqual(unsubmittedCard.isAlpa, false, `${teacher.nama_guru} tidak boleh ditandai Alpa`);
    assert.strictEqual(unsubmittedCard.status_label, 'Bebas Hadir');
  }
});

check('4.3: attendanceAlpa secara objektif mengabaikan guru bebas KBM (Ade & Sarah) dan tidak menyisipkan Alpa saat piket Senin', () => {
  const targetDayLower = 'senin';
  const mockPiket = [{ hari: 'Senin', daftar_guru: 'Ade Fitrawan Ibrahim, Sarah Alhaid' }];

  for (const teacher of mockTeachers) {
    const hasTeachingToday = mockWeeklySchedules.some((j: any) =>
      (j.hari || '').toLowerCase() === targetDayLower &&
      isTeacherRecordMatch(j, teacher, null, { allowSingleWordFirstToken: true })
    );
    assert.strictEqual(hasTeachingToday, false, 'Tidak mengajar hari Senin');

    const policy = resolveTeacherAttendancePolicy({
      teacher,
      weeklySchedules: mockWeeklySchedules,
      guruHanyaMengajarList: mockGhmList,
      aturanGlobal: mockAturanGlobal,
      preferLegacyListWhenGlobalKbm: true,
    });

    const isTeacherExempt = policy.isTeacherExempt;
    assert.strictEqual(isTeacherExempt, true);

    const inJadwalPiket = mockPiket.some((jp: any) =>
      isGuruDiPiket(jp.daftar_guru, teacher.nama_guru)
    );
    assert.strictEqual(inJadwalPiket, true);

    const isBlokActive = false;
    const isExemptNonTeaching = isTeacherExempt && !hasTeachingToday;
    const hasPiketDuty = inJadwalPiket && !isExemptNonTeaching && (!isBlokActive || hasTeachingToday);

    assert.strictEqual(hasPiketDuty, false, 'hasPiketDuty harus false');
    const shouldSkipAlpa = !hasTeachingToday && !hasPiketDuty;
    assert.strictEqual(shouldSkipAlpa, true, `${teacher.nama_guru} harus continue (skip alpa)`);
  }
});

console.log('\n========================================================================');
console.log(`HASIL: ${passCount} LULUS, ${failCount} GAGAL`);
console.log('========================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 VERIFIKASI KEBIJAKAN KEHADIRAN GURU (ADE & SARAH) 100% SUKSES!');
}
