import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getConsolidatedMenuItems, evaluateTabRBAC } from '../src/lib/navigation';
import { isOrangTuaRole, expandDateRange, buildAbsensiRowsFromIzin } from '../src/lib/kolaborasiSync';

console.log('Running Ruang Kolaborasi Guru & Orang Tua verification tests...');

// 1. Role detection
assert.equal(isOrangTuaRole('orang_tua'), true);
assert.equal(isOrangTuaRole('Orang Tua'), true);
assert.equal(isOrangTuaRole('wali_murid'), true);
assert.equal(isOrangTuaRole('guru'), false);

// 2. Consolidated menu items include view-kolaborasi for orang_tua, guru, bk, admin, kepsek
const ortuMenu = getConsolidatedMenuItems({ role: 'orang_tua' });
assert.deepEqual(
  ortuMenu.map((m) => m.id),
  ['view-kolaborasi', 'view-informasi', 'view-pengaturan-akun']
);

for (const role of ['guru', 'bk', 'admin', 'kepalasekolah']) {
  const menu = getConsolidatedMenuItems({ role });
  assert.ok(
    menu.some((m) => m.id === 'view-kolaborasi'),
    `Role ${role} should have view-kolaborasi in consolidated menu`
  );
}

// 3. RBAC isolation for orang_tua
assert.equal(evaluateTabRBAC('view-kolaborasi', '', { role: 'orang_tua' }).allowed, true);
assert.equal(evaluateTabRBAC('view-informasi', '', { role: 'orang_tua' }).allowed, true);
assert.equal(evaluateTabRBAC('view-pengaturan-akun', '', { role: 'orang_tua' }).allowed, true);
const blockedAdmin = evaluateTabRBAC('view-admin-data', '', { role: 'orang_tua' });
assert.equal(blockedAdmin.allowed, false);
assert.equal(blockedAdmin.fallbackTab, 'view-kolaborasi');
const blockedJurnalBk = evaluateTabRBAC('view-jurnal-bk', '', { role: 'orang_tua' });
assert.equal(blockedJurnalBk.allowed, false);

// 4. BK role allowed to access view-kolaborasi
assert.equal(evaluateTabRBAC('view-kolaborasi', '', { role: 'bk', isBk: true }).allowed, true);

// 5. Date range & absensi sync payload builder
const dates = expandDateRange('2026-11-25', '2026-11-27');
assert.deepEqual(dates, ['2026-11-25', '2026-11-26', '2026-11-27']);

const absensiRows = buildAbsensiRowsFromIzin({
  sekolahId: 'sch-1',
  siswaId: 'sis-1',
  nisn: '123456',
  namaSiswa: 'Budi',
  kelas: 'X-A',
  tanggalMulai: '2026-11-25',
  tanggalSelesai: '2026-11-26',
  jenis: 'Sakit',
  alasan: 'Demam tinggi',
  diubahOleh: 'Wali Kelas A',
});
assert.equal(absensiRows.length, 2);
assert.equal(absensiRows[0].status, 'Sakit');
assert.equal(absensiRows[0].sumber_perubahan, 'Izin Orang Tua');
assert.equal(absensiRows[1].tanggal, '2026-11-26');

// 6. Migration SQL file exists and defines all 4 tables
const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20261125_ruang_kolaborasi_ortu.sql');
assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
const sql = fs.readFileSync(migrationPath, 'utf8');
for (const tbl of ['orang_tua_siswa', 'kolaborasi_topik', 'kolaborasi_pesan', 'izin_siswa_ortu']) {
  assert.ok(sql.includes(`public.${tbl}`), `Migration must define public.${tbl}`);
}

console.log('✅ All Ruang Kolaborasi Guru & Orang Tua tests passed!');
