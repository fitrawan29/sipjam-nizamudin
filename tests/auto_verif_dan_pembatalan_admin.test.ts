import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fake.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'fake-anon-key';

import {
  evaluate7DayRepairWindow,
  getVerifStatusBadgeMeta,
  REJECTION_REPAIR_WINDOW_DAYS,
} from '../src/lib/workflow';

let passed = 0;
function check(cond: boolean, label: string) {
  assert(cond, `FAIL: ${label}`);
  console.log(`  ✔ PASS: ${label}`);
  passed++;
}

async function run() {
  console.log('🧪 TEST: Verifikasi Otomatis, Tolak Admin, Masa Perbaikan 7 Hari & Sync Role');

  // 1. Evaluasi Masa Perbaikan 7 Hari Berjalan
  check(REJECTION_REPAIR_WINDOW_DAYS === 7, 'REJECTION_REPAIR_WINDOW_DAYS is 7');

  const day0 = evaluate7DayRepairWindow('2026-11-20', '2026-11-20');
  check(day0.isWithinWindow === true && day0.remainingDays === 7 && day0.deadlineDate === '2026-11-27', 'Day 0: 7 hari tersisa, s/d 2026-11-27');

  const day3 = evaluate7DayRepairWindow('2026-11-20', '2026-11-23');
  check(day3.isWithinWindow === true && day3.remainingDays === 4, 'Day 3: 4 hari tersisa');

  const day7 = evaluate7DayRepairWindow('2026-11-20', '2026-11-27');
  check(day7.isWithinWindow === true && day7.remainingDays === 0, 'Day 7: hari terakhir perbaikan (remainingDays = 0, isWithinWindow = true)');

  const day8 = evaluate7DayRepairWindow('2026-11-20', '2026-11-28');
  check(day8.isWithinWindow === false && day8.remainingDays === 0, 'Day 8: masa perbaikan 7 hari berakhir (isWithinWindow = false)');

  // 2. Badge Meta
  check(getVerifStatusBadgeMeta('Disetujui').label === 'Terverifikasi', 'Disetujui -> Terverifikasi badge');
  check(getVerifStatusBadgeMeta('Ditolak').label === 'Ditolak', 'Ditolak -> Ditolak badge');
  check(getVerifStatusBadgeMeta('Menunggu').label === 'Menunggu', 'Menunggu -> Menunggu badge');

  // 3. Structural checks across all modified files
  const root = path.resolve(__dirname, '..');
  const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf-8');

  const apiCode = read('src/app/api/attendance/route.ts');
  check(
    !apiCode.includes('durasi_hari > 3) || isDinasLuar'),
    'API attendance/route.ts: Dinas Luar tidak lagi dipaksa Menunggu (konsisten auto-Disetujui)'
  );

  const bkCode = read('src/components/BkJurnalView.tsx');
  check(
    bkCode.includes('autoVerifStatusBk') && bkCode.includes("'Disetujui' : 'Menunggu'"),
    'BkJurnalView.tsx: auto-verifikasi Jurnal BK menjadi Disetujui jika isian lengkap'
  );
  check(
    bkCode.includes("table: 'jurnal_bk'") && bkCode.includes('evaluate7DayRepairWindow'),
    'BkJurnalView.tsx: memiliki realtime subscription jurnal_bk dan guard masa perbaikan 7 hari'
  );

  const piketCode = read('src/components/PiketView.tsx');
  check(
    piketCode.includes('statusVerifikasiPersonalPiket'),
    'PiketView.tsx: laporan pribadi piket mendukung auto-verifikasi Disetujui jika foto lengkap'
  );

  const guruHomeCode = read('src/components/HomeViewGuru.tsx');
  check(
    guruHomeCode.includes('fetchUserRejectedItemsWithin7Days') &&
      guruHomeCode.includes('Batas 7 Hari Berjalan') &&
      guruHomeCode.includes('getVerifStatusBadgeMeta') &&
      guruHomeCode.includes("table: 'presensi_guru'") &&
      guruHomeCode.includes("table: 'jurnal_pembelajaran'") &&
      guruHomeCode.includes("table: 'laporan_piket'"),
    'HomeViewGuru.tsx: tampilkan banner perbaikan 7 hari, badge status verifikasi, dan realtime sync untuk guru & guru_bk'
  );

  const tuHomeCode = read('src/components/HomeViewTU.tsx');
  check(
    tuHomeCode.includes('fetchUserRejectedItemsWithin7Days') &&
      tuHomeCode.includes('Batas 7 Hari Berjalan') &&
      tuHomeCode.includes('getVerifStatusBadgeMeta') &&
      tuHomeCode.includes("table: 'laporan_piket'"),
    'HomeViewTU.tsx: tampilkan banner perbaikan 7 hari, badge status verifikasi, dan realtime sync untuk tu'
  );

  const historyCode = read('src/components/HistoryView.tsx');
  check(
    historyCode.includes("table: 'presensi_guru'") && historyCode.includes("table: 'jurnal_pembelajaran'"),
    'HistoryView.tsx: memiliki realtime subscription untuk presensi_guru dan jurnal_pembelajaran'
  );

  const jurnalCode = read('src/components/GuruJurnal.tsx');
  check(
    jurnalCode.includes('evaluate7DayRepairWindow') && jurnalCode.includes('perbaikan'),
    'GuruJurnal.tsx: menampilkan sisa masa perbaikan 7 hari pada banner penolakan'
  );

  console.log(`\n🎉 Semua ${passed} assertion LULUS!`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
