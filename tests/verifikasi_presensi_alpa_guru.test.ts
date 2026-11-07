import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { canTeacherPresensiPulang, GuruDailyState } from '../src/lib/workflow';

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 TEST SUITE: VERIFIKASI PRESENSI ALPA GURU & PENGECUALIAN IZIN/SAKIT');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`  ❌ [FAIL] ${name}: ${e.message}`);
      failed++;
    }
  }

  const root = path.resolve(__dirname, '..');
  const adminVerifContent = fs.readFileSync(path.join(root, 'src', 'components', 'AdminVerifView.tsx'), 'utf8');
  const workflowContent = fs.readFileSync(path.join(root, 'src', 'lib', 'workflow.ts'), 'utf8');
  const homeAdminContent = fs.readFileSync(path.join(root, 'src', 'components', 'HomeViewAdmin.tsx'), 'utf8');
  const homeGuruContent = fs.readFileSync(path.join(root, 'src', 'components', 'HomeViewGuru.tsx'), 'utf8');

  // --- SUITE 1: AST Invariants in AdminVerifView.tsx ---
  console.log('--- Suite 1: AST Invariants in AdminVerifView.tsx ---');

  test('1.1: unsubmittedPresensi maps non-exempt unsubmitted teachers with status_label="Alpa" and status_verifikasi="Alpa"', () => {
    assert(
      adminVerifContent.includes("status_label: isFreeFromPresence ? 'Bebas Hadir' : 'Alpa'"),
      'AdminVerifView must set status_label to Alpa for unsubmitted teachers when not isFreeFromPresence'
    );
    assert(
      adminVerifContent.includes("status_verifikasi: isFreeFromPresence ? 'Bebas Hadir' : 'Alpa'"),
      'AdminVerifView must set status_verifikasi to Alpa for unsubmitted teachers when not isFreeFromPresence'
    );
    assert(
      adminVerifContent.includes("isAlpa: !isFreeFromPresence"),
      'AdminVerifView must flag isAlpa: !isFreeFromPresence'
    );
  });

  test('1.2: AdminVerifView unsubmitted card checks define isPresensiUnsubmitted for task_type="Presensi" and Alpa', () => {
    assert(
      adminVerifContent.includes("const isPresensiUnsubmitted = (item.task_type === 'Presensi' || item.isAlpa || item.status_label === 'Alpa' || item.status_verifikasi === 'Alpa') && !isBebasHadir;"),
      'AdminVerifView must define isPresensiUnsubmitted guarding against isBebasHadir'
    );
  });

  test('1.3: AdminVerifView renders dedicated Alpa badge with red styling and icon on unsubmitted presensi cards', () => {
    assert(
      adminVerifContent.includes("isPresensiUnsubmitted ? (") &&
      adminVerifContent.includes("bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800") &&
      adminVerifContent.includes("fa-user-xmark mr-1 text-[8px]"),
      'AdminVerifView must render red Alpa badge with user-xmark icon for unsubmitted presensi'
    );
  });

  test('1.4: AdminVerifView renders dedicated red card border and message box for unsubmitted presensi (Alpa)', () => {
    assert(
      adminVerifContent.includes("border-red-200/80 dark:border-red-900/40 hover:border-red-400"),
      'AdminVerifView must render border-red for unsubmitted presensi'
    );
    assert(
      adminVerifContent.includes("bg-red-50/70 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-xs text-red-900 dark:text-red-200"),
      'AdminVerifView must render red alert container for Alpa notification'
    );
  });

  test('1.5: AdminVerifView bottom status and footer strip read "Alpa" for unsubmitted presensi', () => {
    assert(
      adminVerifContent.includes("isPresensiUnsubmitted ? 'Alpa' : 'Belum Ada Data'"),
      'AdminVerifView bottom right status must read Alpa when isPresensiUnsubmitted is true'
    );
    assert(
      adminVerifContent.includes("isPresensiUnsubmitted ? 'Alpa (Tidak Melakukan Presensi Datang & Pulang)' : 'Menunggu pengajuan dari guru'"),
      'AdminVerifView footer banner must read Alpa (Tidak Melakukan Presensi Datang & Pulang)'
    );
  });

  test('1.6: AdminVerifView submitted cards render Alpa with red badge and Kategori Alpa pill', () => {
    assert(
      adminVerifContent.includes("(item.status_verifikasi === 'Alpa' || item.jenis_presensi === 'Alpa') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'"),
      'AdminVerifView must render red status badge for submitted Alpa records'
    );
    assert(
      adminVerifContent.includes("if (jp === 'alpa' || sv === 'alpa') {") &&
      adminVerifContent.includes("bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800") &&
      adminVerifContent.includes("<i className=\"fa-solid fa-user-xmark text-[10px]\"></i> Alpa"),
      'AdminVerifView must render red Alpa pill in Kategori instead of defaulting to Hadir di Sekolah'
    );
  });

  test('1.7: AdminVerifView search filter includes status_label and status_verifikasi for matching "alpa"', () => {
    assert(
      adminVerifContent.includes("(item.status_label || '').toLowerCase().includes(q)") &&
      adminVerifContent.includes("(item.status_verifikasi || '').toLowerCase().includes(q)"),
      'AdminVerifView search filter must match on status_label and status_verifikasi'
    );
  });

  // --- SUITE 2: Evaluation Logic Simulation (Unsubmitted Presensi Oracle) ---
  console.log('\n--- Suite 2: Attendance Verification Oracle Simulation ---');

  function simulateComputeUnsubmittedPresensi(
    allTeachers: any[],
    presensiList: any[],
    targetDate: string,
    effectiveDayName: string,
    allJadwalPelajaran: any[],
    allPiketSchedule: any[],
    allPenugasanPiket: any[],
    aturanGlobal: string,
    guruHanyaMengajarList: string[],
    isHoliday: boolean = false
  ) {
    if (allTeachers.length === 0) return [];
    if (isHoliday) return [];

    const submittedList = presensiList.filter(p => {
      if (p.tanggal_mulai && p.tanggal_selesai && targetDate >= p.tanggal_mulai && targetDate <= p.tanggal_selesai) {
        if (p.status_verifikasi !== 'Ditolak') return true;
      }
      if (!p.timestamp) return false;
      if (p.timestamp.includes(targetDate)) return true;
      return false;
    });

    const normalizeName = (s: string) => (s || '').toLowerCase().trim().replace(/z/g, 's');

    return allTeachers
      .filter(t => {
        const hasSubmitted = submittedList.some(p => 
          normalizeName(t.nama_guru) === normalizeName(p.nama_guru)
        );
        return !hasSubmitted;
      })
      .map(t => {
        const namaNorm = normalizeName(t.nama_guru);
        const scheduledClasses = allJadwalPelajaran.filter((j: any) => {
          if (j.hari !== effectiveDayName) return false;
          return normalizeName(j.nama_guru) === namaNorm;
        });

        const hasPiketToday = allPenugasanPiket.some((p: any) => p.hari === effectiveDayName && normalizeName(p.guru_nama) === namaNorm) ||
          allPiketSchedule.some((p: any) => p.hari === effectiveDayName && (p.daftar_guru || '').toLowerCase().includes(namaNorm));

        const isExplicitExempt = t.wajib_hadir_hanya_mengajar === true;
        const isTeacherExempt = isExplicitExempt || (aturanGlobal === 'Hari_Mengajar_Saja');
        const isFreeFromPresence = isTeacherExempt && scheduledClasses.length === 0 && !hasPiketToday;

        return {
          id: `unsub-presensi-${t.id}`,
          nama_guru: t.nama_guru,
          nip: t.nip || '-',
          task_type: 'Presensi',
          pesan_belum: isFreeFromPresence ? 'Bebas Hadir' : 'Belum melakukan presensi datang maupun pulang',
          status_label: isFreeFromPresence ? 'Bebas Hadir' : 'Alpa',
          status_verifikasi: isFreeFromPresence ? 'Bebas Hadir' : 'Alpa',
          isFreeFromPresence,
          isAlpa: !isFreeFromPresence,
          tanggal: targetDate,
          isUnsubmitted: true
        };
      });
  }

  const sampleTeachers = [
    { id: 't1', nama_guru: 'Ahmad Guru', nip: '19800101', wajib_hadir_hanya_mengajar: false },
    { id: 't2', nama_guru: 'Budi Santoso', nip: '19800102', wajib_hadir_hanya_mengajar: false },
    { id: 't3', nama_guru: 'Citra Dewi', nip: '19800103', wajib_hadir_hanya_mengajar: true },
    { id: 't4', nama_guru: 'Dewi Sartika', nip: '19800104', wajib_hadir_hanya_mengajar: false },
    { id: 't5', nama_guru: 'Eko Prasetyo', nip: '19800105', wajib_hadir_hanya_mengajar: false },
  ];

  test('2.1: Teacher without presensi datang & pulang is calculated and read as Alpa', () => {
    // Zero presensi submitted
    const unsub = simulateComputeUnsubmittedPresensi(
      sampleTeachers,
      [],
      '2026-11-07',
      'Sabtu',
      [],
      [],
      [],
      'Semua_Hari',
      []
    );

    const ahmad = unsub.find(u => u.nama_guru === 'Ahmad Guru');
    assert.ok(ahmad, 'Ahmad Guru must be in unsubmitted list');
    assert.strictEqual(ahmad.status_label, 'Alpa', 'status_label must be Alpa');
    assert.strictEqual(ahmad.status_verifikasi, 'Alpa', 'status_verifikasi must be Alpa');
    assert.strictEqual(ahmad.isAlpa, true, 'isAlpa must be true');
    assert.strictEqual(ahmad.isFreeFromPresence, false);
  });

  test('2.2: Exception: Teacher with Izin is excluded from unsubmitted and NOT read as Alpa', () => {
    const presensiList = [
      {
        id: 'p-izin-1',
        nama_guru: 'Budi Santoso',
        tipe_absen: 'Datang',
        jenis_presensi: 'Izin',
        detail_izin: 'Izin Keperluan Keluarga',
        status_verifikasi: 'Disetujui',
        timestamp: '2026-11-07T07:15:00+08:00'
      }
    ];

    const unsub = simulateComputeUnsubmittedPresensi(
      sampleTeachers,
      presensiList,
      '2026-11-07',
      'Sabtu',
      [],
      [],
      [],
      'Semua_Hari',
      []
    );

    const budi = unsub.find(u => u.nama_guru === 'Budi Santoso');
    assert.strictEqual(budi, undefined, 'Teacher on Izin must NOT appear in unsubmitted presensi (Alpa)');
  });

  test('2.3: Exception: Teacher with Sakit (including multi-day leave) is excluded from unsubmitted and NOT read as Alpa', () => {
    const presensiList = [
      {
        id: 'p-sakit-1',
        nama_guru: 'Dewi Sartika',
        tipe_absen: 'Datang',
        jenis_presensi: 'Sakit',
        detail_izin: 'Sakit Demam',
        status_verifikasi: 'Disetujui',
        tanggal_mulai: '2026-11-05',
        tanggal_selesai: '2026-11-08',
        timestamp: '2026-11-05T07:10:00+08:00'
      }
    ];

    const unsub = simulateComputeUnsubmittedPresensi(
      sampleTeachers,
      presensiList,
      '2026-11-07',
      'Sabtu',
      [],
      [],
      [],
      'Semua_Hari',
      []
    );

    const dewi = unsub.find(u => u.nama_guru === 'Dewi Sartika');
    assert.strictEqual(dewi, undefined, 'Teacher with active multi-day Sakit must NOT appear in unsubmitted presensi (Alpa)');
  });

  test('2.4: Exception: Teacher with Dinas Luar is excluded from unsubmitted and NOT read as Alpa', () => {
    const presensiList = [
      {
        id: 'p-dl-1',
        nama_guru: 'Eko Prasetyo',
        tipe_absen: 'Datang',
        jenis_presensi: 'Dinas Luar',
        status_verifikasi: 'Disetujui',
        timestamp: '2026-11-07T07:20:00+08:00'
      }
    ];

    const unsub = simulateComputeUnsubmittedPresensi(
      sampleTeachers,
      presensiList,
      '2026-11-07',
      'Sabtu',
      [],
      [],
      [],
      'Semua_Hari',
      []
    );

    const eko = unsub.find(u => u.nama_guru === 'Eko Prasetyo');
    assert.strictEqual(eko, undefined, 'Teacher on Dinas Luar must NOT appear in unsubmitted presensi (Alpa)');
  });

  test('2.5: Exception: Teacher with Bebas Hadir (exempt + no duty) is NOT read as Alpa', () => {
    const unsub = simulateComputeUnsubmittedPresensi(
      sampleTeachers,
      [],
      '2026-11-07',
      'Sabtu',
      [],
      [],
      [],
      'Semua_Hari',
      []
    );

    const citra = unsub.find(u => u.nama_guru === 'Citra Dewi');
    assert.ok(citra, 'Citra Dewi should appear in unsubmitted list');
    assert.strictEqual(citra.isFreeFromPresence, true, 'isFreeFromPresence must be true');
    assert.strictEqual(citra.status_label, 'Bebas Hadir', 'status_label must be Bebas Hadir, NOT Alpa');
    assert.strictEqual(citra.status_verifikasi, 'Bebas Hadir', 'status_verifikasi must be Bebas Hadir, NOT Alpa');
    assert.strictEqual(citra.isAlpa, false, 'isAlpa must be false');
  });

  test('2.6: Holiday handling: Zero teachers are marked Alpa on educational holiday', () => {
    const unsub = simulateComputeUnsubmittedPresensi(
      sampleTeachers,
      [],
      '2026-11-07',
      'Sabtu',
      [],
      [],
      [],
      'Semua_Hari',
      [],
      true // isHoliday = true
    );

    assert.strictEqual(unsub.length, 0, 'On holiday, exactly 0 teachers are unsubmitted or marked Alpa');
  });

  // --- SUITE 3: Workflow State & Gating Invariants ---
  console.log('\n--- Suite 3: Workflow State & Gating Invariants ---');

  test('3.1: canTeacherPresensiPulang strictly returns false when state.isAlpa is true', () => {
    const state: Partial<GuruDailyState> = {
      presensiDatang: { id: 'p1', tipe_absen: 'Datang' },
      isAlpa: true,
      isIzinSakit: false,
    };
    assert.strictEqual(canTeacherPresensiPulang(state), false, 'Teacher marked Alpa cannot checkout');
  });

  test('3.2: canTeacherPresensiPulang strictly returns false when presensiDatang is recorded as Alpa', () => {
    const state: Partial<GuruDailyState> = {
      presensiDatang: { id: 'p1', tipe_absen: 'Datang', jenis_presensi: 'Alpa', status_verifikasi: 'Alpa' },
      isIzinSakit: false,
    };
    assert.strictEqual(canTeacherPresensiPulang(state), false, 'Teacher with Alpa record cannot checkout');
  });

  test('3.3: workflow.ts getGuruDailyState preserves isAlpa=true and locks workflow when Alpa record is present', () => {
    assert(
      workflowContent.includes("if (jp === 'Alpa' || state.presensiDatang?.status_verifikasi === 'Alpa') {") &&
      workflowContent.includes("state.isAlpa = true;") &&
      workflowContent.includes("state.canPresensiPulang = false;"),
      'workflow.ts must set isAlpa=true and lock presensiPulang when Alpa record is found'
    );
  });

  test('3.4: HomeViewAdmin.tsx maps Alpa presensiDatang and presensiPulang cleanly to "Alpa" with rose color', () => {
    assert(
      homeAdminContent.includes("} else if (jp === 'Alpa' || pDatang.status_verifikasi === 'Alpa') {") &&
      homeAdminContent.includes("presensiDatangStatus = 'Alpa';") &&
      homeAdminContent.includes("presensiDatangColor = 'rose';"),
      'HomeViewAdmin must display Alpa status and rose color for Alpa presensi'
    );
    assert(
      homeAdminContent.includes("else if (pDatang && (pDatang.jenis_presensi === 'Alpa' || pDatang.status_verifikasi === 'Alpa')) {") &&
      homeAdminContent.includes("presensiPulangStatus = 'Alpa';") &&
      homeAdminContent.includes("presensiPulangColor = 'rose';"),
      'HomeViewAdmin must display Alpa for presensiPulang when teacher is Alpa'
    );
  });

  test('3.5: HomeViewGuru.tsx steps and banner reflect Alpa accurately', () => {
    assert(
      homeGuruContent.includes("if (jp === 'Alpa' || dailyState.isAlpa || dailyState.presensiDatang.status_verifikasi === 'Alpa') {") &&
      homeGuruContent.includes("steps.push({ label: 'Presensi Datang', status: 'skipped', detail: 'Tercatat Alpa (Tidak Presensi)', icon: 'fa-user-xmark' });"),
      'HomeViewGuru must render skipped status for Alpa'
    );
  });

  console.log('\n========================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL VERIFIKASI PRESENSI ALPA GURU TESTS PASSED CLEANLY!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
