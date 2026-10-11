import fs from 'fs';
import path from 'path';
import type {
  Database,
  CapaianPembelajaran,
  CapaianPembelajaranInsert,
  CapaianPembelajaranUpdate,
  TujuanPembelajaran,
  TujuanPembelajaranInsert,
  TujuanPembelajaranUpdate,
  AsesmenKolom,
  AsesmenKolomInsert,
  AsesmenKolomUpdate,
  BobotNilaiMapel,
} from '../src/types/database';
import { DEFAULT_BOBOT_NILAI_MAPEL } from '../src/types/database';

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  MILESTONE 1 VERIFICATION: DATABASE MIGRATION & TYPESCRIPT TYPES    ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✔ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  ✘ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failCount++;
  }
}

// ━━━ 1. CANONICAL SQL MIGRATION FILE VERIFICATION ━━━
console.log('━━━ 1. CANONICAL SQL MIGRATION FILE VERIFICATION ━━━');
const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql'
);
assert(fs.existsSync(migrationPath), 'Migration file exists at supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql');

const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

assert(
  sqlContent.includes('CREATE TABLE IF NOT EXISTS public.capaian_pembelajaran'),
  'Creates table public.capaian_pembelajaran with IF NOT EXISTS'
);

// Verify columns in capaian_pembelajaran
assert(sqlContent.includes('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'), 'Column id UUID PRIMARY KEY');
assert(sqlContent.includes('sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE'), 'Column sekolah_id UUID FK to sekolah');
assert(sqlContent.includes('guru_mapel_id UUID REFERENCES public.guru_mapel(id) ON DELETE SET NULL'), 'Column guru_mapel_id UUID FK to guru_mapel');
assert(sqlContent.includes('nama_mapel TEXT NOT NULL'), 'Column nama_mapel TEXT NOT NULL');
assert(sqlContent.includes('kelas TEXT NOT NULL'), 'Column kelas TEXT NOT NULL');
assert(sqlContent.includes("semester TEXT NOT NULL DEFAULT 'Ganjil'"), 'Column semester TEXT DEFAULT Ganjil');
assert(sqlContent.includes("tahun_ajaran TEXT NOT NULL DEFAULT '2024/2025'"), 'Column tahun_ajaran TEXT DEFAULT 2024/2025');
assert(sqlContent.includes('kode_cp TEXT NOT NULL'), 'Column kode_cp TEXT NOT NULL');
assert(sqlContent.includes('deskripsi TEXT NOT NULL'), 'Column deskripsi TEXT NOT NULL');
assert(sqlContent.includes('urutan INTEGER NOT NULL DEFAULT 1'), 'Column urutan INTEGER DEFAULT 1');

// Verify indexes on capaian_pembelajaran
assert(
  sqlContent.includes('idx_cp_sekolah_mapel_kelas') &&
    sqlContent.includes('ON public.capaian_pembelajaran(sekolah_id, nama_mapel, kelas)'),
  'Index idx_cp_sekolah_mapel_kelas created'
);
assert(
  sqlContent.includes('idx_cp_guru_mapel_id') &&
    sqlContent.includes('ON public.capaian_pembelajaran(guru_mapel_id)'),
  'Index idx_cp_guru_mapel_id created'
);
assert(
  sqlContent.includes('idx_cp_semester_tahun') &&
    sqlContent.includes('ON public.capaian_pembelajaran(sekolah_id, semester, tahun_ajaran)'),
  'Index idx_cp_semester_tahun created'
);

// Verify cp_id in tujuan_pembelajaran
assert(
  sqlContent.includes('ALTER TABLE public.tujuan_pembelajaran') &&
    sqlContent.includes('ADD COLUMN IF NOT EXISTS cp_id UUID REFERENCES public.capaian_pembelajaran(id) ON DELETE SET NULL'),
  'cp_id added to public.tujuan_pembelajaran with ON DELETE SET NULL'
);
assert(sqlContent.includes('idx_tp_cp_id'), 'Index idx_tp_cp_id created');

// Verify keterangan in asesmen_kolom
assert(
  sqlContent.includes('ALTER TABLE public.asesmen_kolom') &&
    sqlContent.includes('ADD COLUMN IF NOT EXISTS keterangan TEXT'),
  'keterangan column added to public.asesmen_kolom'
);

// Verify partial unique index for Diagnostik limit
assert(
  sqlContent.includes('CREATE UNIQUE INDEX IF NOT EXISTS uq_asesmen_tp_diagnostik') &&
    sqlContent.includes("ON public.asesmen_kolom(tp_id)") &&
    sqlContent.includes("WHERE (kategori = 'Diagnostik')"),
  'Partial unique index uq_asesmen_tp_diagnostik enforces max 1 Diagnostik per TP'
);

// Verify RLS policies
assert(sqlContent.includes('ALTER TABLE public.capaian_pembelajaran ENABLE ROW LEVEL SECURITY'), 'RLS enabled for capaian_pembelajaran');
assert(sqlContent.includes('capaian_pembelajaran_select_policy'), 'RLS select policy created');
assert(sqlContent.includes('capaian_pembelajaran_modify_policy'), 'RLS modify policy created');
assert(sqlContent.includes('GRANT ALL ON public.capaian_pembelajaran TO anon, authenticated, service_role'), 'Permissions granted');

// Verify idempotent seed for pengaturan
assert(
  sqlContent.includes("INSERT INTO public.pengaturan (sekolah_id, key, value)") &&
    sqlContent.includes("'bobot_nilai_mapel'") &&
    sqlContent.includes("'{\"kehadiran\":40,\"formatif\":30,\"sumatif\":30}'") &&
    sqlContent.includes('ON CONFLICT (sekolah_id, key) DO NOTHING'),
  'Idempotent seed for bobot_nilai_mapel in public.pengaturan'
);

// ━━━ 2. CLEANUP OF DRAFT DIRECTORY ━━━
console.log('\n━━━ 2. CLEANUP OF DRAFT DIRECTORY ━━━');
const draftPath = path.resolve(process.cwd(), 'migrations/add_cp_and_gradebook_v2.sql');
assert(!fs.existsSync(draftPath), 'Draft migrations/add_cp_and_gradebook_v2.sql successfully cleaned up');

// ━━━ 3. TYPESCRIPT INTERFACES AND TYPE SAFETY ━━━
console.log('\n━━━ 3. TYPESCRIPT INTERFACES AND TYPE SAFETY ━━━');

// Check DEFAULT_BOBOT_NILAI_MAPEL constant values
assert(DEFAULT_BOBOT_NILAI_MAPEL.kehadiran === 40, 'DEFAULT_BOBOT_NILAI_MAPEL.kehadiran === 40');
assert(DEFAULT_BOBOT_NILAI_MAPEL.formatif === 30, 'DEFAULT_BOBOT_NILAI_MAPEL.formatif === 30');
assert(DEFAULT_BOBOT_NILAI_MAPEL.sumatif === 30, 'DEFAULT_BOBOT_NILAI_MAPEL.sumatif === 30');
const totalBobot =
  DEFAULT_BOBOT_NILAI_MAPEL.kehadiran +
  DEFAULT_BOBOT_NILAI_MAPEL.formatif +
  DEFAULT_BOBOT_NILAI_MAPEL.sumatif;
assert(totalBobot === 100, `Total default bobot equals 100% (was ${totalBobot}%)`);

// Static type validation using mock data matching Database shapes
const mockCPRow: CapaianPembelajaran = {
  id: '00000000-0000-0000-0000-000000000001',
  sekolah_id: '00000000-0000-0000-0000-000000000002',
  guru_mapel_id: '00000000-0000-0000-0000-000000000003',
  nama_mapel: 'Matematika',
  kelas: '7A',
  semester: 'Ganjil',
  tahun_ajaran: '2024/2025',
  kode_cp: 'CP-01',
  deskripsi: 'Memahami konsep bilangan bulat dan operasinya',
  urutan: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
assert(mockCPRow.kode_cp === 'CP-01' && mockCPRow.deskripsi.length > 0, 'CapaianPembelajaran Row shape conforms to interface');

const mockCPInsert: CapaianPembelajaranInsert = {
  nama_mapel: 'Matematika',
  kelas: '7A',
  kode_cp: 'CP-01',
  deskripsi: 'Memahami konsep bilangan bulat',
};
assert(mockCPInsert.nama_mapel === 'Matematika', 'CapaianPembelajaranInsert allows minimal required insert fields');

const mockCPUpdate: CapaianPembelajaranUpdate = {
  deskripsi: 'Updated deskripsi CP',
  urutan: 2,
};
assert(mockCPUpdate.deskripsi === 'Updated deskripsi CP', 'CapaianPembelajaranUpdate shape allows partial updates');

// Verify TujuanPembelajaran has cp_id field
const mockTPRow: TujuanPembelajaran = {
  id: '00000000-0000-0000-0000-000000000010',
  cp_id: mockCPRow.id,
  sekolah_id: mockCPRow.sekolah_id,
  guru_id: null,
  nama_guru: 'Budi Santoso',
  mapel_id: null,
  nama_mapel: 'Matematika',
  kelas: '7A',
  kode_tp: 'TP-01',
  deskripsi: 'Siswa dapat menjumlahkan bilangan negatif',
  semester: 'Ganjil',
  tahun_ajaran: '2024/2025',
  urutan: 1,
  created_at: null,
  updated_at: null,
};
assert(mockTPRow.cp_id === mockCPRow.id, 'TujuanPembelajaran Row contains cp_id linking to CapaianPembelajaran');

const mockTPInsert: TujuanPembelajaranInsert = {
  cp_id: mockCPRow.id,
  nama_guru: 'Budi Santoso',
  nama_mapel: 'Matematika',
  kelas: '7A',
  kode_tp: 'TP-01',
  deskripsi: 'TP with parent CP',
};
assert(mockTPInsert.cp_id === mockCPRow.id, 'TujuanPembelajaranInsert supports optional cp_id');

// Verify AsesmenKolom has keterangan field
const mockAsesmenRow: AsesmenKolom = {
  id: '00000000-0000-0000-0000-000000000020',
  sekolah_id: mockCPRow.sekolah_id,
  tp_id: mockTPRow.id,
  kategori: 'Diagnostik',
  keterangan: 'Asesmen awal diagnostik pemahaman awal siswa',
  nama: 'Diagnostik 1',
  bobot: 1,
  urutan: 1,
  created_at: null,
  updated_at: null,
};
assert(mockAsesmenRow.keterangan === 'Asesmen awal diagnostik pemahaman awal siswa', 'AsesmenKolom Row contains keterangan field');

const mockAsesmenInsert: AsesmenKolomInsert = {
  tp_id: mockTPRow.id,
  kategori: 'Formatif',
  nama: 'Formatif 1',
  keterangan: 'Kuis mingguan materi 1',
};
assert(mockAsesmenInsert.keterangan === 'Kuis mingguan materi 1', 'AsesmenKolomInsert supports optional keterangan field');

// Verify Database table relationships in Database type
type TPRelationships = Database['public']['Tables']['tujuan_pembelajaran']['Relationships'];
type CPRelationships = Database['public']['Tables']['capaian_pembelajaran']['Relationships'];

// Compile-time checks on Relationships
const tpRelMatches: TPRelationships = [
  {
    foreignKeyName: 'tujuan_pembelajaran_cp_id_fkey',
    columns: ['cp_id'],
    isOneToOne: false,
    referencedRelation: 'capaian_pembelajaran',
    referencedColumns: ['id'],
  },
  {
    foreignKeyName: 'tujuan_pembelajaran_guru_id_fkey',
    columns: ['guru_id'],
    isOneToOne: false,
    referencedRelation: 'data_guru',
    referencedColumns: ['id'],
  },
  {
    foreignKeyName: 'tujuan_pembelajaran_sekolah_id_fkey',
    columns: ['sekolah_id'],
    isOneToOne: false,
    referencedRelation: 'sekolah',
    referencedColumns: ['id'],
  },
];
assert(tpRelMatches.length === 3, 'tujuan_pembelajaran Relationships type definition includes capaian_pembelajaran FK');

const cpRelMatches: CPRelationships = [
  {
    foreignKeyName: 'capaian_pembelajaran_sekolah_id_fkey',
    columns: ['sekolah_id'],
    isOneToOne: false,
    referencedRelation: 'sekolah',
    referencedColumns: ['id'],
  },
  {
    foreignKeyName: 'capaian_pembelajaran_guru_mapel_id_fkey',
    columns: ['guru_mapel_id'],
    isOneToOne: false,
    referencedRelation: 'guru_mapel',
    referencedColumns: ['id'],
  },
];
assert(cpRelMatches.length === 2, 'capaian_pembelajaran Relationships type definition includes sekolah and guru_mapel FKs');

console.log('\n══════════════════════════════════════════════════════════════════════');
console.log(`SUMMARY: Total ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
if (failCount > 0) {
  console.error('VERDICT: MILESTONE 1 VERIFICATION FAILED!');
  process.exit(1);
} else {
  console.log('VERDICT: ALL MILESTONE 1 VERIFICATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}
