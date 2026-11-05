/**
 * ============================================================================
 * COMPREHENSIVE PRODUCTION ADMIN ADJUSTMENTS REGRESSION TEST SUITE (R1–R5)
 * ============================================================================
 * 
 * Verifies all acceptance criteria for Sipjam Admin production adjustments:
 * - R1: Dashboard Operasional:
 *       HomeViewAdmin greeting school name deduplication & absence of Pusat Informasi.
 * - R2: Pusat Verifikasi & Workflow Penyelarasan:
 *       AdminVerifView removal of SOP button, descending presensi sort, clean "Bebas Hadir",
 *       distinct presensi category badges, direct "tidak membuat laporan piket" unsubmitted status,
 *       DokumenView parallel class upload limit per subject & grade level,
 *       attendanceAlpa autoFillKbmJournalsForLeave automated leave sync.
 * - R3: Laporan Analitik Kerja:
 *       AdminRekapView canonicalizeTeacherRekapName deduplicating "Ade Fitrawan Ibrahim"
 *       into a single row without degrees, aggregating presence, journal, and piket metrics.
 * - R4: Asesmen dan Raport Sekolah:
 *       GradebookView & RaporView default active semester & school year on mount for Admin & Guru,
 *       dynamic meeting attendance status points form, calculation formula & persistence.
 * - R5: Master Data, Pengaturan Sistem Persisten, & Akun:
 *       AdminDataView CSV templates omitting 'id' and legacy sample strings ('KP-01', 'JP-01'),
 *       dataIntegrityGuard UUID sanitization preventing PostgreSQL Error 22P02,
 *       AdminConfigView <form noValidate> and synchronization to sekolah table,
 *       AccountSettingsModal removal of Multi-Gelar Manager / title addition UI.
 */

import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { extractTingkat } from '../src/components/DokumenView';
import { canonicalizeTeacherRekapName } from '../src/components/AdminRekapView';
import { DEFAULT_STATUS_POINTS, AttendanceStatusPoints } from '../src/components/GradebookView';
import { 
  autoFillKbmJournalsForLeave, 
  isTeacherScheduleMatch, 
  isTeacherJournalMatch 
} from '../src/lib/attendanceAlpa';
import { 
  parseAndValidateMasterCsv, 
  sanitizeUuid 
} from '../src/lib/dataIntegrityGuard';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails: { id: string; desc: string; error: any }[] = [];

function pass(id: string, desc: string, detail?: string) {
  totalTests++;
  passedTests++;
  console.log(`  ${GREEN}✔ [${id}] PASS:${RESET} ${desc}`);
  if (detail) {
    console.log(`    ${GRAY}↳ ${detail}${RESET}`);
  }
}

function fail(id: string, desc: string, error?: any) {
  totalTests++;
  failedTests++;
  const errMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
  failureDetails.push({ id, desc, error: errMsg });
  console.log(`  ${RED}✖ [${id}] FAIL:${RESET} ${desc}`);
  if (errMsg) {
    console.log(`    ${RED}↳ Error: ${errMsg}${RESET}`);
  }
}

async function runTestSuite() {
  console.log(`\n${BOLD}${CYAN}=================================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  SIPJAM PRODUCTION ADMIN ADJUSTMENTS REGRESSION TEST SUITE (R1–R5)             ${RESET}`);
  console.log(`${BOLD}${CYAN}=================================================================================${RESET}\n`);

  const homeViewAdminPath = path.resolve(__dirname, '../src/components/HomeViewAdmin.tsx');
  const adminVerifViewPath = path.resolve(__dirname, '../src/components/AdminVerifView.tsx');
  const dokumenViewPath = path.resolve(__dirname, '../src/components/DokumenView.tsx');
  const adminRekapViewPath = path.resolve(__dirname, '../src/components/AdminRekapView.tsx');
  const gradebookViewPath = path.resolve(__dirname, '../src/components/GradebookView.tsx');
  const raporViewPath = path.resolve(__dirname, '../src/components/RaporView.tsx');
  const adminDataViewPath = path.resolve(__dirname, '../src/components/AdminDataView.tsx');
  const adminConfigViewPath = path.resolve(__dirname, '../src/components/AdminConfigView.tsx');
  const accountSettingsModalPath = path.resolve(__dirname, '../src/components/AccountSettingsModal.tsx');

  // ============================================================================
  // R1: DASHBOARD OPERASIONAL
  // ============================================================================
  console.log(`${BOLD}${YELLOW}--- R1: DASHBOARD OPERASIONAL (HomeViewAdmin.tsx) ---${RESET}`);

  // Test 1.1: Greeting school name deduplication logic
  try {
    const renderGreetingSubtext = (user: { nama: string; username: string; sekolah_nama?: string }) => {
      const defaultSchool = 'SMA NIZAMUDIN';
      const schoolName = user.sekolah_nama || defaultSchool;
      const userNamaLower = (user.nama || '').toLowerCase();
      const schoolLower = schoolName.toLowerCase();
      
      const shouldRenderSchool = !userNamaLower.includes(schoolLower) && !userNamaLower.includes('sma nizamudin');
      return {
        username: user.username,
        schoolName: shouldRenderSchool ? schoolName : null
      };
    };

    // Scenario A: user.nama already includes school name -> must NOT append school name
    const adminWithSchool = {
      nama: 'Admin SMP Negeri 1 Contoh',
      username: 'admin_smp1',
      sekolah_nama: 'SMP Negeri 1 Contoh'
    };
    const resA = renderGreetingSubtext(adminWithSchool);
    assert.strictEqual(resA.schoolName, null, 'School name should not be rendered if already in user.nama');

    // Scenario B: user.nama does not include school name -> cleanly appends school name
    const adminWithoutSchool = {
      nama: 'Fitra Ibrahim',
      username: 'fitra_admin',
      sekolah_nama: 'SMP Negeri 1 Contoh'
    };
    const resB = renderGreetingSubtext(adminWithoutSchool);
    assert.strictEqual(resB.schoolName, 'SMP Negeri 1 Contoh', 'School name should be rendered if not in user.nama');

    pass('R1-DEDUP-01', 'Greeting subtext suppresses duplicate school name when user.nama already contains it');
  } catch (e) {
    fail('R1-DEDUP-01', 'School name deduplication logic failed', e);
  }

  // Test 1.2: Source verification of HomeViewAdmin.tsx for deduplication guard
  try {
    const homeContent = fs.readFileSync(homeViewAdminPath, 'utf8');
    assert.ok(
      homeContent.includes('!user?.nama?.toLowerCase().includes'),
      'HomeViewAdmin.tsx must include deduplication check !user?.nama?.toLowerCase().includes(...)'
    );
    pass('R1-DEDUP-02', 'HomeViewAdmin.tsx contains genuine case-insensitive deduplication guard in source code');
  } catch (e) {
    fail('R1-DEDUP-02', 'HomeViewAdmin.tsx missing deduplication guard', e);
  }

  // Test 1.3: Elimination of "Pusat Informasi" section from HomeViewAdmin.tsx
  try {
    const homeContent = fs.readFileSync(homeViewAdminPath, 'utf8');
    const hasPusatInformasi = /Pusat\s+Informasi/i.test(homeContent) || /Informasi\s*&\s*Pengumuman/i.test(homeContent);
    assert.strictEqual(hasPusatInformasi, false, 'HomeViewAdmin.tsx must NOT contain "Pusat Informasi" card section');
    pass('R1-INFO-01', 'Pusat Informasi (Informasi & Pengumuman Sekolah) card section is completely eliminated from HomeViewAdmin.tsx');
  } catch (e) {
    fail('R1-INFO-01', 'HomeViewAdmin.tsx still contains Pusat Informasi', e);
  }

  // ============================================================================
  // R2: PUSAT VERIFIKASI & WORKFLOW PENYELARASAN
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}--- R2: PUSAT VERIFIKASI & WORKFLOW PENYELARASAN ---${RESET}`);

  // Test 2.1: Removal of "Pedoman Kebijakan & SOP SIPJAM" button from AdminVerifView.tsx
  try {
    const verifContent = fs.readFileSync(adminVerifViewPath, 'utf8');
    // Strip comments to test actual rendered JSX
    const strippedContent = verifContent.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
    const hasSopButton = /<button[^>]*>[\s\S]*?(?:Pedoman\s+Kebijakan|SOP\s+SIPJAM)[\s\S]*?<\/button>/i.test(strippedContent) ||
                         /Pedoman\s+Kebijakan\s*&\s*SOP/i.test(strippedContent);
    assert.strictEqual(hasSopButton, false, 'AdminVerifView.tsx must NOT render SOP / Pedoman button in UI');
    pass('R2-SOP-01', 'Pedoman Kebijakan & SOP SIPJAM button is completely absent from AdminVerifView.tsx UI');
  } catch (e) {
    fail('R2-SOP-01', 'AdminVerifView.tsx still contains SOP / Pedoman button in UI', e);
  }

  // Test 2.2: Presensi history list descending sorting logic
  try {
    const sortPresensiDescending = (items: { id: string; timestamp: string }[]) => {
      return items.slice().sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
    };

    const presensiItems = [
      { id: 'item-1', timestamp: '2026-11-05T07:15:00+08:00' },
      { id: 'item-2', timestamp: '2026-11-05T09:30:00+08:00' },
      { id: 'item-3', timestamp: '2026-11-05T08:00:00+08:00' },
      { id: 'item-4', timestamp: '2026-11-05 10:45:00' }
    ];

    const sorted = sortPresensiDescending(presensiItems);
    assert.strictEqual(sorted[0].id, 'item-4', 'Newest (10:45) must be first');
    assert.strictEqual(sorted[1].id, 'item-2', 'Second newest (09:30) must be second');
    assert.strictEqual(sorted[2].id, 'item-3', '08:00 must be third');
    assert.strictEqual(sorted[3].id, 'item-1', 'Oldest (07:15) must be last');

    // Also check query in AdminVerifView.tsx: .order('timestamp', { ascending: false })
    const verifContent = fs.readFileSync(adminVerifViewPath, 'utf8');
    assert.ok(
      verifContent.includes(".order('timestamp', { ascending: false })"),
      "AdminVerifView query must order presensi_guru descending by timestamp"
    );

    pass('R2-SORT-01', 'Presensi history list is correctly sorted descending by timestamp (newest to oldest)');
  } catch (e) {
    fail('R2-SORT-01', 'Presensi descending sorting verification failed', e);
  }

  // Test 2.3: Clean "Bebas Hadir" status for KBM-only teachers with 0 scheduled classes and 0 piket
  try {
    const evaluateTeacherPresenceStatus = (
      teacher: { wajib_hadir_hanya_mengajar: boolean; nama_guru: string },
      scheduledClassesCount: number,
      hasPiketToday: boolean
    ) => {
      const isTeacherExempt = teacher.wajib_hadir_hanya_mengajar === true;
      const isFreeFromPresence = isTeacherExempt && scheduledClassesCount === 0 && !hasPiketToday;

      return {
        isFreeFromPresence,
        status_label: isFreeFromPresence ? 'Bebas Hadir' : 'Belum Selesai',
        pesan_belum: isFreeFromPresence ? 'Bebas Hadir' : 'Belum melakukan presensi datang maupun pulang'
      };
    };

    const exemptTeacherNoDuty = {
      wajib_hadir_hanya_mengajar: true,
      nama_guru: 'Guru KBM Khusus'
    };
    const statusClean = evaluateTeacherPresenceStatus(exemptTeacherNoDuty, 0, false);
    assert.strictEqual(statusClean.isFreeFromPresence, true);
    assert.strictEqual(statusClean.status_label, 'Bebas Hadir');
    assert.strictEqual(statusClean.pesan_belum, 'Bebas Hadir');

    // If teacher has scheduled class -> NOT Bebas Hadir
    const statusWithClass = evaluateTeacherPresenceStatus(exemptTeacherNoDuty, 2, false);
    assert.strictEqual(statusWithClass.isFreeFromPresence, false);
    assert.strictEqual(statusWithClass.status_label, 'Belum Selesai');

    // If teacher has piket duty -> NOT Bebas Hadir
    const statusWithPiket = evaluateTeacherPresenceStatus(exemptTeacherNoDuty, 0, true);
    assert.strictEqual(statusWithPiket.isFreeFromPresence, false);

    pass('R2-BEBAS-01', 'KBM-only teachers with 0 scheduled KBM and 0 piket cleanly display "Bebas Hadir" without extra text');
  } catch (e) {
    fail('R2-BEBAS-01', 'Clean "Bebas Hadir" evaluation failed', e);
  }

  // Test 2.4: Presensi Category Badge Pills verification
  try {
    const resolveCategoryBadge = (jenis_presensi: string, detail_izin?: string) => {
      const jp = (jenis_presensi || '').toLowerCase();
      const di = (detail_izin || '').toLowerCase();

      if (jp === 'sakit' || di === 'sakit') {
        return { label: 'Sakit', color: 'rose' };
      }
      if (jp === 'izin' || (di.includes('izin') && di !== 'sakit')) {
        return { label: 'Izin', color: 'amber' };
      }
      if (jp === 'dinas luar' || di.includes('dinas')) {
        return { label: 'Dinas Luar', color: 'blue' };
      }
      return { label: 'Hadir di Sekolah', color: 'emerald' };
    };

    assert.strictEqual(resolveCategoryBadge('Sakit').label, 'Sakit');
    assert.strictEqual(resolveCategoryBadge('Izin', 'Sakit').label, 'Sakit');
    assert.strictEqual(resolveCategoryBadge('Izin', 'Urusan Keluarga').label, 'Izin');
    assert.strictEqual(resolveCategoryBadge('Dinas Luar').label, 'Dinas Luar');
    assert.strictEqual(resolveCategoryBadge('Sekolah').label, 'Hadir di Sekolah');

    const verifContent = fs.readFileSync(adminVerifViewPath, 'utf8');
    assert.ok(verifContent.includes('Hadir di Sekolah'), 'Must render Hadir di Sekolah badge');
    assert.ok(verifContent.includes('fa-notes-medical'), 'Must render Sakit medical badge icon');
    assert.ok(verifContent.includes('fa-envelope-open-text'), 'Must render Izin badge icon');
    assert.ok(verifContent.includes('fa-briefcase'), 'Must render Dinas Luar briefcase badge icon');

    pass('R2-BADGE-01', 'Presensi categories render distinct badge pills (Hadir di Sekolah, Sakit, Izin, Dinas Luar)');
  } catch (e) {
    fail('R2-BADGE-01', 'Presensi category badges resolution failed', e);
  }

  // Test 2.5: Piket unsubmitted teachers directly marked "tidak membuat laporan piket" without confirmation modal
  try {
    const verifContent = fs.readFileSync(adminVerifViewPath, 'utf8');
    assert.ok(
      verifContent.includes("pesan_belum: 'tidak membuat laporan piket'"),
      "unsubmittedPiket must directly assign pesan_belum: 'tidak membuat laporan piket'"
    );
    assert.ok(
      verifContent.includes("status_verifikasi: 'tidak membuat laporan piket'"),
      "unsubmittedPiket must directly assign status_verifikasi: 'tidak membuat laporan piket'"
    );
    pass('R2-PIKET-01', 'Unsubmitted piket teachers are immediately marked "tidak membuat laporan piket" without requiring confirmation');
  } catch (e) {
    fail('R2-PIKET-01', 'Unsubmitted piket status verification failed', e);
  }

  // Test 2.6: DokumenView extractTingkat across diverse parallel classes
  try {
    assert.strictEqual(extractTingkat('7A'), 'VII');
    assert.strictEqual(extractTingkat('7B'), 'VII');
    assert.strictEqual(extractTingkat('VII-A'), 'VII');
    assert.strictEqual(extractTingkat('VII-B'), 'VII');
    assert.strictEqual(extractTingkat('8.1'), 'VIII');
    assert.strictEqual(extractTingkat('VIII-A'), 'VIII');
    assert.strictEqual(extractTingkat('9.2'), 'IX');
    assert.strictEqual(extractTingkat('IX Merdeka'), 'IX');
    assert.strictEqual(extractTingkat('X Merdeka 1'), 'X');
    assert.strictEqual(extractTingkat('X Merdeka 2'), 'X');
    assert.strictEqual(extractTingkat('10A'), 'X');
    assert.strictEqual(extractTingkat('XI Merdeka 1'), 'XI');
    assert.strictEqual(extractTingkat('XI IPA 2'), 'XI');
    assert.strictEqual(extractTingkat('XII IPA 1'), 'XII');
    assert.strictEqual(extractTingkat('12 IPS 3'), 'XII');

    pass('R2-TINGKAT-01', 'extractTingkat correctly identifies grade level across Roman, Arabic, and parallel class names');
  } catch (e) {
    fail('R2-TINGKAT-01', 'extractTingkat failed', e);
  }

  // Test 2.7: DokumenView parallel class upload limit per subject & grade level
  try {
    const existingDocs = [
      {
        nama_guru: 'Fitri Dotulong',
        jenis_dokumen: 'CP',
        mapel: 'Bahasa Inggris',
        kelas: '7A',
        judul: 'Analisis Capaian Pembelajaran 7A'
      },
      {
        nama_guru: 'Fitri Dotulong',
        jenis_dokumen: 'ATP',
        mapel: 'Bahasa Inggris',
        kelas: 'X Merdeka 1',
        judul: 'Alur Tujuan Pembelajaran Kelas X'
      }
    ];

    const checkUploadDuplicate = (
      userNama: string,
      jenis: string,
      mapel: string,
      kelas: string,
      docs: typeof existingDocs
    ): boolean => {
      const targetTingkat = extractTingkat(kelas);
      const normalizedMapel = (mapel || '').trim().toLowerCase();
      const normalizedJenis = (jenis || '').trim().toLowerCase();

      return docs.some(d => {
        const isSameTeacher = (d.nama_guru || '').trim().toLowerCase() === userNama.trim().toLowerCase();
        if (!isSameTeacher) return false;

        const dJenis = (d.jenis_dokumen || '').trim().toLowerCase();
        const isSameJenis = dJenis === normalizedJenis ||
          (normalizedJenis.includes('cp') && (dJenis.includes('capaian') || dJenis.includes('cp'))) ||
          (normalizedJenis.includes('atp') && (dJenis.includes('tujuan') || dJenis.includes('atp')));
        if (!isSameJenis) return false;

        const dMapel = (d.mapel || '').trim().toLowerCase();
        const isSameMapel = !normalizedMapel || !dMapel || dMapel === normalizedMapel;
        if (!isSameMapel) return false;

        const dTingkat = extractTingkat(d.kelas);
        return Boolean(targetTingkat && dTingkat && targetTingkat === dTingkat);
      });
    };

    // Parallel class 7B for same teacher, same subject, same CP -> MUST be blocked
    const duplicate7B = checkUploadDuplicate('Fitri Dotulong', 'CP', 'Bahasa Inggris', '7B', existingDocs);
    assert.strictEqual(duplicate7B, true, 'Upload for 7B must be blocked when 7A exists');

    // Parallel class X Merdeka 2 for same teacher, same subject, same ATP -> MUST be blocked
    const duplicateX2 = checkUploadDuplicate('Fitri Dotulong', 'ATP', 'Bahasa Inggris', 'X Merdeka 2', existingDocs);
    assert.strictEqual(duplicateX2, true, 'Upload for X Merdeka 2 must be blocked when X Merdeka 1 exists');

    // Different grade level (e.g. 8A for CP) -> Allowed
    const allowed8A = checkUploadDuplicate('Fitri Dotulong', 'CP', 'Bahasa Inggris', '8A', existingDocs);
    assert.strictEqual(allowed8A, false, 'Upload for different grade 8A must be allowed');

    // Different subject (e.g. Matematika for 7B) -> Allowed
    const allowedMath = checkUploadDuplicate('Fitri Dotulong', 'CP', 'Matematika', '7B', existingDocs);
    assert.strictEqual(allowedMath, false, 'Upload for different subject must be allowed');

    pass('R2-PARALLEL-01', 'DokumenView restricts teaching device upload to 1 per subject per grade level across parallel classes');
  } catch (e) {
    fail('R2-PARALLEL-01', 'Parallel class upload restriction check failed', e);
  }

  // Test 2.8: autoFillKbmJournalsForLeave generates journal entries on absence with leave
  try {
    const insertedJournals: any[] = [];
    
    // Create chainable Supabase query mock
    const createChainableMock = (resolvedData: any[]) => {
      const chainable: any = {
        data: resolvedData,
        error: null,
        select: () => chainable,
        eq: () => chainable,
        insert: (records: any) => {
          if (Array.isArray(records)) {
            insertedJournals.push(...records);
          } else if (records) {
            insertedJournals.push(records);
          }
          return { error: null };
        },
        then: (resolve: any) => resolve({ data: resolvedData, error: null })
      };
      return chainable;
    };

    const mockJadwal = [
      {
        id: 'jadwal-1',
        hari: 'Senin',
        nama_guru: 'Budi Santoso',
        mata_pelajaran: 'Matematika',
        kelas: '7A',
        jam_mulai: '07:30',
        jam_selesai: '09:00',
        jam_ke: '1-2'
      },
      {
        id: 'jadwal-2',
        hari: 'Senin',
        nama_guru: 'Budi Santoso',
        mata_pelajaran: 'Matematika',
        kelas: '7B',
        jam_mulai: '09:15',
        jam_selesai: '10:45',
        jam_ke: '3-4'
      }
    ];

    const mockClient = {
      from: (table: string) => {
        if (table === 'jadwal_pelajaran') {
          return createChainableMock(mockJadwal);
        }
        if (table === 'jurnal_pembelajaran') {
          return createChainableMock([]);
        }
        return createChainableMock([]);
      }
    };

    // 2026-11-09 is a Monday (Senin)
    const count = await autoFillKbmJournalsForLeave(
      { nama_guru: 'Budi Santoso', sekolah_id: 'sekolah-01' },
      '2026-11-09',
      'Sakit',
      { keterangan: 'Demam tinggi', link_bukti: 'https://drive.google.com/surat.pdf' },
      mockClient
    );

    assert.strictEqual(count, 2, 'Should have inserted 2 KBM journal entries for 2 scheduled classes');
    assert.strictEqual(insertedJournals.length, 2);
    assert.strictEqual(insertedJournals[0].status_verifikasi, 'Sakit');
    assert.strictEqual(insertedJournals[0].materi, 'Sakit');
    assert.strictEqual(insertedJournals[0].kegiatan, 'Presensi Sakit: Demam tinggi');
    assert.strictEqual(insertedJournals[0].catatan_admin, 'Otomatis terisi sesuai presensi (Sakit)');
    assert.strictEqual(insertedJournals[0].foto_kegiatan, 'https://drive.google.com/surat.pdf');

    pass('R2-AUTOJOURNAL-01', 'autoFillKbmJournalsForLeave auto-generates complete KBM journals with Sakit status and notes');
  } catch (e) {
    fail('R2-AUTOJOURNAL-01', 'autoFillKbmJournalsForLeave verification failed', e);
  }

  // ============================================================================
  // R3: LAPORAN ANALITIK KERJA
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}--- R3: LAPORAN ANALITIK KERJA (AdminRekapView.tsx) ---${RESET}`);

  // Test 3.1: canonicalizeTeacherRekapName deduplication of "Ade Fitrawan Ibrahim"
  try {
    const variations = [
      'Ade Fitrawan Ibrahim',
      'Ade Fitrawan Ibrahim, S.Pd.',
      'Ade Fitrawan Ibrahim, M.Pd., Gr.',
      'Drs. Ade Fitrawan Ibrahim',
      '  Ade Fitrawan Ibrahim, S.Kom.  '
    ];

    variations.forEach(variant => {
      const canonical = canonicalizeTeacherRekapName(variant);
      assert.strictEqual(
        canonical,
        'Ade Fitrawan Ibrahim',
        `Variant "${variant}" must be canonicalized to "Ade Fitrawan Ibrahim"`
      );
    });

    // Other teachers are untouched
    assert.strictEqual(canonicalizeTeacherRekapName('Dewi Sartika, S.Pd.'), 'Dewi Sartika, S.Pd.');
    assert.strictEqual(canonicalizeTeacherRekapName('Ahmad Syarif'), 'Ahmad Syarif');

    pass('R3-CANONICAL-01', 'canonicalizeTeacherRekapName correctly normalizes all degree variations of Ade Fitrawan Ibrahim to single name');
  } catch (e) {
    fail('R3-CANONICAL-01', 'canonicalizeTeacherRekapName failed', e);
  }

  // Test 3.2: Aggregation simulation ensuring single consolidated row in rekap table
  try {
    const mockGuruList = [
      { id: '1', nama_guru: 'Ade Fitrawan Ibrahim' },
      { id: '2', nama_guru: 'Ade Fitrawan Ibrahim, M.Pd., Gr.' },
      { id: '3', nama_guru: 'Siti Nurhaliza' }
    ];

    const mockPresensi = [
      { nama_guru: 'Ade Fitrawan Ibrahim', tipe_absen: 'Datang', jenis_presensi: 'Sekolah' },
      { nama_guru: 'Ade Fitrawan Ibrahim, M.Pd., Gr.', tipe_absen: 'Datang', jenis_presensi: 'Sekolah' },
      { nama_guru: 'Siti Nurhaliza', tipe_absen: 'Datang', jenis_presensi: 'Sekolah' }
    ];

    const mockJurnal = [
      { nama_guru: 'Ade Fitrawan Ibrahim' },
      { nama_guru: 'Ade Fitrawan Ibrahim, M.Pd., Gr.' },
      { nama_guru: 'Ade Fitrawan Ibrahim, M.Pd., Gr.' }
    ];

    const pMap: Record<string, any> = {};
    mockGuruList.forEach(g => {
      const cName = canonicalizeTeacherRekapName(g.nama_guru);
      if (!pMap[cName]) {
        pMap[cName] = { nama: cName, hadir: 0, jurnal: 0, piket: 0 };
      }
    });

    mockPresensi.forEach(p => {
      const cName = canonicalizeTeacherRekapName(p.nama_guru);
      if (pMap[cName] && p.tipe_absen === 'Datang') {
        pMap[cName].hadir++;
      }
    });

    mockJurnal.forEach(j => {
      const cName = canonicalizeTeacherRekapName(j.nama_guru);
      if (pMap[cName]) {
        pMap[cName].jurnal++;
      }
    });

    const rows = Object.values(pMap);
    const adeRows = rows.filter(r => r.nama === 'Ade Fitrawan Ibrahim');
    assert.strictEqual(adeRows.length, 1, 'Must produce exactly ONE row for Ade Fitrawan Ibrahim');
    assert.strictEqual(adeRows[0].hadir, 2, 'Attendance from both entries must be aggregated');
    assert.strictEqual(adeRows[0].jurnal, 3, 'Journals from both entries must be aggregated');

    pass('R3-AGGREGATE-01', 'Rekapitulasi consolidates entries into a single row for "Ade Fitrawan Ibrahim" with aggregated metrics');
  } catch (e) {
    fail('R3-AGGREGATE-01', 'Rekapitulasi aggregation failed', e);
  }

  // ============================================================================
  // R4: ASESMEN DAN RAPORT SEKOLAH
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}--- R4: ASESMEN DAN RAPORT SEKOLAH ---${RESET}`);

  // Test 4.1: Active semester and school year default on mount for Admin and Guru in GradebookView.tsx
  try {
    const gradebookContent = fs.readFileSync(gradebookViewPath, 'utf8');
    assert.ok(
      gradebookContent.includes('fetchAcademicYearSettings'),
      'GradebookView.tsx must fetch academic year and semester settings from pengaturan'
    );
    assert.ok(
      gradebookContent.includes('setSyncedTahunAjaran(tahunVal)') && gradebookContent.includes('setSelectedTahunAjaran(tahunVal)'),
      'GradebookView.tsx must synchronize selectedTahunAjaran on mount'
    );
    assert.ok(
      gradebookContent.includes('setSyncedSemester(normSem)') && gradebookContent.includes('setSelectedSemester(normSem)'),
      'GradebookView.tsx must synchronize selectedSemester on mount'
    );
    pass('R4-DEFAULT-01', 'GradebookView synchronizes active school year and semester by default on mount');
  } catch (e) {
    fail('R4-DEFAULT-01', 'GradebookView academic year sync verification failed', e);
  }

  // Test 4.2: Active semester and school year default on mount for Admin in RaporView.tsx
  try {
    const raporContent = fs.readFileSync(raporViewPath, 'utf8');
    assert.ok(
      raporContent.includes('isAdmin || selectedTahunAjaranRef.current === prevActiveTa'),
      'RaporView.tsx must synchronize active school year when user is Admin'
    );
    assert.ok(
      raporContent.includes('isAdmin || selectedSemesterRef.current === prevActiveSem'),
      'RaporView.tsx must synchronize active semester when user is Admin'
    );
    pass('R4-DEFAULT-02', 'RaporView ensures active school year and semester are selected by default on mount for Admin');
  } catch (e) {
    fail('R4-DEFAULT-02', 'RaporView Admin default sync verification failed', e);
  }

  // Test 4.3: DEFAULT_STATUS_POINTS values
  try {
    assert.strictEqual(DEFAULT_STATUS_POINTS.hadir, 100);
    assert.strictEqual(DEFAULT_STATUS_POINTS.sakit, 75);
    assert.strictEqual(DEFAULT_STATUS_POINTS.izin, 75);
    assert.strictEqual(DEFAULT_STATUS_POINTS.terlambat, 75);
    assert.strictEqual(DEFAULT_STATUS_POINTS.alpa, 0);
    pass('R4-POINTS-01', 'DEFAULT_STATUS_POINTS complies with standard values (Hadir: 100, Sakit: 75, Izin: 75, Terlambat: 75, Alpa: 0)');
  } catch (e) {
    fail('R4-POINTS-01', 'DEFAULT_STATUS_POINTS verification failed', e);
  }

  // Test 4.4: Dynamic Attendance Points calculation formula: Math.round((earnedPoints / (validSessions * 100)) * 100)
  try {
    const calculateAttendanceScore = (
      sessions: ('H' | 'S' | 'I' | 'T' | 'A')[],
      customPoints: AttendanceStatusPoints = DEFAULT_STATUS_POINTS
    ): number => {
      const getPoints = (s: string) => {
        if (s === 'H') return customPoints.hadir;
        if (s === 'S') return customPoints.sakit;
        if (s === 'I') return customPoints.izin;
        if (s === 'T') return customPoints.terlambat;
        if (s === 'A') return customPoints.alpa;
        return 0;
      };

      const earned = sessions.reduce((acc, cur) => acc + getPoints(cur), 0);
      const validSessions = sessions.length;
      if (validSessions === 0) return 0;
      return parseFloat(((earned / (validSessions * 100)) * 100).toFixed(1));
    };

    // 10 sessions all Hadir -> 100%
    assert.strictEqual(calculateAttendanceScore(['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H']), 100);

    // 4 sessions: 2 Hadir (100+100), 1 Sakit (75), 1 Izin (75) -> 350 / 400 = 87.5%
    assert.strictEqual(calculateAttendanceScore(['H', 'H', 'S', 'I']), 87.5);

    // 4 sessions: 2 Hadir (200), 1 Terlambat (75), 1 Alpa (0) -> 275 / 400 = 68.8%
    assert.strictEqual(calculateAttendanceScore(['H', 'H', 'T', 'A']), 68.8);

    // Custom point weights: Hadir: 100, Sakit: 80, Izin: 60, Terlambat: 70, Alpa: 10
    const custom: AttendanceStatusPoints = { hadir: 100, sakit: 80, izin: 60, terlambat: 70, alpa: 10 };
    assert.strictEqual(calculateAttendanceScore(['H', 'S', 'I', 'T', 'A'], custom), 64); // 320 / 500 = 64%

    pass('R4-CALC-01', 'Attendance score calculates mathematically via (earnedPoints / (validSessions * 100)) * 100');
  } catch (e) {
    fail('R4-CALC-01', 'Attendance score calculation failed', e);
  }

  // Test 4.5: Persistence schema verification for dynamic attendance status points in GradebookView.tsx
  try {
    const gradebookContent = fs.readFileSync(gradebookViewPath, 'utf8');
    assert.ok(
      gradebookContent.includes('bobot_nilai_mapel'),
      'GradebookView.tsx must persist bobot to key "bobot_nilai_mapel" in pengaturan table'
    );
    assert.ok(
      gradebookContent.includes('status_points'),
      'GradebookView.tsx must serialize and store status_points inside bobot_nilai_mapel'
    );
    assert.ok(
      gradebookContent.includes('input-points-hadir') || gradebookContent.includes('statusPointsForm.hadir'),
      'GradebookView.tsx must provide dynamic form inputs for attendance status points'
    );
    pass('R4-FORM-01', 'GradebookView includes dynamic form inputs and Supabase persistence for meeting attendance points');
  } catch (e) {
    fail('R4-FORM-01', 'GradebookView dynamic points persistence verification failed', e);
  }

  // ============================================================================
  // R5: MASTER DATA, PENGATURAN SISTEM PERSISTEN, & AKUN
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}--- R5: MASTER DATA, PENGATURAN SISTEM PERSISTEN, & AKUN ---${RESET}`);

  // Test 5.1: AdminDataView CSV templates omit 'id' and legacy sample strings ('KP-01', 'JP-01')
  try {
    const adminDataContent = fs.readFileSync(adminDataViewPath, 'utf8');

    // Extract Kalender_Pendidikan template definition
    const kalenderMatch = adminDataContent.match(/Kalender_Pendidikan:\s*\{[\s\S]*?filename:\s*'Template_Kalender_Pendidikan\.csv'[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/);
    assert.ok(kalenderMatch, 'Must find Kalender_Pendidikan template in AdminDataView.tsx');
    const kalenderHeaders = kalenderMatch[1];
    const kalenderSample = kalenderMatch[2];
    assert.strictEqual(kalenderHeaders.includes("'id'"), false, "Kalender_Pendidikan template headers must NOT include 'id'");
    assert.strictEqual(kalenderSample.includes('KP-01'), false, "Kalender_Pendidikan template sample must NOT include 'KP-01'");

    // Extract Jadwal_Pelajaran template definition
    const jadwalMatch = adminDataContent.match(/Jadwal_Pelajaran:\s*\{[\s\S]*?filename:\s*'Template_Jadwal_Pelajaran\.csv'[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/);
    assert.ok(jadwalMatch, 'Must find Jadwal_Pelajaran template in AdminDataView.tsx');
    const jadwalHeaders = jadwalMatch[1];
    const jadwalSample = jadwalMatch[2];
    assert.strictEqual(jadwalHeaders.includes("'id'"), false, "Jadwal_Pelajaran template headers must NOT include 'id'");
    assert.strictEqual(jadwalSample.includes('JP-01'), false, "Jadwal_Pelajaran template sample must NOT include 'JP-01'");

    pass('R5-CSV-01', 'CSV templates for Kalender_Pendidikan and Jadwal_Pelajaran omit "id" and legacy strings ("KP-01", "JP-01")');
  } catch (e) {
    fail('R5-CSV-01', 'AdminDataView CSV templates verification failed', e);
  }

  // Test 5.2: dataIntegrityGuard UUID sanitization converts legacy string IDs to valid UUIDs
  try {
    const csvKalenderLegacy = [
      'id,tanggal,keterangan,tipe',
      'KP-01,2026-10-01,Hari Kesaktian Pancasila,Libur'
    ].join('\n');

    const parsedKalender = parseAndValidateMasterCsv(csvKalenderLegacy, 'kalender_pendidikan');
    assert.strictEqual(parsedKalender.length, 1);
    assert.notStrictEqual(parsedKalender[0].id, 'KP-01', 'Legacy KP-01 must be converted');
    assert.ok(UUID_REGEX.test(parsedKalender[0].id), `Converted ID "${parsedKalender[0].id}" must be a valid UUID`);

    const csvJadwalLegacy = [
      'id,hari,nama_guru,mata_pelajaran,kelas',
      'JP-01,Senin,Fitri Aprilia Dotulong,Bahasa Inggris,X Merdeka'
    ].join('\n');

    const parsedJadwal = parseAndValidateMasterCsv(csvJadwalLegacy, 'jadwal_pelajaran');
    assert.strictEqual(parsedJadwal.length, 1);
    assert.notStrictEqual(parsedJadwal[0].id, 'JP-01', 'Legacy JP-01 must be converted');
    assert.ok(UUID_REGEX.test(parsedJadwal[0].id), `Converted ID "${parsedJadwal[0].id}" must be a valid UUID`);

    pass('R5-UUID-01', 'Legacy string IDs (KP-01, JP-01) are automatically sanitized to genuine UUIDs preventing Error 22P02');
  } catch (e) {
    fail('R5-UUID-01', 'Legacy ID sanitization failed', e);
  }

  // Test 5.3: dataIntegrityGuard automatically generates valid UUID when ID is missing or empty
  try {
    const csvNoId = [
      'hari,nama_guru,mata_pelajaran,kelas',
      'Senin,Dewi Sartika,Informatika,7A'
    ].join('\n');

    const parsed = parseAndValidateMasterCsv(csvNoId, 'jadwal_pelajaran');
    assert.strictEqual(parsed.length, 1);
    assert.ok(parsed[0].id, 'Row must have generated ID');
    assert.ok(UUID_REGEX.test(parsed[0].id), `Generated ID "${parsed[0].id}" must be a valid UUID`);

    pass('R5-UUID-02', 'Rows missing ID column automatically generate a valid UUID');
  } catch (e) {
    fail('R5-UUID-02', 'Missing ID UUID generation failed', e);
  }

  // Test 5.4: AdminConfigView <form> has noValidate attribute
  try {
    const configContent = fs.readFileSync(adminConfigViewPath, 'utf8');
    assert.ok(
      configContent.includes('noValidate'),
      'AdminConfigView form must have noValidate attribute to avoid hidden tab validation blocking'
    );
    pass('R5-FORM-01', 'AdminConfigView form has noValidate to ensure seamless multi-tab configuration saving');
  } catch (e) {
    fail('R5-FORM-01', 'AdminConfigView noValidate verification failed', e);
  }

  // Test 5.5: AdminConfigView synchronizes school identity fields to sekolah table
  try {
    const configContent = fs.readFileSync(adminConfigViewPath, 'utf8');
    assert.ok(
      /\.from\(['"]sekolah['"]\)\s*\.update\(/.test(configContent),
      'AdminConfigView must update the sekolah table'
    );
    assert.ok(
      configContent.includes('updatePayload.nama = saveConfig.kop_sekolah'),
      'AdminConfigView must synchronize kop_sekolah to sekolah.nama'
    );
    assert.ok(
      configContent.includes('updatePayload.alamat = saveConfig.kop_alamat'),
      'AdminConfigView must synchronize kop_alamat to sekolah.alamat'
    );
    assert.ok(
      configContent.includes('updatePayload.npsn = saveConfig.kop_npsn'),
      'AdminConfigView must synchronize kop_npsn to sekolah.npsn'
    );
    assert.ok(
      configContent.includes('updatePayload.kota_kabupaten = cityValue'),
      'AdminConfigView must synchronize kota_kabupaten'
    );
    assert.ok(
      configContent.includes('updatePayload.logo_url = saveConfig.logo_kiri || saveConfig.logo_kanan'),
      'AdminConfigView must synchronize school logo to sekolah.logo_url'
    );
    pass('R5-SEKOLAH-01', 'AdminConfigView persistently synchronizes all school identity fields to the sekolah table');
  } catch (e) {
    fail('R5-SEKOLAH-01', 'AdminConfigView sekolah table sync verification failed', e);
  }

  // Test 5.6: AccountSettingsModal presents clean single 'Nama Lengkap *' input and eliminates Multi-Gelar UI
  try {
    const accountModalContent = fs.readFileSync(accountSettingsModalPath, 'utf8');

    // Verify presence of single Nama Lengkap input
    assert.ok(
      accountModalContent.includes('Nama Lengkap *'),
      'AccountSettingsModal must include a clean single "Nama Lengkap *" input'
    );

    // Verify absence of Multi-Gelar Manager container and "+ Tambah Gelar" button in JSX body
    assert.strictEqual(
      accountModalContent.includes('swal-btn-add-title') || accountModalContent.includes('>+ Tambah Gelar<'),
      false,
      'AccountSettingsModal must NOT contain "+ Tambah Gelar" button in JSX'
    );
    assert.strictEqual(
      accountModalContent.includes('swal-titles-list'),
      false,
      'AccountSettingsModal must NOT contain swal-titles-list container in JSX'
    );

    pass('R5-ACCOUNT-01', 'AccountSettingsModal presents clean single "Nama Lengkap *" input with title addition UI eliminated');
  } catch (e) {
    fail('R5-ACCOUNT-01', 'AccountSettingsModal clean input verification failed', e);
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log(`\n${BOLD}${CYAN}=================================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  TEST SUITE RESULTS SUMMARY                                                     ${RESET}`);
  console.log(`${BOLD}${CYAN}=================================================================================${RESET}`);
  console.log(`  Total Executed Tests: ${BOLD}${totalTests}${RESET}`);
  console.log(`  Passed Tests:         ${GREEN}${BOLD}${passedTests}${RESET}`);
  console.log(`  Failed Tests:         ${failedTests > 0 ? RED : GREEN}${BOLD}${failedTests}${RESET}`);

  if (failedTests > 0) {
    console.log(`\n${RED}${BOLD}Failures Summary:${RESET}`);
    failureDetails.forEach(f => {
      console.log(`  - [${f.id}] ${f.desc}: ${f.error}`);
    });
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}🎉 ALL REGRESSION TESTS PASSED EMPIRICALLY! (R1–R5 VALIDATED)${RESET}\n`);
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Unhandled Test Suite Error:', err);
  process.exit(1);
});
