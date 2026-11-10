/**
 * tests/bk_jurnal_workflow_verif_counting.test.ts
 *
 * Memverifikasi dukungan penuh pembacaan, alur kerja harian, penghitungan rekap/analitik,
 * dan verifikasi Admin + Kepala Sekolah untuk Jurnal BK (`jurnal_bk`), serta
 * memastikan fitur/logika non-BK tidak terpengaruh (strict non-regression).
 */

import assert from 'node:assert';
import { mock } from 'node:test';
import * as fs from 'fs';
import * as path from 'path';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fake.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'fake-anon-key';

import { supabase } from '../src/lib/supabaseClient';
import {
  isBkAccount,
  getGuruDailyState,
  canTeacherPresensiPulang,
  GuruDailyState
} from '../src/lib/workflow';
import {
  evaluateTeacherWarningsSync,
  getTeacherDisciplineWarnings
} from '../src/lib/warningSystem';
import { recordUnfilledJournalsAndPiket } from '../src/lib/attendanceAlpa';
import { isRealSubmittedJournal, isDelinquencyJournal } from '../src/components/AdminVerifView';
import { evaluateReminderConditions } from '../src/components/TeacherReminderManager';
import { POST as postRejectionNotification } from '../src/app/api/notifications/rejection/route';

let passCount = 0;
function pass(msg: string) {
  passCount++;
  console.log(`  ✔ [PASS] ${msg}`);
}

type TableStore = Record<string, any[]>;

/**
 * Membangun mock query builder Supabase yang mendukung chaining filter & await.
 */
function createTableMock(store: TableStore, insertedOps: Array<{ table: string; payload: any }>) {
  return (table: string) => {
    const filters: Array<(row: any) => boolean> = [];
    let pendingAction: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let writePayload: any = null;
    let isSingle = false;

    const applyFilters = (rows: any[]) => rows.filter(r => filters.every(fn => fn(r)));

    const execute = async () => {
      const rows = store[table] || [];
      if (pendingAction === 'insert') {
        const toInsert = Array.isArray(writePayload) ? writePayload : [writePayload];
        insertedOps.push({ table, payload: writePayload });
        store[table] = [...rows, ...toInsert];
        return { data: toInsert, error: null };
      }
      if (pendingAction === 'update') {
        const matched = applyFilters(rows);
        const updated = matched.map(r => Object.assign(r, writePayload));
        return { data: updated, error: null };
      }
      if (pendingAction === 'delete') {
        store[table] = rows.filter(r => !filters.every(fn => fn(r)));
        return { data: [], error: null };
      }
      const matched = applyFilters([...rows]);
      if (isSingle) {
        return { data: matched[0] || null, error: null };
      }
      return { data: matched, error: null };
    };

    const builder: any = {
      select: () => builder,
      insert: (payload: any) => {
        pendingAction = 'insert';
        writePayload = payload;
        return builder;
      },
      update: (payload: any) => {
        pendingAction = 'update';
        writePayload = payload;
        return builder;
      },
      delete: () => {
        pendingAction = 'delete';
        return builder;
      },
      eq: (col: string, val: any) => {
        filters.push(r => r?.[col] === val);
        return builder;
      },
      neq: (col: string, val: any) => {
        filters.push(r => r?.[col] !== val);
        return builder;
      },
      in: (col: string, vals: any[]) => {
        filters.push(r => vals.includes(r?.[col]));
        return builder;
      },
      not: (col: string, op: string, val: any) => {
        if (op === 'is' && val === null) filters.push(r => r?.[col] !== null && r?.[col] !== undefined);
        else if (op === 'ilike') {
          const needle = String(val).replace(/%/g, '').toLowerCase();
          filters.push(r => !String(r?.[col] || '').toLowerCase().includes(needle));
        }
        return builder;
      },
      ilike: (col: string, val: string) => {
        const needle = String(val).replace(/%/g, '').toLowerCase();
        filters.push(r => String(r?.[col] || '').toLowerCase().includes(needle));
        return builder;
      },
      gte: (col: string, val: any) => {
        filters.push(r => r?.[col] >= val);
        return builder;
      },
      lte: (col: string, val: any) => {
        filters.push(r => r?.[col] <= val);
        return builder;
      },
      or: (expr: string) => {
        // Evaluate comma-separated Supabase PostgREST conditions conservatively
        const parts = expr.split(',').map(s => s.trim()).filter(Boolean);
        filters.push(r =>
          parts.some(p => {
            if (p.includes('.is.null')) {
              const col = p.split('.is.null')[0];
              return r?.[col] === null || r?.[col] === undefined;
            }
            if (p.includes('.eq.')) {
              const [col, val] = p.split('.eq.');
              return String(r?.[col]) === String(val);
            }
            if (p.includes('.ilike.')) {
              const [col, rawVal] = p.split('.ilike.');
              const needle = rawVal.replace(/["%]/g, '').toLowerCase();
              return String(r?.[col] || '').toLowerCase().includes(needle);
            }
            return true;
          })
        );
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => {
        isSingle = true;
        return builder;
      },
      single: () => {
        isSingle = true;
        return builder;
      },
      then: (resolve: any, reject: any) => execute().then(resolve, reject)
    };

    return builder;
  };
}

async function main() {
  console.log('\n========================================================================');
  console.log('🧪 BK JURNAL WORKFLOW, VERIFICATION & COUNTING INTEGRATION SUITE');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // Suite 1: isBkAccount helper consistency
  // -------------------------------------------------------------------------
  console.log('--- Suite 1: isBkAccount Helper ---');
  for (const val of ['bk', 'BK', 'guru_bk', 'Guru BK', 'Bimbingan Konseling (BK)', 'Bimbingan dan Konseling']) {
    assert.strictEqual(isBkAccount(val), true, `isBkAccount('${val}') harus true`);
  }
  for (const nonBk of ['guru', 'Matematika', 'Bahasa Indonesia', 'tata_usaha', 'admin', '']) {
    assert.strictEqual(isBkAccount(nonBk), false, `isBkAccount('${nonBk}') harus false`);
  }
  pass('isBkAccount mendeteksi seluruh varian role/mapel BK dan menolak non-BK');

  // Pin clock ke hari kerja (Selasa 2026-11-10 09:30 WITA) agar uji workflow deterministik
  const fixedNow = new Date('2026-11-10T09:30:00+08:00').getTime();
  const RealDate = globalThis.Date;
  class MockDate extends RealDate {
    constructor(value?: any) {
      super(value === undefined ? fixedNow : value);
    }
    static now() {
      return fixedNow;
    }
  }

  // -------------------------------------------------------------------------
  // Suite 2: workflow.getGuruDailyState membaca jurnal_bk untuk Guru BK
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 2: getGuruDailyState Membaca Jurnal BK ---');
  globalThis.Date = MockDate as any;
  const opsLog: Array<{ table: string; payload: any }> = [];

  try {
    const storeBkFilled: TableStore = {
      pengaturan: [
        { key: 'hari_sekolah', value: '6', sekolah_id: 'sch-1' },
        { key: 'aturan_kehadiran_guru', value: 'Semua_Hari', sekolah_id: 'sch-1' }
      ],
      kalender_pendidikan: [],
      sistem_blok: [],
      data_guru: [
        { id: 'dg-bk-1', user_id: 'usr-bk-1', nama_guru: 'Siti Konselor, S.Pd', nip: '199001', mata_pelajaran: '-', sekolah_id: 'sch-1' }
      ],
      users: [
        { id: 'usr-bk-1', username: 'bk1', nama: 'Siti Konselor', role: 'bk', sekolah_id: 'sch-1' }
      ],
      penugasan_piket: [],
      jadwal_piket: [],
      jadwal_pelajaran: [],
      presensi_guru: [
        { id: 'pr-1', nama_guru: 'Siti Konselor', user_id: 'usr-bk-1', sekolah_id: 'sch-1', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', timestamp: '2026-11-10 07:10:00', status_verifikasi: 'Disetujui' }
      ],
      laporan_piket: [],
      jurnal_pembelajaran: [],
      jurnal_bk: [
        {
          id: 'jbk-1',
          sekolah_id: 'sch-1',
          guru_id: 'usr-bk-1',
          nama_guru: 'Siti Konselor',
          nama_siswa: 'Andi',
          kelas: 'XI-A',
          tanggal: '2026-11-10',
          waktu: '08:15',
          bidang_bimbingan: 'Pribadi',
          jenis_layanan: 'Konseling Individual',
          catatan: 'Pendampingan manajemen stres belajar',
          tindak_lanjut: 'Evaluasi pekan depan',
          status: 'Dalam Penanganan',
          status_verifikasi: 'Menunggu'
        },
        {
          id: 'jbk-2',
          sekolah_id: 'sch-1',
          guru_id: 'usr-bk-1',
          nama_guru: 'Siti Konselor',
          nama_siswa: 'Budi',
          kelas: 'XII-B',
          tanggal: '2026-11-10',
          waktu: '09:00',
          bidang_bimbingan: 'Karir',
          jenis_layanan: 'Bimbingan Kelompok',
          catatan: 'Persiapan SNBP',
          tindak_lanjut: 'Selesai',
          status: 'Selesai',
          status_verifikasi: 'Disetujui'
        },
        {
          id: 'jbk-3',
          sekolah_id: 'sch-1',
          guru_id: 'usr-bk-1',
          nama_guru: 'Siti Konselor',
          nama_siswa: 'Citra',
          kelas: 'X-C',
          tanggal: '2026-11-10',
          waktu: '09:20',
          bidang_bimbingan: 'Sosial',
          jenis_layanan: 'Konsultasi',
          catatan: 'Catatan singkat',
          tindak_lanjut: '-',
          status: 'Dalam Penanganan',
          status_verifikasi: 'Ditolak',
          alasan_penolakan: 'Mohon lengkapi rincian tindak lanjut'
        }
      ]
    };

    const mFrom = mock.method(supabase, 'from', createTableMock(storeBkFilled, opsLog));
    try {
      const bkState = await getGuruDailyState('Siti Konselor', 'bk1', 'usr-bk-1', 'sch-1');
      assert.strictEqual(bkState.isBk, true, 'isBk harus bernilai true untuk akun role bk');
      assert.strictEqual(bkState.jurnalBK?.length, 2, 'jurnalBK hanya menghitung entri non-Ditolak (2 sesi)');
      assert.strictEqual(bkState.jurnalDitolak.length, 1, 'jurnalDitolak harus berisi 1 entri Jurnal BK yang ditolak');
      assert.strictEqual(bkState.jurnalDitolak[0]._sourceTable, 'jurnal_bk', 'jurnalDitolak BK ditandai _sourceTable = jurnal_bk');
      assert.strictEqual(canTeacherPresensiPulang(bkState), true, 'BK tetap boleh presensi pulang');
      pass('getGuruDailyState mempopulasikan jurnalBK, memisahkan status Ditolak ke jurnalDitolak, dan menjaga canPresensiPulang');

      // Sub-test: Non-BK regular teacher strict non-regression
      storeBkFilled.data_guru.push({
        id: 'dg-mat-1',
        user_id: 'usr-mat-1',
        nama_guru: 'Pak Budi, S.Pd',
        nip: '198801',
        mata_pelajaran: 'Matematika',
        sekolah_id: 'sch-1'
      });
      storeBkFilled.users.push({ id: 'usr-mat-1', username: 'budi', nama: 'Pak Budi', role: 'guru', sekolah_id: 'sch-1' });
      storeBkFilled.presensi_guru.push({
        id: 'pr-mat-1',
        nama_guru: 'Pak Budi, S.Pd',
        user_id: 'usr-mat-1',
        sekolah_id: 'sch-1',
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        timestamp: '2026-11-10 07:05:00',
        status_verifikasi: 'Disetujui'
      });
      storeBkFilled.jadwal_pelajaran.push({
        id: 'jdw-1',
        sekolah_id: 'sch-1',
        hari: 'Selasa',
        kelas: 'X-A',
        mata_pelajaran: 'Matematika',
        nama_guru: 'Pak Budi, S.Pd'
      });
      storeBkFilled.jurnal_pembelajaran.push({
        id: 'jp-1',
        sekolah_id: 'sch-1',
        tanggal: '2026-11-10',
        nama_guru: 'Pak Budi, S.Pd',
        kelas: 'X-A',
        mapel: 'Matematika',
        materi: 'Aljabar Linear',
        status_verifikasi: 'Menunggu'
      });

      const matState = await getGuruDailyState('Pak Budi, S.Pd', 'budi', 'usr-mat-1', 'sch-1');
      assert.strictEqual(matState.isBk, false, 'Guru Matematika memiliki isBk = false');
      assert.strictEqual(matState.jurnalKBM.length, 1, 'jurnalKBM guru reguler terbaca normal');
      assert.strictEqual(matState.jurnalBK?.length || 0, 0, 'jurnalBK kosong untuk guru non-BK');
      pass('Strict Non-Regression: Guru Matematika tetap membaca jurnal_pembelajaran seperti semula');
    } finally {
      mFrom.mock.restore();
    }

    // -----------------------------------------------------------------------
    // Suite 3: warningSystem.ts menghitung Jurnal BK & menghindari false violation
    // -----------------------------------------------------------------------
    console.log('\n--- Suite 3: warningSystem Penghitungan Jurnal BK ---');
    const summaryBk = evaluateTeacherWarningsSync(
      'dg-bk-1',
      'Siti Konselor',
      false,
      'sch-1',
      [{ key: 'hari_sekolah', value: '6' }],
      [],
      [],
      [],
      [],
      [
        { nama_guru: 'Siti Konselor', timestamp: '2026-11-09 07:05:00', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', status_verifikasi: 'Disetujui' },
        { nama_guru: 'Siti Konselor', timestamp: '2026-11-10 07:08:00', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', status_verifikasi: 'Disetujui' }
      ],
      [],
      [],
      '2026-11',
      [
        { tanggal: '2026-11-09', status_verifikasi: 'Disetujui', bidang_bimbingan: 'Pribadi', jenis_layanan: 'Konseling Individual' },
        { tanggal: '2026-11-10', status_verifikasi: 'Menunggu', bidang_bimbingan: 'Sosial', jenis_layanan: 'Konseling Kelompok' },
        { tanggal: '2026-11-10', status_verifikasi: 'Disetujui', bidang_bimbingan: 'Karir', jenis_layanan: 'Bimbingan Klasikal' },
        { tanggal: '2026-11-10', status_verifikasi: 'Ditolak', bidang_bimbingan: 'Belajar', jenis_layanan: 'Konsultasi' }
      ],
      true
    );
    assert.strictEqual(summaryBk.stats?.jurnal.filled, 3, '3 Jurnal BK non-Ditolak harus terhitung di stats.jurnal.filled');
    assert.strictEqual(summaryBk.stats?.jurnal.required, 3, 'Hari operasional tanpa sesi BK tidak memaksa target KBM palsu');
    assert.strictEqual(
      summaryBk.warnings.some(w => w.category === 'Jurnal'),
      false,
      'Guru BK tidak terkena pelanggaran Jurnal palsu pada hari tanpa sesi'
    );
    pass('evaluateTeacherWarningsSync menghitung Jurnal BK dan membebaskan hari tanpa jadwal KBM bagi BK');

    const summaryReguler = evaluateTeacherWarningsSync(
      'dg-mat-1',
      'Pak Budi',
      false,
      'sch-1',
      [{ key: 'hari_sekolah', value: '6' }],
      [],
      [{ nama_guru: 'Pak Budi', hari: 'Selasa', kelas: 'X-A', mata_pelajaran: 'Matematika' }],
      [],
      [],
      [],
      [{ tanggal: '2026-11-10', kelas: 'X-A', mapel: 'Matematika', status_verifikasi: 'Disetujui' }],
      [],
      '2026-11'
    );
    assert.ok((summaryReguler.stats?.jurnal.filled ?? 0) >= 1, 'Perhitungan jurnal guru KBM reguler tetap akurat');
    pass('Strict Non-Regression: warningSystem untuk guru reguler tetap identik');

    // Async warningSystem query check with mocked supabase.from
    const mFromWarn = mock.method(
      supabase,
      'from',
      createTableMock(
        {
          data_guru: [{ id: 'dg-bk-1', user_id: 'usr-bk-1', nama_guru: 'Siti Konselor', nip: '199001', sekolah_id: 'sch-1', mata_pelajaran: 'BK' }],
          pengaturan: [{ key: 'hari_sekolah', value: '6', sekolah_id: 'sch-1' }],
          kalender_pendidikan: [],
          jadwal_pelajaran: [],
          penugasan_piket: [],
          jadwal_piket: [],
          presensi_guru: [],
          jurnal_pembelajaran: [],
          laporan_piket: [],
          jurnal_bk: [
            { tanggal: '2026-11-10', sekolah_id: 'sch-1', guru_id: 'usr-bk-1', nama_guru: 'Siti Konselor', status_verifikasi: 'Disetujui', bidang_bimbingan: 'Pribadi', jenis_layanan: 'Konseling' }
          ]
        },
        []
      )
    );
    try {
      const asyncBkWarn = await getTeacherDisciplineWarnings('Siti Konselor', 'sch-1', '2026-11');
      assert.strictEqual(asyncBkWarn.stats?.jurnal.filled, 1, 'getTeacherDisciplineWarnings ikut mengambil dan menghitung jurnal_bk');
      pass('getTeacherDisciplineWarnings mengikutsertakan data tabel jurnal_bk secara otomatis');
    } finally {
      mFromWarn.mock.restore();
    }

    // -----------------------------------------------------------------------
    // Suite 4: attendanceAlpa.ts tidak menulis "tidak melaksanakan kegiatan apapun" untuk BK
    // -----------------------------------------------------------------------
    console.log('\n--- Suite 4: recordUnfilledJournalsAndPiket Tidak Memfitnah BK ---');
    const alpaOps: Array<{ table: string; payload: any }> = [];
    const alpaStore: TableStore = {
      jadwal_pelajaran: [],
      jurnal_pembelajaran: [],
      laporan_piket: [],
      presensi_guru: [],
      jurnal_bk: [{ id: 'jbk-today', guru_id: 'usr-bk-1', nama_guru: 'Siti Konselor', tanggal: '2026-11-10', status_verifikasi: 'Menunggu' }]
    };
    const fakeClient: any = { from: createTableMock(alpaStore, alpaOps) };

    const bkCheckoutRes = await recordUnfilledJournalsAndPiket(
      { nama_guru: 'Siti Konselor', user_id: 'usr-bk-1', sekolah_id: 'sch-1' },
      '2026-11-10',
      { isBk: true, isBlok: true, jadwalKBM: [], jurnalKBM: [], jurnalKegiatan: null, jurnalBK: [{ id: 'jbk-today' }], isPiket: false },
      fakeClient
    );
    assert.strictEqual(bkCheckoutRes.unfilledKegiatanCreated, false, 'Guru BK tidak dibuatkan auto-record tidak melaksanakan kegiatan');
    assert.strictEqual(alpaOps.length, 0, 'Tidak ada insert ke jurnal_pembelajaran saat checkout Guru BK');
    pass('recordUnfilledJournalsAndPiket melewati penalti Jurnal Kegiatan kosong bagi BK / pengisi Jurnal BK');

    // Non-BK empty day without journal must STILL behave identically
    const nonBkCheckoutRes = await recordUnfilledJournalsAndPiket(
      { nama_guru: 'Guru Reguler Kosong', user_id: 'usr-reg-1', sekolah_id: 'sch-1' },
      '2026-11-10',
      { isBk: false, isBlok: true, isNonTeachingDay: false, jadwalKBM: [], jurnalKBM: [], jurnalKegiatan: null, isPiket: false },
      fakeClient
    );
    assert.strictEqual(nonBkCheckoutRes.unfilledKegiatanCreated, true, 'Guru non-BK pada Sistem Blok tanpa jurnal tetap dicatat sesuai logika eksisting');
    assert.strictEqual(alpaOps.some(op => op.table === 'jurnal_pembelajaran'), true);
    pass('Strict Non-Regression: Logika auto-record guru non-BK tidak berubah');

    // -----------------------------------------------------------------------
    // Suite 5: Reminder & Rejection Deep-Link Routing + isRealSubmittedJournal
    // -----------------------------------------------------------------------
    console.log('\n--- Suite 5: Reminder Condition, Rejection Deep-Link & Verif Helper ---');
    const bkReminderState: GuruDailyState = {
      tanggal: '2026-11-10',
      isLibur: false,
      presensiDatang: { id: 'p-1' },
      presensiPulang: null,
      isIzinSakit: false,
      isDinasLuar: false,
      isPiket: false,
      laporanPiket: null,
      jadwalKBM: [],
      jurnalKBM: [],
      jurnalKegiatan: null,
      jurnalBK: [{ id: 'jbk-1' }],
      isBlok: true,
      blokInfo: { id: 'blk-1', nama_kegiatan: 'Class Meeting', deskripsi: null, tanggal_mulai: '2026-11-10', tanggal_selesai: '2026-11-12' },
      canOpenPiket: false,
      canOpenJurnal: true,
      canPresensiPulang: true,
      lockedReason: null,
      isBk: true,
      presensiDatangDitolak: null,
      presensiPulangDitolak: null,
      laporanPiketDitolak: null,
      jurnalDitolak: []
    };
    const reminderNow = new RealDate('2026-11-10T10:00:00+08:00');
    const bkReminders = evaluateReminderConditions(bkReminderState, {}, reminderNow);
    assert.strictEqual(
      bkReminders.some(r => r.category === 'jurnal' && r.targetView === 'view-guru-jurnal'),
      false,
      'Guru BK tidak mendapat reminder palsu menuju view-guru-jurnal saat Sistem Blok'
    );
    pass('evaluateReminderConditions menonaktifkan false reminder view-guru-jurnal untuk Guru BK');

    const regBlokReminders = evaluateReminderConditions({ ...bkReminderState, isBk: false, isNonTeachingDay: false }, {}, reminderNow);
    assert.strictEqual(
      regBlokReminders.some(r => r.category === 'jurnal' && r.targetView === 'view-guru-jurnal'),
      true,
      'Guru reguler non-BK tetap menerima pengingat Jurnal Kegiatan pada Sistem Blok'
    );
    pass('Strict Non-Regression: Guru reguler tetap mendapat pengingat Sistem Blok');

    const bkVerifCandidate = {
      id: 'jbk-1',
      _sourceTable: 'jurnal_bk',
      isJurnalBk: true,
      nama_guru: 'Siti Konselor',
      nama_siswa: 'Andi',
      bidang_bimbingan: 'Pribadi',
      jenis_layanan: 'Konseling Individual',
      catatan: 'Diskusi perencanaan studi',
      status_verifikasi: 'Menunggu'
    };
    assert.strictEqual(isDelinquencyJournal(bkVerifCandidate), false, 'Entri Jurnal BK bukan delinquency journal');
    assert.strictEqual(isRealSubmittedJournal(bkVerifCandidate), true, 'isRealSubmittedJournal mengembalikan true untuk entri Jurnal BK');
    pass('Helper verifikasi isRealSubmittedJournal & isDelinquencyJournal memvalidasi entri Jurnal BK dengan benar');

    // Rejection notification API test with targetView: 'view-jurnal-bk'
    const rejStore: TableStore = {
      data_guru: [{ id: 'dg-bk-1', nama_guru: 'Siti Konselor', sekolah_id: 'sch-1' }],
      chat_messages: [],
      push_subscriptions: []
    };
    const rejOps: Array<{ table: string; payload: any }> = [];
    const mFromRej = mock.method(supabase, 'from', createTableMock(rejStore, rejOps));
    try {
      const req = new NextRequest('http://localhost/api/notifications/rejection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherName: 'Siti Konselor',
          category: 'Jurnal',
          detailInfo: 'Jurnal BK (Pribadi - Andi)',
          rejectionReason: 'Lengkapi rincian tindak lanjut layanan',
          targetView: 'view-jurnal-bk',
          sekolahId: 'sch-1'
        })
      });
      const res = await postRejectionNotification(req);
      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.inAppCreated, true);
      assert.ok(rejStore.chat_messages[0].pesan.includes('Jurnal BK (Pribadi - Andi)'));
      pass('POST /api/notifications/rejection membuat notifikasi in-app penolakan Jurnal BK secara valid');
    } finally {
      mFromRej.mock.restore();
    }

    // -----------------------------------------------------------------------
    // Suite 6: Verifikasi Skema, UI Integration & Isolasi Kerahasiaan BK
    // -----------------------------------------------------------------------
    console.log('\n--- Suite 6: Skema DB, UI Admin/Kepsek/Rekap/Analitik & Isolasi Kerahasiaan ---');
    const root = path.resolve(__dirname, '..');
    const readRel = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

    const migrationSql = readRel('supabase/migrations/20261110_add_verifikasi_to_jurnal_bk.sql');
    assert.ok(migrationSql.includes('status_verifikasi'), 'Migrasi menambahkan kolom status_verifikasi');
    assert.ok(migrationSql.includes('catatan_admin'), 'Migrasi menambahkan kolom catatan_admin');
    assert.ok(migrationSql.includes('alasan_penolakan'), 'Migrasi menambahkan kolom alasan_penolakan');

    const verifSrc = readRel('src/components/AdminVerifView.tsx');
    assert.ok(verifSrc.includes("from('jurnal_bk')"), 'AdminVerifView memuat data tabel jurnal_bk untuk Admin & Kepala Sekolah read-only');
    assert.ok(verifSrc.includes("table: 'jurnal_bk'"), 'AdminVerifView berlangganan realtime jurnal_bk');
    assert.ok(verifSrc.includes('targetTable') && verifSrc.includes("'jurnal_bk'"), 'verifyItem mengarahkan update ke jurnal_bk');
    assert.ok(verifSrc.includes('bkPendingIds'), 'bulkVerifyCurrent mendukung persetujuan massal entri jurnal_bk');

    const homeAdminSrc = readRel('src/components/HomeViewAdmin.tsx');
    assert.ok(homeAdminSrc.includes("from('jurnal_bk')"), 'HomeViewAdmin mengambil jurnal_bk untuk Matriks Harian Guru');
    assert.ok(homeAdminSrc.includes('Jurnal BK (${bkFilledCount} Sesi)'), 'HomeViewAdmin menampilkan status & hitungan sesi Jurnal BK');

    const homeGuruSrc = readRel('src/components/HomeViewGuru.tsx');
    assert.ok(homeGuruSrc.includes('dailyState.jurnalBK'), 'HomeViewGuru membaca dailyState.jurnalBK pada Step Tracker & Next Action');
    assert.ok(homeGuruSrc.includes("table: 'jurnal_bk'"), 'HomeViewGuru berlangganan realtime jurnal_bk');

    const rekapAdminSrc = readRel('src/components/AdminRekapView.tsx');
    assert.ok(rekapAdminSrc.includes("from('jurnal_bk')"), 'AdminRekapView membaca jurnal_bk terverifikasi untuk Rekap Bulanan');

    const analitikSrc = readRel('src/components/AnalitikView.tsx');
    assert.ok(analitikSrc.includes("from('jurnal_bk')"), 'AnalitikView menghitung jurnal_bk terverifikasi dalam statistik & leaderboard');

    // Confidentiality Isolation: Class recaps & Dinas monitoring must NOT expose confidential counseling logs
    const rekapJurnalSrc = readRel('src/components/RekapJurnalView.tsx');
    assert.strictEqual(rekapJurnalSrc.includes('jurnal_bk'), false, 'RekapJurnalView per kelas tetap terisolasi dan tidak membocorkan Jurnal BK');
    const dinasSrc = readRel('src/components/DinasDashboard.tsx');
    assert.strictEqual(dinasSrc.includes('jurnal_bk'), false, 'DinasDashboard tidak mengakses detail rahasia jurnal_bk');

    pass('Integrasi UI Admin/Kepsek/Rekap/Analitik terverifikasi & isolasi kerahasiaan Jurnal BK terjaga ketat');
  } finally {
    globalThis.Date = RealDate;
  }

  console.log(`\n========================================================================`);
  console.log(`🎉 ALL ${passCount} INTEGRATION & NON-REGRESSION CHECKS PASSED (0 FAILURES)`);
  console.log(`========================================================================\n`);
}

main().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
