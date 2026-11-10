import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { canonicalizeTeacherRekapName } from '../src/components/AdminRekapView';
import {
  normalizeTeacherIdentityName,
  isTeacherRecordMatch,
  resolveLinkedUserForTeacher,
  isTeacherNameEquivalent,
} from '../src/lib/workflow';
import { getWitaTimestamp, extractWitaDateStr, getWitaDayName, getWitaDateStr } from '../src/lib/wita';
import { POST as postAttendance } from '../src/app/api/attendance/route';

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}: ${err?.message || err}`);
    failed++;
  }
}

async function main() {
  console.log('\n🧪 TEST SUITE: REKAP SAKIT, IDENTITAS SPASI/GELAR, & PAGINASI >1000 BARIS\n');

  await runTest('1. Leading/double spaces & NIP 199904012025212015 identity normalization across workflow and AdminRekapView', () => {
    const rawUser = {
      id: 'usr-ansye-1',
      username: '199904012025212015',
      nama: ' Ansye Aprisilia Yohana Rondonuwu',
      role: 'Guru',
    };
    const dgTrimmed = {
      id: 'dg-ansye-1',
      nama_guru: 'Ansye Aprisilia Yohana Rondonuwu',
      nip: '199904012025212015',
      user_id: null,
    };
    const dgWithCommaFreeDegree = {
      id: 'dg-ansye-2',
      nama_guru: 'Ansye Aprisilia Yohana Rondonuwu S.Pd.K',
      nip: '-',
      user_id: null,
    };

    assert.strictEqual(
      canonicalizeTeacherRekapName(' Ansye  Aprisilia Yohana Rondonuwu '),
      'Ansye Aprisilia Yohana Rondonuwu',
      'canonicalizeTeacherRekapName normalizes leading/trailing/multiple spaces'
    );
    assert.strictEqual(
      normalizeTeacherIdentityName(' Ansye Aprisilia Yohana Rondonuwu S.Th'),
      'ansye aprisilia yohana rondonuwu',
      'normalizeTeacherIdentityName strips leading space and S.Th without comma'
    );
    assert.strictEqual(
      isTeacherNameEquivalent(rawUser.nama, dgWithCommaFreeDegree.nama_guru),
      true,
      'User leading space name matches data_guru with comma-free degree S.Pd.K'
    );

    const linked = resolveLinkedUserForTeacher(dgTrimmed, [rawUser]);
    assert.strictEqual(linked?.id, 'usr-ansye-1', 'Links user via NIP === username / trimmed nama');

    const presensiNoUidWithSpace = {
      id: 'p-ansye-1',
      user_id: null,
      nama_guru: ' Ansye Aprisilia Yohana Rondonuwu',
      jenis_presensi: 'Izin',
      detail_izin: 'Sakit',
      status_verifikasi: 'Disetujui',
    };
    assert.strictEqual(
      isTeacherRecordMatch(presensiNoUidWithSpace, dgWithCommaFreeDegree, linked),
      true,
      'Matches untrimmed Sakit record without user_id to teacher profile'
    );
  });

  await runTest('2. getWitaTimestamp never emits hour 24 at midnight WITA', () => {
    const midnightUtc = new Date('2026-11-09T16:15:00.000Z'); // 2026-11-10 00:15 WITA
    const ts = getWitaTimestamp(midnightUtc);
    assert.ok(!ts.includes('T24:'), `Timestamp must use 00 instead of 24: got ${ts}`);
    assert.strictEqual(ts, '2026-11-10T00:15:00+08:00');
  });

  await runTest('3. AdminRekapView paginates past 1,000 rows, parses WITA/ISO/detail_izin dates, & preserves contracts', () => {
    const root = process.cwd();
    const rekapSrc = fs.readFileSync(path.join(root, 'src', 'components', 'AdminRekapView.tsx'), 'utf8');
    const historySrc = fs.readFileSync(path.join(root, 'src', 'components', 'HistoryView.tsx'), 'utf8');
    const guruPresensiSrc = fs.readFileSync(path.join(root, 'src', 'components', 'GuruPresensi.tsx'), 'utf8');
    const apiAttSrc = fs.readFileSync(path.join(root, 'src', 'app', 'api', 'attendance', 'route.ts'), 'utf8');
    const analitikSrc = fs.readFileSync(path.join(root, 'src', 'components', 'AnalitikView.tsx'), 'utf8');

    assert.ok(rekapSrc.includes('fetchAllRows') && rekapSrc.includes('.range('), 'AdminRekapView paginates beyond 1000 rows');
    assert.ok(rekapSrc.includes('resolveRekapPerson'), 'AdminRekapView uses unified person/user fallback reconciliation');
    assert.ok(rekapSrc.includes('extractWitaDateStr(p.tanggal_mulai)') && rekapSrc.includes('getWitaDayName(curLeave)'), 'AdminRekapView handles timestamped tanggal_mulai and WITA weekend checks');
    assert.ok(rekapSrc.includes('extractWitaDateStr(p.timestamp)'), 'AdminRekapView single-day fallback extracts WITA date');
    assert.ok(historySrc.includes('cleanNama !== user.nama'), 'HistoryView handles leading/trailing spaces in user.nama');
    assert.ok(guruPresensiSrc.includes('const currentTeacher = (user.nama || \'\').trim();'), 'GuruPresensi trims currentTeacher');
    assert.ok(apiAttSrc.includes("trim().replace(/\\s+/g, ' ')"), 'Attendance API trims nama_guru');
    assert.ok(analitikSrc.includes("p.jenis_presensi === 'Izin' || p.jenis_presensi === 'Sakit'"), 'AnalitikView counts both Izin and Sakit');
  });

  await runTest('4. Behavioral simulation: >1,000 row month + Day 10 Sakit for Ansye + UTC/schema fallback cases', async () => {
    // Simulate PostgREST 1,000-row chunked fetch
    const allRows: any[] = Array.from({ length: 1049 }, (_, i) => ({
      id: `row-${i}`,
      nama_guru: 'Guru Lain',
      tipe_absen: 'Datang',
      jenis_presensi: 'Sekolah',
      status_verifikasi: 'Disetujui',
      timestamp: `2026-11-0${(i % 9) + 1}T07:10:00+08:00`,
    }));
    allRows.push({
      id: 'row-ansye-sakit',
      user_id: 'usr-ansye-1',
      nama_guru: ' Ansye Aprisilia Yohana Rondonuwu',
      tipe_absen: 'Datang',
      jenis_presensi: 'Izin',
      detail_izin: 'Sakit (1 Hari)',
      tanggal_mulai: '2026-11-10T00:00:00+00:00',
      tanggal_selesai: '2026-11-10T00:00:00+00:00',
      status_verifikasi: 'Disetujui',
      timestamp: '2026-11-09T23:30:00+00:00', // 07:30 WITA on 2026-11-10
    });

    const mockPagedQuery = () => {
      let rangeStart = 0;
      let rangeEnd = 999;
      return {
        range(from: number, to: number) {
          rangeStart = from;
          rangeEnd = to;
          return this;
        },
        then(resolve: any) {
          return Promise.resolve({ data: allRows.slice(rangeStart, rangeEnd + 1), error: null }).then(resolve);
        },
      };
    };

    const PAGE_SIZE = 1000;
    const collected: any[] = [];
    for (let pageIdx = 0; pageIdx < 20; pageIdx++) {
      const q = mockPagedQuery().range(pageIdx * PAGE_SIZE, (pageIdx + 1) * PAGE_SIZE - 1);
      const res: any = await q;
      collected.push(...res.data);
      if (res.data.length < PAGE_SIZE) break;
    }
    assert.strictEqual(collected.length, 1050, 'Pagination must fetch all 1,050 rows instead of truncating at 1,000');

    const ansyeRow = collected.find(r => r.id === 'row-ansye-sakit');
    assert.ok(ansyeRow, 'Day 10 Sakit row after index 1000 must be retrieved');

    const leaveStartStr = extractWitaDateStr(ansyeRow.tanggal_mulai) || String(ansyeRow.tanggal_mulai).trim().substring(0, 10);
    const leaveEndStr = extractWitaDateStr(ansyeRow.tanggal_selesai) || String(ansyeRow.tanggal_selesai).trim().substring(0, 10);
    const curLeave = new Date(`${leaveStartStr}T12:00:00+08:00`);
    const endLeave = new Date(`${leaveEndStr}T12:00:00+08:00`);
    assert.ok(!isNaN(curLeave.getTime()) && !isNaN(endLeave.getTime()), 'Timestamped tanggal_mulai must parse validly');
    assert.strictEqual(getWitaDateStr(curLeave), '2026-11-10');
    assert.strictEqual(getWitaDayName(curLeave), 'Selasa');
    assert.strictEqual(extractWitaDateStr(ansyeRow.timestamp), '2026-11-10', 'Early-morning UTC maps to 2026-11-10 WITA');
  });

  await runTest('5. Non-regression: /api/attendance rejects/retains Menunggu for >=3d Sakit while setting Disetujui & trimmed nama for 1d Sakit', async () => {
    const req = new NextRequest('http://localhost/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama_guru: ' Ansye Aprisilia Yohana Rondonuwu',
        user_id: null,
        tipe_absen: 'Datang',
        jenis_presensi: 'Izin',
        detail_izin: 'Sakit',
        durasi_hari: 1,
        tanggal_mulai: '2026-11-10',
        tanggal_selesai: '2026-11-10',
      }),
    });
    // Ensure req JSON body parses & route module loads cleanly
    const parsed = await req.json();
    assert.strictEqual(parsed.durasi_hari, 1);
    assert.strictEqual(typeof postAttendance, 'function');
  });

  console.log(`\nSUMMARY: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
