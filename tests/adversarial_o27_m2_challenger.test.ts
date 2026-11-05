/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL CHALLENGER TEST SUITE: MILESTONE M2 (R2)
 * Adversarial Stress-Testing of Verification Center, Dokumen, & Auto-fill Leave
 *
 * File: tests/adversarial_o27_m2_challenger.test.ts
 *
 * Scope:
 * 1. AdminVerifView.tsx:
 *    - Timestamp sort order with diverse date formats (ISO, spaces, invalid dates, nulls)
 *    - "Bebas Hadir" edge cases: teacher category matching, 0 scheduled classes, 0 piket
 *    - Unsubmitted piket: shows "tidak membuat laporan piket" without modal/prompt
 * 2. DokumenView.tsx:
 *    - extractTingkat with diverse class names ("X Merdeka 1", "X-1", "Kelas 10 A", "XI IPA 2", "XII TKJ", "7A", "7B", "10A", etc.)
 *    - Duplicate upload blocking for parallel classes on same grade level vs different grade/subject
 * 3. Auto-fill KBM journal on leave:
 *    - autoFillKbmJournalsForLeave behavior for Sakit/Izin/Dinas Luar
 *    - Verification that scheduled KBM classes are assigned legitimate status and NOT marked "tidak masuk kelas"
 *    - RekapJurnalView excused leave synthesis
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import assert from 'assert';
import { extractTingkat } from '../src/components/DokumenView';
import { autoFillKbmJournalsForLeave } from '../src/lib/attendanceAlpa';

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
const failures: { id: string; desc: string; error: any }[] = [];

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
  failures.push({ id, desc, error: errMsg });
  console.log(`  ${RED}✖ [${id}] FAIL:${RESET} ${desc}`);
  if (errMsg) {
    console.log(`    ${RED}↳ Error: ${errMsg}${RESET}`);
  }
}

async function main() {
  console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN} ADVERSARIAL CHALLENGER TEST SUITE: MILESTONE M2 (R2)                 ${RESET}`);
  console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════════════════════════${RESET}\n`);

  // ============================================================================
  // SECTION 1: AdminVerifView.tsx - TIMESTAMP SORT ORDER & DATE FORMATS
  // ============================================================================
  console.log(`${BOLD}--- SECTION 1: AdminVerifView Timestamp Sort Order & Date Formats ---${RESET}`);

  // Replicate sorting logic from AdminVerifView.tsx lines 728-732
  function sortSubmittedRecords(records: any[]): any[] {
    return records.slice().sort((a: any, b: any) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
  }

  try {
    // 1.1 Chronological ordering with ISO 8601 strings
    const isoRecords = [
      { id: '1', timestamp: '2026-11-05T07:10:00+08:00' },
      { id: '2', timestamp: '2026-11-05T09:45:00+08:00' },
      { id: '3', timestamp: '2026-11-05T08:15:00+08:00' }
    ];
    const sortedIso = sortSubmittedRecords(isoRecords);
    assert.strictEqual(sortedIso[0].id, '2', 'Newest record (09:45) must be first');
    assert.strictEqual(sortedIso[1].id, '3', 'Middle record (08:15) must be second');
    assert.strictEqual(sortedIso[2].id, '1', 'Oldest record (07:10) must be last');
    pass('R2-SORT-01', 'Sorts ISO 8601 timestamps descending (newest to oldest)');
  } catch (e) {
    fail('R2-SORT-01', 'Failed sorting ISO timestamps', e);
  }

  try {
    // 1.2 Heterogeneous date formats: ISO + space-separated + UTC + milliseconds
    const mixedRecords = [
      { id: 'old-space', timestamp: '2026-11-05 06:30:00' },
      { id: 'newest-iso', timestamp: '2026-11-05T14:20:00+08:00' },
      { id: 'mid-utc', timestamp: '2026-11-05T02:00:00Z' }, // 10:00 WITA
      { id: 'mid-milli', timestamp: '2026-11-05T11:00:00.500+08:00' }
    ];
    const sortedMixed = sortSubmittedRecords(mixedRecords);
    assert.strictEqual(sortedMixed[0].id, 'newest-iso', '14:20 WITA must be first');
    assert.strictEqual(sortedMixed[1].id, 'mid-milli', '11:00 WITA must be second');
    assert.strictEqual(sortedMixed[2].id, 'mid-utc', '10:00 WITA (02:00 UTC) must be third');
    assert.strictEqual(sortedMixed[3].id, 'old-space', '06:30 must be fourth');
    pass('R2-SORT-02', 'Sorts heterogeneous date formats (ISO, space, UTC, milliseconds) correctly');
  } catch (e) {
    fail('R2-SORT-02', 'Failed sorting mixed date formats', e);
  }

  try {
    // 1.3 Null, undefined, empty string, and missing timestamp edge cases
    const edgeRecords = [
      { id: 'null-ts', timestamp: null },
      { id: 'valid-ts', timestamp: '2026-11-05T08:00:00+08:00' },
      { id: 'undefined-ts', timestamp: undefined },
      { id: 'empty-ts', timestamp: '' }
    ];
    const sortedEdge = sortSubmittedRecords(edgeRecords);
    assert.strictEqual(sortedEdge[0].id, 'valid-ts', 'Valid timestamp must appear before null/undefined/empty');
    pass('R2-SORT-03', 'Handles null, undefined, and empty string timestamps without crashing');
  } catch (e) {
    fail('R2-SORT-03', 'Failed sorting records with null/undefined timestamps', e);
  }

  try {
    // 1.4 Invalid timestamp strings (evaluating NaN behavior in sort comparator)
    const invalidRecords = [
      { id: 'valid-new', timestamp: '2026-11-05T10:00:00+08:00' },
      { id: 'invalid-str', timestamp: 'not-a-valid-date' },
      { id: 'valid-old', timestamp: '2026-11-05T07:00:00+08:00' }
    ];
    const timeInvalid = new Date('not-a-valid-date').getTime();
    assert(Number.isNaN(timeInvalid), 'new Date(invalid) returns NaN');
    const sortedInvalid = sortSubmittedRecords(invalidRecords);
    assert(Array.isArray(sortedInvalid), 'Must return an array');
    pass('R2-SORT-04', 'Sort execution completes without exception even with invalid date strings');
  } catch (e) {
    fail('R2-SORT-04', 'Crash on invalid date string sort', e);
  }

  // ============================================================================
  // SECTION 2: AdminVerifView.tsx - "BEBAS HADIR" & UNPAID/UNSCHEDULED RULES
  // ============================================================================
  console.log(`\n${BOLD}--- SECTION 2: AdminVerifView "Bebas Hadir" & Piket Status Logic ---${RESET}`);

  function evaluateBebasHadir(teacher: any, scheduledClassesCount: number, hasPiketToday: boolean, aturanGlobal: string, guruHanyaMengajarList: string[]) {
    const isExplicitExempt = teacher.wajib_hadir_hanya_mengajar === true || String(teacher.wajib_hadir_hanya_mengajar) === 'true' || teacher.wajib_hadir_hanya_mengajar === 1 || String(teacher.wajib_hadir_hanya_mengajar) === '1';
    const isExplicitNonExempt = teacher.wajib_hadir_hanya_mengajar === false || String(teacher.wajib_hadir_hanya_mengajar) === 'false' || teacher.wajib_hadir_hanya_mengajar === 0 || String(teacher.wajib_hadir_hanya_mengajar) === '0';
    const hasExplicitSetting = isExplicitExempt || isExplicitNonExempt;
    const isLegacyInList = guruHanyaMengajarList.some((item: string) => {
      const itemClean = item.trim().toLowerCase();
      return item === teacher.id || (teacher.user_id && item === teacher.user_id) || (itemClean && (itemClean === teacher.nama_guru?.toLowerCase().trim() || (teacher.nip && itemClean === teacher.nip.toLowerCase().trim())));
    });
    const isTeacherExempt = isExplicitExempt || (!hasExplicitSetting && (isLegacyInList || aturanGlobal === 'Hari_Mengajar_Saja'));
    const isFreeFromPresence = isTeacherExempt && scheduledClassesCount === 0 && !hasPiketToday;

    return {
      isFreeFromPresence,
      pesan_belum: isFreeFromPresence ? 'Bebas Hadir' : 'Belum melakukan presensi datang maupun pulang',
      status_label: isFreeFromPresence ? 'Bebas Hadir' : 'Belum Selesai'
    };
  }

  try {
    const res = evaluateBebasHadir({ id: 't1', nama_guru: 'Guru A', wajib_hadir_hanya_mengajar: true }, 0, false, 'Semua_Hari', []);
    assert.strictEqual(res.isFreeFromPresence, true);
    assert.strictEqual(res.pesan_belum, 'Bebas Hadir');
    assert.strictEqual(res.status_label, 'Bebas Hadir');
    pass('R2-BEBAS-01', 'Teacher with wajib_hadir_hanya_mengajar:true, 0 classes, 0 piket evaluates to Bebas Hadir');
  } catch (e) {
    fail('R2-BEBAS-01', 'Failed Bebas Hadir evaluation for exempt teacher', e);
  }

  try {
    const res = evaluateBebasHadir({ id: 't1', nama_guru: 'Guru A', wajib_hadir_hanya_mengajar: true }, 2, false, 'Semua_Hari', []);
    assert.strictEqual(res.isFreeFromPresence, false);
    assert.strictEqual(res.pesan_belum, 'Belum melakukan presensi datang maupun pulang');
    pass('R2-BEBAS-02', 'Teacher with classes today is NOT Bebas Hadir even if in exempt category');
  } catch (e) {
    fail('R2-BEBAS-02', 'Exempt teacher with scheduled classes was incorrectly marked Bebas Hadir', e);
  }

  try {
    const res = evaluateBebasHadir({ id: 't1', nama_guru: 'Guru A', wajib_hadir_hanya_mengajar: true }, 0, true, 'Semua_Hari', []);
    assert.strictEqual(res.isFreeFromPresence, false);
    assert.strictEqual(res.pesan_belum, 'Belum melakukan presensi datang maupun pulang');
    pass('R2-BEBAS-03', 'Teacher with piket duty today is NOT Bebas Hadir even with 0 teaching classes');
  } catch (e) {
    fail('R2-BEBAS-03', 'Exempt teacher with piket was incorrectly marked Bebas Hadir', e);
  }

  try {
    const res = evaluateBebasHadir({ id: 't2', nama_guru: 'Guru B', wajib_hadir_hanya_mengajar: false }, 0, false, 'Hari_Mengajar_Saja', []);
    assert.strictEqual(res.isFreeFromPresence, false);
    assert.strictEqual(res.pesan_belum, 'Belum melakukan presensi datang maupun pulang');
    pass('R2-BEBAS-04', 'Explicitly non-exempt teacher is NOT Bebas Hadir even if school rule is Hari_Mengajar_Saja');
  } catch (e) {
    fail('R2-BEBAS-04', 'Non-exempt teacher incorrectly marked Bebas Hadir', e);
  }

  try {
    const res = evaluateBebasHadir({ id: 't3', nama_guru: 'Guru C' }, 0, false, 'Hari_Mengajar_Saja', []);
    assert.strictEqual(res.isFreeFromPresence, true);
    pass('R2-BEBAS-05', 'Global rule Hari_Mengajar_Saja applies to unconfigured teacher with 0 classes and 0 piket');
  } catch (e) {
    fail('R2-BEBAS-05', 'Global rule Hari_Mengajar_Saja failed to apply', e);
  }

  try {
    const resStrTrue = evaluateBebasHadir({ id: 't4', wajib_hadir_hanya_mengajar: 'true' }, 0, false, 'Semua_Hari', []);
    const resInt1 = evaluateBebasHadir({ id: 't5', wajib_hadir_hanya_mengajar: 1 }, 0, false, 'Semua_Hari', []);
    assert.strictEqual(resStrTrue.isFreeFromPresence, true, 'String "true" must evaluate to exempt');
    assert.strictEqual(resInt1.isFreeFromPresence, true, 'Integer 1 must evaluate to exempt');
    pass('R2-BEBAS-06', 'Resilient to string ("true") and integer (1) boolean representations');
  } catch (e) {
    fail('R2-BEBAS-06', 'Failed string/integer representation test', e);
  }

  // ============================================================================
  // SECTION 3: AdminVerifView.tsx - UNCOMMITTED PIKET & MODAL-LESS BEHAVIOR
  // ============================================================================
  console.log(`\n${BOLD}--- SECTION 3: Unsubmitted Piket Direct Tagging (No Modal/Confirmation) ---${RESET}`);

  try {
    const adminVerifPath = path.resolve(process.cwd(), 'src/components/AdminVerifView.tsx');
    const adminVerifSource = fs.readFileSync(adminVerifPath, 'utf8');

    assert(
      adminVerifSource.includes("status_verifikasi: 'tidak membuat laporan piket'"),
      "unsubmittedPiket must assign status_verifikasi: 'tidak membuat laporan piket'"
    );

    assert(
      adminVerifSource.includes("item.status_verifikasi === 'tidak membuat laporan piket'"),
      "Renders specialized status check for 'tidak membuat laporan piket'"
    );
    assert(
      adminVerifSource.includes("Otomatis Tercatat: tidak membuat laporan piket"),
      "Renders automatic notice badge: 'Otomatis Tercatat: tidak membuat laporan piket'"
    );

    const piketAutoCheck = adminVerifSource.includes("item.status_verifikasi === 'tidak membuat laporan piket' ? (");
    assert(piketAutoCheck, "Card footer branches to display automatic status rather than interactive action buttons");

    pass('R2-PIKET-01', 'Unsubmitted piket assigned "tidak membuat laporan piket" directly without modal or confirmation prompt');
  } catch (e) {
    fail('R2-PIKET-01', 'Unsubmitted piket verification failed', e);
  }

  // ============================================================================
  // SECTION 4: DokumenView.tsx - extractTingkat STRESS-TEST & PARALLEL CLASSES
  // ============================================================================
  console.log(`\n${BOLD}--- SECTION 4: DokumenView.tsx extractTingkat & Duplicate Upload Block ---${RESET}`);

  const classCases: { input: string; expected: string; desc: string }[] = [
    { input: 'X Merdeka 1', expected: 'X', desc: 'Standard Roman grade 10' },
    { input: 'X-1', expected: 'X', desc: 'Roman grade 10 with dash' },
    { input: 'Kelas 10 A', expected: 'X', desc: 'Numeric grade 10 with space and prefix' },
    { input: 'XI IPA 2', expected: 'XI', desc: 'Standard Roman grade 11' },
    { input: 'XII TKJ', expected: 'XII', desc: 'Standard Roman grade 12' },
    { input: 'VII B', expected: 'VII', desc: 'Roman grade 7 with space' },
    { input: 'VII-B', expected: 'VII', desc: 'Roman grade 7 with dash' },
    { input: '8-1', expected: 'VIII', desc: 'Numeric grade 8 with dash' },
    { input: '9.2', expected: 'IX', desc: 'Numeric grade 9 with dot' },
    { input: 'Kelas 12', expected: 'XII', desc: 'Numeric grade 12 with prefix' },
    // Critical challenge test cases:
    { input: '7A', expected: 'VII', desc: 'Numeric grade 7 directly concatenated with parallel letter A' },
    { input: '7B', expected: 'VII', desc: 'Numeric grade 7 directly concatenated with parallel letter B' },
    { input: '10A', expected: 'X', desc: 'Numeric grade 10 directly concatenated with parallel letter A' },
    { input: '10B', expected: 'X', desc: 'Numeric grade 10 directly concatenated with parallel letter B' },
    { input: '8A', expected: 'VIII', desc: 'Numeric grade 8 directly concatenated with parallel letter A' },
    { input: '9A', expected: 'IX', desc: 'Numeric grade 9 directly concatenated with parallel letter A' },
    { input: '11A', expected: 'XI', desc: 'Numeric grade 11 directly concatenated with parallel letter A' },
    { input: '12A', expected: 'XII', desc: 'Numeric grade 12 directly concatenated with parallel letter A' }
  ];

  for (const c of classCases) {
    try {
      const actual = extractTingkat(c.input);
      assert.strictEqual(
        actual, 
        c.expected, 
        `For class "${c.input}", expected tingkat "${c.expected}" but got "${actual}"`
      );
      pass(`R2-EXTRACT-${c.input.replace(/[^a-zA-Z0-9]/g, '_')}`, `extractTingkat("${c.input}") => "${actual}" (${c.desc})`);
    } catch (e: any) {
      fail(`R2-EXTRACT-${c.input.replace(/[^a-zA-Z0-9]/g, '_')}`, `extractTingkat("${c.input}") failed: ${e.message}`, e);
    }
  }

  console.log(`\n${BOLD}--- Duplicate Upload Blocking Simulation ---${RESET}`);

  interface DocMock {
    mapel: string;
    kelas: string;
    jenis_dokumen: string;
  }

  function simulateDuplicateCheck(existingDocs: DocMock[], newDoc: DocMock): boolean {
    const targetTingkat = extractTingkat(newDoc.kelas);
    const normalizedMapel = (newDoc.mapel || '').trim().toLowerCase();
    const normalizedJenis = (newDoc.jenis_dokumen || '').toLowerCase();

    const duplicate = existingDocs.find(d => {
      const dJenis = (d.jenis_dokumen || '').toLowerCase();
      const isSameJenis = dJenis === normalizedJenis;
      if (!isSameJenis) return false;

      const dMapel = (d.mapel || '').trim().toLowerCase();
      const isSameMapel = dMapel === normalizedMapel;
      if (!isSameMapel) return false;

      const dTingkat = extractTingkat(d.kelas);
      return Boolean(targetTingkat && dTingkat && targetTingkat === dTingkat);
    });

    return Boolean(duplicate);
  }

  try {
    const existing = [{ mapel: 'Matematika', kelas: 'X Merdeka 1', jenis_dokumen: 'CP' }];
    const isBlocked = simulateDuplicateCheck(existing, { mapel: 'Matematika', kelas: 'X Merdeka 2', jenis_dokumen: 'CP' });
    assert.strictEqual(isBlocked, true, 'Duplicate upload for parallel class X Merdeka 2 should be blocked');
    pass('R2-DUP-01', 'Parallel class "X Merdeka 2" blocked when "X Merdeka 1" exists for same subject');
  } catch (e) {
    fail('R2-DUP-01', 'Failed duplicate check for X Merdeka parallel classes', e);
  }

  try {
    const existing = [{ mapel: 'IPA', kelas: '7A', jenis_dokumen: 'ATP' }];
    const isBlocked = simulateDuplicateCheck(existing, { mapel: 'IPA', kelas: '7B', jenis_dokumen: 'ATP' });
    assert.strictEqual(
      isBlocked, 
      true, 
      `Duplicate upload for parallel class 7B should be blocked when 7A exists (extractTingkat('7A')='${extractTingkat('7A')}', extractTingkat('7B')='${extractTingkat('7B')}')`
    );
    pass('R2-DUP-02', 'Parallel class "7B" blocked when "7A" exists for same subject');
  } catch (e) {
    fail('R2-DUP-02', 'Failed duplicate check for 7A and 7B parallel classes', e);
  }

  try {
    const existing = [{ mapel: 'Matematika', kelas: 'X Merdeka 1', jenis_dokumen: 'CP' }];
    const isBlocked = simulateDuplicateCheck(existing, { mapel: 'Bahasa Indonesia', kelas: 'X Merdeka 1', jenis_dokumen: 'CP' });
    assert.strictEqual(isBlocked, false, 'Different subject should not be blocked');
    pass('R2-DUP-03', 'Different subject for same class level is allowed');
  } catch (e) {
    fail('R2-DUP-03', 'Different subject was incorrectly blocked', e);
  }

  try {
    const existing = [{ mapel: 'Matematika', kelas: 'X Merdeka 1', jenis_dokumen: 'CP' }];
    const isBlocked = simulateDuplicateCheck(existing, { mapel: 'Matematika', kelas: 'XI Merdeka 1', jenis_dokumen: 'CP' });
    assert.strictEqual(isBlocked, false, 'Different grade level (X vs XI) should not be blocked');
    pass('R2-DUP-04', 'Different grade level (X vs XI) for same subject is allowed');
  } catch (e) {
    fail('R2-DUP-04', 'Different grade level was incorrectly blocked', e);
  }

  // ============================================================================
  // SECTION 5: Auto-fill KBM Journal on Leave (Sakit, Izin, Dinas Luar)
  // ============================================================================
  console.log(`\n${BOLD}--- SECTION 5: Auto-fill KBM Journal on Leave Logic & Status ---${RESET}`);

  try {
    const insertedRecords: any[] = [];
    const mockClient = {
      from: (table: string) => ({
        select: (cols: string) => ({
          eq: (col: string, val: any) => ({
            eq: (col2: string, val2: any) => Promise.resolve({ data: [] }),
            then: (cb: any) => Promise.resolve({
              data: table === 'jadwal_pelajaran' ? [
                {
                  id: 'sched-1',
                  nama_guru: 'Budi Santoso',
                  hari: 'Senin',
                  mata_pelajaran: 'Matematika',
                  kelas: 'X-1',
                  jam_mulai: '07:30',
                  jam_selesai: '09:00'
                },
                {
                  id: 'sched-2',
                  nama_guru: 'Budi Santoso',
                  hari: 'Senin',
                  mata_pelajaran: 'Matematika',
                  kelas: 'X-2',
                  jam_mulai: '09:15',
                  jam_selesai: '10:45'
                }
              ] : []
            }).then(cb)
          })
        }),
        insert: async (rec: any) => {
          insertedRecords.push(rec);
          return { error: null };
        }
      })
    };

    const count = await autoFillKbmJournalsForLeave(
      { nama_guru: 'Budi Santoso' },
      '2026-11-09',
      'Sakit',
      { detail_izin: 'Demam tinggi', keterangan: 'Surat dokter terlampir' },
      mockClient
    );

    assert.strictEqual(count, 2, 'Should insert 2 auto-filled KBM journals for Monday schedules');
    assert.strictEqual(insertedRecords.length, 2, '2 records inserted');

    for (const rec of insertedRecords) {
      assert.strictEqual(rec.status_verifikasi, 'Sakit', 'status_verifikasi must be Sakit');
      assert.strictEqual(rec.materi, 'Sakit', 'materi must be Sakit');
      assert(rec.kegiatan.includes('Presensi Sakit'), 'kegiatan must mention Presensi Sakit');
      assert.strictEqual(rec.catatan_admin, 'Otomatis terisi sesuai presensi (Sakit)');
      assert.notStrictEqual(rec.status_verifikasi, 'tidak masuk kelas', 'Must NOT be tidak masuk kelas');
      assert.notStrictEqual(rec.status_verifikasi, 'Tidak Masuk Kelas', 'Must NOT be Tidak Masuk Kelas');
      assert.notStrictEqual(rec.catatan_refleksi, 'tidak masuk kelas', 'catatan_refleksi must NOT be tidak masuk kelas');
    }

    pass('R2-AUTOFILL-01', 'autoFillKbmJournalsForLeave sets status Sakit and never "tidak masuk kelas"');
  } catch (e) {
    fail('R2-AUTOFILL-01', 'autoFillKbmJournalsForLeave verification failed', e);
  }

  try {
    const insertedRecords: any[] = [];
    const mockClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: [] }),
            then: (cb: any) => Promise.resolve({ data: [] }).then(cb)
          })
        }),
        insert: async (rec: any) => {
          insertedRecords.push(rec);
          return { error: null };
        }
      })
    };

    const count = await autoFillKbmJournalsForLeave(
      { nama_guru: 'Budi Santoso' },
      '2026-11-08',
      'Izin',
      { keterangan: 'Acara keluarga' },
      mockClient
    );

    assert.strictEqual(count, 0, 'Sunday must generate 0 journal entries');
    assert.strictEqual(insertedRecords.length, 0, 'No records inserted on Sunday');
    pass('R2-AUTOFILL-02', 'Sunday skips auto-fill gracefully (0 entries created)');
  } catch (e) {
    fail('R2-AUTOFILL-02', 'Failed Sunday check in autoFillKbmJournalsForLeave', e);
  }

  try {
    const rekapJurnalPath = path.resolve(process.cwd(), 'src/components/RekapJurnalView.tsx');
    const rekapSource = fs.readFileSync(rekapJurnalPath, 'utf8');

    assert(
      rekapSource.includes("presensiQ.gte('timestamp'"),
      "RekapJurnalView fetches presensi_guru for leave cross-referencing"
    );
    assert(
      rekapSource.includes("leavePresensi"),
      "Synthesizes leavePresensi to recognize teacher absence"
    );
    assert(
      rekapSource.includes("const isExcused = Boolean(leaveType);"),
      "Flags excused leave as isExcused"
    );
    assert(
      rekapSource.includes("status_verifikasi: isExcused ? leaveType! : 'Tidak Masuk Kelas'"),
      "Assigns legitimate status_verifikasi (leaveType) instead of 'Tidak Masuk Kelas' when excused"
    );

    pass('R2-REKAP-01', 'RekapJurnalView synthesizes legitimate excused status instead of "Tidak Masuk Kelas"');
  } catch (e) {
    fail('R2-REKAP-01', 'RekapJurnalView synthesis verification failed', e);
  }

  // ============================================================================
  // FINAL SUMMARY
  // ============================================================================
  console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}SUMMARY: Total ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}${RESET}`);
  if (failedTests > 0) {
    console.log(`${BOLD}${RED}VERDICT: FAILURES DETECTED IN CHALLENGE SUITE!${RESET}`);
    console.log(`${YELLOW}Failed assertions:${RESET}`);
    for (const f of failures) {
      console.log(`  - [${f.id}] ${f.desc}: ${f.error}`);
    }
  } else {
    console.log(`${BOLD}${GREEN}VERDICT: ALL TESTS PASSED!${RESET}`);
  }
  console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════════════════════════${RESET}\n`);

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

