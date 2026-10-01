import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config();

import fs from 'fs';
import { NextRequest } from 'next/server';

console.log('====================================================');
console.log('MILESTONE 3 VERIFICATION: IZIN TERLAMBAT UI & API');
console.log('====================================================\n');

let failed = 0;
function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

async function runTests() {
  // Dynamically import route after dotenv has loaded env vars
  const { POST, GET } = await import('../src/app/api/attendance/route');
  const { supabase } = await import('../src/lib/supabaseClient');

  const rootDir = path.join(__dirname, '..');
  const guruPresensiPath = path.join(rootDir, 'src', 'components', 'GuruPresensi.tsx');
  const attendanceRoutePath = path.join(rootDir, 'src', 'app', 'api', 'attendance', 'route.ts');

  // Test 1: Verify GuruPresensi.tsx file existence & content
  assert(fs.existsSync(guruPresensiPath), 'GuruPresensi.tsx exists');
  const presensiContent = fs.readFileSync(guruPresensiPath, 'utf-8');

  assert(
    presensiContent.includes('<option value="Izin Terlambat">Izin Terlambat</option>'),
    'GuruPresensi.tsx contains option with value="Izin Terlambat"'
  );

  assert(
    presensiContent.includes("isTerlambat = jenisPresensi === 'Izin Terlambat' || jenisPresensi === 'Terlambat'"),
    'GuruPresensi.tsx defines isTerlambat helper supporting backward compatibility'
  );

  assert(
    presensiContent.includes('const statusVerif = isTerlambat') && presensiContent.includes("'Menunggu'"),
    'GuruPresensi.tsx sets status_verifikasi to "Menunggu" when isTerlambat'
  );

  assert(
    presensiContent.includes("jenisPresensi === 'Sekolah' || isTerlambat"),
    'GuruPresensi.tsx calculates late seconds for both Sekolah and isTerlambat'
  );

  assert(
    presensiContent.includes('row-keterangan-terlambat'),
    'GuruPresensi.tsx renders optional reason input for Izin Terlambat'
  );

  // Test 2: Verify route.ts exists and exports POST and GET
  assert(fs.existsSync(attendanceRoutePath), 'src/app/api/attendance/route.ts exists');
  assert(typeof POST === 'function', 'POST handler is exported as a function');
  assert(typeof GET === 'function', 'GET handler is exported as a function');

  // Test 3: Test GET endpoint
  const getReq = new NextRequest('http://localhost:3000/api/attendance?limit=1');
  const getRes = await GET(getReq);
  assert(getRes.status === 200, `GET /api/attendance returns 200 OK (got ${getRes.status})`);
  const getJson = await getRes.json();
  assert(getJson.success === true, 'GET response includes success: true');
  assert(getJson.message === 'Attendance endpoint active', 'GET response includes active confirmation message');

  // Test 4: Test POST endpoint with "Izin Terlambat"
  const testId = 'test-m3-' + Date.now();
  const testPayload = {
    id: testId,
    user_id: 'fff9d836-b034-4a66-be96-1c1b7cfad277',
    nama_guru: 'Ade Fitrawan Ibrahim',
    tipe_absen: 'Datang',
    jenis_presensi: 'Izin Terlambat',
    detail_izin: 'Ban motor bocor dalam perjalanan ke sekolah',
    lokasi: 'GPS: -5.14767, 119.43273',
    jarak: '15 m',
    keterlambatan_detik: 1200,
    sekolah_id: 'a0000000-0000-0000-0000-000000000001',
  };

  const postReq = new NextRequest('http://localhost:3000/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload),
  });

  const postRes = await POST(postReq);
  assert(postRes.status === 201 || postRes.status === 200, `POST /api/attendance returns 201 Created (got ${postRes.status})`);
  const postJson = await postRes.json();
  assert(postJson.success === true, 'POST response includes success: true');
  assert(postJson.data?.jenis_presensi === 'Izin Terlambat', 'Saved record has jenis_presensi="Izin Terlambat"');
  assert(postJson.data?.status_verifikasi === 'Menunggu', 'Saved record has status_verifikasi="Menunggu"');
  assert(postJson.data?.keterlambatan_detik === 1200, 'Saved record captures keterlambatan_detik');

  // Cleanup test record from database
  try {
    await supabase.from('presensi_guru').delete().eq('id', testId);
    console.log(`Cleaned up test record: ${testId}`);
  } catch (cleanErr) {
    console.warn('Cleanup warning:', cleanErr);
  }

  console.log(`\nVerification finished with ${failed} failures.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
