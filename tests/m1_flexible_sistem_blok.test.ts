import fs from 'fs';
import path from 'path';
import assert from 'assert';
import type {
  Database,
  TargetBlokType,
  SistemBlok,
  SistemBlokInsert,
  SistemBlokUpdate,
} from '../src/types/database';

console.log('=================================================================');
console.log('MILESTONE 1 VERIFICATION: FLEXIBLE SISTEM BLOK SCHEMA, TYPES & UI');
console.log('=================================================================\n');

let passed = 0;
let failed = 0;

function testAssert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${label}`);
    if (detail) console.error(`   ${detail}`);
    failed++;
  }
}

// -------------------------------------------------------------
// Section 1: Canonical SQL Migration Verification
// -------------------------------------------------------------
console.log('--- 1. Canonical Migration File Verification ---');
const migrationPath = path.resolve(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20261102_flexible_sistem_blok.sql'
);

testAssert(fs.existsSync(migrationPath), 'Migration file exists: supabase/migrations/20261102_flexible_sistem_blok.sql');

const sqlContent = fs.readFileSync(migrationPath, 'utf8');

// Target scope columns
testAssert(
  sqlContent.includes("ADD COLUMN IF NOT EXISTS tipe_target TEXT NOT NULL DEFAULT 'sekolah'"),
  'Migration adds tipe_target with DEFAULT sekolah'
);
testAssert(
  sqlContent.includes('ADD COLUMN IF NOT EXISTS target_angkatan TEXT DEFAULT NULL'),
  'Migration adds target_angkatan column'
);
testAssert(
  sqlContent.includes('ADD COLUMN IF NOT EXISTS target_kelas TEXT DEFAULT NULL'),
  'Migration adds target_kelas column'
);
testAssert(
  sqlContent.includes('ADD COLUMN IF NOT EXISTS target_guru_id UUID REFERENCES public.data_guru(id)'),
  'Migration adds target_guru_id column with FK reference to public.data_guru(id)'
);
testAssert(
  sqlContent.includes('ADD COLUMN IF NOT EXISTS target_guru_nama TEXT DEFAULT NULL'),
  'Migration adds target_guru_nama column'
);

// Time range columns
testAssert(
  sqlContent.includes('ADD COLUMN IF NOT EXISTS is_full_day BOOLEAN NOT NULL DEFAULT true'),
  'Migration adds is_full_day column with DEFAULT true'
);
testAssert(
  sqlContent.includes('ADD COLUMN IF NOT EXISTS jam_mulai TEXT DEFAULT NULL'),
  'Migration adds jam_mulai column'
);
testAssert(
  sqlContent.includes('ADD COLUMN IF NOT EXISTS jam_selesai TEXT DEFAULT NULL'),
  'Migration adds jam_selesai column'
);

// Check constraint
testAssert(
  sqlContent.includes("CHECK (tipe_target IN ('sekolah', 'angkatan', 'kelas', 'guru'))"),
  'Migration enforces check constraint for tipe_target (sekolah, angkatan, kelas, guru)'
);

// Idempotent backfill
testAssert(
  sqlContent.includes("UPDATE public.sistem_blok\nSET tipe_target = 'sekolah'") ||
  sqlContent.includes("UPDATE public.sistem_blok SET tipe_target = 'sekolah'"),
  'Migration backfills existing rows with tipe_target = sekolah'
);
testAssert(
  sqlContent.includes("UPDATE public.sistem_blok\nSET is_full_day = true") ||
  sqlContent.includes("UPDATE public.sistem_blok SET is_full_day = true"),
  'Migration backfills existing rows with is_full_day = true'
);

// Performance indexes
testAssert(
  sqlContent.includes('CREATE INDEX IF NOT EXISTS idx_sistem_blok_tipe_target ON public.sistem_blok(tipe_target)'),
  'Migration creates index on tipe_target'
);
testAssert(
  sqlContent.includes('CREATE INDEX IF NOT EXISTS idx_sistem_blok_target_angkatan ON public.sistem_blok(target_angkatan)'),
  'Migration creates index on target_angkatan'
);
testAssert(
  sqlContent.includes('CREATE INDEX IF NOT EXISTS idx_sistem_blok_target_kelas ON public.sistem_blok(target_kelas)'),
  'Migration creates index on target_kelas'
);
testAssert(
  sqlContent.includes('CREATE INDEX IF NOT EXISTS idx_sistem_blok_target_guru_id ON public.sistem_blok(target_guru_id)'),
  'Migration creates index on target_guru_id'
);
testAssert(
  sqlContent.includes('CREATE INDEX IF NOT EXISTS idx_sistem_blok_time_range ON public.sistem_blok(is_full_day, jam_mulai, jam_selesai)'),
  'Migration creates composite index on time range'
);

// Schema cache reload
testAssert(
  sqlContent.includes("NOTIFY pgrst, 'reload schema'"),
  'Migration issues NOTIFY pgrst reload schema command'
);

// -------------------------------------------------------------
// Section 2: TypeScript Database Types Verification
// -------------------------------------------------------------
console.log('\n--- 2. TypeScript Types Verification ---');
const dbTypesPath = path.resolve(__dirname, '..', 'src', 'types', 'database.ts');
const dbTypesContent = fs.readFileSync(dbTypesPath, 'utf8');

testAssert(
  dbTypesContent.includes("export type TargetBlokType = 'sekolah' | 'angkatan' | 'kelas' | 'guru'"),
  'database.ts exports TargetBlokType definition'
);

// Conformance check via mock shapes
const mockSchoolBlock: SistemBlok = {
  id: '00000000-0000-0000-0000-000000000001',
  sekolah_id: 'a0000000-0000-0000-0000-000000000001',
  nama_kegiatan: 'Pelatihan Hari Santri',
  deskripsi: 'Semua guru mengisi jurnal kegiatan',
  tanggal_mulai: '2026-11-02',
  tanggal_selesai: '2026-11-05',
  tipe_target: 'sekolah',
  target_angkatan: null,
  target_kelas: null,
  target_guru_id: null,
  target_guru_nama: null,
  is_full_day: true,
  jam_mulai: null,
  jam_selesai: null,
  created_at: '2026-11-02T12:00:00Z',
  updated_at: '2026-11-02T12:00:00Z',
};

const mockAngkatanBlock: SistemBlok = {
  ...mockSchoolBlock,
  id: '00000000-0000-0000-0000-000000000002',
  tipe_target: 'angkatan',
  target_angkatan: '10',
  is_full_day: false,
  jam_mulai: '08:00',
  jam_selesai: '10:30',
};

const mockKelasBlock: SistemBlok = {
  ...mockSchoolBlock,
  id: '00000000-0000-0000-0000-000000000003',
  tipe_target: 'kelas',
  target_kelas: 'X Merdeka',
};

const mockGuruBlock: SistemBlok = {
  ...mockSchoolBlock,
  id: '00000000-0000-0000-0000-000000000004',
  tipe_target: 'guru',
  target_guru_id: 'c75c7712-7eab-4929-bf3b-172cafffcda2',
  target_guru_nama: 'Saskia Agow',
};

testAssert(mockSchoolBlock.tipe_target === 'sekolah', 'SistemBlok conforms to sekolah target');
testAssert(mockAngkatanBlock.tipe_target === 'angkatan' && mockAngkatanBlock.target_angkatan === '10', 'SistemBlok conforms to angkatan target');
testAssert(mockKelasBlock.tipe_target === 'kelas' && mockKelasBlock.target_kelas === 'X Merdeka', 'SistemBlok conforms to kelas target');
testAssert(mockGuruBlock.tipe_target === 'guru' && mockGuruBlock.target_guru_id !== null, 'SistemBlok conforms to guru target');
testAssert(mockAngkatanBlock.is_full_day === false && mockAngkatanBlock.jam_mulai === '08:00', 'SistemBlok conforms to time range fields');

// Test Insert and Update shapes
const mockInsert: SistemBlokInsert = {
  nama_kegiatan: 'Kegiatan Angkatan 11',
  tanggal_mulai: '2026-11-03',
  tanggal_selesai: '2026-11-03',
  tipe_target: 'angkatan',
  target_angkatan: '11',
  is_full_day: true,
};
testAssert(mockInsert.tipe_target === 'angkatan', 'SistemBlokInsert supports flexible target attributes');

const mockUpdate: SistemBlokUpdate = {
  is_full_day: false,
  jam_mulai: '07:30',
  jam_selesai: '11:00',
};
testAssert(mockUpdate.jam_mulai === '07:30', 'SistemBlokUpdate supports flexible time range attributes');

// -------------------------------------------------------------
// Section 3: Admin Configuration UI (SistemBlokView.tsx)
// -------------------------------------------------------------
console.log('\n--- 3. Admin Configuration UI Verification ---');
const viewPath = path.resolve(__dirname, '..', 'src', 'components', 'SistemBlokView.tsx');
const viewContent = fs.readFileSync(viewPath, 'utf8');

// Target Scope Configuration UI
testAssert(
  viewContent.includes('Cakupan Target Pemblokiran') &&
  viewContent.includes('Keseluruhan Sekolah') &&
  viewContent.includes('Per Angkatan') &&
  viewContent.includes('Per Kelas') &&
  viewContent.includes('Per Guru'),
  'SistemBlokView renders all 4 target scope options: Keseluruhan Sekolah, Per Angkatan, Per Kelas, Per Guru'
);

testAssert(
  viewContent.includes('tipeTarget === \'angkatan\'') &&
  viewContent.includes('Pilih Angkatan Target'),
  'SistemBlokView conditionally displays angkatan selector when Per Angkatan is active'
);

testAssert(
  viewContent.includes('tipeTarget === \'kelas\'') &&
  viewContent.includes('Pilih Kelas Target'),
  'SistemBlokView conditionally displays class selector when Per Kelas is active'
);

testAssert(
  viewContent.includes('tipeTarget === \'guru\'') &&
  viewContent.includes('Pilih Guru Target'),
  'SistemBlokView conditionally displays teacher selector when Per Guru is active'
);

testAssert(
  viewContent.includes('tipeTarget === \'sekolah\'') &&
  viewContent.includes('Aturan blok berlaku untuk seluruh siswa, guru, dan jadwal KBM di sekolah'),
  'SistemBlokView displays informative banner for whole-school block'
);

// Time Range Configuration UI
testAssert(
  viewContent.includes('Berlaku Sepanjang Hari (Full Day)') &&
  viewContent.includes('isFullDay'),
  'SistemBlokView renders full-day toggle/checkbox'
);

testAssert(
  viewContent.includes('!isFullDay') &&
  viewContent.includes('Jam Mulai') &&
  viewContent.includes('Jam Selesai'),
  'SistemBlokView renders time range inputs (jam_mulai, jam_selesai) when full-day is unchecked'
);

// Form Validations
testAssert(
  viewContent.includes("tipeTarget === 'angkatan' && !targetAngkatan") &&
  viewContent.includes('Silakan pilih angkatan target pemblokiran'),
  'SistemBlokView validates required target angkatan selection'
);

testAssert(
  viewContent.includes("tipeTarget === 'kelas' && !targetKelas") &&
  viewContent.includes('Silakan pilih kelas target pemblokiran'),
  'SistemBlokView validates required target kelas selection'
);

testAssert(
  viewContent.includes("tipeTarget === 'guru' && !targetGuruId") &&
  viewContent.includes('Silakan pilih guru target pemblokiran'),
  'SistemBlokView validates required target guru selection'
);

testAssert(
  viewContent.includes('jamMulai >= jamSelesai') &&
  viewContent.includes('Jam selesai harus lebih akhir dari jam mulai'),
  'SistemBlokView validates that jam_selesai is after jam_mulai'
);

// Edit Modal Form
testAssert(
  viewContent.includes('editTipeTarget') &&
  viewContent.includes('editIsFullDay') &&
  viewContent.includes('editJamMulai') &&
  viewContent.includes('editJamSelesai'),
  'SistemBlokView edit modal supports editing target scope and time range'
);

testAssert(
  viewContent.includes('setEditTipeTarget((item.tipe_target as TargetBlokType) || \'sekolah\')') &&
  viewContent.includes('setEditIsFullDay(item.is_full_day ?? true)'),
  'openEditModal pre-populates target scope and time range from block entity'
);

// Rule Badges in Cards
testAssert(
  viewContent.includes('Semua Sekolah') &&
  viewContent.includes('Angkatan {item.target_angkatan}') &&
  viewContent.includes('Kelas {item.target_kelas}') &&
  viewContent.includes('Guru: {item.target_guru_nama || \'Guru Terpilih\'}'),
  'SistemBlokView renders informative target scope badges on rule cards'
);

testAssert(
  viewContent.includes('Sepanjang Hari') &&
  viewContent.includes('{item.jam_mulai || \'00:00\'} - {item.jam_selesai || \'23:59\'}'),
  'SistemBlokView renders informative time range badges on rule cards'
);

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n=================================================================');
console.log(`TOTAL TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('=================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL MILESTONE 1 VERIFICATION TESTS PASSED SUCCESSFULLY!');
}
