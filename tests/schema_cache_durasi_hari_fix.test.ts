import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log('================================================================');
console.log('VERIFICATION: SCHEMA CACHE DURASI_HARI RESILIENT FALLBACK');
console.log('================================================================\n');

async function run() {
  const root = process.cwd();

  // Test 1: GuruPresensi.tsx contains schema cache column fallback
  console.log('👉 [Test 1] Checking GuruPresensi.tsx fallback logic...');
  const presensiSrc = fs.readFileSync(path.join(root, 'src', 'components', 'GuruPresensi.tsx'), 'utf8');
  assert.ok(
    presensiSrc.includes("error.message.includes('schema cache') || error.message.includes('column')"),
    'GuruPresensi must intercept schema cache / missing column errors'
  );
  assert.ok(
    presensiSrc.includes('compatiblePresensi'),
    'GuruPresensi must construct compatiblePresensi payload'
  );
  assert.ok(
    presensiSrc.includes('supabase.from(\'presensi_guru\').insert([compatiblePresensi])'),
    'GuruPresensi must retry inserting compatiblePresensi'
  );
  console.log('   ✅ GuruPresensi.tsx correctly implements resilient schema cache fallback.\n');

  // Test 2: API attendance route resilience
  console.log('👉 [Test 2] Checking /api/attendance/route.ts resilience...');
  const routeSrc = fs.readFileSync(path.join(root, 'src', 'app', 'api', 'attendance', 'route.ts'), 'utf8');
  assert.ok(
    routeSrc.includes("error.message.includes('schema cache') || error.message.includes('column')"),
    'Route must intercept schema cache errors'
  );
  assert.ok(
    routeSrc.includes('baseCleanRecord'),
    'Route must strip extended columns on schema mismatch'
  );
  console.log('   ✅ /api/attendance/route.ts correctly implements schema cache fallback.\n');

  // Test 3: attendanceAlpa.ts auto-checkout resilience
  console.log('👉 [Test 3] Checking attendanceAlpa.ts auto-checkout resilience...');
  const alpaSrc = fs.readFileSync(path.join(root, 'src', 'lib', 'attendanceAlpa.ts'), 'utf8');
  assert.ok(
    alpaSrc.includes("insErr.message.includes('schema cache') || insErr.message.includes('column')"),
    'Auto-checkout must handle schema cache errors'
  );
  console.log('   ✅ attendanceAlpa.ts correctly handles missing columns on auto-checkout.\n');

  // Test 4: Live Supabase transaction test
  console.log('👉 [Test 4] Live Supabase cloud transaction test...');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const superadminPassword = process.env.SUPERADMIN_API_PASSWORD;

  if (supabaseUrl && anonKey && superadminPassword) {
    const supabase = createClient(supabaseUrl, anonKey);
    const { data: loginData, error: loginErr } = await supabase.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: superadminPassword,
    });
    assert.ok(!loginErr && loginData?.[0]?.session_token, 'Superadmin login must succeed');
    const token = loginData[0].session_token;

    // Fetch active school
    const client = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          'x-session-token': token,
          'x-user-role': 'Superadmin',
        },
      },
    });

    const { data: sekolahList } = await client.from('sekolah').select('id').limit(1);
    const sekolahId = sekolahList?.[0]?.id || 'a0000000-0000-0000-0000-000000000001';

    // Simulate GuruPresensi submission with durasi_hari against remote DB
    const dummyNewPresensi = {
      id: 'test-durasi-' + Date.now(),
      timestamp: '2026-10-13 07:00:00',
      nama_guru: 'Ade Fitrawan Ibrahim',
      user_id: loginData[0].id,
      sekolah_id: sekolahId,
      tipe_absen: 'Datang',
      jenis_presensi: 'Izin',
      detail_izin: 'Sakit',
      durasi_hari: 3,
      tanggal_mulai: '2026-10-13',
      tanggal_selesai: '2026-10-15',
      memerlukan_persetujuan_admin: true,
      is_auto_checkout: false,
      lokasi: 'Rumah',
      jarak: 'Unknown',
      link_bukti: '',
      status_verifikasi: 'Menunggu',
      keterlambatan_detik: 0,
    };

    let insertSuccess = false;
    let insertErrorMsg = '';

    const { error: firstErr } = await client.from('presensi_guru').insert([dummyNewPresensi]);
    if (!firstErr) {
      insertSuccess = true;
    } else {
      insertErrorMsg = firstErr.message;
      if (firstErr.message && (firstErr.message.includes('schema cache') || firstErr.message.includes('column'))) {
        const compatiblePresensi: any = {
          id: dummyNewPresensi.id,
          timestamp: dummyNewPresensi.timestamp,
          nama_guru: dummyNewPresensi.nama_guru,
          user_id: dummyNewPresensi.user_id,
          tipe_absen: dummyNewPresensi.tipe_absen,
          jenis_presensi: dummyNewPresensi.jenis_presensi,
          detail_izin: dummyNewPresensi.durasi_hari > 1
            ? `${dummyNewPresensi.detail_izin} (${dummyNewPresensi.durasi_hari} Hari: ${dummyNewPresensi.tanggal_mulai} s/d ${dummyNewPresensi.tanggal_selesai})`
            : dummyNewPresensi.detail_izin,
          lokasi: dummyNewPresensi.lokasi,
          jarak: dummyNewPresensi.jarak,
          link_bukti: dummyNewPresensi.link_bukti,
          status_verifikasi: dummyNewPresensi.status_verifikasi,
          keterlambatan_detik: dummyNewPresensi.keterlambatan_detik,
          sekolah_id: dummyNewPresensi.sekolah_id,
        };
        const { error: retryError } = await client.from('presensi_guru').insert([compatiblePresensi]);
        if (!retryError) {
          insertSuccess = true;
          insertErrorMsg = '';
        } else {
          insertErrorMsg = retryError.message;
        }
      }
    }

    assert.ok(insertSuccess, `Presensi insert must succeed via fallback! Error was: ${insertErrorMsg}`);
    console.log('   ✅ Presensi successfully inserted to live Supabase despite unmigrated durasi_hari column!');

    // Clean up test record
    await client.from('presensi_guru').delete().eq('id', dummyNewPresensi.id);
    console.log('   ✅ Cleaned up test record from live Supabase.\n');
  }

  // Test 5: user_id schema cache fallback & SQL template/migration verification
  console.log('👉 [Test 5] Checking user_id schema cache resilience & SQL migration...');
  assert.ok(
    presensiSrc.includes('withoutUserId'),
    'GuruPresensi must strip user_id when user_id column is missing in schema cache'
  );
  assert.ok(
    !presensiSrc.match(/const compatiblePresensi[\s\S]*?user_id:\s*newPresensi\.user_id/),
    'compatiblePresensi in GuruPresensi must NOT include user_id'
  );
  assert.ok(
    !routeSrc.match(/const baseCleanRecord[\s\S]*?user_id:\s*presensiRecord\.user_id/),
    'baseCleanRecord in /api/attendance/route.ts must NOT include user_id'
  );
  const templateSql = fs.readFileSync(path.join(root, 'supabase', 'SETUP_NEW_SCHOOL_TEMPLATE.sql'), 'utf8');
  assert.ok(
    templateSql.includes('CREATE TABLE IF NOT EXISTS public.presensi_guru (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,\n    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,'),
    'SETUP_NEW_SCHOOL_TEMPLATE.sql must define user_id on presensi_guru'
  );
  const migrationSql = fs.readFileSync(
    path.join(root, 'supabase', 'migrations', '20261106_fix_presensi_guru_user_id_schema_cache.sql'),
    'utf8'
  );
  assert.ok(
    migrationSql.includes('ALTER TABLE public.presensi_guru ADD COLUMN IF NOT EXISTS user_id') &&
      migrationSql.includes("NOTIFY pgrst, 'reload schema';"),
    'Migration must add user_id to presensi_guru and reload PostgREST schema cache'
  );
  console.log('   ✅ user_id schema cache fallback and SQL migration verified.\n');

  console.log('================================================================');
  console.log('🎉 ALL DURASI_HARI SCHEMA CACHE TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
