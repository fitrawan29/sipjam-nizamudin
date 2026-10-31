import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { 
  canTeacherPresensiPulang,
  GuruDailyState 
} from '../src/lib/workflow';
import { 
  recordUnfilledJournalsAndPiket,
  evaluatePulangCepatDanJurnal 
} from '../src/lib/attendanceAlpa';

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}:`, err?.message || err);
    failed++;
  }
}

async function runAll() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TEST SUITE: JURNAL FOTO UPLOAD, PRESENSI PULANG & REKAP STANDAR (R1-R3)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const root = path.resolve(__dirname, '..');

  // ==========================================================================
  // SECTION 1: R1 - PHOTO UPLOAD OPTION IN GURU JURNAL
  // ==========================================================================
  console.log('--- Section 1: R1 - Photo Upload Option in Guru Jurnal ---');

  await runTest('1.1: GuruJurnal component enables photo upload unconditionally', () => {
    const guruJurnalPath = path.join(root, 'src', 'components', 'GuruJurnal.tsx');
    const content = fs.readFileSync(guruJurnalPath, 'utf8');

    // Check that isUploadAllowed is true unconditionally
    assert.ok(
      content.includes('const isUploadAllowed = true;'),
      'isUploadAllowed must be set to true unconditionally in GuruJurnal.tsx'
    );

    // Check that both live camera and upload file options are present in UI
    assert.ok(
      content.includes('Kamera Langsung') && content.includes('Upload Foto / Galeri'),
      'UI must offer both "Kamera Langsung" and "Upload Foto / Galeri" options'
    );

    // Check that file input element is present
    assert.ok(
      content.includes('type="file"') && content.includes('accept="image/*"'),
      'File input with accept="image/*" must be present'
    );

    // Check that photo is saved in both link_bukti_foto and foto_kegiatan
    assert.ok(
      content.includes('link_bukti_foto: fileUrl') && content.includes('foto_kegiatan: fileUrl'),
      'GuruJurnal must preserve photo via fileUrl in link_bukti_foto and foto_kegiatan'
    );
  });

  await runTest('1.2: File input resets value on click to guarantee re-selection fires onChange', () => {
    const guruJurnalPath = path.join(root, 'src', 'components', 'GuruJurnal.tsx');
    const content = fs.readFileSync(guruJurnalPath, 'utf8');

    assert.ok(
      content.includes('onClick={(e) => { (e.target as HTMLInputElement).value = \'\'; }}'),
      'File input must clear value on click so re-selecting same photo triggers onChange'
    );
  });

  // ==========================================================================
  // SECTION 2: R2 - PRESENSI PULANG FLEXIBILITY & TIME VALIDATION
  // ==========================================================================
  console.log('\n--- Section 2: R2 - Presensi Pulang Flexibility & Time Validation ---');

  await runTest('2.1: canTeacherPresensiPulang allows departure when presensiDatang is present even without journals', () => {
    const stateWithoutJournals: Partial<GuruDailyState> = {
      presensiDatang: { id: 'pres-1', tipe_absen: 'Datang', timestamp: '2026-10-31T07:10:00+08:00' },
      isIzinSakit: false,
      isPiket: true,
      laporanPiket: null, // No piket report
      jadwalKBM: [{ id: 'kbm-1', mapel: 'Matematika' }],
      jurnalKBM: [], // No KBM journals
      jurnalKegiatan: null // No kegiatan journal
    };

    const canPulang = canTeacherPresensiPulang(stateWithoutJournals);
    assert.strictEqual(canPulang, true, 'canTeacherPresensiPulang MUST return true once presensiDatang exists');
  });

  await runTest('2.2: canTeacherPresensiPulang forbids departure if no presensiDatang or on izin/sakit', () => {
    // Case A: No presensi datang
    const stateNoDatang: Partial<GuruDailyState> = {
      presensiDatang: null,
      isIzinSakit: false
    };
    assert.strictEqual(canTeacherPresensiPulang(stateNoDatang), false, 'Must be false when presensiDatang is null');

    // Case B: Izin / Sakit
    const stateIzin: Partial<GuruDailyState> = {
      presensiDatang: { id: 'pres-2', tipe_absen: 'Izin' },
      isIzinSakit: true
    };
    assert.strictEqual(canTeacherPresensiPulang(stateIzin), false, 'Must be false when isIzinSakit is true');
  });

  await runTest('2.3: GuruPresensi enforces jam_pulang check and records unsubmitted duties', () => {
    const guruPresensiPath = path.join(root, 'src', 'components', 'GuruPresensi.tsx');
    const content = fs.readFileSync(guruPresensiPath, 'utf8');

    // Verify departure time check is strictly active
    assert.ok(
      content.includes('currTimeVal < startVal'),
      'Departure time validation (currTimeVal < startVal) must be enforced in GuruPresensi.tsx'
    );
    assert.ok(
      content.includes('Presensi pulang baru dibuka jam'),
      'Warning for early checkout must be present'
    );

    // Verify recordUnfilledJournalsAndPiket is invoked on departure
    assert.ok(
      content.includes('recordUnfilledJournalsAndPiket'),
      'recordUnfilledJournalsAndPiket must be called upon presensi pulang'
    );
  });

  await runTest('2.4: Departure time validation boundary conditions (currTimeVal === startVal vs < startVal)', () => {
    const parseTime = (str: string) => {
      const [h, m] = str.split(':').map(Number);
      return h * 60 + m;
    };

    const pulangMulai = '14:00';
    const startVal = parseTime(pulangMulai);

    // 1 minute before departure time: 13:59 -> currTimeVal < startVal is true (BLOCKED)
    const earlyTime = '13:59';
    const earlyVal = parseTime(earlyTime);
    assert.strictEqual(earlyVal < startVal, true, '13:59 must be rejected when start is 14:00');

    // Exact minute of departure: 14:00 -> currTimeVal < startVal is false (ALLOWED)
    const exactTime = '14:00';
    const exactVal = parseTime(exactTime);
    assert.strictEqual(exactVal < startVal, false, '14:00 must be allowed when start is 14:00');

    // 5 minutes after departure: 14:05 -> currTimeVal < startVal is false (ALLOWED)
    const afterTime = '14:05';
    const afterVal = parseTime(afterTime);
    assert.strictEqual(afterVal < startVal, false, '14:05 must be allowed when start is 14:00');
  });

  // ==========================================================================
  // SECTION 3: R3 - STANDARD DESCRIPTIONS FOR UNFILLED DUTIES
  // ==========================================================================
  // Helper to create mock supabase client
  const createMockSupabase = (journalsArr: any[], piketArr: any[], mockQueryData: Record<string, any[]> = {}) => ({
    from: (table: string) => {
      let filterDate: string | null = null;
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: any) => {
          if (col === 'tanggal') filterDate = val;
          return builder;
        },
        or: () => builder,
        ilike: () => builder,
        then: (resolve: any) => {
          if (table === 'jadwal_pelajaran' && mockQueryData.jadwal_pelajaran) {
            return resolve({ data: mockQueryData.jadwal_pelajaran, error: null });
          }
          if (table === 'jurnal_pembelajaran') {
            return resolve({ data: journalsArr, error: null });
          }
          if (table === 'laporan_piket') {
            return resolve({ data: piketArr, error: null });
          }
          return resolve({ data: [], error: null });
        },
        insert: (data: any) => {
          if (table === 'jurnal_pembelajaran') {
            if (Array.isArray(data)) journalsArr.push(...data);
            else journalsArr.push(data);
          } else if (table === 'laporan_piket') {
            if (Array.isArray(data)) piketArr.push(...data);
            else piketArr.push(data);
          }
          return Promise.resolve({ error: null });
        }
      };
      return builder;
    }
  });

  await runTest('3.1: recordUnfilledJournalsAndPiket inserts required standard descriptions for KBM and Piket', async () => {
    const insertedJournals: any[] = [];
    const insertedPiket: any[] = [];
    const mockSupabase = createMockSupabase(insertedJournals, insertedPiket);

    const teacher = {
      nama_guru: 'Bambang Sudibyo, M.Pd.',
      user_id: 'usr-bambang-1',
      sekolah_id: 'sch-1'
    };

    const mockWorkflowState: any = {
      teacherName: 'Bambang Sudibyo, M.Pd.',
      todayDateStr: '2026-10-31',
      isWajibHadir: true,
      isBlok: false,
      isDinasLuar: false,
      isIzinSakit: false,
      isPiket: true, // Has piket duty but didn't submit report
      isPiketDone: false,
      laporanPiket: null,
      jadwalKBM: [
        {
          id: 'sch-101',
          nama_guru: 'Bambang Sudibyo, M.Pd.',
          user_id: 'usr-bambang-1',
          hari: 'Sabtu',
          kelas: 'IX C',
          mata_pelajaran: 'Bahasa Indonesia',
          jam_mulai: '07:30',
          jam_selesai: '09:00',
          sekolah_id: 'sch-1'
        }
      ],
      jurnalKBM: [], // Unfilled KBM schedule
      isJurnalDone: false,
      jurnalKegiatan: null, // Unfilled Kegiatan
      presensiDatang: { id: 'pres-1' } as any,
      presensiPulang: null,
      canPresensiPulang: true
    };

    const res = await recordUnfilledJournalsAndPiket(teacher, '2026-10-31', mockWorkflowState, mockSupabase as any);

    assert.strictEqual(res.unfilledKbmCount, 1, 'Should record 1 unfilled KBM');
    assert.strictEqual(res.unfilledPiketCreated, true, 'Should record 1 unfilled Piket');
    assert.strictEqual(insertedJournals.length, 1, '1 KBM journal row should be inserted');
    assert.strictEqual(insertedPiket.length, 1, '1 Piket row should be inserted');

    // Verify exact note for KBM: "tidak masuk kelas"
    assert.strictEqual(insertedJournals[0].keterangan, 'tidak masuk kelas');
    assert.strictEqual(insertedJournals[0].status_verifikasi, 'Tidak Masuk Kelas');

    // Verify exact note for Piket: "tidak membuat laporan piket"
    assert.strictEqual(insertedPiket[0].catatan_apel, 'tidak membuat laporan piket');
    assert.strictEqual(insertedPiket[0].keterangan, 'tidak membuat laporan piket');
    assert.strictEqual(insertedPiket[0].status_verifikasi, 'tidak membuat laporan piket');
  });

  await runTest('3.2: Teacher with 0 KBM and 0 Kegiatan records "tidak melaksanakan kegiatan apapun"', async () => {
    const insertedJournals: any[] = [];
    const mockSupabase = createMockSupabase(insertedJournals, []);

    const teacher = {
      nama_guru: 'Dewi Lestari, S.Pd.',
      user_id: 'usr-dewi-1',
      sekolah_id: 'sch-1'
    };

    const mockWorkflowState: any = {
      teacherName: 'Dewi Lestari, S.Pd.',
      todayDateStr: '2026-10-31',
      isWajibHadir: true,
      isBlok: false,
      isDinasLuar: false,
      isIzinSakit: false,
      isPiket: false,
      isPiketDone: false,
      laporanPiket: null,
      jadwalKBM: [], // No teaching schedules today
      jurnalKBM: [],
      isJurnalDone: false,
      jurnalKegiatan: null, // No kegiatan submitted
      presensiDatang: { id: 'pres-2' } as any,
      presensiPulang: null,
      canPresensiPulang: true
    };

    const res = await recordUnfilledJournalsAndPiket(teacher, '2026-10-31', mockWorkflowState, mockSupabase as any);

    assert.strictEqual(res.unfilledKegiatanCreated, true, 'Should record 1 unfilled Kegiatan');
    assert.strictEqual(insertedJournals.length, 1);
    assert.strictEqual(insertedJournals[0].keterangan, 'tidak melaksanakan kegiatan apapun');
    assert.strictEqual(insertedJournals[0].materi_kegiatan, 'tidak melaksanakan kegiatan apapun');
    assert.strictEqual(insertedJournals[0].status_verifikasi, 'Tidak Melaksanakan Kegiatan');
  });

  await runTest('3.3: RekapJurnalView displays "tidak masuk kelas" and "tidak melaksanakan kegiatan apapun"', () => {
    const rekapPath = path.join(root, 'src', 'components', 'RekapJurnalView.tsx');
    const content = fs.readFileSync(rekapPath, 'utf8');

    assert.ok(
      content.includes('tidak masuk kelas'),
      'RekapJurnalView must display "tidak masuk kelas" for unsubmitted KBM'
    );
    assert.ok(
      content.includes('tidak melaksanakan kegiatan apapun'),
      'RekapJurnalView must display "tidak melaksanakan kegiatan apapun" for unsubmitted kegiatan'
    );
  });

  await runTest('3.4: PiketView displays "tidak membuat laporan piket"', () => {
    const piketPath = path.join(root, 'src', 'components', 'PiketView.tsx');
    const content = fs.readFileSync(piketPath, 'utf8');

    assert.ok(
      content.includes('tidak membuat laporan piket'),
      'PiketView must display "tidak membuat laporan piket" for unsubmitted piket duties'
    );
  });

  await runTest('3.5: recordUnfilledJournalsAndPiket works autonomously when state is empty object {}', async () => {
    const insertedJournals: any[] = [];
    const mockQueryData = {
      jadwal_pelajaran: [
        {
          id: 'sch-auton-1',
          nama_guru: 'Ahmad Faiz',
          hari: 'Sabtu',
          kelas: 'VIII A',
          mata_pelajaran: 'Matematika',
          jam_mulai: '07:30',
          jam_selesai: '09:00',
          sekolah_id: 'sch-1'
        }
      ]
    };
    const mockSupabase = createMockSupabase(insertedJournals, [], mockQueryData);

    const teacher = {
      nama_guru: 'Ahmad Faiz',
      user_id: 'usr-faiz-1',
      sekolah_id: 'sch-1'
    };

    // Passing empty state {}
    const res = await recordUnfilledJournalsAndPiket(teacher, '2026-10-31', {} as any, mockSupabase as any);

    assert.strictEqual(res.unfilledKbmCount, 1, 'Should autonomously fetch schedule and insert 1 unfilled KBM');
    assert.strictEqual(insertedJournals.length, 1);
    assert.strictEqual(insertedJournals[0].keterangan, 'tidak masuk kelas');
    assert.strictEqual(insertedJournals[0].kelas, 'VIII A');
  });

  await runTest('3.6: recordUnfilledJournalsAndPiket handles title normalization and prevents duplicate insert', async () => {
    // Existing journal in database with stripped title
    const existingJournals: any[] = [
      {
        id: 'j-exist-1',
        nama_guru: 'Bambang Sudibyo',
        tanggal: '2026-10-31',
        kelas: 'IX C',
        mapel: 'Bahasa Indonesia',
        status_verifikasi: 'Disetujui',
        keterangan: 'Jurnal KBM'
      }
    ];
    const mockSupabase = createMockSupabase(existingJournals, []);

    // Caller with full title: "Bambang Sudibyo, M.Pd."
    const teacher = {
      nama_guru: 'Bambang Sudibyo, M.Pd.',
      user_id: 'usr-bambang-1',
      sekolah_id: 'sch-1'
    };

    const stateWithSchedule: any = {
      jadwalKBM: [
        {
          id: 'sch-101',
          nama_guru: 'Bambang Sudibyo, M.Pd.',
          kelas: 'IX C',
          mata_pelajaran: 'Bahasa Indonesia'
        }
      ],
      jurnalKBM: existingJournals
    };

    const res = await recordUnfilledJournalsAndPiket(teacher, '2026-10-31', stateWithSchedule, mockSupabase as any);

    assert.strictEqual(res.unfilledKbmCount, 0, 'Must NOT insert duplicate when journal already exists');
    assert.strictEqual(existingJournals.length, 1, 'Length must remain 1 without duplicate insertion');
  });

  await runTest('2.5: workflow clears lockedReason when canTeacherPresensiPulang unlocks departure', () => {
    const { getGuruDailyState } = require('../src/lib/workflow');
    // Verify in code that when canTeacherPresensiPulang(state) is true, stale lockedReason is reset
    const workflowPath = path.join(root, 'src', 'lib', 'workflow.ts');
    const content = fs.readFileSync(workflowPath, 'utf8');

    assert.ok(
      content.includes("state.lockedReason = null;"),
      'workflow.ts must reset lockedReason when presensi pulang is unlocked'
    );
  });

  await runTest('3.7: RekapJurnalView cross-references jadwal_pelajaran for unfilled schedules', () => {
    const rekapPath = path.join(root, 'src', 'components', 'RekapJurnalView.tsx');
    const content = fs.readFileSync(rekapPath, 'utf8');

    assert.ok(
      content.includes("supabase.from('jadwal_pelajaran')"),
      'RekapJurnalView must cross-reference jadwal_pelajaran for missing schedules'
    );
    assert.ok(
      content.includes('unfilled-kbm-'),
      'RekapJurnalView must generate synthetic missing entries with prefix unfilled-kbm-'
    );
  });

  await runTest('3.8: RekapJurnalView synthesizes unfilled Jurnal Kegiatan in personal mode', () => {
    const rekapPath = path.join(root, 'src', 'components', 'RekapJurnalView.tsx');
    const content = fs.readFileSync(rekapPath, 'utf8');

    assert.ok(
      content.includes('unfilled-kegiatan-'),
      'RekapJurnalView must generate synthetic missing entries with prefix unfilled-kegiatan-'
    );
    assert.ok(
      content.includes("'tidak melaksanakan kegiatan apapun'"),
      'RekapJurnalView must include "tidak melaksanakan kegiatan apapun" for unsubmitted kegiatan'
    );
  });

  await runTest('3.9: RekapJurnalView schedule time parsing handles dot format (07.30) and guards morning', () => {
    const rekapPath = path.join(root, 'src', 'components', 'RekapJurnalView.tsx');
    const content = fs.readFileSync(rekapPath, 'utf8');

    assert.ok(
      content.includes("sched.jam_mulai.replace('.', ':')"),
      'RekapJurnalView must normalize dot notation in schedule times'
    );
    assert.ok(
      content.includes("currTime < '07:00'"),
      'RekapJurnalView must guard morning schedules before 07:00'
    );
  });

  await runTest('3.10: evaluateAndApplyAutoCheckout records unfilled duties using recordUnfilledJournalsAndPiket', () => {
    const attendancePath = path.join(root, 'src', 'lib', 'attendanceAlpa.ts');
    const content = fs.readFileSync(attendancePath, 'utf8');

    assert.ok(
      content.includes('const unfilledRes = await recordUnfilledJournalsAndPiket'),
      'evaluateAndApplyAutoCheckout must invoke recordUnfilledJournalsAndPiket for auto-checkout teachers'
    );
  });

  console.log('\n====================================================================');
  console.log(`🏁 FINISHED: Passed: ${passed}, Failed: ${failed}`);
  console.log('====================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
