import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type {
  Database,
  ChatMessage,
  ChatMessageInsert,
  ChatMessageUpdate,
  PengumumanDibaca,
  PengumumanDibacaInsert,
  PengumumanDibacaUpdate,
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
  console.log('MILESTONE M9.1 TEST: DATABASE SCHEMA & TYPES VERIFICATION');
  console.log('====================================================\n');

  // Test 1: Migration file verification
  console.log('--- Step 1: SQL Migration File ---');
  const migrationPath = path.resolve(__dirname, '..', 'supabase', 'migrations', '20260918_milestone9_schema.sql');
  assert(fs.existsSync(migrationPath), 'Migration file 20260918_milestone9_schema.sql exists');

  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
  assert(migrationContent.includes('jam_pulang_jumat TEXT DEFAULT'), 'Migration adds jam_pulang_jumat to pengaturan');
  assert(migrationContent.includes('guru_hanya_mengajar TEXT DEFAULT'), 'Migration adds guru_hanya_mengajar to pengaturan');
  assert(migrationContent.includes('wajib_hadir_hanya_mengajar BOOLEAN DEFAULT FALSE'), 'Migration adds wajib_hadir_hanya_mengajar to data_guru');
  assert(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.chat_messages'), 'Migration creates chat_messages table');
  assert(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.pengumuman_dibaca'), 'Migration creates pengumuman_dibaca table');
  assert(migrationContent.includes('ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;'), 'Migration adds chat_messages to supabase_realtime publication');
  assert(migrationContent.includes('ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;'), 'Migration enables RLS for chat_messages');
  assert(migrationContent.includes('ALTER TABLE public.pengumuman_dibaca ENABLE ROW LEVEL SECURITY;'), 'Migration enables RLS for pengumuman_dibaca');

  // Test 2: Types file verification
  console.log('\n--- Step 2: TypeScript Types ---');
  const typesPath = path.resolve(__dirname, '..', 'src', 'types', 'database.ts');
  assert(fs.existsSync(typesPath), 'TypeScript database types file exists');

  const typesContent = fs.readFileSync(typesPath, 'utf-8');
  assert(typesContent.includes('chat_messages:'), 'database.ts contains chat_messages table schema');
  assert(typesContent.includes('pengumuman_dibaca:'), 'database.ts contains pengumuman_dibaca table schema');
  assert(typesContent.includes('jam_pulang_jumat: string | null'), 'database.ts contains jam_pulang_jumat in pengaturan');
  assert(typesContent.includes('guru_hanya_mengajar: string | null'), 'database.ts contains guru_hanya_mengajar in pengaturan');
  assert(typesContent.includes('wajib_hadir_hanya_mengajar: boolean | null'), 'database.ts contains wajib_hadir_hanya_mengajar in data_guru');
  assert(typesContent.includes('export type ChatMessage ='), 'database.ts exports ChatMessage');
  assert(typesContent.includes('export type PengumumanDibaca ='), 'database.ts exports PengumumanDibaca');

  // Test 3: Live database schema and connectivity
  console.log('\n--- Step 3: Live Supabase Database Query ---');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jicvvqxjyzntdrccnuyz.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  // Test query chat_messages
  const { data: chatData, error: chatError } = await supabase.from('chat_messages').select('*').limit(1);
  assert(!chatError, 'chat_messages table is accessible via Supabase client', chatError?.message);

  // Test query pengumuman_dibaca
  const { data: readData, error: readError } = await supabase.from('pengumuman_dibaca').select('*').limit(1);
  assert(!readError, 'pengumuman_dibaca table is accessible via Supabase client', readError?.message);

  // Test query pengaturan columns
  const { data: configData, error: configError } = await supabase.from('pengaturan').select('id, jam_pulang_jumat, guru_hanya_mengajar').limit(1);
  assert(!configError, 'pengaturan table has jam_pulang_jumat and guru_hanya_mengajar queryable', configError?.message);

  // Test query data_guru column
  const { data: guruData, error: guruError } = await supabase.from('data_guru').select('id, wajib_hadir_hanya_mengajar').limit(1);
  assert(!guruError, 'data_guru table has wajib_hadir_hanya_mengajar queryable', guruError?.message);

  console.log('\n====================================================');
  console.log(`TOTAL TESTS RUN: 17`);
  console.log(`PASSED: ${17 - failureCount}`);
  console.log(`FAILED: ${failureCount}`);
  console.log('====================================================');

  if (failureCount > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL 17 M9.1 TESTS PASSED!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
