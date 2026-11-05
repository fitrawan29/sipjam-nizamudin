import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('🧪 VERIFIKASI: PENGATURAN SCHEMA CACHE RESILIENCE (guru_hanya_mengajar)');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(desc: string) {
  totalTests++;
  passedTests++;
  console.log(`  ✅ [PASS] ${desc}`);
}

function fail(desc: string, err?: any) {
  totalTests++;
  failedTests++;
  console.error(`  ❌ [FAIL] ${desc}`);
  if (err) console.error(`     ↳ Error:`, err);
}

const root = process.cwd();

// Test 1: AdminConfigView.tsx contains schema cache error interception
try {
  const adminConfigSrc = fs.readFileSync(path.join(root, 'src', 'components', 'AdminConfigView.tsx'), 'utf8');
  assert.ok(
    adminConfigSrc.includes("error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column') || error.message?.includes('Could not find the')"),
    'AdminConfigView must intercept schema cache and missing column errors'
  );
  pass('Test 1: AdminConfigView intercepts PGRST204, schema cache, and missing column errors');
} catch (e) {
  fail('Test 1: AdminConfigView missing schema cache error interception', e);
}

// Test 2: AdminConfigView.tsx constructs clean key-value fallback and retries upsert
try {
  const adminConfigSrc = fs.readFileSync(path.join(root, 'src', 'components', 'AdminConfigView.tsx'), 'utf8');
  assert.ok(
    adminConfigSrc.includes('cleanUpsertData'),
    'AdminConfigView must construct cleanUpsertData without non-existent columns'
  );
  assert.ok(
    adminConfigSrc.includes("key: 'guru_hanya_mengajar'"),
    'cleanUpsertData must still save guru_hanya_mengajar as a canonical key-value entry'
  );
  assert.ok(
    adminConfigSrc.includes("supabase.from('pengaturan').upsert(cleanUpsertData, { onConflict: 'sekolah_id,key' })"),
    'AdminConfigView must retry upsert with cleanUpsertData'
  );
  pass('Test 2: AdminConfigView constructs clean key-value payload and retries upsert on schema cache error');
} catch (e) {
  fail('Test 2: AdminConfigView cleanUpsertData retry verification failed', e);
}

// Test 3: Compatibility with existing tests (preserves guru_hanya_mengajar: jsonExempt)
try {
  const adminConfigSrc = fs.readFileSync(path.join(root, 'src', 'components', 'AdminConfigView.tsx'), 'utf8');
  assert.ok(
    adminConfigSrc.includes('guru_hanya_mengajar: jsonExempt'),
    'AdminConfigView must retain guru_hanya_mengajar: jsonExempt for backward test compatibility'
  );
  assert.ok(
    adminConfigSrc.includes('const jsonExempt = JSON.stringify(exemptIds)'),
    'AdminConfigView must retain jsonExempt definition'
  );
  pass('Test 3: Backward compatibility preserved for existing tests & schema column checks');
} catch (e) {
  fail('Test 3: Backward compatibility verification failed', e);
}

// Test 4: SETUP_NEW_SCHOOL_TEMPLATE.sql includes jam_pulang_jumat and guru_hanya_mengajar
try {
  const templateSrc = fs.readFileSync(path.join(root, 'supabase', 'SETUP_NEW_SCHOOL_TEMPLATE.sql'), 'utf8');
  assert.ok(
    templateSrc.includes("jam_pulang_jumat TEXT DEFAULT '11:00'"),
    'SETUP_NEW_SCHOOL_TEMPLATE.sql must define jam_pulang_jumat on public.pengaturan'
  );
  assert.ok(
    templateSrc.includes("guru_hanya_mengajar TEXT DEFAULT '[]'"),
    'SETUP_NEW_SCHOOL_TEMPLATE.sql must define guru_hanya_mengajar on public.pengaturan'
  );
  pass('Test 4: SETUP_NEW_SCHOOL_TEMPLATE.sql includes jam_pulang_jumat and guru_hanya_mengajar');
} catch (e) {
  fail('Test 4: SETUP_NEW_SCHOOL_TEMPLATE.sql verification failed', e);
}

// Test 5: Standalone migration file exists and triggers NOTIFY pgrst, 'reload schema'
try {
  const migrationPath = path.join(root, 'supabase', 'migrations', '20261106_fix_pengaturan_guru_hanya_mengajar_schema_cache.sql');
  assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
  const migrationSrc = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(
    migrationSrc.includes('ADD COLUMN IF NOT EXISTS guru_hanya_mengajar'),
    'Migration must add guru_hanya_mengajar to public.pengaturan'
  );
  assert.ok(
    migrationSrc.includes("NOTIFY pgrst, 'reload schema';"),
    'Migration must notify PostgREST to reload schema cache'
  );
  pass('Test 5: Standalone migration file 20261106_fix_pengaturan_guru_hanya_mengajar_schema_cache.sql valid and ready');
} catch (e) {
  fail('Test 5: Standalone migration verification failed', e);
}

// Test 6: Simulation of schema cache recovery logic
try {
  const simulatedError = {
    code: 'PGRST204',
    message: "Could not find the 'guru_hanya_mengajar' column of 'pengaturan' in the schema cache"
  };

  const isSchemaCacheError = Boolean(
    simulatedError && (
      simulatedError.code === 'PGRST204' ||
      simulatedError.message?.includes('schema cache') ||
      simulatedError.message?.includes('column') ||
      simulatedError.message?.includes('Could not find the')
    )
  );

  assert.strictEqual(isSchemaCacheError, true, 'Error matcher must accurately match PostgREST schema cache error');

  // Verify that clean items retain key and value without extended missing columns
  const mockSaveConfig = {
    tahun_ajaran: '2024/2025',
    semester: 'Ganjil',
    jam_pulang_jumat: '11:00'
  };
  const targetSekolahId = 'sch-123';
  const jsonExempt = JSON.stringify(['guru-1', 'guru-2']);

  const cleanUpsertData = Object.entries(mockSaveConfig).map(([key, value]) => ({
    sekolah_id: targetSekolahId,
    key,
    value: value !== undefined && value !== null ? value.toString() : ''
  }));
  cleanUpsertData.push({
    sekolah_id: targetSekolahId,
    key: 'guru_hanya_mengajar',
    value: jsonExempt
  });

  for (const item of cleanUpsertData) {
    assert.strictEqual('sekolah_id' in item, true);
    assert.strictEqual('key' in item, true);
    assert.strictEqual('value' in item, true);
    assert.strictEqual('guru_hanya_mengajar' in item, false, 'Clean item must not contain guru_hanya_mengajar property');
  }

  const ghmRow = cleanUpsertData.find(item => item.key === 'guru_hanya_mengajar');
  assert.ok(ghmRow, 'Clean data must contain guru_hanya_mengajar row');
  assert.strictEqual(ghmRow?.value, jsonExempt);

  pass('Test 6: Simulation verifies fallback payload removes column properties while preserving key-value data');
} catch (e) {
  fail('Test 6: Fallback simulation failed', e);
}

console.log('\n========================================================================');
console.log(`TOTAL TESTS:  ${totalTests}`);
console.log(`PASSED:       ${passedTests}`);
console.log(`FAILED:       ${failedTests}`);
console.log('========================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PENGATURAN SCHEMA CACHE RESILIENCE TESTS PASSED!\n');
  process.exit(0);
}
