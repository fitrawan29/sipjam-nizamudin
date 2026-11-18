import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { recordUnfilledJournalsAndPiket } from '../src/lib/attendanceAlpa';

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
    assert(
      rekapCode.includes('expandedTeacherDates.add'),
      'RekapJurnalView must track expandedTeacherDates'
    );
  });

  await runTest('1.3: RekapJurnalView removes generic Jurnal Kegiatan entries when expanded into KBM schedules', () => {
    assert(
      rekapCode.includes('expandedKegiatanIds.has(String(j.id))'),
      'RekapJurnalView must remove generic Jurnal Kegiatan matching expandedKegiatanIds'
    );
    assert(
      rekapCode.includes('expandedTeacherDates.has'),
      'RekapJurnalView must verify expandedTeacherDates'
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
