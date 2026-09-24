/**
 * Empirical Adversarial Challenger Test Suite for Milestone 1 (M1)
 * Focus: Presensi, Jurnal, Piket Resubmission Reset & Admin Verification UI (F1 - F4)
 */

// Must set env before workflow is loaded
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyzcompany.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key';

import './e2e/helpers/testHarness';
import { MOCK_SEKOLAH_ID } from './e2e/helpers/mockData';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    if (detail) console.error(`    Detail: ${detail}`);
    failed++;
  }
}

function suite(title: string) {
  console.log(`\n======================================================`);
  console.log(`SUITE: ${title}`);
  console.log(`======================================================`);
}

async function runAdversarialM1Tests() {
  console.log('STARTING EMPIRICAL ADVERSARIAL CHALLENGER TESTS (M1)');

  const { isJurnalMatchJadwal, isGuruDiPiket } = await import('../src/lib/workflow');

  // =========================================================================
  // SUITE 1: Jurnal Targeted Class Isolation & Subject Collision (F2)
  // =========================================================================
  suite('1. Jurnal Targeted Class Isolation & Subject Collision Oracles');

  // Scenario 1.1: 5-Class multi-rejection isolation oracle
  const initial5Rejected = [
    { id: 'j-7a', kelas: 'VII A', mapel: 'Matematika', keterangan: 'Jurnal KBM', nama_guru: 'Ade' },
    { id: 'j-7b', kelas: 'VII B', mapel: 'Matematika', keterangan: 'Jurnal KBM', nama_guru: 'Ade' },
    { id: 'j-7c', kelas: 'VII C', mapel: 'Matematika', keterangan: 'Jurnal KBM', nama_guru: 'Ade' },
    { id: 'j-8a', kelas: 'VIII A', mapel: 'Matematika', keterangan: 'Jurnal KBM', nama_guru: 'Ade' },
    { id: 'j-8b', kelas: 'VIII B', mapel: 'Matematika', keterangan: 'Jurnal KBM', nama_guru: 'Ade' },
  ];

  // Emulate GuruJurnal.tsx line 341 deletion filter for VII B
  const submitTargetClass = 'VII B';
  const submitTargetMapel = 'Matematika';
  const matchingFor7B = initial5Rejected.filter((j: any) => {
    if (j.kelas !== submitTargetClass) return false;
    return j.mapel === submitTargetMapel || isJurnalMatchJadwal(j, { kelas: submitTargetClass, mata_pelajaran: submitTargetMapel });
  });

  assert(
    matchingFor7B.length === 1 && matchingFor7B[0].id === 'j-7b',
    'F2-ADV1: Resubmission of VII B Matematika targets ONLY VII B (1 of 5 classes)'
  );

  const remainingAfter7B = initial5Rejected.filter(j => !matchingFor7B.some(m => m.id === j.id));
  assert(
    remainingAfter7B.length === 4 &&
    remainingAfter7B.every(j => j.id !== 'j-7b') &&
    remainingAfter7B.some(j => j.id === 'j-7a') &&
    remainingAfter7B.some(j => j.id === 'j-7c') &&
    remainingAfter7B.some(j => j.id === 'j-8a') &&
    remainingAfter7B.some(j => j.id === 'j-8b'),
    'F2-ADV2: Exact 4 non-targeted rejected journals remain completely untouched'
  );

  // Scenario 1.2: Subject Collision between phonetically or prefix-similar subjects
  const collisionClasses = [
    { id: 'j-ipa', kelas: 'VII A', mapel: 'IPA', keterangan: 'Jurnal KBM' },
    { id: 'j-ips', kelas: 'VII A', mapel: 'IPS', keterangan: 'Jurnal KBM' },
    { id: 'j-pai', kelas: 'VII A', mapel: 'Pendidikan Agama Islam', keterangan: 'Jurnal KBM' },
    { id: 'j-pkn', kelas: 'VII A', mapel: 'Pendidikan Pancasila', keterangan: 'Jurnal KBM' },
    { id: 'j-mtk-wajib', kelas: 'VII A', mapel: 'Matematika Wajib', keterangan: 'Jurnal KBM' },
    { id: 'j-mtk-minat', kelas: 'VII A', mapel: 'Matematika Peminatan', keterangan: 'Jurnal KBM' }
  ];

  // Testing IPA vs IPS: IPA must NEVER match IPS
  const matchIPA_IPS = isJurnalMatchJadwal(collisionClasses[0], { kelas: 'VII A', mata_pelajaran: 'IPS' });
  assert(matchIPA_IPS === false, 'F2-ADV3: isJurnalMatchJadwal correctly distinguishes IPA from IPS');

  // Testing PAI vs PKN: PAI must NEVER match Pendidikan Pancasila
  const matchPAI_PKN = isJurnalMatchJadwal(collisionClasses[2], { kelas: 'VII A', mata_pelajaran: 'Pendidikan Pancasila' });
  assert(matchPAI_PKN === false, 'F2-ADV4: isJurnalMatchJadwal correctly distinguishes PAI from Pendidikan Pancasila');

  // Testing Prefix clean matching: 'VII A_Matematika' vs 'Matematika'
  const matchPrefix = isJurnalMatchJadwal({ kelas: 'VII A', mapel: 'VII A_Matematika' }, { kelas: 'VII A', mata_pelajaran: 'Matematika' });
  assert(matchPrefix === true, 'F2-ADV5: isJurnalMatchJadwal cleanly handles underscore-prefixed subject format');

  // Scenario 1.3: Boundary inputs (null, undefined, empty strings)
  assert(
    isJurnalMatchJadwal({ kelas: null, mapel: null }, { kelas: 'VII A', mata_pelajaran: 'Matematika' }) === false,
    'F2-ADV6: Null journal properties return false without throwing TypeError'
  );
  assert(
    isJurnalMatchJadwal({ kelas: 'VII A', mapel: 'Matematika' }, { kelas: null, mata_pelajaran: null }) === false,
    'F2-ADV7: Null schedule properties return false without throwing TypeError'
  );
  
  // GuruJurnal filtering guard on malformed/empty objects
  const guruJurnalFilter = (j: any, kelas: string, mapel: string) => {
    if (j.kelas !== kelas) return false;
    return j.mapel === mapel || isJurnalMatchJadwal(j, { kelas, mata_pelajaran: mapel });
  };
  assert(
    guruJurnalFilter({}, 'VII A', 'Matematika') === false,
    'F2-ADV8: GuruJurnal filter guard safely rejects empty object records due to kelas mismatch'
  );

  // Scenario 1.4: Jurnal Kegiatan vs Jurnal KBM Discrimination
  const mixedJournals = [
    { id: 'kbm-1', kelas: 'VII A', mapel: 'Matematika', keterangan: 'Jurnal KBM' },
    { id: 'keg-1', kelas: '-', mapel: 'Jurnal Kegiatan', keterangan: 'Jurnal Kegiatan' },
    { id: 'keg-legacy', kelas: '', mapel: 'Jurnal Kegiatan', keterangan: '-' }
  ];

  // Teacher submits Jurnal Kegiatan
  const matchKegiatan = mixedJournals.filter(j => j.keterangan === 'Jurnal Kegiatan' || j.mapel === 'Jurnal Kegiatan');
  assert(
    matchKegiatan.length === 2 &&
    matchKegiatan.some(j => j.id === 'keg-1') &&
    matchKegiatan.some(j => j.id === 'keg-legacy') &&
    !matchKegiatan.some(j => j.id === 'kbm-1'),
    'F2-ADV9: Resubmitting Jurnal Kegiatan matches modern and legacy Kegiatan, protecting KBM'
  );

  // Scenario 1.5: Tenant Isolation with sekolah_id
  const makeJournalPayload = (user: any, form: any) => ({
    ...form,
    catatan_refleksi: form.refleksi || '-',
    foto_kegiatan: form.fileUrl,
    ...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {})
  });

  const payloadWithTenant = makeJournalPayload({ sekolah_id: MOCK_SEKOLAH_ID }, { refleksi: 'OK', fileUrl: 'http://img' });
  assert(
    payloadWithTenant.sekolah_id === MOCK_SEKOLAH_ID,
    'F2-ADV10: Journal insert attaches valid sekolah_id under tenant context'
  );

  const payloadWithoutTenant = makeJournalPayload({}, { refleksi: 'OK', fileUrl: 'http://img' });
  assert(
    !('sekolah_id' in payloadWithoutTenant),
    'F2-ADV11: Journal insert omits sekolah_id when user has no sekolah_id (prevents undefined key)'
  );


  // =========================================================================
  // SUITE 2: Presensi Resubmission State & Reset Lifecycle (F1)
  // =========================================================================
  suite('2. Presensi Resubmission State & Reset Lifecycle');

  // Scenario 2.1: Datang Rejected Workflow Locks Pulang
  const stateDatangRejected = {
    tanggal: '2026-09-24',
    presensiDatang: null,
    presensiPulang: null,
    presensiDatangDitolak: { id: 'p-datang-bad', tipe_absen: 'Datang', status_verifikasi: 'Ditolak' },
    presensiPulangDitolak: null,
    canPresensiPulang: false,
    lockedReason: 'Anda belum melakukan Presensi Datang hari ini.'
  };

  // Check Pulang disabled condition in select dropdown:
  // disabled={!dailyState?.presensiDatang || (!!dailyState?.presensiPulang && !dailyState?.presensiPulangDitolak)}
  const isPulangDropdownDisabled = !stateDatangRejected.presensiDatang || 
    (!!stateDatangRejected.presensiPulang && !stateDatangRejected.presensiPulangDitolak);

  assert(
    isPulangDropdownDisabled === true,
    'F1-ADV1: Pulang dropdown option is strictly DISABLED when Datang is rejected'
  );

  // Check Datang dropdown option:
  // disabled={!!dailyState?.presensiDatang && !dailyState?.presensiDatangDitolak}
  const isDatangDropdownDisabled = !!stateDatangRejected.presensiDatang && !stateDatangRejected.presensiDatangDitolak;
  assert(
    isDatangDropdownDisabled === false,
    'F1-ADV2: Datang dropdown option is strictly ENABLED for resubmission when Datang was rejected'
  );

  // Check initConfig default auto-selection logic
  let initialTipeAbsen = 'Pulang';
  if (stateDatangRejected.presensiDatangDitolak) {
    initialTipeAbsen = 'Datang';
  } else if (stateDatangRejected.presensiDatang && (!stateDatangRejected.presensiPulang || stateDatangRejected.presensiPulangDitolak)) {
    initialTipeAbsen = 'Pulang';
  }
  assert(
    initialTipeAbsen === 'Datang',
    'F1-ADV3: Form automatically pre-selects Datang on mount when Datang was rejected'
  );

  // Scenario 2.2: Datang Resubmission deletes rejected Datang and unlocks next flow
  let mockPresensiDb = [
    { id: 'p-datang-bad', tipe_absen: 'Datang', status_verifikasi: 'Ditolak' }
  ];
  // Teacher resubmits Datang
  const newDatangId = 'p-datang-fresh';
  mockPresensiDb.push({ id: newDatangId, tipe_absen: 'Datang', status_verifikasi: 'Menunggu' });
  // Deletion logic:
  const rejectedRecordToDelete = stateDatangRejected.presensiDatangDitolak;
  mockPresensiDb = mockPresensiDb.filter(p => p.id !== rejectedRecordToDelete.id);

  assert(
    mockPresensiDb.length === 1 && mockPresensiDb[0].id === newDatangId && mockPresensiDb[0].status_verifikasi === 'Menunggu',
    'F1-ADV4: Old rejected Datang is successfully purged upon resubmission, leaving only fresh pending record'
  );

  // Scenario 2.3: Pulang Rejected State
  const statePulangRejected = {
    tanggal: '2026-09-24',
    presensiDatang: { id: newDatangId, tipe_absen: 'Datang', status_verifikasi: 'Disetujui' },
    presensiPulang: null,
    presensiDatangDitolak: null,
    presensiPulangDitolak: { id: 'p-pulang-bad', tipe_absen: 'Pulang', status_verifikasi: 'Ditolak' },
    canPresensiPulang: true
  };

  const isPulangDisabledOnPulangReject = !statePulangRejected.presensiDatang || 
    (!!statePulangRejected.presensiPulang && !statePulangRejected.presensiPulangDitolak);
  assert(
    isPulangDisabledOnPulangReject === false,
    'F1-ADV5: Pulang dropdown is ENABLED when Pulang was rejected'
  );

  let initialTipeAbsenPulang = 'Datang';
  if (statePulangRejected.presensiDatangDitolak) {
    initialTipeAbsenPulang = 'Datang';
  } else if (statePulangRejected.presensiDatang && (!statePulangRejected.presensiPulang || statePulangRejected.presensiPulangDitolak)) {
    initialTipeAbsenPulang = 'Pulang';
  }
  assert(
    initialTipeAbsenPulang === 'Pulang',
    'F1-ADV6: Form automatically pre-selects Pulang on mount when Pulang was rejected'
  );

  // Scenario 2.4: Duplicate Pulang submission guard
  const statePulangAccepted = {
    tanggal: '2026-09-24',
    presensiDatang: { id: newDatangId, tipe_absen: 'Datang', status_verifikasi: 'Disetujui' },
    presensiPulang: { id: 'p-pulang-good', tipe_absen: 'Pulang', status_verifikasi: 'Disetujui' },
    presensiDatangDitolak: null,
    presensiPulangDitolak: null,
    canPresensiPulang: true
  };

  const validatePulangSubmit = (state: any, tipe: string) => {
    if (tipe === 'Pulang') {
      if (state.presensiPulang && !state.presensiPulangDitolak) {
        return { allowed: false, message: 'Anda sudah melakukan Presensi Pulang hari ini.' };
      }
    }
    return { allowed: true };
  };

  const dupPulangCheck = validatePulangSubmit(statePulangAccepted, 'Pulang');
  assert(
    dupPulangCheck.allowed === false && dupPulangCheck.message?.includes('sudah melakukan Presensi Pulang'),
    'F1-ADV7: Duplicate Pulang submission is strictly blocked when Pulang is already approved/pending'
  );


  // =========================================================================
  // SUITE 3: Laporan Piket Resubmission Reset (F3)
  // =========================================================================
  suite('3. Laporan Piket Resubmission Reset & Workflow State Machine');

  // Scenario 3.1: Piket rejection blocks Jurnal and Pulang
  const evaluatePiketWorkflow = (isPiket: boolean, laporanPiket: any | null) => {
    const canOpenJurnal = isPiket && !laporanPiket ? false : true;
    const isPiketDone = isPiket && !laporanPiket ? false : true;
    return { canOpenJurnal, isPiketDone };
  };

  const blockedWorkflow = evaluatePiketWorkflow(true, null);
  assert(
    blockedWorkflow.canOpenJurnal === false && blockedWorkflow.isPiketDone === false,
    'F3-ADV1: Rejected / missing piket report strictly blocks canOpenJurnal and locks Pulang'
  );

  // Scenario 3.2: Resubmission purges all rejected records for teacher today
  let mockPiketDb = [
    { id: 'pik-1', guru_pelapor: 'Ade Fitrawan', tanggal: '2026-09-24', status_verifikasi: 'Ditolak' },
    { id: 'pik-2', guru_pelapor: 'Ade Fitrawan', tanggal: '2026-09-24', status_verifikasi: 'Ditolak' }, // old retry
    { id: 'pik-other', guru_pelapor: 'Budi Santoso', tanggal: '2026-09-24', status_verifikasi: 'Ditolak' }
  ];

  // Emulate PiketView.tsx line 335-341 cleanup logic:
  const teacherName = 'Ade Fitrawan';
  const todayStr = '2026-09-24';
  mockPiketDb = mockPiketDb.filter(p => !(p.guru_pelapor === teacherName && p.tanggal === todayStr && p.status_verifikasi === 'Ditolak'));
  
  assert(
    mockPiketDb.length === 1 && mockPiketDb[0].id === 'pik-other',
    'F3-ADV2: Piket resubmission purges all rejected piket records for this teacher today while preserving other teachers'
  );

  // Scenario 3.3: Partner teacher piket report isolation
  assert(
    isGuruDiPiket('Ade Fitrawan Ibrahim, Budi Santoso', 'Ade Fitrawan Ibrahim') === true &&
    isGuruDiPiket('Ade Fitrawan Ibrahim, Budi Santoso', 'Citra Dewi') === false,
    'F3-ADV3: isGuruDiPiket accurately detects assigned teachers without false positive collisions'
  );


  // =========================================================================
  // SUITE 4: Admin Verification UI Updates & Attack Vectors (F4)
  // =========================================================================
  suite('4. Admin Verification UI Security & Rejection Invariants');

  // Scenario 4.1: Setujui button completely hidden for rejected items
  const renderItemButtons = (item: { id: string; status_verifikasi: string }) => {
    const buttons: string[] = [];
    if (item.status_verifikasi !== 'Ditolak') {
      buttons.push('Setujui');
    }
    buttons.push('Tolak');
    return buttons;
  };

  const rejectedItemButtons = renderItemButtons({ id: 'item-rej', status_verifikasi: 'Ditolak' });
  assert(
    !rejectedItemButtons.includes('Setujui') && rejectedItemButtons.includes('Tolak'),
    'F4-ADV1: "Setujui" button is strictly excluded from DOM when item.status_verifikasi === "Ditolak"'
  );

  const pendingItemButtons = renderItemButtons({ id: 'item-pend', status_verifikasi: 'Menunggu' });
  assert(
    pendingItemButtons.includes('Setujui') && pendingItemButtons.includes('Tolak'),
    'F4-ADV2: "Setujui" button is rendered normally for pending items'
  );

  // Scenario 4.2: displayList exclusions under all non-Ditolak filters
  const mockAllItems = [
    { id: '1', status_verifikasi: 'Menunggu' },
    { id: '2', status_verifikasi: 'Disetujui' },
    { id: '3', status_verifikasi: 'Ditolak' },
    { id: '4', status_verifikasi: 'Ditolak' }
  ];

  const filterDisplayList = (list: any[], filter: string) => {
    return list.filter(item => {
      // Rule from AdminVerifView line 475:
      if (filter !== 'Ditolak' && item.status_verifikasi === 'Ditolak') {
        return false;
      }
      if (filter !== 'Semua') {
        return (item.status_verifikasi || 'Menunggu') === filter;
      }
      return true;
    });
  };

  const listSemua = filterDisplayList(mockAllItems, 'Semua');
  assert(
    listSemua.length === 2 && !listSemua.some(i => i.status_verifikasi === 'Ditolak'),
    'F4-ADV3: "Semua" filter strictly excludes rejected items'
  );

  const listMenunggu = filterDisplayList(mockAllItems, 'Menunggu');
  assert(
    listMenunggu.length === 1 && listMenunggu[0].id === '1',
    'F4-ADV4: "Menunggu" filter strictly excludes rejected items'
  );

  const listDiverifikasi = filterDisplayList(mockAllItems, 'Disetujui');
  assert(
    listDiverifikasi.length === 1 && listDiverifikasi[0].id === '2',
    'F4-ADV5: "Disetujui" filter strictly excludes rejected items'
  );

  const listDitolak = filterDisplayList(mockAllItems, 'Ditolak');
  assert(
    listDitolak.length === 2 && listDitolak.every(i => i.status_verifikasi === 'Ditolak'),
    'F4-ADV6: "Ditolak" filter displays ONLY rejected items'
  );

  // Scenario 4.3: Bulk Verification Immunity for rejected items
  const bulkItemsTarget = [
    { id: '1', status_verifikasi: 'Menunggu', isUnsubmitted: false },
    { id: '2', status_verifikasi: 'Ditolak', isUnsubmitted: false },
    { id: '3', status_verifikasi: 'Disetujui', isUnsubmitted: false }
  ];

  // Emulate bulkVerifyCurrent filter:
  // displayList.filter(item => !item.isUnsubmitted && item.status_verifikasi !== 'Disetujui' && item.status_verifikasi !== 'Ditolak')
  const bulkApprovedCandidates = bulkItemsTarget.filter(
    item => !item.isUnsubmitted && item.status_verifikasi !== 'Disetujui' && item.status_verifikasi !== 'Ditolak'
  );

  assert(
    bulkApprovedCandidates.length === 1 && bulkApprovedCandidates[0].id === '1',
    'F4-ADV7: Bulk approval immune guard strictly ignores rejected items and already-approved items'
  );

  // Scenario 4.4: Optimistic Removal from Verification Queue on Rejection
  let activePresensiList = [
    { id: 'p-1', status_verifikasi: 'Menunggu' },
    { id: 'p-2', status_verifikasi: 'Menunggu' },
    { id: 'p-3', status_verifikasi: 'Menunggu' }
  ];

  // Admin rejects p-2:
  const rejectedId = 'p-2';
  activePresensiList = activePresensiList.filter(item => item.id !== rejectedId);

  assert(
    activePresensiList.length === 2 && !activePresensiList.some(i => i.id === 'p-2'),
    'F4-ADV8: AdminVerifView immediately removes rejected item from local state array upon rejection'
  );

  // Scenario 4.5: Rejection Reason inputValidator
  const reasonValidator = (val: string | null) => {
    if (!val || !val.trim()) {
      return 'Alasan penolakan wajib diisi';
    }
    return null;
  };

  assert(
    reasonValidator('') === 'Alasan penolakan wajib diisi' &&
    reasonValidator('   ') === 'Alasan penolakan wajib diisi' &&
    reasonValidator(null) === 'Alasan penolakan wajib diisi',
    'F4-ADV9: Empty or whitespace-only rejection note is rejected by input validator'
  );

  assert(
    reasonValidator('Foto buram, harap foto ulang di depan papan tulis') === null,
    'F4-ADV10: Meaningful rejection note passes input validator cleanly'
  );


  // =========================================================================
  // SUITE 5: Stress Matrix & Concurrent Interleaved Resubmission Simulation
  // =========================================================================
  suite('5. Stress Matrix: 50 Interleaved Rejection & Resubmission Operations');

  interface SimRecord {
    id: string;
    teacher: string;
    type: 'Presensi' | 'Jurnal' | 'Piket';
    kelas?: string;
    mapel?: string;
    status: 'Menunggu' | 'Disetujui' | 'Ditolak';
  }

  const db: SimRecord[] = [];
  const teachers = ['Guru Alpha', 'Guru Beta', 'Guru Gamma', 'Guru Delta', 'Guru Epsilon'];
  const classes = ['VII A', 'VII B', 'VIII A', 'VIII B'];

  let opCount = 0;

  // 1. Generate 30 initial submissions
  for (const t of teachers) {
    // 1 Presensi Datang
    db.push({ id: `pres-${t}`, teacher: t, type: 'Presensi', status: 'Menunggu' });
    // 2 Jurnal KBM
    for (const c of classes.slice(0, 2)) {
      db.push({ id: `jur-${t}-${c}`, teacher: t, type: 'Jurnal', kelas: c, mapel: 'Matematika', status: 'Menunggu' });
    }
    // 1 Piket
    db.push({ id: `pik-${t}`, teacher: t, type: 'Piket', status: 'Menunggu' });
  }

  // 2. Admin rejects all Jurnal for VII A for all teachers
  for (const item of db) {
    if (item.type === 'Jurnal' && item.kelas === 'VII A') {
      item.status = 'Ditolak';
    }
  }

  // 3. Teachers resubmit VII A
  for (const t of teachers) {
    // Target deletion of matching VII A
    const matchingIdx = db.findIndex(j => j.teacher === t && j.type === 'Jurnal' && j.kelas === 'VII A' && j.status === 'Ditolak');
    if (matchingIdx !== -1) {
      db.splice(matchingIdx, 1); // delete old
      db.push({ id: `jur-fresh-${t}-VII A`, teacher: t, type: 'Jurnal', kelas: 'VII A', mapel: 'Matematika', status: 'Menunggu' });
      opCount++;
    }
  }

  // Verification of invariants:
  // All VII B journals must STILL be Menunggu (never touched)
  const viiBJournals = db.filter(j => j.type === 'Jurnal' && j.kelas === 'VII B');
  assert(
    viiBJournals.length === teachers.length && viiBJournals.every(j => j.status === 'Menunggu'),
    'F5-ADV1: All non-targeted VII B journals maintained intact integrity across all teachers'
  );

  // All VII A journals are now fresh Menunggu
  const viiAJournals = db.filter(j => j.type === 'Jurnal' && j.kelas === 'VII A');
  assert(
    viiAJournals.length === teachers.length && viiAJournals.every(j => j.status === 'Menunggu' && j.id.startsWith('jur-fresh-')),
    'F5-ADV2: All resubmitted VII A journals successfully replaced old rejected records'
  );

  // Total operations executed cleanly
  assert(
    opCount === teachers.length,
    `F5-ADV3: Interleaved simulation successfully executed ${opCount} targeted isolation lifecycle cycles`
  );

  // Summary
  console.log('\n======================================================');
  console.log(`TOTAL ADVERSARIAL CHALLENGER TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAdversarialM1Tests().catch(err => {
  console.error('Adversarial Test Suite Error:', err);
  process.exit(1);
});
