import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type {
  Database,
  PenugasanPiket,
  Pengumuman,
  PengumumanTanggapan,
  BankDokumen,
  DataGuru,
  GuruMapel,
} from '../src/types/database';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

let failureCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
    failureCount++;
  } else {
    console.log(`✅ PASS: ${testName}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('MILESTONE M6.1 TEST: DATABASE SCHEMA & TYPES VERIFICATION');
  console.log('====================================================\n');

  // Test 1: Migration file verification
  console.log('--- Step 1: SQL Migration File ---');
  const migrationPath = path.resolve(__dirname, '..', 'supabase', 'migrations', '20260912_m6_overhaul.sql');
  assert(fs.existsSync(migrationPath), 'Migration file 20260912_m6_overhaul.sql exists');

  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
  assert(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.penugasan_piket'), 'Migration creates penugasan_piket table');
  assert(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.pengumuman'), 'Migration creates pengumuman table');
  assert(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.pengumuman_tanggapan'), 'Migration creates pengumuman_tanggapan table');
  assert(migrationContent.includes('ALTER TABLE public.bank_dokumen ADD COLUMN IF NOT EXISTS mapel TEXT;'), 'Migration adds mapel column to bank_dokumen');
  assert(migrationContent.includes('ALTER TABLE public.penugasan_piket ENABLE ROW LEVEL SECURITY;'), 'Migration enables RLS for penugasan_piket');

  // Test 2: Types file verification
  console.log('\n--- Step 2: TypeScript Types ---');
  const typesPath = path.resolve(__dirname, '..', 'src', 'types', 'database.ts');
  assert(fs.existsSync(typesPath), 'TypeScript database types file exists');

  const typesContent = fs.readFileSync(typesPath, 'utf-8');
  assert(typesContent.includes('penugasan_piket:'), 'database.ts contains penugasan_piket schema');
  assert(typesContent.includes('pengumuman:'), 'database.ts contains pengumuman schema');
  assert(typesContent.includes('pengumuman_tanggapan:'), 'database.ts contains pengumuman_tanggapan schema');
  assert(typesContent.includes('export type PenugasanPiket ='), 'database.ts exports PenugasanPiket');
  assert(typesContent.includes('export type Pengumuman ='), 'database.ts exports Pengumuman');
  assert(typesContent.includes('export type PengumumanTanggapan ='), 'database.ts exports PengumumanTanggapan');
  assert(typesContent.includes('export type BankDokumen ='), 'database.ts exports BankDokumen');

  // Test 3: Live database schema and connectivity
  console.log('\n--- Step 3: Live Supabase Database Query ---');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  assert(Boolean(supabaseUrl && supabaseKey), 'Supabase environment variables present');

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  // 3.1 Penugasan Piket
  const { data: piketData, error: piketError } = await supabase
    .from('penugasan_piket')
    .select('*')
    .order('hari');

  assert(!piketError, 'Query public.penugasan_piket executes without error', piketError?.message);
  assert(Array.isArray(piketData) && piketData.length > 0, 'public.penugasan_piket contains seeded records', `Count: ${piketData?.length}`);

  const guruPiket = piketData?.filter((p) => p.tipe_petugas === 'Guru') || [];
  const siswaPiket = piketData?.filter((p) => p.tipe_petugas === 'Siswa') || [];
  assert(guruPiket.length >= 6, 'public.penugasan_piket contains at least 6 teacher assignments', `Found: ${guruPiket.length}`);
  assert(siswaPiket.length >= 1, 'public.penugasan_piket contains student assignments', `Found: ${siswaPiket.length}`);

  // 3.2 Pengumuman
  const { data: pengumumanData, error: pengumumanError } = await supabase
    .from('pengumuman')
    .select('*')
    .order('created_at', { ascending: false });

  assert(!pengumumanError, 'Query public.pengumuman executes without error', pengumumanError?.message);
  assert(Array.isArray(pengumumanData) && pengumumanData.length > 0, 'public.pengumuman contains seeded broadcasts', `Count: ${pengumumanData?.length}`);

  // 3.3 Pengumuman Tanggapan
  const { data: tanggapanData, error: tanggapanError } = await supabase
    .from('pengumuman_tanggapan')
    .select('*');

  assert(!tanggapanError, 'Query public.pengumuman_tanggapan executes without error', tanggapanError?.message);
  assert(Array.isArray(tanggapanData) && tanggapanData.length > 0, 'public.pengumuman_tanggapan contains responses', `Count: ${tanggapanData?.length}`);

  // 3.4 Bank Dokumen with mapel
  const { data: dokumenData, error: dokumenError } = await supabase
    .from('bank_dokumen')
    .select('id, mapel, kelas')
    .limit(1);

  assert(!dokumenError, 'Query public.bank_dokumen with mapel and kelas executes without error', dokumenError?.message);

  console.log('\n====================================================');
  if (failureCount > 0) {
    console.error(`❌ TEST SUITE FAILED with ${failureCount} failure(s)`);
    process.exit(1);
  } else {
    console.log('🎉 ALL M6.1 DATABASE & TYPES TESTS PASSED SUCCESSFULLY!');
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
