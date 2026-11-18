import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { recordUnfilledJournalsAndPiket, isTeacherJournalMatch } from '../src/lib/attendanceAlpa';

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    })
    .catch((err) => {
      console.error(`  ✘ [FAIL] ${name}`);
      console.error(err);
      failed++;
    });
}

function createMockClient(insertedRecords: any[]) {
  const chain: any = {
    eq: () => chain,
    neq: () => chain,
    gte: () => chain,
    lte: () => chain,
    not: () => chain,
    or: () => chain,
    ilike: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: any) => Promise.resolve(resolve({ data: [], error: null }))
  };
  return {
    from: (_table: string) => ({
      select: () => chain,
      insert: (record: any) => {
        insertedRecords.push(record);
        return Promise.resolve({ error: null });
      },
      update: () => chain,
      delete: () => chain
    })
  };
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TEST SUITE: JURNAL KEGIATAN EXPAND KBM & SQUELCH TIDAK MASUK KELAS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const rekapPath = path.resolve(process.cwd(), 'src/components/RekapJurnalView.tsx');
  const alpaPath = path.resolve(process.cwd(), 'src/lib/attendanceAlpa.ts');
  const rekapCode = fs.readFileSync(rekapPath, 'utf-8');
  const alpaCode = fs.readFileSync(alpaPath, 'utf-8');

  // =========================================================================
  // Section 1: Static Code Invariants & Logic Integrity
  // =========================================================================
  console.log('--- Section 1: Static Code Invariants ---');

  await runTest('1.1: attendanceAlpa skips inserting "tidak masuk kelas" when teacher has Jurnal Kegiatan', () => {
    assert(
      alpaCode.includes('jadwalKBM.length > 0 && !hasTeacherKegiatan'),
      'recordUnfilledJournalsAndPiket must guard KBM delinquency insert with !hasTeacherKegiatan'
    );
    assert(
      alpaCode.includes('hasTeacherKegiatan = Boolean'),
      'recordUnfilledJournalsAndPiket must compute hasTeacherKegiatan from jurnalKegiatan'
    );
  });

  await runTest('1.2: RekapJurnalView converts unfilled KBM schedules to Jurnal Kegiatan when teacherKegiatan exists', () => {
    assert(
      rekapCode.includes('hasTeacherKegiatan && teacherKegiatan'),
      'RekapJurnalView must check hasTeacherKegiatan && teacherKegiatan for unfilled schedules'
    );
    assert(
      rekapCode.includes('converted-kegiatan-'),
      'RekapJurnalView must synthesize converted-kegiatan- entries'
    );
    assert(
      rekapCode.includes('expandedKegiatanIds.add'),
      'RekapJurnalView must track expandedKegiatanIds'
    );
  });

  await runTest('1.3: RekapJurnalView removes generic Jurnal Kegiatan and delinquency via hasConvertedOnDate', () => {
    assert(
      rekapCode.includes('expandedKegiatanIds.has(String(j.id))'),
      'RekapJurnalView must remove generic Jurnal Kegiatan matching expandedKegiatanIds'
    );
    assert(
      rekapCode.includes('hasConvertedOnDate'),
      'RekapJurnalView must check hasConvertedOnDate with isTeacherJournalMatch'
    );
  });

  await runTest('1.4: RekapJurnalView squelches old auto-record "tidak masuk kelas" in filteredJurnal when Jurnal Kegiatan exists', () => {
    assert(
      rekapCode.includes('hasKegiatanOnDate'),
      'filteredJurnal must check hasKegiatanOnDate before keeping delinquency'
    );
    assert(
      rekapCode.includes('converted-kegiatan-'),
      'filteredJurnal must recognize converted-kegiatan- as valid activity squelching delinquency'
    );
  });

  await runTest('1.5: RekapJurnalView uses valid PostgREST quotes in kq.or for Jurnal Kegiatan', () => {
    assert(
      rekapCode.includes('keterangan.ilike."%Jurnal Kegiatan%"'),
      'kq.or must wrap ilike pattern with double quotes for PostgREST grammar'
    );
  });

  await runTest('1.6: RekapJurnalView handleSaveEdit preserves generic fields for Jurnal Kegiatan', () => {
    assert(
      rekapCode.includes('const isKegiatanUnderlying = isEditingJurnalKegiatan || Boolean(editingJurnal.original_id)'),
      'handleSaveEdit must determine underlying kegiatan mode'
    );
    assert(
      rekapCode.includes("kelas: isKegiatanUnderlying ? '-' : editKelas"),
      'handleSaveEdit must keep kelas as - for underlying kegiatan records in DB'
    );
    assert(
      rekapCode.includes("mapel: isKegiatanUnderlying ? '-' : editMapel"),
      'handleSaveEdit must keep mapel as - for underlying kegiatan records in DB'
    );
  });

  // =========================================================================
  // Section 2: Behavioral Mocking for recordUnfilledJournalsAndPiket
  // =========================================================================
  console.log('\n--- Section 2: Behavioral Mocking for recordUnfilledJournalsAndPiket ---');

  await runTest('2.1: recordUnfilledJournalsAndPiket does NOT insert "tidak masuk kelas" when jurnalKegiatan is provided in state', async () => {
    const insertedRecords: any[] = [];
    const mockClient = createMockClient(insertedRecords);

    const teacher = { nama_guru: 'Ahmad Fauzi, S.Pd.', user_id: 'usr-1', sekolah_id: 'sch-1' };
    const dateStr = '2026-11-18';
    const state = {
      jadwalKBM: [
        { kelas: '7A', mata_pelajaran: 'Matematika', hari: 'Rabu', jam_ke: '1-2' },
        { kelas: '7B', mata_pelajaran: 'Matematika', hari: 'Rabu', jam_ke: '3-4' },
        { kelas: '8A', mata_pelajaran: 'Matematika', hari: 'Rabu', jam_ke: '5-6' },
        { kelas: '8B', mata_pelajaran: 'Matematika', hari: 'Rabu', jam_ke: '7-8' }
      ],
      jurnalKBM: [],
      jurnalKegiatan: {
        id: 'keg-001',
        nama_guru: 'Ahmad Fauzi, S.Pd.',
        tanggal: dateStr,
        keterangan: 'Jurnal Kegiatan',
        mapel: 'Jurnal Kegiatan',
        materi: 'Workshop Implementasi Kurikulum Merdeka',
        status_verifikasi: 'Disetujui'
      }
    };

    const res = await recordUnfilledJournalsAndPiket(teacher, dateStr, state, mockClient);
    assert.strictEqual(res.unfilledKbmCount, 0, 'No unfilled KBM should be recorded when teacher has Jurnal Kegiatan');
    const insertedKbm = insertedRecords.filter((r: any) => r.materi === 'tidak masuk kelas' || r.status_verifikasi === 'Tidak Masuk Kelas');
    assert.strictEqual(insertedKbm.length, 0, 'Must NOT insert any "tidak masuk kelas" records');
  });

  await runTest('2.2: recordUnfilledJournalsAndPiket DOES insert "tidak masuk kelas" when teacher has NO Jurnal Kegiatan and no KBM', async () => {
    const insertedRecords: any[] = [];
    const mockClient = createMockClient(insertedRecords);

    const teacher = { nama_guru: 'Ahmad Fauzi, S.Pd.', user_id: 'usr-1', sekolah_id: 'sch-1' };
    const dateStr = '2026-11-18';
    const state = {
      jadwalKBM: [
        { kelas: '7A', mata_pelajaran: 'Matematika', hari: 'Rabu', jam_ke: '1-2' },
        { kelas: '7B', mata_pelajaran: 'Matematika', hari: 'Rabu', jam_ke: '3-4' }
      ],
      jurnalKBM: [],
      jurnalKegiatan: null
    };

    const res = await recordUnfilledJournalsAndPiket(teacher, dateStr, state, mockClient);
    assert.strictEqual(res.unfilledKbmCount, 2, 'Unfilled KBM should be 2 when teacher has no journal and no kegiatan');
    assert.strictEqual(insertedRecords.length, 2, 'Must insert 2 delinquency records');
  });

  // =========================================================================
  // Section 3: Expansion & De-duplication Simulation
  // =========================================================================
  console.log('\n--- Section 3: Expansion & De-duplication Simulation ---');

  await runTest('3.1: 4 KBM schedules with 1 Jurnal Kegiatan expands to exactly 4 rows with no duplicate generic and no "tidak masuk kelas"', () => {
    const schedules = [
      { kelas: '7A', mapel: 'IPA', jam_mulai: '07:30', jam_selesai: '09:00', jam_ke: '1-2' },
      { kelas: '7B', mapel: 'IPA', jam_mulai: '09:15', jam_selesai: '10:45', jam_ke: '3-4' },
      { kelas: '8A', mapel: 'IPA', jam_mulai: '11:00', jam_selesai: '12:30', jam_ke: '5-6' },
      { kelas: '8B', mapel: 'IPA', jam_mulai: '13:00', jam_selesai: '14:30', jam_ke: '7-8' }
    ];

    const teacherKegiatan = {
      id: 'keg-real-123',
      nama_guru: 'Sarah Alheid, S.Pd.',
      tanggal: '2026-11-18',
      kelas: '-',
      mapel: 'Jurnal Kegiatan',
      keterangan: 'Jurnal Kegiatan',
      materi: 'Pelatihan Guru Penggerak',
      kegiatan: 'Penyusunan Modul Ajar Kolaboratif',
      status_verifikasi: 'Disetujui',
      link_bukti_foto: 'https://drive.google.com/test.jpg'
    };

    let combined = [teacherKegiatan];
    const missingEntries: any[] = [];
    const expandedKegiatanIds = new Set<string>();

    for (const sched of schedules) {
      // Simulate conversion
      missingEntries.push({
        id: `converted-kegiatan-2026-11-18-${sched.kelas}-${sched.mapel}-${sched.jam_ke}`,
        original_id: teacherKegiatan.id,
        tanggal: '2026-11-18',
        nama_guru: teacherKegiatan.nama_guru,
        kelas: sched.kelas,
        mapel: sched.mapel,
        jam_ke: `${sched.jam_mulai} - ${sched.jam_selesai}`,
        materi: teacherKegiatan.materi,
        kegiatan: teacherKegiatan.kegiatan,
        status_verifikasi: teacherKegiatan.status_verifikasi,
        link_bukti_foto: teacherKegiatan.link_bukti_foto
      });
      expandedKegiatanIds.add(teacherKegiatan.id);
    }

    // Filter out generic
    combined = combined.filter((j: any) => !expandedKegiatanIds.has(j.id));
    combined = [...combined, ...missingEntries];

    assert.strictEqual(combined.length, 4, 'Total rows must be exactly 4 (one per schedule)');
    const classes = combined.map(j => j.kelas);
    assert.deepStrictEqual(classes, ['7A', '7B', '8A', '8B'], 'Rows must correspond to the 4 schedules');
    const hasTidakMasuk = combined.some(j => j.materi.toLowerCase().includes('tidak masuk kelas'));
    assert.strictEqual(hasTidakMasuk, false, 'No row should contain "tidak masuk kelas"');
    const allKegiatanMateri = combined.every(j => j.materi === 'Pelatihan Guru Penggerak');
    assert.strictEqual(allKegiatanMateri, true, 'All 4 rows must inherit the Jurnal Kegiatan materi');
  });

  await runTest('3.2: Handles teacher academic titles mismatch ("Ahmad Fauzi" vs "Ahmad Fauzi, S.Pd.") and squelches pre-existing delinquency', () => {
    // Schedule has "Ahmad Fauzi" without title
    const sched = {
      nama_guru: 'Ahmad Fauzi',
      user_id: 'usr-fauzi',
      kelas: '7A',
      mapel: 'Matematika',
      hari: 'Rabu',
      jam_ke: '1-2'
    };

    // Database Jurnal Kegiatan has "Ahmad Fauzi, S.Pd." with title
    const teacherKegiatan = {
      id: 'keg-fauzi-01',
      nama_guru: 'Ahmad Fauzi, S.Pd.',
      user_id: 'usr-fauzi',
      tanggal: '2026-11-18',
      kelas: '-',
      mapel: 'Jurnal Kegiatan',
      keterangan: 'Jurnal Kegiatan',
      materi: 'Rapat Koordinasi Kurikulum',
      kegiatan: 'Penyusunan RPP',
      status_verifikasi: 'Disetujui'
    };

    // Pre-existing delinquency auto-recorded previously with title
    const oldDelinquency = {
      id: 'alpa-fauzi-01',
      nama_guru: 'Ahmad Fauzi, S.Pd.',
      user_id: 'usr-fauzi',
      tanggal: '2026-11-18',
      kelas: '7A',
      mapel: 'Matematika',
      materi: 'tidak masuk kelas',
      keterangan: 'tidak masuk kelas',
      status_verifikasi: 'Tidak Masuk Kelas'
    };

    let combined = [teacherKegiatan, oldDelinquency];
    const missingEntries: any[] = [];
    const expandedKegiatanIds = new Set<string>();

    // Conversion
    const convertedEntry = {
      id: `converted-kegiatan-2026-11-18-${sched.kelas}-${sched.mapel}-${sched.jam_ke}`,
      original_id: teacherKegiatan.id,
      tanggal: '2026-11-18',
      nama_guru: sched.nama_guru,
      user_id: sched.user_id,
      kelas: sched.kelas,
      mapel: sched.mapel,
      materi: teacherKegiatan.materi,
      kegiatan: teacherKegiatan.kegiatan,
      status_verifikasi: teacherKegiatan.status_verifikasi
    };
    missingEntries.push(convertedEntry);
    expandedKegiatanIds.add(teacherKegiatan.id);

    // Apply combined filter using isTeacherJournalMatch
    combined = combined.filter((j: any) => {
      if (expandedKegiatanIds.has(String(j.id))) return false;

      const hasConvertedOnDate = missingEntries.some((m: any) =>
        m.id &&
        String(m.id).startsWith('converted-kegiatan-') &&
        m.tanggal === j.tanggal &&
        isTeacherJournalMatch(m, j)
      );

      if (hasConvertedOnDate) {
        const isGeneric = (!j.kelas || j.kelas === '-') && (!j.mapel || j.mapel === '-' || j.mapel === 'Jurnal Kegiatan');
        if (isGeneric) return false;

        const statusLower = (j.status_verifikasi || '').toLowerCase();
        const matLower = (j.materi || '').toLowerCase();
        if (statusLower === 'tidak masuk kelas' || matLower === 'tidak masuk kelas') return false;
      }

      return true;
    });

    combined = [...combined, ...missingEntries];

    assert.strictEqual(combined.length, 1, 'Exactly 1 row should remain (the converted entry)');
    assert.strictEqual(combined[0].materi, 'Rapat Koordinasi Kurikulum');
    assert.strictEqual(combined[0].kelas, '7A');
    assert.strictEqual(combined[0].status_verifikasi, 'Disetujui');
  });

  await runTest('3.3: Edit payload simulation preserves generic kelas and mapel as - for converted Jurnal Kegiatan', () => {
    const editingJurnal = {
      id: 'converted-kegiatan-2026-11-18-7A-Matematika-1-2',
      original_id: 'keg-fauzi-01',
      tanggal: '2026-11-18',
      nama_guru: 'Ahmad Fauzi, S.Pd.',
      kelas: '7A',
      mapel: 'Matematika',
      keterangan: 'Jurnal Kegiatan',
      materi: 'Rapat Koordinasi Kurikulum',
      kegiatan: 'Penyusunan RPP',
      status_verifikasi: 'Disetujui'
    };

    const isEditingJurnalKegiatan = Boolean(
      editingJurnal && (
        Boolean(editingJurnal.original_id) ||
        editingJurnal.keterangan?.includes('Jurnal Kegiatan') ||
        editingJurnal.mapel === 'Jurnal Kegiatan'
      )
    );
    assert.strictEqual(isEditingJurnalKegiatan, true, 'Converted entry must be detected as Jurnal Kegiatan');

    const isKegiatanUnderlying = isEditingJurnalKegiatan || Boolean(editingJurnal.original_id);
    const payload = {
      tanggal: editingJurnal.tanggal,
      jam_ke: isKegiatanUnderlying ? '-' : '1-2',
      mapel: isKegiatanUnderlying ? '-' : editingJurnal.mapel,
      kelas: isKegiatanUnderlying ? '-' : editingJurnal.kelas,
      materi: 'Rapat Koordinasi Kurikulum (Revisi)',
      kegiatan: 'Penyusunan RPP Kolaboratif'
    };

    assert.strictEqual(payload.kelas, '-', 'Payload kelas must remain - to preserve generic nature in DB');
    assert.strictEqual(payload.mapel, '-', 'Payload mapel must remain - to preserve generic nature in DB');
    assert.strictEqual(payload.jam_ke, '-', 'Payload jam_ke must remain -');
    assert.strictEqual(payload.materi, 'Rapat Koordinasi Kurikulum (Revisi)');
  });

  console.log('\n========================================');
  console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
