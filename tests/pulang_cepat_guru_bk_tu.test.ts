import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  evaluatePulangCepatDanJurnal,
  evaluateAndApplyAutoCheckout,
} from '../src/lib/attendanceAlpa';

function createMockSupabase(initialTables: Record<string, any[]>) {
  const tables: Record<string, any[]> = Object.fromEntries(
    Object.entries(initialTables).map(([k, v]) => [k, [...v]])
  );

  function buildChain(tableName: string) {
    const filters: ((row: any) => boolean)[] = [];
    let isSingle = false;

    const execute = async () => {
      const source = tables[tableName] || [];
      const matched = source.filter(r => filters.every(fn => fn(r)));
      if (isSingle) {
        return { data: matched[0] || null, error: null };
      }
      return { data: matched, error: null };
    };

    const chain: any = {
      select: () => chain,
      eq: (col: string, val: any) => {
        filters.push(r => r?.[col] === val);
        return chain;
      },
      neq: (col: string, val: any) => {
        filters.push(r => r?.[col] !== val);
        return chain;
      },
      gte: (col: string, val: any) => {
        filters.push(r => (r?.[col] || '') >= val);
        return chain;
      },
      lte: (col: string, val: any) => {
        filters.push(r => (r?.[col] || '') <= val);
        return chain;
      },
      not: (col: string, op: string, val: any) => {
        if (op === 'is' && val === null) {
          filters.push(r => r?.[col] !== null && r?.[col] !== undefined);
        }
        return chain;
      },
      in: (col: string, vals: any[]) => {
        filters.push(r => vals.includes(r?.[col]));
        return chain;
      },
      order: () => chain,
      maybeSingle: () => {
        isSingle = true;
        return execute();
      },
      insert: async (row: any) => {
        if (!tables[tableName]) tables[tableName] = [];
        tables[tableName].push(row);
        return { data: row, error: null };
      },
      then: (resolve: any, reject: any) => execute().then(resolve, reject),
    };
    return chain;
  }

  return {
    tables,
    from: (tableName: string) => buildChain(tableName),
  };
}

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}: ${err?.message || err}`);
    failed++;
  }
}

async function main() {
  console.log('\n🧪 TEST SUITE: PULANG CEPAT UNIVERSAL (GURU, BK, TATA USAHA)\n');

  await runTest('1. Unit: evaluatePulangCepatDanJurnal handles Dinas Luar & Izin Terlambat as Pulang Cepat, skips Cuti/Izin/Sakit/Alpa', () => {
    const emp = { nama_guru: 'Staff Uji', user_id: 'u-1', sekolah_id: 'sch-1' };

    const resDinas = evaluatePulangCepatDanJurnal(
      emp,
      [{ tipe_absen: 'Datang', jenis_presensi: 'Dinas Luar', status_verifikasi: 'Disetujui', timestamp: '2026-10-30T07:30:00+08:00' }],
      [],
      []
    );
    assert.strictEqual(resDinas.isPulangCepat, true);
    assert.strictEqual(resDinas.statusPresensi, 'Pulang Cepat');

    const resTerlambat = evaluatePulangCepatDanJurnal(
      emp,
      [{ tipe_absen: 'Datang', jenis_presensi: 'Izin Terlambat', status_verifikasi: 'Disetujui', timestamp: '2026-10-30T08:15:00+08:00' }],
      [],
      []
    );
    assert.strictEqual(resTerlambat.isPulangCepat, true);
    assert.strictEqual(resTerlambat.statusPresensi, 'Pulang Cepat');

    const resCuti = evaluatePulangCepatDanJurnal(
      emp,
      [{ tipe_absen: 'Datang', jenis_presensi: 'Cuti', status_verifikasi: 'Disetujui', timestamp: '2026-10-30T07:30:00+08:00' }],
      [],
      []
    );
    assert.strictEqual(resCuti.isPulangCepat, false);
    assert.strictEqual(resCuti.isEligibleAutoCheckout, false);

    const resRejectedPulang = evaluatePulangCepatDanJurnal(
      emp,
      [
        { tipe_absen: 'Datang', jenis_presensi: 'Sekolah', status_verifikasi: 'Disetujui', timestamp: '2026-10-30T07:05:00+08:00' },
        { tipe_absen: 'Pulang', jenis_presensi: 'Sekolah', status_verifikasi: 'Ditolak', timestamp: '2026-10-30T15:00:00+08:00' }
      ],
      [],
      []
    );
    assert.strictEqual(resRejectedPulang.isPulangCepat, true, 'Pulang yang ditolak admin dianggap belum melakukan presensi pulang');
  });

  await runTest('2. Integration (Mock DB): evaluateAndApplyAutoCheckout marks Guru, BK, & TU without Pulang as Pulang Cepat without breaking KBM/BK rules', async () => {
    const evalDate = '2026-10-30'; // Jumat
    const mockDb = createMockSupabase({
      pengaturan: [{ key: 'jam_pulang_akhir', value: '17:00', sekolah_id: 'sch-1' }],
      kalender_pendidikan: [],
      data_guru: [
        { user_id: 'u-guru-kbm', nama: 'Guru KBM Lengkap', role: 'guru', mata_pelajaran: 'Matematika', sekolah_id: 'sch-1' },
        { user_id: 'u-guru-kosong', nama: 'Guru KBM Kosong', role: 'guru', mata_pelajaran: 'IPA', sekolah_id: 'sch-1' },
        { user_id: 'u-bk', nama: 'Konselor BK', role: 'guru', mata_pelajaran: 'Bimbingan Konseling (BK)', sekolah_id: 'sch-1' },
      ],
      users: [
        { id: 'u-guru-kbm', nama: 'Guru KBM Lengkap', role: 'guru', mata_pelajaran: 'Matematika', sekolah_id: 'sch-1' },
        { id: 'u-guru-kosong', nama: 'Guru KBM Kosong', role: 'guru', mata_pelajaran: 'IPA', sekolah_id: 'sch-1' },
        { id: 'u-bk', nama: 'Konselor BK', role: 'bk', mata_pelajaran: 'Bimbingan Konseling', sekolah_id: 'sch-1' },
        { id: 'u-tu-rajin', nama: 'Staf TU Rajin', role: 'tata_usaha', mata_pelajaran: 'Tata Usaha', sekolah_id: 'sch-1' },
        { id: 'u-tu-normal', nama: 'Staf TU Normal', role: 'tata_usaha', mata_pelajaran: 'Tata Usaha', sekolah_id: 'sch-1' },
        { id: 'u-sakit', nama: 'Guru Sakit', role: 'guru', mata_pelajaran: 'IPS', sekolah_id: 'sch-1' },
      ],
      jadwal_pelajaran: [
        { id: 'jad-1', hari: 'Jumat', nama_guru: 'Guru KBM Lengkap', user_id: 'u-guru-kbm', kelas: 'VIII A', mata_pelajaran: 'Matematika', jam_mulai: '07:30', jam_selesai: '09:00', sekolah_id: 'sch-1' },
        { id: 'jad-2', hari: 'Jumat', nama_guru: 'Guru KBM Kosong', user_id: 'u-guru-kosong', kelas: 'VIII B', mata_pelajaran: 'IPA', jam_mulai: '09:00', jam_selesai: '10:30', sekolah_id: 'sch-1' },
      ],
      jurnal_pembelajaran: [
        { id: 'jrn-1', tanggal: evalDate, nama_guru: 'Guru KBM Lengkap', user_id: 'u-guru-kbm', kelas: 'VIII A', mapel: 'Matematika', status_verifikasi: 'Disetujui', sekolah_id: 'sch-1' },
        { id: 'jrn-tu', tanggal: evalDate, nama_guru: 'Staf TU Rajin', user_id: 'u-tu-rajin', kelas: '-', mapel: 'Jurnal Kegiatan', keterangan: 'Jurnal Kegiatan', materi: 'Rekap surat masuk', status_verifikasi: 'Disetujui', sekolah_id: 'sch-1' },
      ],
      jurnal_bk: [],
      penugasan_piket: [],
      jadwal_piket: [],
      laporan_piket: [],
      presensi_guru: [
        { id: 'p-1', timestamp: `${evalDate}T07:05:00+08:00`, nama_guru: 'Guru KBM Lengkap', user_id: 'u-guru-kbm', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', status_verifikasi: 'Disetujui', sekolah_id: 'sch-1' },
        { id: 'p-2', timestamp: `${evalDate}T07:10:00+08:00`, nama_guru: 'Guru KBM Kosong', user_id: 'u-guru-kosong', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', status_verifikasi: 'Disetujui', sekolah_id: 'sch-1' },
        { id: 'p-3', timestamp: `${evalDate}T07:15:00+08:00`, nama_guru: 'Konselor BK', user_id: 'u-bk', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', status_verifikasi: 'Disetujui', sekolah_id: 'sch-1' },
        { id: 'p-4', timestamp: `${evalDate}T07:20:00+08:00`, nama_guru: 'Staf TU Rajin', user_id: 'u-tu-rajin', tipe_absen: 'Datang', jenis_presensi: 'Dinas Luar', status_verifikasi: 'Disetujui', sekolah_id: 'sch-1' },
        { id: 'p-5a', timestamp: `${evalDate}T07:25:00+08:00`, nama_guru: 'Staf TU Normal', user_id: 'u-tu-normal', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', status_verifikasi: 'Disetujui', sekolah_id: 'sch-1' },
        { id: 'p-5b', timestamp: `${evalDate}T16:10:00+08:00`, nama_guru: 'Staf TU Normal', user_id: 'u-tu-normal', tipe_absen: 'Pulang', jenis_presensi: 'Sekolah', status_verifikasi: 'Disetujui', sekolah_id: 'sch-1' },
        { id: 'p-6', timestamp: `${evalDate}T06:50:00+08:00`, nama_guru: 'Guru Sakit', user_id: 'u-sakit', tipe_absen: 'Datang', jenis_presensi: 'Sakit', status_verifikasi: 'Disetujui', sekolah_id: 'sch-1' },
      ],
    });

    const result = await evaluateAndApplyAutoCheckout(evalDate, 'sch-1', { force: true }, mockDb);

    assert.strictEqual(result.affectedCount, 4, 'Exactly Guru KBM Lengkap, Guru KBM Kosong, Konselor BK, and Staf TU Rajin must get Pulang Cepat');
    for (const d of result.details) {
      assert.strictEqual(d.newStatus, 'Pulang Cepat', `${d.nama_guru} must have status Pulang Cepat`);
      assert.strictEqual(d.pulangCepat, true);
    }

    const names = result.details.map(d => d.nama_guru).sort();
    assert.deepStrictEqual(names, ['Guru KBM Kosong', 'Guru KBM Lengkap', 'Konselor BK', 'Staf TU Rajin']);

    // Verify Guru KBM Lengkap got 0 false Tidak Masuk Kelas / Tidak Melaksanakan Kegiatan
    const insertedKbm = mockDb.tables.jurnal_pembelajaran.filter(
      j => j.status_verifikasi === 'Tidak Masuk Kelas' || j.status_verifikasi === 'Tidak Melaksanakan Kegiatan'
    );
    assert.strictEqual(insertedKbm.filter(j => j.nama_guru === 'Guru KBM Lengkap').length, 0, 'Guru KBM Lengkap must NOT get false empty journal');
    assert.strictEqual(insertedKbm.filter(j => j.nama_guru === 'Guru KBM Kosong').length, 1, 'Guru KBM Kosong keeps existing Tidak Masuk Kelas behavior');
    assert.strictEqual(insertedKbm.filter(j => j.nama_guru === 'Konselor BK').length, 0, 'Konselor BK must NOT get false Tidak Melaksanakan Kegiatan');
    assert.strictEqual(insertedKbm.filter(j => j.nama_guru === 'Staf TU Rajin').length, 0, 'Staf TU Rajin with Jurnal Kegiatan must NOT get false Tidak Melaksanakan Kegiatan');
  });

  await runTest('3. UI & Rekap Integration Contracts: AdminRekapView, HomeViewTU, HomeViewGuru, and HistoryView', () => {
    const root = process.cwd();
    const rekap = fs.readFileSync(path.join(root, 'src', 'components', 'AdminRekapView.tsx'), 'utf8');
    const homeTu = fs.readFileSync(path.join(root, 'src', 'components', 'HomeViewTU.tsx'), 'utf8');
    const homeGuru = fs.readFileSync(path.join(root, 'src', 'components', 'HomeViewGuru.tsx'), 'utf8');
    const history = fs.readFileSync(path.join(root, 'src', 'components', 'HistoryView.tsx'), 'utf8');

    assert.ok(rekap.includes('datangWorkDates') && rekap.includes('normalPulangDates') && rekap.includes('explicitPulangCepatDates'), 'AdminRekapView must deduplicate Pulang Cepat by date across Guru, BK, and TU');
    assert.ok(rekap.includes('jam_pulang_akhir') && rekap.includes('isBeforeCutoff'), 'AdminRekapView must respect jam_pulang_akhir before flagging today as Pulang Cepat');
    assert.ok(rekap.includes('PrintHeader') && rekap.includes('PrintSignature'), 'AdminRekapView preserves dual print headers and signatures');

    assert.ok(homeTu.includes('⚠️ Pulang Cepat') && homeTu.includes('⚠️ Anda tercatat Pulang Cepat'), 'HomeViewTU must render Pulang Cepat step and warning banner');
    assert.ok(homeGuru.includes('⚠️ Anda tercatat Pulang Cepat'), 'HomeViewGuru preserves Pulang Cepat warning banner');
    assert.ok(history.includes("item.status_verifikasi === 'Pulang Cepat'"), 'HistoryView must highlight Pulang Cepat status');
  });

  console.log(`\nSUMMARY: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
