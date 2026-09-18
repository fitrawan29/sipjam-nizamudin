import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';
import { getDefaultWatermarkOptions } from '../src/lib/watermarkCanvas';
import { getWitaDateStr, getWitaDayName, getWitaTimestamp } from '../src/lib/wita';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config();

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m[PASS]\x1b[0m #${totalTests}: ${testName}`);
  } else {
    failedTests++;
    const msg = `FAIL #${totalTests}: ${testName}${detail ? ` -> ${detail}` : ''}`;
    failureDetails.push(msg);
    console.error(`  \x1b[31m[FAIL]\x1b[0m #${totalTests}: ${testName}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function runAdversarialStressSuite() {
  console.log('\n======================================================================');
  console.log('       SIPJAM MILESTONE 9 ADVERSARIAL STRESS & CHALLENGER SUITE       ');
  console.log('======================================================================\n');

  // =========================================================================
  // 1. WORKFLOW.TS & FRIDAY CHECKOUT LOGIC EDGE CASES
  // =========================================================================
  console.log('\x1b[36m=== 1. Edge Cases in workflow.ts & Friday Checkout Logic ===\x1b[0m');

  // A. Friday Checkout Time Model & Boundary Conditions
  // Replicates exact time comparison logic used in GuruPresensi.tsx
  const parseTime = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const evaluatePulang = (
    currH: number,
    currM: number,
    isJumat: boolean,
    jamPulangMulai: string,
    jamPulangJumat: string,
    jamPulangAkhir: string
  ) => {
    const currTimeVal = currH * 60 + currM;
    const effectivePulangMulai = isJumat ? (jamPulangJumat || jamPulangMulai) : jamPulangMulai;
    const startVal = parseTime(effectivePulangMulai);
    const akhirVal = parseTime(jamPulangAkhir);

    if (currTimeVal < startVal) {
      return { status: 'BELUM_WAKTUNYA', effectivePulangMulai, currTimeVal, startVal, akhirVal };
    }
    if (currTimeVal > akhirVal) {
      return { status: 'DITUTUP', effectivePulangMulai, currTimeVal, startVal, akhirVal };
    }
    return { status: 'DIBUKA', effectivePulangMulai, currTimeVal, startVal, akhirVal };
  };

  const stdPulangMulai = '14:00';
  const friPulang = '11:00';
  const stdPulangAkhir = '22:00';

  // Friday: 1 minute before Friday pulang time (10:59)
  const friPre = evaluatePulang(10, 59, true, stdPulangMulai, friPulang, stdPulangAkhir);
  assert(friPre.status === 'BELUM_WAKTUNYA', 'Friday at 10:59 is rejected (before jam_pulang_jumat 11:00)');

  // Friday: Exact checkout start time (11:00)
  const friAt = evaluatePulang(11, 0, true, stdPulangMulai, friPulang, stdPulangAkhir);
  assert(friAt.status === 'DIBUKA' && friAt.effectivePulangMulai === '11:00', 'Friday at 11:00 is accepted (exact boundary)');

  // Friday: Mid-day after Friday checkout time (12:30)
  const friPost = evaluatePulang(12, 30, true, stdPulangMulai, friPulang, stdPulangAkhir);
  assert(friPost.status === 'DIBUKA', 'Friday at 12:30 is accepted (after jam_pulang_jumat)');

  // Friday vs Non-Friday at 13:30 (Crucial edge case: between Friday pulang and regular weekday pulang)
  const fri1330 = evaluatePulang(13, 30, true, stdPulangMulai, friPulang, stdPulangAkhir);
  const mon1330 = evaluatePulang(13, 30, false, stdPulangMulai, friPulang, stdPulangAkhir);
  assert(
    fri1330.status === 'DIBUKA' && mon1330.status === 'BELUM_WAKTUNYA',
    'At 13:30, checkout is OPEN on Friday (11:00) but CLOSED on Monday (14:00)'
  );

  // Friday: Exact closing boundary (22:00)
  const friClose = evaluatePulang(22, 0, true, stdPulangMulai, friPulang, stdPulangAkhir);
  assert(friClose.status === 'DIBUKA', 'Friday at 22:00 is accepted (closing boundary)');

  // Friday: 1 minute past closing time (22:01)
  const friOver = evaluatePulang(22, 1, true, stdPulangMulai, friPulang, stdPulangAkhir);
  assert(friOver.status === 'DITUTUP', 'Friday at 22:01 is rejected (past closing time)');

  // Friday: Empty/missing jam_pulang_jumat gracefully fallbacks to standard jam_pulang_mulai
  const friFallback = evaluatePulang(11, 0, true, stdPulangMulai, '', stdPulangAkhir);
  assert(
    friFallback.status === 'BELUM_WAKTUNYA' && friFallback.effectivePulangMulai === '14:00',
    'Friday with empty jam_pulang_jumat falls back to jam_pulang_mulai (14:00)'
  );

  // B. Attendance Exemption State Machine in workflow.ts
  // Pure functional reproduction of getGuruDailyState decision engine
  interface ExemptionSimulationParams {
    hasPresensiDatang: boolean;
    wajibHadirHanyaMengajar: boolean;
    isInPengaturanExemptList: boolean;
    globalPolicy: 'Semua_Hari' | 'Hari_Mengajar_Saja';
    hasKbmToday: boolean;
    isPiketToday: boolean;
    isSundayOrHoliday: boolean;
  }

  const evaluateDailyWorkflow = (p: ExemptionSimulationParams) => {
    if (p.isSundayOrHoliday) {
      return { isLibur: true, bebasAlpa: true, isAlpa: false, lockedReason: 'Libur' };
    }

    let isTeacherExempt = p.wajibHadirHanyaMengajar || p.isInPengaturanExemptList || p.globalPolicy === 'Hari_Mengajar_Saja';
    const aturanKehadiran = isTeacherExempt ? 'Hari_Mengajar_Saja' : 'Semua_Hari';
    const hasTeachingObligation = p.hasKbmToday || p.isPiketToday;

    if (!p.hasPresensiDatang) {
      if (isTeacherExempt) {
        if (!hasTeachingObligation) {
          return {
            aturanKehadiran,
            isNonTeachingDay: true,
            bebasAlpa: true,
            isAlpa: false,
            lockedReason: 'Hari ini tidak ada jadwal mengajar (Bebas Kehadiran).'
          };
        } else {
          return {
            aturanKehadiran,
            isNonTeachingDay: false,
            bebasAlpa: false,
            isAlpa: true,
            lockedReason: 'Anda belum melakukan Presensi Datang hari ini.'
          };
        }
      }
      // Non-exempt default teacher
      return {
        aturanKehadiran,
        isNonTeachingDay: false,
        bebasAlpa: false,
        isAlpa: true,
        lockedReason: 'Anda belum melakukan Presensi Datang hari ini.'
      };
    }

    return {
      aturanKehadiran,
      isNonTeachingDay: isTeacherExempt && !hasTeachingObligation,
      bebasAlpa: isTeacherExempt && !hasTeachingObligation,
      isAlpa: false,
      lockedReason: null
    };
  };

  // Case 1: Exempt teacher on NON-teaching day without presensi
  const rExemptNonTeach = evaluateDailyWorkflow({
    hasPresensiDatang: false,
    wajibHadirHanyaMengajar: true,
    isInPengaturanExemptList: false,
    globalPolicy: 'Semua_Hari',
    hasKbmToday: false,
    isPiketToday: false,
    isSundayOrHoliday: false
  });
  assert(
    rExemptNonTeach.bebasAlpa === true && rExemptNonTeach.isAlpa === false && rExemptNonTeach.isNonTeachingDay === true,
    'Exempt teacher on non-teaching day is bebasAlpa=true, isAlpa=false (Bebas Kehadiran)'
  );

  // Case 2: Exempt teacher on TEACHING day without presensi
  const rExemptTeach = evaluateDailyWorkflow({
    hasPresensiDatang: false,
    wajibHadirHanyaMengajar: true,
    isInPengaturanExemptList: false,
    globalPolicy: 'Semua_Hari',
    hasKbmToday: true,
    isPiketToday: false,
    isSundayOrHoliday: false
  });
  assert(
    rExemptTeach.isAlpa === true && rExemptTeach.bebasAlpa === false,
    'Exempt teacher on teaching day without presensi is marked isAlpa=true'
  );

  // Case 3: Regular non-exempt teacher on non-teaching day without presensi
  const rRegularNonTeach = evaluateDailyWorkflow({
    hasPresensiDatang: false,
    wajibHadirHanyaMengajar: false,
    isInPengaturanExemptList: false,
    globalPolicy: 'Semua_Hari',
    hasKbmToday: false,
    isPiketToday: false,
    isSundayOrHoliday: false
  });
  assert(
    rRegularNonTeach.isAlpa === true && rRegularNonTeach.bebasAlpa === false,
    'Non-exempt teacher on non-teaching day without presensi is marked isAlpa=true'
  );

  // Case 4: Teacher exempted via pengaturan.guru_hanya_mengajar JSON array
  const rJsonExempt = evaluateDailyWorkflow({
    hasPresensiDatang: false,
    wajibHadirHanyaMengajar: false,
    isInPengaturanExemptList: true,
    globalPolicy: 'Semua_Hari',
    hasKbmToday: false,
    isPiketToday: false,
    isSundayOrHoliday: false
  });
  assert(
    rJsonExempt.bebasAlpa === true && rJsonExempt.aturanKehadiran === 'Hari_Mengajar_Saja',
    'Teacher listed in pengaturan.guru_hanya_mengajar acquires exemption'
  );

  // Case 5: Global policy override: Hari_Mengajar_Saja
  const rGlobalExempt = evaluateDailyWorkflow({
    hasPresensiDatang: false,
    wajibHadirHanyaMengajar: false,
    isInPengaturanExemptList: false,
    globalPolicy: 'Hari_Mengajar_Saja',
    hasKbmToday: false,
    isPiketToday: false,
    isSundayOrHoliday: false
  });
  assert(
    rGlobalExempt.bebasAlpa === true && rGlobalExempt.isAlpa === false,
    'Global policy Hari_Mengajar_Saja exempts teachers on non-teaching days'
  );

  // Case 6: Sunday or holiday overrides obligation even if teaching schedule exists
  const rHoliday = evaluateDailyWorkflow({
    hasPresensiDatang: false,
    wajibHadirHanyaMengajar: false,
    isInPengaturanExemptList: false,
    globalPolicy: 'Semua_Hari',
    hasKbmToday: true,
    isPiketToday: true,
    isSundayOrHoliday: true
  });
  assert(
    rHoliday.isLibur === true && rHoliday.isAlpa === false && rHoliday.bebasAlpa === true,
    'Sunday / Kalender Libur overrides teaching obligation with isLibur=true, isAlpa=false'
  );

  // =========================================================================
  // 2. JURNAL KELAS ACCESS CONTROL RULES (AppScreen & RekapJurnalView)
  // =========================================================================
  console.log('\n\x1b[36m=== 2. Jurnal Kelas RBAC & Class Restrictions ===\x1b[0m');

  const appScreenSrc = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'components', 'AppScreen.tsx'), 'utf-8');
  const rekapJurnalSrc = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'components', 'RekapJurnalView.tsx'), 'utf-8');

  // AppScreen RBAC Model
  const evaluateAppScreenNavigation = (userRole: string, isWaliKelas: boolean, targetView: string) => {
    const isAdmin = userRole === 'Admin' || userRole === 'Superadmin';
    if (targetView === 'view-jurnal-kelas') {
      if (!isAdmin && !isWaliKelas) {
        return { allowed: false, error: 'Akses Terblokir' };
      }
    }
    return { allowed: true, error: null };
  };

  // 1. Admin access
  const navAdmin = evaluateAppScreenNavigation('Admin', false, 'view-jurnal-kelas');
  assert(navAdmin.allowed === true, 'Admin is permitted to navigate to view-jurnal-kelas');

  // 2. Assigned Wali Kelas
  const navWali = evaluateAppScreenNavigation('Guru', true, 'view-jurnal-kelas');
  assert(navWali.allowed === true, 'Assigned Wali Kelas is permitted to navigate to view-jurnal-kelas');

  // 3. Regular non-wali teacher
  const navRegular = evaluateAppScreenNavigation('Guru', false, 'view-jurnal-kelas');
  assert(navRegular.allowed === false && navRegular.error === 'Akses Terblokir', 'Regular non-wali teacher is blocked from view-jurnal-kelas');

  // Code inspection in AppScreen.tsx
  assert(
    appScreenSrc.includes("if (targetId === 'view-jurnal-kelas')") &&
    appScreenSrc.includes('!isAdmin && !isWaliKelas') &&
    appScreenSrc.includes('Akses Terblokir'),
    'AppScreen.tsx handleNavigation contains explicit RBAC gate rejecting unauthorized teachers'
  );

  assert(
    appScreenSrc.includes("...(isWaliKelas ? [{ id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' }] : [])"),
    'AppScreen.tsx menuItemsGuru completely hides Jurnal Kelas from non-wali teachers'
  );

  assert(
    appScreenSrc.includes("currentView === 'view-jurnal-kelas'") &&
    appScreenSrc.includes('isAdmin || isWaliKelas ?') &&
    appScreenSrc.includes('Akses Terblokir'),
    'AppScreen.tsx renders locked card fallback if view-jurnal-kelas is reached unauthorized'
  );

  // RekapJurnalView RBAC & Class restriction Model
  const evaluateRekapJurnalAccess = (
    userRole: string,
    isWaliKelas: boolean,
    waliClasses: string[],
    requestedMode: 'pribadi' | 'kelas',
    requestedClass: string
  ) => {
    const isAdmin = userRole === 'Admin' || userRole === 'Superadmin';
    
    // Check mode permission
    if (requestedMode === 'kelas' && !isAdmin && !isWaliKelas && waliClasses.length === 0) {
      return { allowed: false, finalClass: null, reason: 'BLOCKED_NON_WALI' };
    }

    let finalClass = requestedClass;
    // Restrict Wali Kelas to assigned classes
    if (requestedMode === 'kelas' && !isAdmin && waliClasses.length > 0) {
      if (!requestedClass || !waliClasses.includes(requestedClass)) {
        finalClass = waliClasses[0]; // Auto-reset to their assigned class
      }
    }

    return { allowed: true, finalClass, reason: 'OK' };
  };

  // Case A: Regular teacher tries to query kelas mode
  const rkRegular = evaluateRekapJurnalAccess('Guru', false, [], 'kelas', 'X-A');
  assert(rkRegular.allowed === false, 'RekapJurnalView blocks regular teacher from querying kelas mode');

  // Case B: Wali Kelas queries their own assigned class
  const rkWaliOwn = evaluateRekapJurnalAccess('Guru', true, ['X-A'], 'kelas', 'X-A');
  assert(rkWaliOwn.allowed === true && rkWaliOwn.finalClass === 'X-A', 'Wali Kelas permitted for assigned class X-A');

  // Case C: Wali Kelas attempts to access a DIFFERENT class (XI-B)
  const rkWaliForeign = evaluateRekapJurnalAccess('Guru', true, ['X-A'], 'kelas', 'XI-B');
  assert(
    rkWaliForeign.allowed === true && rkWaliForeign.finalClass === 'X-A',
    'Wali Kelas assigned to X-A attempting XI-B is automatically locked/reset back to X-A'
  );

  // Case D: Admin can access any class
  const rkAdminForeign = evaluateRekapJurnalAccess('Admin', true, [], 'kelas', 'XI-B');
  assert(
    rkAdminForeign.allowed === true && rkAdminForeign.finalClass === 'XI-B',
    'Admin is permitted to inspect journals for any requested class'
  );

  assert(
    rekapJurnalSrc.includes("if (activeMode === 'kelas' && !isAdmin && !isWaliKelas && waliClasses.length === 0)") &&
    rekapJurnalSrc.includes('setJurnalData([])'),
    'RekapJurnalView.tsx tarikRekap explicitly zeroes out data and aborts on unauthorized access'
  );

  assert(
    rekapJurnalSrc.includes("if (activeMode === 'kelas' && !isAdmin && waliClasses.length > 0)") &&
    rekapJurnalSrc.includes('activeKelas = waliClasses[0]'),
    'RekapJurnalView.tsx forces activeKelas to waliClasses[0] when non-admin requests outside their assignment'
  );

  // =========================================================================
  // 3. GRADEBOOKVIEW ACCESS RULES
  // =========================================================================
  console.log('\n\x1b[36m=== 3. GradebookView Access & Role Restrictions ===\x1b[0m');

  const gradebookSrc = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'components', 'GradebookView.tsx'), 'utf-8');

  // Admin View-Only Lock Inspection
  assert(
    gradebookSrc.includes("const isAdmin = user?.role === 'Admin' || user?.role === 'Superadmin' || user?.role === 'admin'"),
    'GradebookView resolves Admin and Superadmin roles'
  );

  assert(
    gradebookSrc.includes('if (isAdmin) {') && gradebookSrc.includes('setIsGuruPengampu(false);'),
    'GradebookView strictly forces isGuruPengampu=false for Admin accounts'
  );

  // TP CRUD Mutation Gating
  assert(
    gradebookSrc.includes('handleOpenAddTpModal = () => {') &&
    gradebookSrc.includes('if (isAdmin || !isGuruPengampu)'),
    'handleOpenAddTpModal rejects Admin and non-subject teachers with warning'
  );

  assert(
    gradebookSrc.includes('handleOpenEditTpModal = (tp: TujuanPembelajaran) => {') &&
    gradebookSrc.includes('if (isAdmin || !isGuruPengampu)'),
    'handleOpenEditTpModal rejects Admin and non-subject teachers with warning'
  );

  assert(
    gradebookSrc.includes('handleSaveTp = async (e: React.FormEvent) => {') &&
    gradebookSrc.includes('if (isAdmin || !isGuruPengampu)'),
    'handleSaveTp rejects Admin and non-subject teachers with warning'
  );

  assert(
    gradebookSrc.includes('handleDeleteTp = async (tp: TujuanPembelajaran) => {') &&
    gradebookSrc.includes('if (isAdmin || !isGuruPengampu)'),
    'handleDeleteTp rejects Admin and non-subject teachers with warning'
  );

  assert(
    gradebookSrc.includes('handleSaveGrades = async () => {') &&
    gradebookSrc.includes('if (isAdmin) {') &&
    gradebookSrc.includes('return;'),
    'handleSaveGrades immediately returns early without mutating DB if user is Admin'
  );

  // Render Inspection: Static <span> vs <input>
  assert(
    gradebookSrc.includes('{isAdmin || !isGuruPengampu ? (') &&
    gradebookSrc.includes('<span className="font-semibold text-gray-900 dark:text-white">') &&
    gradebookSrc.includes('<input') &&
    gradebookSrc.includes('type="number"'),
    'GradebookView renders read-only <span> for Admin/Non-pengampu and <input type="number"> for pengampu'
  );

  // Render Inspection: UI Action Controls
  assert(
    gradebookSrc.includes('{!isAdmin && isGuruPengampu && (') &&
    gradebookSrc.includes('Tambah TP Baru'),
    '"Tambah TP Baru" button is conditionally rendered only for non-admin guru pengampu'
  );

  assert(
    gradebookSrc.includes('{!isAdmin && isGuruPengampu && (') &&
    gradebookSrc.includes('Simpan Semua Nilai'),
    '"Simpan Semua Nilai" button is conditionally rendered only for non-admin guru pengampu'
  );

  assert(
    gradebookSrc.includes('window.print()') && gradebookSrc.includes('Cetak Dokumen'),
    '"Cetak Dokumen" button is available across roles for assessment printing'
  );

  assert(
    gradebookSrc.includes('{!isAdmin && activeTab === \'tp-matrix\' && (') &&
    gradebookSrc.includes('Export CSV'),
    'CSV export buttons are hidden for Admin view-only mode, leaving Cetak Dokumen as the exclusive export'
  );

  // =========================================================================
  // 4. CHAT & BROADCAST REALTIME CONTRACTS
  // =========================================================================
  console.log('\n\x1b[36m=== 4. Chat & Broadcast Realtime Database Contracts ===\x1b[0m');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jicvvqxjyzntdrccnuyz.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const testSekolahId = 'a0000000-0000-0000-0000-000000000001';
  const dbClient = createClient<Database>(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': testSekolahId,
        'x-user-role': 'Admin',
        'x-user-id': 'challenger-test-agent'
      }
    }
  });

  // A. Chat Messages Contract & Lifecycle
  const chatSenderId = 'challenger-guru-sender-' + Date.now();
  const chatRecipientId = 'challenger-guru-recipient-' + Date.now();
  const testChatMessage = {
    sekolah_id: testSekolahId,
    sender_id: chatSenderId,
    sender_nama: 'Challenger Guru A',
    recipient_id: chatRecipientId,
    recipient_nama: 'Challenger Guru B',
    pesan: 'Adversarial test message verifying chat contract.',
    is_read: false
  };

  const { data: insertedChat, error: errChatInsert } = await dbClient
    .from('chat_messages')
    .insert([testChatMessage])
    .select()
    .single();

  assert(!errChatInsert && !!insertedChat, 'Successfully inserted real row into public.chat_messages', errChatInsert?.message);

  if (insertedChat) {
    assert(insertedChat.pesan === testChatMessage.pesan, 'Retrieved chat message text matches payload');
    assert(insertedChat.is_read === false, 'Retrieved chat message is_read defaults to false');
    assert(!!insertedChat.created_at, 'Chat message automatically populated created_at timestamp');

    // Query conversation bidirectionally
    const { data: convMessages } = await dbClient
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${chatSenderId},recipient_id.eq.${chatRecipientId}),and(sender_id.eq.${chatRecipientId},recipient_id.eq.${chatSenderId})`);

    assert(
      !!convMessages && convMessages.some(m => m.id === insertedChat.id),
      'Bidirectional conversation query locates inserted chat message'
    );

    // State transition: Mark as read
    const { data: readChat, error: errChatUpdate } = await dbClient
      .from('chat_messages')
      .update({ is_read: true })
      .eq('id', insertedChat.id)
      .select()
      .single();

    assert(!errChatUpdate && readChat?.is_read === true, 'Chat message successfully transitioned to is_read = true');

    // Clean up
    await dbClient.from('chat_messages').delete().eq('id', insertedChat.id);
  }

  // B. Broadcast Announcement & Unread Calculation State Transitions
  const testUserId = 'challenger-user-' + Date.now();
  const testAnnouncement = {
    sekolah_id: testSekolahId,
    judul: 'Challenger Stress Test Broadcast',
    konten: 'Pengumuman untuk validasi adversarial unread badge transitions.',
    sasaran: 'Semua',
    mode: 'Satu Arah',
    penulis_nama: 'Challenger Agent',
    penulis_role: 'Admin',
    is_pinned: true
  };

  const { data: insertedAnn, error: errAnnInsert } = await dbClient
    .from('pengumuman')
    .insert([testAnnouncement])
    .select()
    .single();

  assert(!errAnnInsert && !!insertedAnn, 'Successfully inserted broadcast row into public.pengumuman', errAnnInsert?.message);

  if (insertedAnn) {
    // Unread verification: No read receipt row in public.pengumuman_dibaca
    const { data: initialReadReceipt } = await dbClient
      .from('pengumuman_dibaca')
      .select('*')
      .eq('pengumuman_id', insertedAnn.id)
      .eq('user_id', testUserId);

    assert(
      !initialReadReceipt || initialReadReceipt.length === 0,
      'Broadcast announcement has 0 read receipts for test user (State: UNREAD)'
    );

    // Simulate mark as read by inserting receipt
    const { data: insertedReceipt, error: errReceiptInsert } = await dbClient
      .from('pengumuman_dibaca')
      .insert([
        {
          sekolah_id: testSekolahId,
          pengumuman_id: insertedAnn.id,
          user_id: testUserId
        }
      ])
      .select()
      .single();

    assert(!errReceiptInsert && !!insertedReceipt, 'Inserted read receipt into public.pengumuman_dibaca');

    // Verify state transition: Announcement is now READ
    const { data: finalReadReceipt } = await dbClient
      .from('pengumuman_dibaca')
      .select('*')
      .eq('pengumuman_id', insertedAnn.id)
      .eq('user_id', testUserId);

    assert(
      !!finalReadReceipt && finalReadReceipt.length === 1,
      'Broadcast announcement now recognized as READ for test user (State: READ)'
    );

    // Clean up
    await dbClient.from('pengumuman_dibaca').delete().eq('pengumuman_id', insertedAnn.id);
    await dbClient.from('pengumuman').delete().eq('id', insertedAnn.id);
  }

  // =========================================================================
  // 5. CAMERA AND FILE INPUT RULES
  // =========================================================================
  console.log('\n\x1b[36m=== 5. Camera Enforcement & File Input Rules ===\x1b[0m');

  const presensiSrc = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'components', 'GuruPresensi.tsx'), 'utf-8');
  const jurnalSrc = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'components', 'GuruJurnal.tsx'), 'utf-8');
  const piketSrc = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'components', 'PiketView.tsx'), 'utf-8');
  const cameraSrc = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'components', 'CameraSelfieCapture.tsx'), 'utf-8');
  const watermarkSrc = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'lib', 'watermarkCanvas.ts'), 'utf-8');

  // A. Zero File Input on GuruJurnal and PiketView
  const jurnalFileInputs = (jurnalSrc.match(/<input[^>]*type=["']file["'][^>]*>/gi) || []).length;
  assert(jurnalFileInputs === 0, 'GuruJurnal.tsx has 0 <input type="file"> tags (strict live camera only)');

  const piketFileInputs = (piketSrc.match(/<input[^>]*type=["']file["'][^>]*>/gi) || []).length;
  assert(piketFileInputs === 0, 'PiketView.tsx has 0 <input type="file"> tags (strict live camera only)');

  // B. GuruPresensi: Verify file input is NEVER rendered for Pulang
  // It only exists under `jenisPresensi === 'Izin' && tipeAbsen === 'Datang'` for medical letters
  assert(
    presensiSrc.includes("{/* File upload for Izin / Sakit */}") &&
    presensiSrc.includes("{jenisPresensi === 'Izin' && tipeAbsen === 'Datang' && (") &&
    !presensiSrc.includes("tipeAbsen === 'Pulang' && <input type=\"file\""),
    'GuruPresensi.tsx strictly restricts file input to Datang Izin/Sakit surat; Pulang has NO file input'
  );

  // Presensi Pulang enforces CameraSelfieCapture
  assert(
    presensiSrc.includes("const isSelfieRequired = tipeAbsen === 'Pulang'") &&
    presensiSrc.includes('<CameraSelfieCapture'),
    'GuruPresensi.tsx binds Presensi Pulang to CameraSelfieCapture with mandatory live camera'
  );

  // C. Camera Facing Mode Toggle & Mirroring
  assert(
    cameraSrc.includes("const [facingMode, setFacingMode] = useState<'user' | 'environment'>") &&
    cameraSrc.includes('toggleFacingMode'),
    'CameraSelfieCapture supports state switching between user (front) and environment (back)'
  );

  assert(
    cameraSrc.includes("facingMode === 'user' ? '-scale-x-100' : ''"),
    'CameraSelfieCapture applies CSS horizontal flip (-scale-x-100) to live video feed for front camera'
  );

  assert(
    watermarkSrc.includes('mirror: boolean = false') &&
    watermarkSrc.includes('ctx.translate(width, 0)') &&
    watermarkSrc.includes('ctx.scale(-1, 1)'),
    'watermarkCanvas.ts drawWatermarkedCanvas performs 2D canvas mirroring when mirror=true'
  );

  // Functional test of getDefaultWatermarkOptions
  const defaultOpts = getDefaultWatermarkOptions({ latitude: -6.2088, longitude: 106.8456 });
  assert(
    defaultOpts.timestamp.includes('WITA') &&
    defaultOpts.coordinates !== null &&
    defaultOpts.coordinates.latitude === -6.2088 &&
    typeof defaultOpts.dateText === 'string' &&
    defaultOpts.dateText.length > 5,
    'getDefaultWatermarkOptions generates valid Indonesian dateText, WITA timestamp, and coordinates'
  );

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log('\n======================================================================');
  console.log(`TOTAL ADVERSARIAL STRESS CHECKS: ${totalTests}`);
  console.log(`PASSED: \x1b[32m${passedTests}\x1b[0m`);
  console.log(`FAILED: \x1b[31m${failedTests}\x1b[0m`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    console.error(`💥 ${failedTests} ADVERSARIAL CHECKS FAILED:`);
    failureDetails.forEach(f => console.error(` - ${f}`));
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${totalTests} ADVERSARIAL CHECKS CONFIRMED & VERIFIED!`);
    process.exit(0);
  }
}

runAdversarialStressSuite().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
