import assert from 'assert';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  connectGuruMapelWithJadwal,
  filterGuruMapelByHari,
  isJurnalMatchJadwal,
} from '../src/lib/workflow';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SEKOLAH_ID = 'a0000000-0000-0000-0000-000000000001';

let passed = 0;
let failed = 0;

function check(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✔ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ✘ FAIL: ${label}`);
    failed++;
  }
}

async function main() {
  console.log('========================================================================');
  console.log('🧪 VERIFIKASI KONEKSI DATA MAPEL, DATA GURU & JADWAL PELAJARAN (JURNAL KBM)');
  console.log('========================================================================\n');

  const anon = createClient(supabaseUrl, supabaseKey);
  const { data: login } = await anon.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'superadmin123',
  });
  const u = login?.[0];
  assert(u, 'Superadmin login must succeed');

  const sb = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-id': u.id,
        'x-user-role': u.role,
        'x-session-token': u.session_token,
      },
    },
  });

  const [guruRes, mapelRes, jadwalRes, gmRes, usersRes] = await Promise.all([
    sb.from('data_guru').select('*').eq('sekolah_id', SEKOLAH_ID),
    sb.from('data_mapel').select('*').eq('sekolah_id', SEKOLAH_ID),
    sb.from('jadwal_pelajaran').select('*').eq('sekolah_id', SEKOLAH_ID),
    sb.from('guru_mapel').select('*').eq('sekolah_id', SEKOLAH_ID),
    sb.from('users').select('*').eq('sekolah_id', SEKOLAH_ID),
  ]);

  const guruList = guruRes.data || [];
  const mapelList = mapelRes.data || [];
  const jadwalList = jadwalRes.data || [];
  const gmList = gmRes.data || [];
  const usersList = usersRes.data || [];

  check(guruList.length === 12, `Master data_guru contains 12 teachers (got ${guruList.length})`);
  check(mapelList.length === 39, `Master data_mapel contains 39 subjects (got ${mapelList.length})`);
  check(jadwalList.length === 51, `Master jadwal_pelajaran contains 51 schedule slots (got ${jadwalList.length})`);

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Verify every teacher's connected subjects and daily schedule filtering
  for (const g of guruList) {
    const userAcc = usersList.find((usr: any) => usr.id === g.user_id || usr.username === g.nip);
    check(Boolean(userAcc), `Teacher ${g.nama_guru} (${g.nip}) is linked to user account ${userAcc?.username}`);

    const myGm = gmList.filter((x: any) => x.guru_id === g.id || x.nip === g.nip);
    const connected = connectGuruMapelWithJadwal(
      { id: userAcc?.id || g.user_id, user_id: g.user_id, username: userAcc?.username || g.nip, nama: userAcc?.nama || g.nama_guru },
      jadwalList,
      mapelList,
      myGm,
      g
    );

    check(connected.length > 0, `Teacher ${g.nama_guru} has ${connected.length} connected subjects`);

    for (const day of days) {
      const expectedJadwalOnDay = jadwalList.filter(
        (j: any) => j.user_id === g.user_id && j.hari === day
      );
      if (expectedJadwalOnDay.length > 0) {
        const filtered = filterGuruMapelByHari(connected, day);
        check(
          filtered.length === expectedJadwalOnDay.length,
          `${g.nip} on ${day}: filterGuruMapelByHari returns exact ${expectedJadwalOnDay.length} scheduled mapel(s): [${filtered.map(f => f.nama_mata_pelajaran).join(', ')}]`
        );
        for (const jd of expectedJadwalOnDay) {
          const match = filtered.find(m =>
            isJurnalMatchJadwal({ kelas: m.kelas, mapel: m.nama_mata_pelajaran }, jd)
          );
          check(
            Boolean(match),
            `${g.nip} on ${day}: schedule (${jd.kelas} - ${jd.mata_pelajaran}) matches canonical mapel "${match?.nama_mata_pelajaran}"`
          );
        }
      }
    }
  }

  // Specific regression checks for cross-class and cross-subject per-day accuracy
  const getDayMapelsForNip = (nip: string, hari: string) => {
    const g = guruList.find((x: any) => x.nip === nip)!;
    const myGm = gmList.filter((x: any) => x.guru_id === g.id);
    const connected = connectGuruMapelWithJadwal(g, jadwalList, mapelList, myGm, g);
    return filterGuruMapelByHari(connected, hari).map(m => m.nama_mata_pelajaran);
  };

  assert.deepStrictEqual(getDayMapelsForNip('Dinda', 'Selasa'), ['X Merdeka_PAI BP']);
  assert.deepStrictEqual(getDayMapelsForNip('Dinda', 'Jumat'), ['XI Merdeka_PAI BP']);
  check(true, 'Dinda gets X Merdeka_PAI BP on Selasa and XI Merdeka_PAI BP on Jumat');

  assert.deepStrictEqual(getDayMapelsForNip('Rohani', 'Jumat'), ['X Merdeka_Sosiologi']);
  assert.deepStrictEqual(getDayMapelsForNip('Rohani', 'Selasa'), ['XI Merdeka_SB']);
  assert.deepStrictEqual(getDayMapelsForNip('Rohani', 'Senin'), ['X Merdeka_SB', 'XII Merdeka_SB']);
  check(true, 'Rohani gets X Merdeka_Sosiologi on Jumat, XI Merdeka_SB on Selasa, and SB on Senin');

  assert.deepStrictEqual(getDayMapelsForNip('Ambar', 'Jumat'), ['X Merdeka_Fisika']);
  assert.deepStrictEqual(getDayMapelsForNip('Ambar', 'Senin'), ['XII Merdeka_Kimia']);
  assert.deepStrictEqual(getDayMapelsForNip('Ambar', 'Sabtu'), ['X Merdeka_Kimia', 'XI Merdeka_Kimia']);
  check(true, 'Ambar gets X Merdeka_Fisika on Jumat, XII Merdeka_Kimia on Senin, and Kimia on Sabtu');

  assert.deepStrictEqual(getDayMapelsForNip('Fitrawan', 'Senin'), ['X Merdeka_MTK', 'XI Merdeka_MTK']);
  assert.deepStrictEqual(getDayMapelsForNip('Fitrawan', 'Selasa'), ['X Merdeka_MTK']);
  assert.deepStrictEqual(getDayMapelsForNip('Fitrawan', 'Jumat'), ['XI Merdeka_MTK', 'XII Merdeka_MTK']);
  assert.deepStrictEqual(getDayMapelsForNip('Fitrawan', 'Sabtu'), ['X Merdeka_Informatika', 'XII Merdeka_MTK']);
  check(true, 'Ade (Fitrawan) gets exact scheduled MTK / Informatika subjects per day');

  assert.deepStrictEqual(getDayMapelsForNip('Venda', 'Rabu'), ['X Merdeka_Geografi', 'XI Merdeka_Biologi']);
  assert.deepStrictEqual(getDayMapelsForNip('Venda', 'Kamis'), ['X Merdeka_Biologi', 'XII Merdeka_Biologi']);
  check(true, 'Venda gets X Merdeka_Geografi + XI Merdeka_Biologi on Rabu and Biologi on Kamis');

  assert.deepStrictEqual(getDayMapelsForNip('Susana', 'Rabu'), ['XII Merdeka_PP']);
  assert.deepStrictEqual(getDayMapelsForNip('Fitri', 'Kamis'), ['XII Merdeka_MTL']);
  check(true, 'Susana on Rabu (XII Merdeka_PP) and Fitri on Kamis (XII Merdeka_MTL) match exact class');

  // Source wiring check
  const gjSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'GuruJurnal.tsx'), 'utf8');
  const adSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'AdminDataView.tsx'), 'utf8');
  check(gjSrc.includes('connectGuruMapelWithJadwal') && gjSrc.includes('filterGuruMapelByHari'), 'GuruJurnal.tsx uses connectGuruMapelWithJadwal and filterGuruMapelByHari');
  check(adSrc.includes('connectGuruMapelWithJadwal'), 'AdminDataView.tsx uses connectGuruMapelWithJadwal for master data sync');

  console.log(`\n========================================================================`);
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`========================================================================`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
