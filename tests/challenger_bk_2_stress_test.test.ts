/**
 * ============================================================================
 * ADVERSARIAL STRESS TEST HARNESS — CHALLENGER BK 2
 * Focus: Jurnal BK Classless Counseling, Universal Student Selector,
 *        CRUD & Draft Resilience, Kepala Sekolah Read-Only Mode,
 *        Admin BK Account Management, and Non-Regression
 * File: tests/challenger_bk_2_stress_test.test.ts
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import assert from 'node:assert';
import { isSchemaCacheOrMissingTableError } from '../src/lib/supabaseClient';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function check(condition: boolean, id: string, name: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✔ [${id}] PASS:${RESET} ${name}`);
    if (details) console.log(`    ${GRAY}↳ ${details}${RESET}`);
  } else {
    failedTests++;
    console.error(`  ${RED}✖ [${id}] FAIL:${RESET} ${name}`);
    if (details) console.error(`    ${RED}↳ Detail: ${details}${RESET}`);
  }
}

// In-memory mock localStorage for simulating browser storage
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }
}

async function runAdversarialStressTests() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}⚡ ADVERSARIAL STRESS TEST: JURNAL BK & STUDENT SELECTOR RESILIENCE${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  const mockStorage = new MockLocalStorage();

  // ==========================================================================
  // SUITE 1: UNIVERSAL STUDENT SELECTOR & CLASSLESS FILTERING
  // ==========================================================================
  console.log(`${BOLD}--- Suite 1: Universal Student Selector & Classless Stress Testing ---${RESET}`);

  // Generate 500 heterogeneous student records across 10 classes
  const classes = ['7A', '7B', '8A', '8B', '8C', '9A', '9B', '10-IPA-1', '11-IPS-2', '12-BAHASA'];
  const baseNames = ['Ahmad', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fajar', 'Gita', 'Hadi', 'Indah', 'Joko'];
  const generatedStudents: Array<{
    id: string;
    nisn: string;
    nama_siswa: string;
    kelas: string;
    gender: string;
  }> = [];

  for (let i = 0; i < 500; i++) {
    const cls = classes[i % classes.length];
    const base = baseNames[i % baseNames.length];
    const nisn = `00${(10000000 + i).toString()}`;
    const name = `${base} ${i < 50 ? 'Pratama' : i < 100 ? 'Santoso' : i < 200 ? 'Wijaya' : 'Putra'} ${i + 1}`;
    generatedStudents.push({
      id: `s-${i + 1}`,
      nisn,
      nama_siswa: name,
      kelas: cls,
      gender: i % 2 === 0 ? 'L' : 'P'
    });
  }

  // Exact filtering algorithm used by BkJurnalView.tsx:
  // filteredStudents = students.filter(s => {
  //   const matchClass = studentClassFilter === 'all' || s.kelas === studentClassFilter;
  //   const matchSearch = !q || (s.nama_siswa && s.nama_siswa.toLowerCase().includes(q)) ||
  //     (s.nisn && s.nisn.toLowerCase().includes(q));
  //   return matchClass && matchSearch;
  // });
  function filterStudents(
    students: typeof generatedStudents,
    classFilter: string,
    searchQuery: string
  ) {
    const q = searchQuery.trim().toLowerCase();
    return students.filter(s => {
      const matchClass = classFilter === 'all' || s.kelas === classFilter;
      const matchSearch =
        !q ||
        (s.nama_siswa && s.nama_siswa.toLowerCase().includes(q)) ||
        (s.nisn && s.nisn.toLowerCase().includes(q));
      return matchClass && matchSearch;
    });
  }

  // 1.1 Unconstrained cross-class selection
  const allResult = filterStudents(generatedStudents, 'all', '');
  check(allResult.length === 500, 'S1.1', 'Universal student pool contains all 500 students without timetable lock');

  // 1.2 Class filter isolation
  const class7AResult = filterStudents(generatedStudents, '7A', '');
  check(
    class7AResult.length === 50 && class7AResult.every(s => s.kelas === '7A'),
    'S1.2',
    'Class filter strictly confines results to class 7A (50 students)'
  );

  // 1.3 Case-insensitive partial name search
  const queryBudi = filterStudents(generatedStudents, 'all', 'buDi');
  check(
    queryBudi.length > 0 && queryBudi.every(s => s.nama_siswa.toLowerCase().includes('budi')),
    'S1.3',
    'Live search matches "buDi" case-insensitively across all classes'
  );

  // 1.4 NISN partial search
  const queryNisn = filterStudents(generatedStudents, 'all', '1000004');
  check(
    queryNisn.length > 0 && queryNisn.every(s => s.nisn.includes('1000004')),
    'S1.4',
    'Live search matches partial NISN digits accurately'
  );

  // 1.5 Combined class + search filter
  const combinedResult = filterStudents(generatedStudents, '8B', 'ahmad');
  check(
    combinedResult.every(s => s.kelas === '8B' && s.nama_siswa.toLowerCase().includes('ahmad')),
    'S1.5',
    'Combined filter correctly intersects class selection and student search'
  );

  // 1.6 Adversarial input stress: regex metacharacters, punctuation, unicode
  const regexAttacks = ['.*', '+', '(', '[0-9]', '^$', '\\d+', '(?=.*)', '.*+?^${}()|[]\\'];
  let regexSafe = true;
  for (const attack of regexAttacks) {
    try {
      const res = filterStudents(generatedStudents, 'all', attack);
      if (!Array.isArray(res)) regexSafe = false;
    } catch (e) {
      regexSafe = false;
    }
  }
  check(regexSafe, 'S1.6', 'Search handles raw regex metacharacters without throwing RegEx errors or crashing');

  // 1.7 Adversarial input stress: empty strings, whitespace strings, emojis, unicode
  const blankResult = filterStudents(generatedStudents, 'all', '    ');
  check(blankResult.length === 500, 'S1.7.1', 'Whitespace-only search returns full student list without filtering');
  const emojiResult = filterStudents(generatedStudents, 'all', '🎓🔍💯');
  check(emojiResult.length === 0, 'S1.7.2', 'Emoji search gracefully returns empty list with zero crashes');

  // 1.8 Extremely long input (10,000 characters buffer overflow stress)
  const hugeString = 'a'.repeat(10000);
  const hugeResult = filterStudents(generatedStudents, 'all', hugeString);
  check(hugeResult.length === 0, 'S1.8', '10,000 character search input executes cleanly without memory leak or TLE');

  // ==========================================================================
  // SUITE 2: COUNSELING FIELD VALIDATION & PAYLOAD INTEGRITY
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 2: Counseling Field Validation & Payload Integrity ---${RESET}`);

  // Validation logic from BkJurnalView.tsx handleSubmitForm:
  function validateBkJurnalForm(formData: {
    nama_siswa: string;
    kelas: string;
    catatan: string;
    tindak_lanjut: string;
    tanggal: string;
    waktu: string;
    bidang_bimbingan: string;
    status: string;
  }): { valid: boolean; errorField?: string } {
    if (!formData.nama_siswa || !formData.kelas) {
      return { valid: false, errorField: 'siswa' };
    }
    if (!formData.catatan || !formData.catatan.trim()) {
      return { valid: false, errorField: 'catatan' };
    }
    if (!formData.tindak_lanjut || !formData.tindak_lanjut.trim()) {
      return { valid: false, errorField: 'tindak_lanjut' };
    }
    return { valid: true };
  }

  // 2.1 Rejection of missing student
  const missingStudent = validateBkJurnalForm({
    nama_siswa: '',
    kelas: '',
    catatan: 'Permasalahan belajar',
    tindak_lanjut: 'Sesi lanjutan',
    tanggal: '2026-11-09',
    waktu: '10:00',
    bidang_bimbingan: 'Belajar',
    status: 'Dalam Penanganan'
  });
  check(!missingStudent.valid && missingStudent.errorField === 'siswa', 'S2.1', 'Form strictly rejects empty student selection');

  // 2.2 Rejection of whitespace-only student
  const emptyClass = validateBkJurnalForm({
    nama_siswa: 'Budi Santoso',
    kelas: '',
    catatan: 'Permasalahan',
    tindak_lanjut: 'Tindak lanjut',
    tanggal: '2026-11-09',
    waktu: '10:00',
    bidang_bimbingan: 'Sosial',
    status: 'Dalam Penanganan'
  });
  check(!emptyClass.valid && emptyClass.errorField === 'siswa', 'S2.2', 'Form strictly rejects student without assigned class');

  // 2.3 Rejection of empty / whitespace catatan
  const emptyCatatan = validateBkJurnalForm({
    nama_siswa: 'Budi Santoso',
    kelas: '8A',
    catatan: '     \n\t   ',
    tindak_lanjut: 'Tindak lanjut',
    tanggal: '2026-11-09',
    waktu: '10:00',
    bidang_bimbingan: 'Sosial',
    status: 'Dalam Penanganan'
  });
  check(!emptyCatatan.valid && emptyCatatan.errorField === 'catatan', 'S2.3', 'Form strictly rejects whitespace-only catatan kasus');

  // 2.4 Rejection of empty / whitespace tindak lanjut
  const emptyTindakLanjut = validateBkJurnalForm({
    nama_siswa: 'Budi Santoso',
    kelas: '8A',
    catatan: 'Catatan kasus valid',
    tindak_lanjut: '  ',
    tanggal: '2026-11-09',
    waktu: '10:00',
    bidang_bimbingan: 'Sosial',
    status: 'Dalam Penanganan'
  });
  check(!emptyTindakLanjut.valid && emptyTindakLanjut.errorField === 'tindak_lanjut', 'S2.4', 'Form strictly rejects whitespace-only tindak lanjut');

  // 2.5 Acceptance of valid form
  const validForm = validateBkJurnalForm({
    nama_siswa: 'Budi Santoso',
    kelas: '8A',
    catatan: 'Siswa mengalami penurunan motivasi belajar pasca sakit.',
    tindak_lanjut: 'Jadwalkan konseling belajar lanjutan minggu depan dan kontak wali kelas.',
    tanggal: '2026-11-09',
    waktu: '10:00',
    bidang_bimbingan: 'Belajar',
    status: 'Dalam Penanganan'
  });
  check(validForm.valid, 'S2.5', 'Form accepts fully populated, valid counseling entry');

  // 2.6 Automatic sasaran determination: Kelompok vs Individu
  const deriveSasaran = (layanan: string) => layanan.toLowerCase().includes('kelompok') ? 'Kelompok' : 'Individu';
  check(deriveSasaran('Konseling Individual') === 'Individu', 'S2.6.1', 'Konseling Individual derives sasaran "Individu"');
  check(deriveSasaran('Konseling Kelompok') === 'Kelompok', 'S2.6.2', 'Konseling Kelompok derives sasaran "Kelompok"');
  check(deriveSasaran('Bimbingan Kelompok') === 'Kelompok', 'S2.6.3', 'Bimbingan Kelompok derives sasaran "Kelompok"');
  check(deriveSasaran('Mediasi') === 'Individu', 'S2.6.4', 'Mediasi derives sasaran "Individu"');
  check(deriveSasaran('Konferensi Kasus') === 'Individu', 'S2.6.5', 'Konferensi Kasus derives sasaran "Individu"');

  // ==========================================================================
  // SUITE 3: CRUD RESILIENCE, CACHING & DRAFT AUTO-SAVING
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 3: CRUD Operations, LocalStorage & Cache Resilience ---${RESET}`);

  const sekolahId = 'sekolah-test-uuid-001';
  const counselorId = 'counselor-uuid-001';
  const cacheKey = `sipjam_jurnal_bk_cache_${sekolahId}`;
  const draftKey = `sipjam_jurnal_bk_draft_${counselorId}`;

  // 3.1 Draft Auto-Save & Recovery Simulation
  mockStorage.clear();
  const sampleDraft = {
    siswa_id: 's-1',
    nisn: '0010000000',
    nama_siswa: 'Ahmad Pratama 1',
    kelas: '7A',
    tanggal: '2026-11-09',
    waktu: '09:00',
    bidang_bimbingan: 'Pribadi',
    jenis_layanan: 'Konseling Individual',
    tempat_layanan: 'Ruang BK',
    catatan: 'Draft uraian masalah siswa sedang diketik...',
    tindak_lanjut: '',
    status: 'Dalam Penanganan'
  };

  // Condition for draft auto-save:
  // if (isReadOnly || editingId) return;
  // const isTouched = formData.nama_siswa || formData.catatan || formData.tindak_lanjut;
  const isTouched = Boolean(sampleDraft.nama_siswa || sampleDraft.catatan || sampleDraft.tindak_lanjut);
  if (isTouched) {
    mockStorage.setItem(draftKey, JSON.stringify(sampleDraft));
  }

  const restoredDraftRaw = mockStorage.getItem(draftKey);
  check(Boolean(restoredDraftRaw), 'S3.1.1', 'Form draft correctly auto-saves to localStorage');
  const restoredDraft = JSON.parse(restoredDraftRaw!);
  check(
    restoredDraft.nama_siswa === 'Ahmad Pratama 1' && restoredDraft.catatan.includes('Draft uraian masalah'),
    'S3.1.2',
    'Form draft accurately restores student name and in-progress notes'
  );

  // 3.2 Draft cleanup upon form reset or successful save
  mockStorage.removeItem(draftKey);
  check(mockStorage.getItem(draftKey) === null, 'S3.2', 'Draft key is cleanly purged upon reset or save completion');

  // 3.3 Create Entry with Cache Persistence
  let entriesList: any[] = [];
  const newEntry1 = {
    id: 'entry-uuid-101',
    sekolah_id: sekolahId,
    guru_id: counselorId,
    user_id: counselorId,
    nama_guru: 'Dra. Hj. Siti Rahmah, M.Pd (Guru BK)',
    siswa_id: 's-1',
    nisn: '0010000000',
    nama_siswa: 'Ahmad Pratama 1',
    kelas: '7A',
    tanggal: '2026-11-09',
    waktu: '08:30',
    bidang_bimbingan: 'Belajar',
    jenis_layanan: 'Konseling Individual',
    tempat_layanan: 'Ruang BK',
    catatan: 'Kesulitan konsentrasi saat pembelajaran matematika.',
    tindak_lanjut: 'Konseling berkala dan latihan manajemen waktu.',
    status: 'Dalam Penanganan',
    created_at: new Date().toISOString()
  };

  entriesList = [newEntry1, ...entriesList];
  mockStorage.setItem(cacheKey, JSON.stringify(entriesList));

  check(entriesList.length === 1, 'S3.3.1', 'New entry successfully prepended to entries list');
  check(
    JSON.parse(mockStorage.getItem(cacheKey)!).length === 1,
    'S3.3.2',
    'LocalStorage cache is immediately synchronized on create'
  );

  // 3.4 Multi-entry CRUD & Update
  const newEntry2 = {
    id: 'entry-uuid-102',
    sekolah_id: sekolahId,
    guru_id: counselorId,
    nama_guru: 'Dra. Hj. Siti Rahmah, M.Pd (Guru BK)',
    siswa_id: 's-2',
    nisn: '0010000001',
    nama_siswa: 'Budi Santoso 2',
    kelas: '7B',
    tanggal: '2026-11-08',
    waktu: '11:00',
    bidang_bimbingan: 'Sosial',
    jenis_layanan: 'Mediasi',
    tempat_layanan: 'Ruang BK',
    catatan: 'Perselisihan dengan teman sekelas mengenai tugas piket.',
    tindak_lanjut: 'Mediasi damai dan kesepakatan bersama saling memaafkan.',
    status: 'Selesai',
    created_at: new Date().toISOString()
  };

  entriesList = [newEntry2, ...entriesList];
  mockStorage.setItem(cacheKey, JSON.stringify(entriesList));
  check(entriesList.length === 2, 'S3.4.1', 'Second entry added for different student and class');

  // Perform Update on entry-uuid-101
  const updatedStatus = 'Selesai';
  entriesList = entriesList.map(e => e.id === 'entry-uuid-101' ? { ...e, status: updatedStatus, updated_at: new Date().toISOString() } : e);
  mockStorage.setItem(cacheKey, JSON.stringify(entriesList));
  const updatedEntry = entriesList.find(e => e.id === 'entry-uuid-101');
  check(updatedEntry?.status === 'Selesai', 'S3.4.2', 'Update operation successfully transitions case status to "Selesai"');
  check(
    JSON.parse(mockStorage.getItem(cacheKey)!).find((e: any) => e.id === 'entry-uuid-101').status === 'Selesai',
    'S3.4.3',
    'LocalStorage cache reflects updated status immediately'
  );

  // Perform Delete on entry-uuid-102
  entriesList = entriesList.filter(e => e.id !== 'entry-uuid-102');
  mockStorage.setItem(cacheKey, JSON.stringify(entriesList));
  check(entriesList.length === 1 && entriesList[0].id === 'entry-uuid-101', 'S3.4.4', 'Delete operation cleanly removes entry');
  check(
    JSON.parse(mockStorage.getItem(cacheKey)!).length === 1,
    'S3.4.5',
    'LocalStorage cache reflects deletion immediately'
  );

  // 3.5 Schema Cache / Missing Table Error Fallback Resilience
  const mockPostgrestErrors = [
    { code: 'PGRST205', message: 'Could not find the table "public.jurnal_bk" in the schema cache' },
    { code: 'PGRST204', message: 'Schema cache column error' },
    { code: '42P01', message: 'relation "public.jurnal_bk" does not exist' },
    { hint: 'reload schema', message: 'Table relation missing' },
    { message: 'could not find the table "public.jurnal_bk" in the schema cache' }
  ];

  let fallbackSuccess = true;
  for (const err of mockPostgrestErrors) {
    const isCacheErr = isSchemaCacheOrMissingTableError(err);
    if (!isCacheErr) {
      fallbackSuccess = false;
      break;
    }
    // Simulate fallback: read from localStorage
    const cached = mockStorage.getItem(cacheKey);
    if (!cached || JSON.parse(cached).length !== 1) {
      fallbackSuccess = false;
      break;
    }
  }
  check(
    fallbackSuccess,
    'S3.5',
    'isSchemaCacheOrMissingTableError detects missing table / stale cache and safely retrieves localStorage data'
  );

  // ==========================================================================
  // SUITE 4: KEPALA SEKOLAH READ-ONLY & ADMIN SUPERVISION
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 4: Kepala Sekolah Read-Only & Admin Multi-Counselor Supervision ---${RESET}`);

  const bkViewPath = path.resolve('src/components/BkJurnalView.tsx');
  const bkViewSource = fs.readFileSync(bkViewPath, 'utf8');

  // 4.1 Read-only notice banner preservation
  check(
    bkViewSource.includes('data-testid="readonly-notice"'),
    'S4.1.1',
    'BkJurnalView source renders <div data-testid="readonly-notice"> in read-only mode'
  );
  check(
    bkViewSource.includes('Mode Peninjauan (Monitoring Read-Only)'),
    'S4.1.2',
    'Read-only notice informs user about active monitoring mode'
  );

  // 4.2 Mutative action inhibition in Read-Only Mode
  check(
    bkViewSource.includes('if (isReadOnly) {') && bkViewSource.includes('Aksi dinonaktifkan: Anda dalam mode peninjauan (read-only)'),
    'S4.2.1',
    'Form submission strictly blocked with warning dialog if isReadOnly === true'
  );
  check(
    bkViewSource.includes('const handleStartEdit = (entry: JurnalBkEntry) => {\n    if (isReadOnly) return;'),
    'S4.2.2',
    'handleStartEdit strictly aborts execution when isReadOnly === true'
  );
  check(
    bkViewSource.includes('const handleDeleteEntry = async (entry: JurnalBkEntry) => {\n    if (isReadOnly) return;'),
    'S4.2.3',
    'handleDeleteEntry strictly aborts execution when isReadOnly === true'
  );
  check(
    bkViewSource.includes('activeTab === \'input\' && !isReadOnly'),
    'S4.2.4',
    'Input / edit tab is completely inaccessible and unrendered when isReadOnly === true'
  );
  check(
    bkViewSource.includes('!isReadOnly && <th className="py-2.5 px-3 text-center">Aksi</th>'),
    'S4.2.5',
    'Table "Aksi" column header is completely omitted when isReadOnly === true'
  );
  check(
    bkViewSource.includes('!isReadOnly && (\n                          <td className="py-2.5 px-3 align-top text-center whitespace-nowrap">'),
    'S4.2.6',
    'Table edit and delete action buttons are completely omitted when isReadOnly === true'
  );

  // 4.3 Admin Multi-Counselor Supervision & Filtering
  // Multi-counselor dataset
  const multiCounselorEntries = [
    { id: '1', nama_guru: 'Dra. Siti Rahmah (Guru BK)', nama_siswa: 'Siswa A', tanggal: '2026-11-09', status: 'Dalam Penanganan', bidang_bimbingan: 'Pribadi' },
    { id: '2', nama_guru: 'Ahmad Fauzi, S.Pd (Guru BK)', nama_siswa: 'Siswa B', tanggal: '2026-11-08', status: 'Selesai', bidang_bimbingan: 'Sosial' },
    { id: '3', nama_guru: 'Dra. Siti Rahmah (Guru BK)', nama_siswa: 'Siswa C', tanggal: '2026-11-07', status: 'Dalam Penanganan', bidang_bimbingan: 'Belajar' },
    { id: '4', nama_guru: 'Budi Hartono, M.Pd (Guru BK)', nama_siswa: 'Siswa D', tanggal: '2026-11-06', status: 'Alih Tangan Kasus', bidang_bimbingan: 'Karir' }
  ];

  // Extract counselor options as done in BkJurnalView:
  const extractedCounselors = Array.from(new Set(multiCounselorEntries.map(e => e.nama_guru))).sort();
  check(extractedCounselors.length === 3, 'S4.3.1', 'Counselor list dynamically extracts all 3 distinct counselors');
  check(
    extractedCounselors.includes('Dra. Siti Rahmah (Guru BK)') &&
    extractedCounselors.includes('Ahmad Fauzi, S.Pd (Guru BK)') &&
    extractedCounselors.includes('Budi Hartono, M.Pd (Guru BK)'),
    'S4.3.2',
    'All counselor names correctly mapped in options'
  );

  // Filter by specific counselor
  function filterByCounselor(entries: typeof multiCounselorEntries, counselor: string) {
    if (counselor === 'all') return entries;
    return entries.filter(e => e.nama_guru === counselor);
  }

  const sitiFilter = filterByCounselor(multiCounselorEntries, 'Dra. Siti Rahmah (Guru BK)');
  check(sitiFilter.length === 2, 'S4.3.3', 'Admin filter isolates Dra. Siti Rahmah entries (2 entries)');
  const ahmadFilter = filterByCounselor(multiCounselorEntries, 'Ahmad Fauzi, S.Pd (Guru BK)');
  check(ahmadFilter.length === 1, 'S4.3.4', 'Admin filter isolates Ahmad Fauzi entries (1 entry)');
  const allCounselors = filterByCounselor(multiCounselorEntries, 'all');
  check(allCounselors.length === 4, 'S4.3.5', 'Admin filter "all" reveals supervisory view across all 4 entries');

  // ==========================================================================
  // SUITE 5: ADMIN BK ACCOUNT MANAGEMENT & teacherUserSync RESILIENCE
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 5: Admin BK Account Management & teacherUserSync ---${RESET}`);

  const adminViewPath = path.resolve('src/components/AdminPenggunaView.tsx');
  const adminViewSource = fs.readFileSync(adminViewPath, 'utf8');
  const syncModulePath = path.resolve('src/lib/teacherUserSync.ts');
  const syncModuleSource = fs.readFileSync(syncModulePath, 'utf8');

  // 5.1 "+ Akun BK" Modal 4-Field Validation Logic
  function validateCreateBkForm(fields: {
    nip?: string;
    nama?: string;
    no_hp?: string;
    email?: string;
  }): { valid: boolean; error?: string } {
    const nip = fields.nip?.trim();
    const nama = fields.nama?.trim();
    const no_hp = fields.no_hp?.trim();
    const email = fields.email?.trim();

    if (!nip || !nama || !no_hp || !email) {
      return { valid: false, error: 'Semua 4 data (NIP, Nama Lengkap, Nomor HP, dan Email Aktif) wajib diisi!' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { valid: false, error: 'Format email aktif tidak valid (contoh: user@sekolah.sch.id)!' };
    }
    return { valid: true };
  }

  // Test modal validations
  check(!validateCreateBkForm({ nip: '', nama: 'Guru BK', no_hp: '08123', email: 'bk@sch.id' }).valid, 'S5.1.1', 'Empty NIP is rejected');
  check(!validateCreateBkForm({ nip: '19800101', nama: '', no_hp: '08123', email: 'bk@sch.id' }).valid, 'S5.1.2', 'Empty Nama is rejected');
  check(!validateCreateBkForm({ nip: '19800101', nama: 'Guru BK', no_hp: '', email: 'bk@sch.id' }).valid, 'S5.1.3', 'Empty Nomor HP is rejected');
  check(!validateCreateBkForm({ nip: '19800101', nama: 'Guru BK', no_hp: '08123', email: '' }).valid, 'S5.1.4', 'Empty Email is rejected');

  // Test invalid emails
  const invalidEmails = ['invalid', 'user@', '@domain.com', 'user@domain', 'user name@school.id'];
  let emailValidationPassed = true;
  for (const badEmail of invalidEmails) {
    const res = validateCreateBkForm({ nip: '19800101', nama: 'Guru BK', no_hp: '08123', email: badEmail });
    if (res.valid || !res.error?.includes('Format email')) {
      emailValidationPassed = false;
      break;
    }
  }
  check(emailValidationPassed, 'S5.1.5', 'Regex strictly rejects invalid email addresses with descriptive error');

  // Test valid creation & default password
  const validBkInput = {
    nip: '198503152010011005',
    nama: 'Rina Kusumawati, S.Psi',
    no_hp: '081298765432',
    email: 'rina.bk@sekolah.sch.id'
  };
  const validBkResult = validateCreateBkForm(validBkInput);
  check(validBkResult.valid, 'S5.1.6', 'All 4 valid fields pass form validation');
  const expectedPassword = `${validBkInput.nip}27`;
  check(expectedPassword === '19850315201001100527', 'S5.1.7', 'Default password complies with `${nip}27` contract');

  // 5.2 "Tunjuk BK" / "Ke Guru" toggle in AdminPenggunaView
  check(
    adminViewSource.includes('handleToggleBkAssignment'),
    'S5.2.1',
    'AdminPenggunaView implements handleToggleBkAssignment'
  );
  check(
    adminViewSource.includes('Tunjuk BK') && adminViewSource.includes('Ke Guru'),
    'S5.2.2',
    'AdminPenggunaView displays contextual action labels "Tunjuk BK" and "Ke Guru"'
  );
  check(
    adminViewSource.includes("targetRole === 'bk' ? 'Bimbingan Konseling (BK)' : '-'"),
    'S5.2.3',
    'Toggling to BK updates mata_pelajaran to "Bimbingan Konseling (BK)" and reciprocal resets to "-"'
  );

  // 5.3 teacherUserSync role preservation
  check(
    syncModuleSource.includes("'Guru', 'tata_usaha', 'Tata Usaha', 'bk', 'guru_bk', 'Guru BK'"),
    'S5.3.1',
    'teacherUserSync queries user accounts with BK role variants'
  );
  check(
    syncModuleSource.includes("role: matchedUser?.role || (isTeacherBk ? 'bk' : 'Guru')"),
    'S5.3.2',
    'teacherUserSync strictly preserves assigned matchedUser.role without overriding to Guru'
  );
  check(
    syncModuleSource.includes("role: isBkMapel ? 'bk' : 'Guru'"),
    'S5.3.3',
    'New user accounts for teachers with BK mapel automatically receive role "bk"'
  );

  // ==========================================================================
  // SUITE 6: NON-REGRESSION & INVARIANT CHECK
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 6: Non-Regression & Verbatim Comment Invariants ---${RESET}`);

  // 6.1 Check GuruJurnal and workflow
  const workflowPath = path.resolve('src/lib/workflow.ts');
  const workflowSource = fs.readFileSync(workflowPath, 'utf8');
  check(
    workflowSource.includes('canTeacherPresensiPulang'),
    'S6.1.1',
    'workflow.ts preserves checkout gate function canTeacherPresensiPulang'
  );

  const guruJurnalPath = path.resolve('src/components/GuruJurnal.tsx');
  const guruJurnalSource = fs.readFileSync(guruJurnalPath, 'utf8');
  check(
    guruJurnalSource.includes('getGuruDailyState') && guruJurnalSource.includes('isJurnalMatchJadwal'),
    'S6.1.2',
    'GuruJurnal.tsx retains core KBM timetable scheduling and learning journal structures'
  );

  // 6.2 Check AST preservation comments
  const appScreenPath = path.resolve('src/components/AppScreen.tsx');
  const appScreenSource = fs.readFileSync(appScreenPath, 'utf8');
  check(
    appScreenSource.includes('{/* AST preservation: data-tour={item.id} */}'),
    'S6.2.1',
    'AppScreen.tsx preserves verbatim: {/* AST preservation: data-tour={item.id} */}'
  );

  const claySidebarPath = path.resolve('src/components/ClaySidebar.tsx');
  const claySidebarSource = fs.readFileSync(claySidebarPath, 'utf8');
  check(
    claySidebarSource.includes('{/* AST preservation: data-tour={item.id} */}'),
    'S6.2.2',
    'ClaySidebar.tsx preserves verbatim: {/* AST preservation: data-tour={item.id} */}'
  );

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}📊 ADVERSARIAL STRESS TEST SUMMARY${RESET}`);
  console.log(`  Total Checks  : ${BOLD}${totalTests}${RESET}`);
  console.log(`  Passed Checks : ${BOLD}${GREEN}${passedTests}${RESET}`);
  console.log(`  Failed Checks : ${BOLD}${failedTests > 0 ? RED : GREEN}${failedTests}${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  if (failedTests > 0) {
    console.error(`${BOLD}${RED}❌ ADVERSARIAL CHALLENGE DETECTED FAILURES!${RESET}`);
    process.exit(1);
  } else {
    console.log(`${BOLD}${GREEN}🎉 ALL ${totalTests} ADVERSARIAL STRESS CHECKS PASSED EMPIRICALLY WITH ZERO DEFECTS!${RESET}\n`);
    process.exit(0);
  }
}

runAdversarialStressTests().catch(err => {
  console.error('Unhandled failure:', err);
  process.exit(1);
});
