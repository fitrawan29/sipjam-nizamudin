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

  // ==========================================================================
  // SECTION 3: R3 - STANDARD DESCRIPTIONS FOR UNFILLED DUTIES
  // ==========================================================================
  // Helper to create mock supabase client
  const createMockSupabase = (journalsArr: any[], piketArr: any[]) => ({
    from: (table: string) => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        or: () => builder,
        ilike: () => builder,
        then: (resolve: any) => resolve({ data: [], error: null }),
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
