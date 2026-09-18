import fs from 'fs';
import path from 'path';
import vm from 'vm';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';
import { NextRequest } from 'next/server';

import { setServerTenantContext } from '../src/lib/supabaseClient';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

// Enable Superadmin context for server-side testing of RLS tables
setServerTenantContext({ role: 'Superadmin', sekolahId: 'a0000000-0000-0000-0000-000000000001' });

let failureCount = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
    failureCount++;
  } else {
    console.log(`✅ PASS: ${testName}`);
  }
}

async function runVerification() {
  console.log('================================================================');
  console.log('CHALLENGER 2: EMPIRICAL E2E & PRODUCTION READINESS VERIFICATION');
  console.log('================================================================\n');

  // ===========================================================================
  // SECTION 1: /api/push/send-reminders ENDPOINT & REMINDER LOGIC EMPIRICAL TESTS
  // ===========================================================================
  console.log('----------------------------------------------------------------');
  console.log('PART 1: EMPIRICAL TESTS FOR /api/push/send-reminders');
  console.log('----------------------------------------------------------------');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jicvvqxjyzntdrccnuyz.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const defaultSchoolAId = 'a0000000-0000-0000-0000-000000000001';
  const tenantClient = createClient<Database>(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': defaultSchoolAId,
        'x-user-role': 'Admin',
        'x-user-id': 'admin-challenger-m9'
      }
    }
  });

  const testSekolahId = defaultSchoolAId;
  const testDate = '2026-09-18';
  const testDay = 'Jumat';

  // Generate unique test teacher names to isolate our empirical run
  const testIdSuffix = Date.now().toString().slice(-6);
  const teacherMissingDatang = `Guru Challenger Datang ${testIdSuffix}`;
  const teacherExemptNoSchedule = `Guru Challenger Exempt NoSched ${testIdSuffix}`;
  const teacherExemptWithSchedule = `Guru Challenger Exempt WithSched ${testIdSuffix}`;
  const teacherMissingJournal = `Guru Challenger MissingJournal ${testIdSuffix}`;
  const teacherCompleteJournal = `Guru Challenger DoneJournal ${testIdSuffix}`;
  const teacherMissingPiket = `Guru Challenger MissingPiket ${testIdSuffix}`;
  const teacherDonePiket = `Guru Challenger DonePiket ${testIdSuffix}`;

  const createdTeacherIds: string[] = [];
  const createdScheduleIds: string[] = [];
  const createdPresensiIds: string[] = [];
  const createdJournalIds: string[] = [];
  const createdPiketAssignIds: string[] = [];
  const createdPiketReportIds: string[] = [];

  try {
    console.log('-> Seeding controlled empirical test data for all 3 reminder types...');

    // 1. Insert test teachers
    const teachersToInsert = [
      {
        nama_guru: teacherMissingDatang,
        sekolah_id: testSekolahId,
        nip: `nip-cd-${testIdSuffix}`,
        wajib_hadir_hanya_mengajar: false
      },
      {
        nama_guru: teacherExemptNoSchedule,
        sekolah_id: testSekolahId,
        nip: `nip-ex-ns-${testIdSuffix}`,
        wajib_hadir_hanya_mengajar: true
      },
      {
        nama_guru: teacherExemptWithSchedule,
        sekolah_id: testSekolahId,
        nip: `nip-ex-ws-${testIdSuffix}`,
        wajib_hadir_hanya_mengajar: true
      },
      {
        nama_guru: teacherMissingJournal,
        sekolah_id: testSekolahId,
        nip: `nip-mj-${testIdSuffix}`,
        wajib_hadir_hanya_mengajar: false
      },
      {
        nama_guru: teacherCompleteJournal,
        sekolah_id: testSekolahId,
        nip: `nip-cj-${testIdSuffix}`,
        wajib_hadir_hanya_mengajar: false
      },
      {
        nama_guru: teacherMissingPiket,
        sekolah_id: testSekolahId,
        nip: `nip-mp-${testIdSuffix}`,
        wajib_hadir_hanya_mengajar: false
      },
      {
        nama_guru: teacherDonePiket,
        sekolah_id: testSekolahId,
        nip: `nip-dp-${testIdSuffix}`,
        wajib_hadir_hanya_mengajar: false
      }
    ];

    const { data: insertedTeachers, error: tErr } = await tenantClient
      .from('data_guru')
      .insert(teachersToInsert)
      .select();

    assert(!tErr && !!insertedTeachers && insertedTeachers.length === teachersToInsert.length,
      'Seeded 7 empirical test teachers into data_guru', tErr?.message);

    if (insertedTeachers) {
      insertedTeachers.forEach(t => createdTeacherIds.push(t.id));
    }

    // 2. Insert schedules for today (Jumat):
    const schedulesToInsert = [
      {
        id: crypto.randomUUID(),
        sekolah_id: testSekolahId,
        nama_guru: teacherExemptWithSchedule,
        hari: testDay,
        kelas: 'X-A',
        mata_pelajaran: 'Matematika'
      },
      {
        id: crypto.randomUUID(),
        sekolah_id: testSekolahId,
        nama_guru: teacherMissingJournal,
        hari: testDay,
        kelas: 'X-B',
        mata_pelajaran: 'Fisika'
      },
      {
        id: crypto.randomUUID(),
        sekolah_id: testSekolahId,
        nama_guru: teacherMissingJournal,
        hari: testDay,
        kelas: 'XI-B',
        mata_pelajaran: 'Fisika'
      },
      {
        id: crypto.randomUUID(),
        sekolah_id: testSekolahId,
        nama_guru: teacherCompleteJournal,
        hari: testDay,
        kelas: 'XII-C',
        mata_pelajaran: 'Kimia'
      }
    ];

    const { data: insertedScheds, error: sErr } = await tenantClient
      .from('jadwal_pelajaran')
      .insert(schedulesToInsert)
      .select();

    assert(!sErr && !!insertedScheds && insertedScheds.length === schedulesToInsert.length,
      'Seeded teaching schedules for today into jadwal_pelajaran', sErr?.message);

    if (insertedScheds) {
      insertedScheds.forEach(s => createdScheduleIds.push(s.id));
    }

    // 3. Probe and insert presensi records
    // Check presensi_guru columns
    const { data: samplePresensi, error: samplePresError } = await tenantClient.from('presensi_guru').select('*').limit(1);
    console.log('ℹ️ presensi_guru schema probe:', samplePresError ? `Error: ${samplePresError.message}` : (samplePresensi?.[0] ? Object.keys(samplePresensi[0]) : 'empty table'));

    const presensiToInsert = [
      {
        id: crypto.randomUUID(),
        sekolah_id: testSekolahId,
        nama_guru: teacherCompleteJournal,
        timestamp: `${testDate} 07:15:00`,
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Diverifikasi'
      },
      {
        id: crypto.randomUUID(),
        sekolah_id: testSekolahId,
        nama_guru: teacherDonePiket,
        timestamp: `${testDate} 07:10:00`,
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Diverifikasi'
      }
    ];

    const { data: insertedPres, error: pErr } = await tenantClient
      .from('presensi_guru')
      .insert(presensiToInsert)
      .select();

    assert(!pErr && !!insertedPres, 'Seeded Presensi Datang records into presensi_guru', pErr?.message);
    if (insertedPres) {
      insertedPres.forEach(p => createdPresensiIds.push(p.id));
    }

    // 4. Insert KBM Journal for teacherCompleteJournal (completed) and teacherMissingJournal (only 1 of 2 completed)
    const journalsToInsert = [
      {
        id: crypto.randomUUID(),
        sekolah_id: testSekolahId,
        nama_guru: teacherCompleteJournal,
        tanggal: testDate,
        kelas: 'XII-C',
        mapel: 'Kimia',
        materi: 'Stoikiometri'
      },
      {
        id: crypto.randomUUID(),
        sekolah_id: testSekolahId,
        nama_guru: teacherMissingJournal,
        tanggal: testDate,
        kelas: 'X-B',
        mapel: 'Fisika',
        materi: 'Kinematika'
      }
    ];

    const { data: insertedJournals, error: jErr } = await tenantClient
      .from('jurnal_pembelajaran')
      .insert(journalsToInsert)
      .select();

    assert(!jErr && !!insertedJournals, 'Seeded KBM Journals into jurnal_pembelajaran', jErr?.message);
    if (insertedJournals) {
      insertedJournals.forEach(j => createdJournalIds.push(j.id));
    }

    // 5. Insert Piket Assignments for today: teacherMissingPiket and teacherDonePiket
    const piketAssignments = [
      {
        id: crypto.randomUUID(),
        sekolah_id: testSekolahId,
        hari: testDay,
        guru_nama: teacherMissingPiket,
        tipe_petugas: 'Guru'
      },
      {
        id: crypto.randomUUID(),
        sekolah_id: testSekolahId,
        hari: testDay,
        guru_nama: teacherDonePiket,
        tipe_petugas: 'Guru'
      }
    ];

    const { data: insertedPiketAssign, error: paErr } = await tenantClient
      .from('penugasan_piket')
      .insert(piketAssignments)
      .select();

    assert(!paErr && !!insertedPiketAssign, 'Seeded Penugasan Piket for today into penugasan_piket', paErr?.message);
    if (insertedPiketAssign) {
      insertedPiketAssign.forEach(pa => createdPiketAssignIds.push(pa.id));
    }

    // 6. Insert Piket Report for teacherDonePiket only
    const piketReports = [
      {
        id: crypto.randomUUID(),
        sekolah_id: testSekolahId,
        tanggal: testDate,
        guru_pelapor: teacherDonePiket,
        kehadiran_guru_piket: teacherDonePiket,
        catatan_apel: 'Kondisi sekolah kondusif dan tertib.'
      }
    ];

    const { data: insertedReports, error: prErr } = await tenantClient
      .from('laporan_piket')
      .insert(piketReports)
      .select();

    assert(!prErr && !!insertedReports, 'Seeded Laporan Piket into laporan_piket', prErr?.message);
    if (insertedReports) {
      insertedReports.forEach(pr => createdPiketReportIds.push(pr.id));
    }

    console.log('\n-> Executing checkMissingTasks against empirical seeded data...');
    const { checkMissingTasks, GET, POST } = await import('../src/app/api/push/send-reminders/route');

    const result = await checkMissingTasks(testDate, testDay, testSekolahId);
    assert(result && Array.isArray(result.reminders), 'checkMissingTasks returns object with reminders array');

    const { reminders } = result;
    console.log(`ℹ️ Total reminders generated for school: ${reminders.length}`);

    // Verification A: Missing Datang Reminder for teacherMissingDatang
    const datangReminder = reminders.find(r => r.guru_nama === teacherMissingDatang && r.category === 'presensi');
    assert(!!datangReminder, 'Simulated missing Datang triggers reminder for non-exempt teacher');
    if (datangReminder) {
      assert(datangReminder.title === 'Pengingat Presensi Datang', 'Missing Datang reminder title is correct');
      assert(datangReminder.body.includes(teacherMissingDatang), 'Missing Datang body includes teacher name');
      assert(datangReminder.body.includes('belum melakukan Presensi Datang'), 'Missing Datang body states missing presensi');
      assert(datangReminder.url === '/?view=view-guru-presensi', 'Missing Datang reminder URL routes to view-guru-presensi');
    }

    // Verification B: Exempt Teacher with No Schedule -> NO Reminder
    const exemptNoSchedReminder = reminders.find(r => r.guru_nama === teacherExemptNoSchedule && r.category === 'presensi');
    assert(!exemptNoSchedReminder, 'Exempt teacher with no teaching schedule today receives NO Datang reminder');

    // Verification C: Exempt Teacher with Schedule -> Gets Reminder
    const exemptWithSchedReminder = reminders.find(r => r.guru_nama === teacherExemptWithSchedule && r.category === 'presensi');
    assert(!!exemptWithSchedReminder, 'Exempt teacher who DOES teach today receives Datang reminder when not checked in');

    // Verification D: Missing Journal Reminder for teacherMissingJournal (2 scheduled, only 1 done)
    const journalReminder = reminders.find(r => r.guru_nama === teacherMissingJournal && r.category === 'jurnal');
    assert(!!journalReminder, 'Simulated missing journal triggers reminder when submittedCount < scheduledCount');
    if (journalReminder) {
      assert(journalReminder.title === 'Pengingat Jurnal Mengajar', 'Journal reminder title is correct');
      assert(journalReminder.body.includes('2 jam mengajar hari ini (1 selesai)'), 'Journal reminder body accurately calculates remaining classes');
      assert(journalReminder.url === '/?view=view-guru-jurnal', 'Journal reminder URL routes to view-guru-jurnal');
    }

    // Verification E: Completed Journal -> NO Reminder
    const completedJournalReminder = reminders.find(r => r.guru_nama === teacherCompleteJournal && r.category === 'jurnal');
    assert(!completedJournalReminder, 'Teacher who completed all scheduled journals receives NO journal reminder');

    // Verification F: Missing Piket Reminder for teacherMissingPiket
    const piketReminder = reminders.find(r => r.guru_nama === teacherMissingPiket && r.category === 'piket');
    assert(!!piketReminder, 'Simulated missing piket triggers reminder for assigned teacher without report');
    if (piketReminder) {
      assert(piketReminder.title === 'Pengingat Laporan Piket', 'Piket reminder title is correct');
      assert(piketReminder.body.includes('bertugas piket hari ini'), 'Piket reminder body mentions piket duty');
      assert(piketReminder.url === '/?view=view-piket', 'Piket reminder URL routes to view-piket');
    }

    // Verification G: Done Piket -> NO Reminder
    const donePiketReminder = reminders.find(r => r.guru_nama === teacherDonePiket && r.category === 'piket');
    assert(!donePiketReminder, 'Teacher who submitted piket report receives NO piket reminder');

    // Verification H: API Route Handlers (GET and POST)
    console.log('\n-> Testing Next.js API Route GET and POST handlers with simulated requests...');

    // GET with dry_run = true
    const getDryRunReq = new NextRequest(
      `http://localhost:3000/api/push/send-reminders?date=${testDate}&day=${testDay}&sekolah_id=${testSekolahId}&dry_run=true`
    );
    const getDryRunRes = await GET(getDryRunReq);
    assert(getDryRunRes.status === 200, 'GET /api/push/send-reminders?dry_run=true returns status 200');
    const getDryRunJson = await getDryRunRes.json();
    assert(getDryRunJson.success === true, 'GET response includes success: true');
    assert(getDryRunJson.dryRun === true, 'GET response includes dryRun: true');
    assert(typeof getDryRunJson.totalReminders === 'number' && getDryRunJson.totalReminders >= 3,
      'GET dryRun returns valid totalReminders count (at least 3 from our seeded teachers)');
    assert(Array.isArray(getDryRunJson.reminders), 'GET dryRun returns reminders array');

    // POST with dry_run = true
    const postDryRunReq = new NextRequest(
      'http://localhost:3000/api/push/send-reminders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: testDate,
          day: testDay,
          sekolah_id: testSekolahId,
          dry_run: true
        })
      }
    );
    const postDryRunRes = await POST(postDryRunReq);
    assert(postDryRunRes.status === 200, 'POST /api/push/send-reminders { dry_run: true } returns status 200');
    const postDryRunJson = await postDryRunRes.json();
    assert(postDryRunJson.success === true && postDryRunJson.dryRun === true, 'POST dryRun response success and dryRun flags verified');

    // POST standard (with active summary calculations)
    const postRealReq = new NextRequest(
      'http://localhost:3000/api/push/send-reminders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: testDate,
          day: testDay,
          sekolah_id: testSekolahId,
          dry_run: false
        })
      }
    );
    const postRealRes = await POST(postRealReq);
    assert(postRealRes.status === 200, 'POST /api/push/send-reminders (dispatch mode) returns status 200');
    const postRealJson = await postRealRes.json();
    assert(postRealJson.success === true, 'POST dispatch response includes success: true');
    assert(!!postRealJson.summary, 'POST dispatch response contains summary object');
    if (postRealJson.summary) {
      assert(typeof postRealJson.summary.totalMissingTasks === 'number', 'Summary contains totalMissingTasks');
      assert(typeof postRealJson.summary.presensiReminders === 'number', 'Summary contains presensiReminders');
      assert(typeof postRealJson.summary.jurnalReminders === 'number', 'Summary contains jurnalReminders');
      assert(typeof postRealJson.summary.piketReminders === 'number', 'Summary contains piketReminders');
      assert(typeof postRealJson.summary.pushesSent === 'number', 'Summary contains pushesSent');
      assert(typeof postRealJson.summary.pushErrors === 'number', 'Summary contains pushErrors');
    }

  } finally {
    // Clean up all seeded test data
    console.log('\n-> Cleaning up seeded empirical test data...');
    if (createdPiketReportIds.length > 0) {
      await tenantClient.from('laporan_piket').delete().in('id', createdPiketReportIds);
    }
    if (createdPiketAssignIds.length > 0) {
      await tenantClient.from('penugasan_piket').delete().in('id', createdPiketAssignIds);
    }
    if (createdJournalIds.length > 0) {
      await tenantClient.from('jurnal_pembelajaran').delete().in('id', createdJournalIds);
    }
    if (createdPresensiIds.length > 0) {
      await tenantClient.from('presensi_guru').delete().in('id', createdPresensiIds);
    }
    if (createdScheduleIds.length > 0) {
      await tenantClient.from('jadwal_pelajaran').delete().in('id', createdScheduleIds);
    }
    if (createdTeacherIds.length > 0) {
      await tenantClient.from('data_guru').delete().in('id', createdTeacherIds);
    }
    console.log('-> Cleanup completed cleanly.');
  }

  // ===========================================================================
  // SECTION 2: SERVICE WORKER public/sw.js SANDBOXED EMPIRICAL EXECUTION
  // ===========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('PART 2: SERVICE WORKER public/sw.js SANDBOXED EMPIRICAL TESTS');
  console.log('----------------------------------------------------------------');

  const swPath = path.resolve(__dirname, '..', 'public', 'sw.js');
  assert(fs.existsSync(swPath), 'public/sw.js exists');

  const swSource = fs.readFileSync(swPath, 'utf-8');

  // We set up a mock ServiceWorkerGlobalScope
  type Listener = (event: any) => any;
  const listeners: Record<string, Listener> = {};
  const notificationCalls: Array<{ title: string; options: any }> = [];
  const focusCalls: string[] = [];
  const openWindowCalls: string[] = [];
  let claimed = false;
  let skippedWaiting = false;

  const mockSelf: any = {
    addEventListener: (type: string, listener: Listener) => {
      listeners[type] = listener;
    },
    skipWaiting: () => {
      skippedWaiting = true;
    },
    clients: {
      claim: async () => {
        claimed = true;
      },
      matchAll: async (opts: any) => {
        // Return simulated open client windows
        return [
          {
            url: 'https://sipjam.sch.id/?view=view-guru-jurnal',
            focus: async () => {
              focusCalls.push('https://sipjam.sch.id/?view=view-guru-jurnal');
            }
          }
        ];
      },
      openWindow: async (url: string) => {
        openWindowCalls.push(url);
        return { url };
      }
    },
    registration: {
      showNotification: async (title: string, options: any) => {
        notificationCalls.push({ title, options });
      }
    }
  };

  // Run sw.js in the sandboxed VM context
  const sandbox = {
    self: mockSelf,
    Date: Date,
    JSON: JSON
  };
  vm.createContext(sandbox);
  vm.runInContext(swSource, sandbox);

  assert(typeof listeners['install'] === 'function', 'sw.js registers "install" listener');
  assert(typeof listeners['activate'] === 'function', 'sw.js registers "activate" listener');
  assert(typeof listeners['push'] === 'function', 'sw.js registers "push" listener');
  assert(typeof listeners['notificationclick'] === 'function', 'sw.js registers "notificationclick" listener');

  // Test 2.1: Lifecycle execution
  listeners['install']({});
  assert(skippedWaiting, 'sw.js install event calls self.skipWaiting()');

  let waitUntilPromise: Promise<any> | null = null;
  listeners['activate']({
    waitUntil: (p: Promise<any>) => {
      waitUntilPromise = p;
    }
  });
  if (waitUntilPromise) await waitUntilPromise;
  assert(claimed, 'sw.js activate event calls self.clients.claim()');

  // Test 2.2: Push event with rich JSON payload
  const pushJsonPayload = {
    title: 'Pengingat Presensi Datang',
    body: 'Halo Budi, Anda belum melakukan Presensi Datang.',
    icon: '/icon-custom.png',
    badge: '/badge-custom.png',
    url: '/?view=view-guru-presensi',
    vibrate: [300, 100, 300],
    tag: 'presensi-reminder-tag',
    data: { category: 'presensi', customMeta: 123 }
  };

  let pushWaitPromise: Promise<any> | null = null;
  listeners['push']({
    data: {
      json: () => pushJsonPayload,
      text: () => JSON.stringify(pushJsonPayload)
    },
    waitUntil: (p: Promise<any>) => {
      pushWaitPromise = p;
    }
  });
  if (pushWaitPromise) await pushWaitPromise;

  assert(notificationCalls.length === 1, 'sw.js push event invokes self.registration.showNotification');
  const lastNotif = notificationCalls[0];
  assert(lastNotif.title === 'Pengingat Presensi Datang', 'Notification title preserved correctly from payload');
  assert(lastNotif.options.body === 'Halo Budi, Anda belum melakukan Presensi Datang.', 'Notification body preserved correctly');
  assert(lastNotif.options.icon === '/icon-custom.png', 'Notification icon preserved');
  assert(lastNotif.options.badge === '/badge-custom.png', 'Notification badge preserved');
  assert(lastNotif.options.tag === 'presensi-reminder-tag', 'Notification tag preserved');
  assert(lastNotif.options.data.url === '/?view=view-guru-presensi', 'Notification data.url matches target URL');
  assert(lastNotif.options.data.category === 'presensi', 'Notification data merged custom payload data');
  assert(typeof lastNotif.options.data.timestamp === 'number', 'Notification data automatically includes timestamp');

  // Test 2.3: Push event with non-JSON plain text fallback
  let textPushWaitPromise: Promise<any> | null = null;
  listeners['push']({
    data: {
      json: () => {
        throw new Error('Unexpected token in JSON');
      },
      text: () => 'Pesan darurat dari sekolah.'
    },
    waitUntil: (p: Promise<any>) => {
      textPushWaitPromise = p;
    }
  });
  if (textPushWaitPromise) await textPushWaitPromise;

  assert(notificationCalls.length === 2, 'sw.js handles non-JSON push payload gracefully without crashing');
  const textNotif = notificationCalls[1];
  assert(textNotif.title === 'SIPJAM Notifikasi', 'Fallback title "SIPJAM Notifikasi" used for plain text');
  assert(textNotif.options.body === 'Pesan darurat dari sekolah.', 'Plain text content preserved as body');

  // Test 2.4: notificationclick event - Focusing an existing matching window
  let notifClosed = false;
  let clickWaitPromise: Promise<any> | null = null;
  listeners['notificationclick']({
    notification: {
      close: () => {
        notifClosed = true;
      },
      data: { url: '/?view=view-guru-jurnal' }
    },
    waitUntil: (p: Promise<any>) => {
      clickWaitPromise = p;
    }
  });
  if (clickWaitPromise) await clickWaitPromise;

  assert(notifClosed === true, 'notificationclick calls event.notification.close()');
  assert(focusCalls.length === 1 && focusCalls[0].includes('view-guru-jurnal'),
    'notificationclick focuses existing matching window');

  // Test 2.5: notificationclick event - Opening a new window when no match exists
  let notifClosed2 = false;
  let clickWaitPromise2: Promise<any> | null = null;
  listeners['notificationclick']({
    notification: {
      close: () => {
        notifClosed2 = true;
      },
      data: { url: '/?view=view-piket' }
    },
    waitUntil: (p: Promise<any>) => {
      clickWaitPromise2 = p;
    }
  });
  if (clickWaitPromise2) await clickWaitPromise2;

  assert(notifClosed2 === true, 'Second notificationclick closes notification');
  assert(openWindowCalls.length === 1 && openWindowCalls[0] === '/?view=view-piket',
    'notificationclick calls self.clients.openWindow with targetUrl when client is not already open');

  // ===========================================================================
  // SECTION 3: UI STATE TRANSITIONS & NOTIFICATION PROMPT EMPIRICAL TESTS
  // ===========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('PART 3: UI STATE TRANSITIONS & PUSH NOTIFICATION PROMPT TESTS');
  console.log('----------------------------------------------------------------');

  // 3.1: globals.css Bell Shake CSS verification
  const cssPath = path.resolve(__dirname, '..', 'src', 'app', 'globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  assert(cssContent.includes('@keyframes bell-shake'), '@keyframes bell-shake is defined in globals.css');
  assert(cssContent.includes('0% { transform: rotate(0); }'), 'bell-shake begins at rotate(0)');
  assert(cssContent.includes('15% { transform: rotate(14deg); }'), 'bell-shake swings clockwise to 14deg');
  assert(cssContent.includes('30% { transform: rotate(-12deg); }'), 'bell-shake swings counterclockwise to -12deg');
  assert(cssContent.includes('45% { transform: rotate(10deg); }'), 'bell-shake oscillates with damping');
  assert(cssContent.includes('100% { transform: rotate(0); }'), 'bell-shake resolves back to rotate(0)');
  assert(cssContent.includes('.animate-bell-shake {'), '.animate-bell-shake class is defined in globals.css');
  assert(cssContent.includes('animation: bell-shake 0.8s ease-in-out infinite;'),
    'animate-bell-shake sets 0.8s ease-in-out infinite animation');
  assert(cssContent.includes('transform-origin: top center;'),
    'animate-bell-shake sets transform-origin: top center for natural pivot');

  // 3.2: AppScreen.tsx Bell rendering condition verification
  const appScreenPath = path.resolve(__dirname, '..', 'src', 'components', 'AppScreen.tsx');
  const appScreenContent = fs.readFileSync(appScreenPath, 'utf-8');

  assert(
    appScreenContent.includes("unreadCount > 0 ? 'text-amber-500 animate-bell-shake' : 'text-gray-700 dark:text-gray-300'"),
    'AppScreen dynamically toggles "animate-bell-shake" and "text-amber-500" based on unreadCount > 0'
  );
  assert(
    appScreenContent.includes("{unreadCount > 0 && (") &&
    appScreenContent.includes("bg-red-600 text-white") &&
    appScreenContent.includes("{unreadCount > 99 ? '99+' : unreadCount}"),
    'AppScreen renders unread count badge conditionally when unreadCount > 0 with 99+ overflow cap'
  );
  assert(
    appScreenContent.includes("setBroadcastModalOpen(true)"),
    'Clicking bell button opens the Broadcast modal (setBroadcastModalOpen)'
  );
  assert(
    appScreenContent.includes("table: 'pengumuman'") && appScreenContent.includes("table: 'pengumuman_dibaca'"),
    'AppScreen subscribes to realtime changes on both pengumuman and pengumuman_dibaca'
  );

  // 3.3: PushNotificationPrompt.tsx Dialog & Simulation Trigger verification
  const promptPath = path.resolve(__dirname, '..', 'src', 'components', 'PushNotificationPrompt.tsx');
  assert(fs.existsSync(promptPath), 'PushNotificationPrompt.tsx exists');
  const promptContent = fs.readFileSync(promptPath, 'utf-8');

  assert(
    promptContent.includes("sessionStorage.getItem('sipjam_push_prompt_dismissed')"),
    'PushNotificationPrompt checks sessionStorage to avoid re-prompting dismissed users'
  );
  assert(
    promptContent.includes("setTimeout(() => {") && promptContent.includes("setShowPrompt(true);"),
    'PushNotificationPrompt introduces a delay timer for smooth layout rendering'
  );
  assert(
    promptContent.includes('Kirim Notifikasi (Push)'),
    'PushNotificationPrompt renders explicit header "Kirim Notifikasi (Push)"'
  );
  assert(
    promptContent.includes('handleRequestPermission'),
    'PushNotificationPrompt provides handleRequestPermission trigger'
  );
  assert(
    promptContent.includes('triggerSimulatedNotification'),
    'PushNotificationPrompt provides triggerSimulatedNotification function'
  );
  assert(
    promptContent.includes('Kirim Notifikasi Uji Coba'),
    'PushNotificationPrompt provides "Kirim Notifikasi Uji Coba" button'
  );
  assert(
    promptContent.includes("notificationTitle = 'SIPJAM - Uji Coba Push Notifikasi'"),
    'Simulated notification sends title "SIPJAM - Uji Coba Push Notifikasi"'
  );
  assert(
    promptContent.includes("body: 'Notifikasi simulasi dari sistem berhasil masuk! Pengingat presensi dan jurnal aktif.'"),
    'Simulated notification body confirms system push dispatch'
  );
  assert(
    promptContent.includes("sessionStorage.setItem('sipjam_push_prompt_dismissed', 'true')"),
    'Dismissing modal records state in sessionStorage'
  );
  assert(
    appScreenContent.includes('<PushNotificationPrompt user={user} />'),
    'AppScreen embeds PushNotificationPrompt in root render'
  );

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n================================================================');
  console.log(`TOTAL TESTS EXECUTED: ${totalTests}`);
  console.log(`PASSED: ${totalTests - failureCount}`);
  console.log(`FAILED: ${failureCount}`);
  console.log('================================================================');

  if (failureCount > 0) {
    console.error(`\n💥 VERIFICATION FAILED with ${failureCount} failure(s)!`);
    process.exit(1);
  } else {
    console.log(`\n🎉 ALL ${totalTests} EMPIRICAL E2E & SPECIFICATION CHECKS PASSED!`);
    process.exit(0);
  }
}

runVerification().catch(err => {
  console.error('Fatal unhandled verification error:', err);
  process.exit(1);
});
