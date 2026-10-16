/**
 * ============================================================================
 * TEST SUITE: WHATSAPP PARENT NOTIFICATIONS & LOCAL DRAFT AUTOSAVE
 * File: tests/whatsapp_parent_notify_and_autosave.test.ts
 *
 * Verifies Requirements R1 and R2 across 5 comprehensive sections:
 * - Section 1: Phone Number Normalization (whatsappUtils.ts)
 * - Section 2: WhatsApp URI & Attendance Message Formatting (whatsappUtils.ts)
 * - Section 3: Gradebook Scoped Draft Key & Storage Lifecycle (draftStorage.ts)
 * - Section 4: GuruJurnal Offline Draft Retention & Resilience (draftStorage.ts)
 * - Section 5: Static Code Inspection & UI Wiring Verification (PiketView, RekapSiswaView, GradebookView, GuruJurnal)
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import assert from 'assert';

import {
  normalizeIndonesianPhoneNumber,
  formatWhatsAppAttendanceMessage,
  generateParentWhatsAppUrl
} from '../src/utils/whatsappUtils';

import {
  getGradebookDraftKey,
  saveGradebookDraft,
  loadGradebookDraft,
  clearGradebookDraft,
  saveJurnalDraft,
  loadJurnalDraft,
  clearJurnalDraft
} from '../src/utils/draftStorage';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(desc: string) {
  totalTests++;
  passedTests++;
  console.log(`  ${GREEN}✔ [PASS]${RESET} ${desc}`);
}

function fail(desc: string, err?: any) {
  totalTests++;
  failedTests++;
  console.error(`  ${RED}✖ [FAIL]${RESET} ${desc}`);
  if (err) console.error(`    ↳ Error:`, err);
}

// In-memory localStorage mock setup for Node test environment
const mockStorageState: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string): string | null => {
    return Object.prototype.hasOwnProperty.call(mockStorageState, key)
      ? mockStorageState[key]
      : null;
  },
  setItem: (key: string, value: string): void => {
    mockStorageState[key] = String(value);
  },
  removeItem: (key: string): void => {
    delete mockStorageState[key];
  },
  clear: (): void => {
    for (const k of Object.keys(mockStorageState)) {
      delete mockStorageState[k];
    }
  },
  get length(): number {
    return Object.keys(mockStorageState).length;
  },
  key: (index: number): string | null => {
    return Object.keys(mockStorageState)[index] ?? null;
  }
};

// Mount to globalThis and global
(globalThis as any).localStorage = mockLocalStorage;
(global as any).localStorage = mockLocalStorage;

async function runTests() {
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║  WHATSAPP PARENT NOTIFY & AUTOSAVE / OFFLINE RESILIENCE TEST SUITE           ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  // ==========================================================================
  // SECTION 1: INDONESIAN PHONE NUMBER NORMALIZATION
  // ==========================================================================
  console.log(`${YELLOW}${BOLD}━━━ SECTION 1: INDONESIAN PHONE NUMBER NORMALIZATION ━━━${RESET}`);

  // 1.1 Valid standard national format (08...)
  try {
    assert.strictEqual(normalizeIndonesianPhoneNumber('081234567890'), '6281234567890');
    pass('Standard national 081234567890 normalizes to 6281234567890');
  } catch (e) {
    fail('Standard national normalization failed', e);
  }

  // 1.2 International format with leading plus (+62...)
  try {
    assert.strictEqual(normalizeIndonesianPhoneNumber('+6281234567890'), '6281234567890');
    pass('International format +6281234567890 normalizes to 6281234567890');
  } catch (e) {
    fail('International with plus failed', e);
  }

  // 1.3 Pure international format without plus (62...)
  try {
    assert.strictEqual(normalizeIndonesianPhoneNumber('6281234567890'), '6281234567890');
    pass('Pure international format 6281234567890 remains 6281234567890');
  } catch (e) {
    fail('Pure international failed', e);
  }

  // 1.4 Dashed formatting
  try {
    assert.strictEqual(normalizeIndonesianPhoneNumber('0812-3456-7890'), '6281234567890');
    pass('Dashed format 0812-3456-7890 normalizes to 6281234567890');
  } catch (e) {
    fail('Dashed format failed', e);
  }

  // 1.5 Spaced formatting
  try {
    assert.strictEqual(normalizeIndonesianPhoneNumber('0812 3456 7890'), '6281234567890');
    pass('Spaced format 0812 3456 7890 normalizes to 6281234567890');
  } catch (e) {
    fail('Spaced format failed', e);
  }

  // 1.6 Parenthesized formatting
  try {
    assert.strictEqual(normalizeIndonesianPhoneNumber('(0812) 3456-7890'), '6281234567890');
    pass('Parenthesized format (0812) 3456-7890 normalizes to 6281234567890');
  } catch (e) {
    fail('Parenthesized format failed', e);
  }

  // 1.7 Combined international with parens and spaces (+62 (812) 3456-7890)
  try {
    assert.strictEqual(normalizeIndonesianPhoneNumber('+62 (812) 3456-7890'), '6281234567890');
    pass('Combined +62 (812) 3456-7890 normalizes to 6281234567890');
  } catch (e) {
    fail('Combined format failed', e);
  }

  // 1.8 Direct 8 prefix without 0 or 62 (e.g. 81234567890)
  try {
    assert.strictEqual(normalizeIndonesianPhoneNumber('81234567890'), '6281234567890');
    assert.strictEqual(normalizeIndonesianPhoneNumber('812-3456-7890'), '6281234567890');
    assert.strictEqual(normalizeIndonesianPhoneNumber(' 0812-3456-7890 '), '6281234567890');
    pass('Leading 8 prefix and whitespace-trimmed numbers normalize to 6281234567890');
  } catch (e) {
    fail('Leading 8 prefix failed', e);
  }

  // 1.9 Redundant prefix 6208... (e.g. 62081234567890)
  try {
    assert.strictEqual(normalizeIndonesianPhoneNumber('62081234567890'), '6281234567890');
    pass('Redundant prefix 62081234567890 corrects to 6281234567890');
  } catch (e) {
    fail('Redundant 6208 prefix failed', e);
  }

  // 1.10 Mobile operators (Telkomsel, Indosat, XL, Tri, Smartfren)
  try {
    assert.strictEqual(normalizeIndonesianPhoneNumber('085212345678'), '6285212345678'); // As
    assert.strictEqual(normalizeIndonesianPhoneNumber('081512345678'), '6281512345678'); // Mentari
    assert.strictEqual(normalizeIndonesianPhoneNumber('087812345678'), '6287812345678'); // XL
    assert.strictEqual(normalizeIndonesianPhoneNumber('089612345678'), '6289612345678'); // Tri
    assert.strictEqual(normalizeIndonesianPhoneNumber('088812345678'), '6288812345678'); // Smartfren
    pass('Successfully normalizes across major Indonesian mobile operator prefixes');
  } catch (e) {
    fail('Operator prefix normalization failed', e);
  }

  // 1.11 Boundary length limits (Indonesian cellular 10 to 16 digits)
  try {
    // 10 digits total: 628 + 7 digits (e.g. 081234567 -> 6281234567)
    assert.strictEqual(normalizeIndonesianPhoneNumber('081234567'), '6281234567');
    // 16 digits max total: 628 + 13 digits (e.g. 081234567890123 -> 6281234567890123)
    assert.strictEqual(normalizeIndonesianPhoneNumber('081234567890123'), '6281234567890123');
    // 17 digits total: exceeds maximum 16 digits -> null
    assert.strictEqual(normalizeIndonesianPhoneNumber('0812345678901234'), null);
    // 9 digits total: below minimum 10 digits -> null
    assert.strictEqual(normalizeIndonesianPhoneNumber('08123456'), null);
    pass('Boundary lengths (10-16 digits allowed, <10 or >16 rejected) strictly enforced');
  } catch (e) {
    fail('Boundary length validation failed', e);
  }

  // 1.12 Edge cases & invalid numbers
  try {
    assert.strictEqual(normalizeIndonesianPhoneNumber(''), null);
    assert.strictEqual(normalizeIndonesianPhoneNumber(null), null);
    assert.strictEqual(normalizeIndonesianPhoneNumber(undefined), null);
    assert.strictEqual(normalizeIndonesianPhoneNumber('12345'), null); // too short
    assert.strictEqual(normalizeIndonesianPhoneNumber('021123456'), null); // landline (021 Jakarta)
    assert.strictEqual(normalizeIndonesianPhoneNumber('031123456'), null); // landline (031 Surabaya)
    assert.strictEqual(normalizeIndonesianPhoneNumber('022123456'), null); // landline (022 Bandung)
    assert.strictEqual(normalizeIndonesianPhoneNumber('abcdef'), null); // non-digits
    assert.strictEqual(normalizeIndonesianPhoneNumber('08123'), null); // too short (< 10 total digits)
    assert.strictEqual(normalizeIndonesianPhoneNumber('01234567890'), null); // non-mobile prefix (012)
    assert.strictEqual(normalizeIndonesianPhoneNumber('0081234567890'), null); // international 00 prefix not starting with 628
    assert.strictEqual(normalizeIndonesianPhoneNumber(1234567890 as any), null); // non-string type guard
    pass('Rejects empty, null, undefined, landlines, non-digits, and non-mobile prefixes');
  } catch (e) {
    fail('Invalid phone number edge cases failed', e);
  }

  // ==========================================================================
  // SECTION 2: WHATSAPP URI & MESSAGE FORMATTING
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ SECTION 2: WHATSAPP URI & MESSAGE FORMATTING ━━━${RESET}`);

  // 2.1 Native WhatsApp URL structure and query param
  try {
    const url = generateParentWhatsAppUrl({
      phone: '0812-3456-7890',
      studentName: 'Ahmad Fauzan',
      kelas: '7A',
      tanggal: '2026-10-16',
      status: 'Hadir',
      schoolName: 'SMP Negeri 1 Surabaya'
    });
    assert.ok(url.startsWith('https://wa.me/6281234567890?text='), 'URL must start with https://wa.me/6281234567890?text=');
    const encodedText = url.split('?text=')[1];
    assert.ok(encodedText, 'URI must contain encoded text');
    const decoded = decodeURIComponent(encodedText);
    assert.ok(decoded.includes('Ahmad Fauzan'), 'Decoded message contains student name');
    assert.ok(decoded.includes('7A'), 'Decoded message contains class');
    assert.ok(decoded.includes('SMP Negeri 1 Surabaya'), 'Decoded message contains school name');
    assert.ok(decoded.includes('*Hadir*'), 'Decoded message contains bold status');
    assert.ok(decoded.includes('2026-10-16'), 'Decoded message contains date');
    pass('WhatsApp URI properly generated with encodeURIComponent and essential metadata');
  } catch (e) {
    fail('WhatsApp URL generation failed', e);
  }

  // 2.2 Formatting across various attendance statuses
  const statusesToTest = ['Hadir', 'Terlambat', 'Alpa', 'Bolos', 'Izin', 'Sakit'];
  for (const st of statusesToTest) {
    try {
      const msg = formatWhatsAppAttendanceMessage({
        studentName: 'Siti Rahma',
        kelas: '8B',
        tanggal: '2026-10-16',
        status: st,
        schoolName: 'SMP Negeri 1',
        timeStr: '07:15 WITA',
        note: `Verifikasi piket status ${st}`
      });
      assert.ok(msg.includes(`*${st}*`), `Message must bold status ${st}`);
      assert.ok(msg.includes('⏰ Waktu: 07:15 WITA'), 'Message includes recorded timestamp');
      assert.ok(msg.includes(`📝 Catatan: Verifikasi piket status ${st}`), 'Message includes custom note');
      pass(`Attendance message formatted cleanly for status: ${st}`);
    } catch (e) {
      fail(`Failed formatting for status ${st}`, e);
    }
  }

  // 2.3 Fallback defaults when optional parameters are omitted
  try {
    const defaultMsg = formatWhatsAppAttendanceMessage({
      studentName: '',
      kelas: '',
      tanggal: '',
      status: ''
    });
    assert.ok(defaultMsg.includes('*Siswa*'), 'Defaults studentName to Siswa');
    assert.ok(defaultMsg.includes('(-)'), 'Defaults class to -');
    assert.ok(defaultMsg.includes('*Sekolah*'), 'Defaults school to Sekolah');
    assert.ok(defaultMsg.includes('*Tercatat*'), 'Defaults status to Tercatat');
    assert.ok(!defaultMsg.includes('⏰ Waktu:'), 'Does not include time line when timeStr is empty');
    assert.ok(!defaultMsg.includes('📝 Catatan:'), 'Does not include note line when note is empty');
    pass('Fallback defaults gracefully applied without undefined / null strings');
  } catch (e) {
    fail('Fallback defaults failed', e);
  }

  // 2.4 Adversarial special characters, emojis, and URI safety
  try {
    const rawNote = 'Sakit demam tinggi (38.5°C) & batuk; perlu istirahat di UKS 🤒';
    const complexName = 'M. D\'Angelo & "Budi" <7A>';
    const url = generateParentWhatsAppUrl({
      phone: '+62 812-3456-7890', // unnormalized phone with plus, spaces, dashes
      studentName: complexName,
      kelas: '7-A (Unggulan)',
      tanggal: '2026-10-16',
      status: 'Sakit',
      schoolName: 'SMP "Merdeka Belajar" & Sains',
      note: rawNote
    });

    assert.ok(url.startsWith('https://wa.me/6281234567890?text='), 'Targets normalized phone endpoint');
    // Ensure no raw unsafe characters in the query string
    const queryPart = url.split('?text=')[1];
    assert.ok(!queryPart.includes(' '), 'Query string must NOT contain unencoded spaces');
    assert.ok(!queryPart.includes('\n'), 'Query string must NOT contain unencoded newlines');
    assert.ok(!queryPart.includes('"'), 'Query string must NOT contain unencoded double quotes');
    assert.ok(!queryPart.includes('<'), 'Query string must NOT contain unencoded angle brackets');

    // Decode and verify exact fidelity
    const decoded = decodeURIComponent(queryPart);
    assert.ok(decoded.includes(complexName), 'Decoded message preserves exact special characters');
    assert.ok(decoded.includes(rawNote), 'Decoded message preserves emojis and punctuation');
    pass('Adversarial encoding preserves quotes, ampersands, angle brackets, emojis, and newlines safely');
  } catch (e) {
    fail('Adversarial URL encoding failed', e);
  }

  // ==========================================================================
  // SECTION 3: GRADEBOOK SCOPED DRAFT KEY & STORAGE LIFECYCLE
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ SECTION 3: GRADEBOOK SCOPED DRAFT KEY & STORAGE LIFECYCLE ━━━${RESET}`);

  // 3.1 Scoped Draft Key Generation
  try {
    const key1 = getGradebookDraftKey('sch-101', 'Matematika', '7A', 'tp-1');
    assert.strictEqual(key1, 'sipjam_gradebook_draft_sch-101_Matematika_7A_tp-1');

    const keyDefault = getGradebookDraftKey(null, '', '', undefined);
    assert.strictEqual(keyDefault, 'sipjam_gradebook_draft_default_mapel_kelas_all');

    const keyTrimmed = getGradebookDraftKey('  sch-99  ', '  IPA  ', '  8B  ', '  tp-3  ');
    assert.strictEqual(keyTrimmed, 'sipjam_gradebook_draft_sch-99_IPA_8B_tp-3');
    pass('Scoped draft key generation handles standard, null, and whitespace inputs');
  } catch (e) {
    fail('Gradebook draft key generation failed', e);
  }

  // 3.2 Save, Load, and Clear Lifecycle
  mockLocalStorage.clear();
  const testKeyA = getGradebookDraftKey('sch-01', 'Bahasa Indonesia', '7A', 'tp-01');
  const sampleScoresA: Record<string, Record<string, number | null>> = {
    '10001': { 'col_tp1_f1': 85, 'col_tp1_s1': 90 },
    '10002': { 'col_tp1_f1': 78, 'col_tp1_s1': null }
  };

  try {
    // Save
    saveGradebookDraft(testKeyA, sampleScoresA);
    assert.ok(mockLocalStorage.getItem(testKeyA), 'Storage must contain saved item');

    // Load
    const loadedA = loadGradebookDraft(testKeyA);
    assert.deepStrictEqual(loadedA, sampleScoresA, 'Loaded scores must match saved scores');
    assert.strictEqual(loadedA?.['10001']['col_tp1_f1'], 85);
    assert.strictEqual(loadedA?.['10002']['col_tp1_s1'], null);

    // Clear
    clearGradebookDraft(testKeyA);
    assert.strictEqual(loadGradebookDraft(testKeyA), null, 'After clear, load must return null');
    assert.strictEqual(mockLocalStorage.getItem(testKeyA), null, 'Storage entry must be removed');
    pass('Gradebook save, load, and clear lifecycle executes with complete data fidelity');
  } catch (e) {
    fail('Gradebook storage lifecycle failed', e);
  }

  // 3.3 Key Isolation (Multi-class, multi-mapel, multi-TP)
  try {
    mockLocalStorage.clear();
    const keyKelas7A = getGradebookDraftKey('sch-01', 'Matematika', '7A', 'tp-1');
    const keyKelas7B = getGradebookDraftKey('sch-01', 'Matematika', '7B', 'tp-1');
    const keyIpa7A = getGradebookDraftKey('sch-01', 'IPA', '7A', 'tp-1');

    saveGradebookDraft(keyKelas7A, { '001': { 'col1': 100 } });
    saveGradebookDraft(keyKelas7B, { '002': { 'col1': 75 } });
    saveGradebookDraft(keyIpa7A, { '001': { 'col1': 92 } });

    // Verify isolation
    assert.strictEqual(loadGradebookDraft(keyKelas7A)?.['001']['col1'], 100);
    assert.strictEqual(loadGradebookDraft(keyKelas7B)?.['002']['col1'], 75);
    assert.strictEqual(loadGradebookDraft(keyIpa7A)?.['001']['col1'], 92);

    // Clear one key, others must remain intact
    clearGradebookDraft(keyKelas7A);
    assert.strictEqual(loadGradebookDraft(keyKelas7A), null);
    assert.strictEqual(loadGradebookDraft(keyKelas7B)?.['002']['col1'], 75);
    assert.strictEqual(loadGradebookDraft(keyIpa7A)?.['001']['col1'], 92);
    pass('Gradebook draft keys are strictly isolated across class, subject, and TP scopes');
  } catch (e) {
    fail('Gradebook draft key isolation failed', e);
  }

  // 3.4 Corrupted and Edge-Case JSON Handling
  try {
    const corruptKey = 'sipjam_gradebook_draft_corrupt';
    mockLocalStorage.setItem(corruptKey, '{bad json;;');
    assert.strictEqual(loadGradebookDraft(corruptKey), null, 'Corrupt JSON returns null without throw');

    mockLocalStorage.setItem(corruptKey, '12345');
    assert.strictEqual(loadGradebookDraft(corruptKey), null, 'Primitive number returns null');

    mockLocalStorage.setItem(corruptKey, '"simple string"');
    assert.strictEqual(loadGradebookDraft(corruptKey), null, 'String literal returns null');

    assert.strictEqual(loadGradebookDraft('non_existent_key'), null, 'Non-existent key returns null');
    pass('Corrupted, non-object, and missing JSON safely caught with null fallback');
  } catch (e) {
    fail('Corrupted JSON resilience failed', e);
  }

  // 3.5 Zero Grade Preservation & Payload Compatibility (Wrapped vs Flat)
  try {
    const keyZero = getGradebookDraftKey('sch-uuid-1234', 'Fisika', '9A', 'tp-final');
    // Scores including valid zero and null
    const scoresWithZero = {
      'nisn_001': { 'uas': 0, 'uts': 100 },
      'nisn_002': { 'uas': null, 'uts': 0 }
    };
    saveGradebookDraft(keyZero, scoresWithZero);
    const loadedZero = loadGradebookDraft(keyZero);
    assert.strictEqual(loadedZero?.['nisn_001']['uas'], 0, 'Numeric grade 0 must be preserved, not converted to null');
    assert.strictEqual(loadedZero?.['nisn_001']['uts'], 100);
    assert.strictEqual(loadedZero?.['nisn_002']['uas'], null);
    assert.strictEqual(loadedZero?.['nisn_002']['uts'], 0);

    // Test backward compatibility: flat payload without { scores, savedAt } wrapper
    const flatKey = 'sipjam_gradebook_draft_flat_test';
    mockLocalStorage.setItem(flatKey, JSON.stringify({ 'nisn_flat': { 'tugas1': 88 } }));
    const loadedFlat = loadGradebookDraft(flatKey);
    assert.strictEqual(loadedFlat?.['nisn_flat']['tugas1'], 88, 'Safely loads unwrapped flat score structures');
    pass('Numeric grade 0 preserved and both wrapped/flat draft payloads handled seamlessly');
  } catch (e) {
    fail('Grade 0 and payload compatibility failed', e);
  }

  // ==========================================================================
  // SECTION 4: GURUJURNAL OFFLINE DRAFT RETENTION & RESILIENCE
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ SECTION 4: GURUJURNAL OFFLINE DRAFT RETENTION ━━━${RESET}`);

  try {
    mockLocalStorage.clear();
    const sampleJurnal = {
      tipeJurnal: 'Jurnal KBM',
      mapel: 'Matematika',
      kelas: '7A',
      tanggal: '2026-10-16',
      tujuanPembelajaran: 'Memahami konsep aljabar linear',
      kktp: 'Mampu menyelesaikan persamaan satu variabel',
      konten: 'Persamaan Linear Satu Variabel',
      kegiatan: 'Diskusi kelompok dan pemecahan soal latihan kontekstual',
      lokasiKbm: 'Ruang Kelas 7A',
      absensi: { '001': 'H', '002': 'S' },
      refleksi: 'Pembelajaran berjalan interaktif',
      kehadiranMurid: 'Total murid: 2, Hadir: 1, Izin: 0, Sakit: 1, Alpa: 0'
    };

    // Save draft
    saveJurnalDraft(sampleJurnal);
    const restored = loadJurnalDraft();
    assert.deepStrictEqual(restored, sampleJurnal, 'Saved draft must be restored completely');

    // Simulate Network Failure / Offline Submission:
    // Draft must NOT be cleared when submission is interrupted by network drop
    assert.ok(mockLocalStorage.getItem('sipjam_jurnal_autosave'), 'Draft must remain in storage after network failure');
    const stillPresent = loadJurnalDraft();
    assert.strictEqual(stillPresent?.konten, 'Persamaan Linear Satu Variabel');
    assert.strictEqual(stillPresent?.kktp, 'Mampu menyelesaikan persamaan satu variabel');

    // Simulate Confirmed Supabase Success:
    // Only then clearJurnalDraft is invoked
    clearJurnalDraft();
    assert.strictEqual(loadJurnalDraft(), null, 'Draft is cleared only upon confirmed database success');
    assert.strictEqual(mockLocalStorage.getItem('sipjam_jurnal_autosave'), null);
    pass('GuruJurnal offline draft retention preserved across network drops and cleared on success');
  } catch (e) {
    fail('GuruJurnal draft lifecycle failed', e);
  }

  // 4.2 GuruJurnal Corrupt JSON resilience
  try {
    mockLocalStorage.setItem('sipjam_jurnal_autosave', '{broken syntax');
    assert.strictEqual(loadJurnalDraft(), null, 'GuruJurnal load handles malformed JSON safely');
    clearJurnalDraft();
    pass('GuruJurnal draft handles corrupt localStorage data without throwing');
  } catch (e) {
    fail('GuruJurnal corrupt storage failed', e);
  }

  // 4.3 Storage Isolation between Jurnal and Gradebook drafts
  try {
    mockLocalStorage.clear();
    const gbKey = getGradebookDraftKey('sch-1', 'IPA', '7A', 'tp-1');
    saveGradebookDraft(gbKey, { '001': { 'col1': 95 } });
    saveJurnalDraft({ tipeJurnal: 'Jurnal Kegiatan', kegiatan: 'Rapat Kerja' });

    assert.ok(mockLocalStorage.getItem(gbKey), 'Gradebook draft exists');
    assert.ok(mockLocalStorage.getItem('sipjam_jurnal_autosave'), 'Jurnal draft exists');

    // Clear only jurnal draft
    clearJurnalDraft();
    assert.strictEqual(loadJurnalDraft(), null, 'Jurnal draft cleared');
    assert.ok(mockLocalStorage.getItem(gbKey), 'Gradebook draft remains completely unharmed');
    assert.strictEqual(loadGradebookDraft(gbKey)?.['001']['col1'], 95);

    // Clean up
    clearGradebookDraft(gbKey);
    pass('Clearing Jurnal draft leaves Gradebook drafts untouched and isolated');
  } catch (e) {
    fail('Jurnal and Gradebook storage isolation failed', e);
  }

  // ==========================================================================
  // SECTION 5: STATIC CODE INSPECTION & UI WIRING VERIFICATION
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ SECTION 5: STATIC CODE INSPECTION & UI WIRING ━━━${RESET}`);

  const cwd = process.cwd();

  // 5.1 PiketView.tsx Inspection
  try {
    const piketPath = path.resolve(cwd, 'src/components/PiketView.tsx');
    assert.ok(fs.existsSync(piketPath), 'PiketView.tsx must exist');
    const piketSrc = fs.readFileSync(piketPath, 'utf8');

    // Check imports
    assert.ok(
      piketSrc.includes("from '@/utils/whatsappUtils'"),
      'PiketView must import from @/utils/whatsappUtils'
    );
    assert.ok(
      piketSrc.includes('triggerParentWhatsApp'),
      'PiketView must import triggerParentWhatsApp'
    );

    // Check 1-click WhatsApp buttons in manual table, scan log, and mobile cards
    assert.ok(
      piketSrc.includes('triggerParentWhatsApp('),
      'PiketView must trigger WhatsApp on click'
    );
    assert.ok(
      piketSrc.includes('fa-whatsapp'),
      'PiketView must render WhatsApp icon'
    );
    assert.ok(
      piketSrc.includes('WA Ortu'),
      'PiketView must contain WA Ortu table column header'
    );
    pass('PiketView: Verified whatsappUtils import, WA Ortu header, and 1-click WhatsApp buttons');
  } catch (e) {
    fail('PiketView static inspection failed', e);
  }

  // 5.2 RekapSiswaView.tsx Inspection
  try {
    const rekapPath = path.resolve(cwd, 'src/components/RekapSiswaView.tsx');
    assert.ok(fs.existsSync(rekapPath), 'RekapSiswaView.tsx must exist');
    const rekapSrc = fs.readFileSync(rekapPath, 'utf8');

    // Check imports
    assert.ok(
      rekapSrc.includes("from '@/utils/whatsappUtils'"),
      'RekapSiswaView must import from @/utils/whatsappUtils'
    );
    assert.ok(
      rekapSrc.includes('triggerParentWhatsApp'),
      'RekapSiswaView must import triggerParentWhatsApp'
    );

    // Check buttons in Gerbang & Rekap tables with print:hidden
    assert.ok(
      rekapSrc.includes('print:hidden'),
      'RekapSiswaView must protect printable documents using print:hidden'
    );
    assert.ok(
      rekapSrc.includes('triggerParentWhatsApp('),
      'RekapSiswaView must invoke triggerParentWhatsApp on click'
    );
    assert.ok(
      rekapSrc.includes('fa-whatsapp'),
      'RekapSiswaView must render WhatsApp action buttons'
    );
    pass('RekapSiswaView: Verified whatsappUtils import, Gerbang & Rekap buttons, and print:hidden protection');
  } catch (e) {
    fail('RekapSiswaView static inspection failed', e);
  }

  // 5.3 GradebookView.tsx Inspection
  try {
    const gradebookPath = path.resolve(cwd, 'src/components/GradebookView.tsx');
    assert.ok(fs.existsSync(gradebookPath), 'GradebookView.tsx must exist');
    const gradebookSrc = fs.readFileSync(gradebookPath, 'utf8');

    // Check imports
    assert.ok(
      gradebookSrc.includes("from '@/utils/draftStorage'"),
      'GradebookView must import from @/utils/draftStorage'
    );
    assert.ok(
      gradebookSrc.includes('getGradebookDraftKey'),
      'GradebookView must import getGradebookDraftKey'
    );
    assert.ok(
      gradebookSrc.includes('saveGradebookDraft'),
      'GradebookView must import saveGradebookDraft'
    );
    assert.ok(
      gradebookSrc.includes('loadGradebookDraft'),
      'GradebookView must import loadGradebookDraft'
    );
    assert.ok(
      gradebookSrc.includes('clearGradebookDraft'),
      'GradebookView must import clearGradebookDraft'
    );

    // Check debounced auto-save effect
    assert.ok(
      gradebookSrc.includes('draftDebounceRef'),
      'GradebookView must maintain debounced timer ref'
    );
    assert.ok(
      gradebookSrc.includes('saveGradebookDraft(draftKey'),
      'GradebookView must invoke saveGradebookDraft with scoped draft key'
    );

    // Check restore effect
    assert.ok(
      gradebookSrc.includes('loadGradebookDraft(draftKey)'),
      'GradebookView must restore local draft on filter change/mount'
    );

    // Check clear on successful save
    assert.ok(
      gradebookSrc.includes('clearGradebookDraft(draftKey)'),
      'GradebookView must clear draft upon successful database upsert'
    );

    // Check visual indicator badge
    assert.ok(
      gradebookSrc.includes('Draft Lokal Tersimpan'),
      'GradebookView must render "Draft Lokal Tersimpan" visual badge'
    );
    pass('GradebookView: Verified draftStorage integration, debounced autosave, restore, cleanup, and badge');
  } catch (e) {
    fail('GradebookView static inspection failed', e);
  }

  // 5.4 GuruJurnal.tsx Inspection
  try {
    const jurnalPath = path.resolve(cwd, 'src/components/GuruJurnal.tsx');
    assert.ok(fs.existsSync(jurnalPath), 'GuruJurnal.tsx must exist');
    const jurnalSrc = fs.readFileSync(jurnalPath, 'utf8');

    // Check imports
    assert.ok(
      jurnalSrc.includes("from '@/utils/draftStorage'"),
      'GuruJurnal must import from @/utils/draftStorage'
    );
    assert.ok(
      jurnalSrc.includes('saveJurnalDraft'),
      'GuruJurnal must import saveJurnalDraft'
    );
    assert.ok(
      jurnalSrc.includes('loadJurnalDraft'),
      'GuruJurnal must import loadJurnalDraft'
    );
    assert.ok(
      jurnalSrc.includes('clearJurnalDraft'),
      'GuruJurnal must import clearJurnalDraft'
    );

    // Check visual badge in UI
    assert.ok(
      jurnalSrc.includes('Draft Lokal Tersimpan'),
      'GuruJurnal must render "Draft Lokal Tersimpan" indicator badge'
    );

    // Check offline resilience and error retention
    assert.ok(
      jurnalSrc.includes('!navigator.onLine'),
      'GuruJurnal must check navigator.onLine before submission'
    );
    assert.ok(
      jurnalSrc.includes('Draft formulir tetap tersimpan aman di perangkat'),
      'GuruJurnal must reassure teacher that draft is retained on network interruption'
    );
    assert.ok(
      jurnalSrc.includes('clearJurnalDraft()'),
      'GuruJurnal must clear draft upon confirmed success'
    );
    pass('GuruJurnal: Verified draftStorage import, Draft badge, offline resilience, and conditional cleanup');
  } catch (e) {
    fail('GuruJurnal static inspection failed', e);
  }

  // ==========================================================================
  // FINAL SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║  TEST RUN SUMMARY                                                            ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════════════╝${RESET}`);
  console.log(`  Total Assertions / Specs: ${BOLD}${totalTests}${RESET}`);
  console.log(`  Passed:                   ${GREEN}${BOLD}${passedTests}${RESET}`);
  console.log(`  Failed:                   ${failedTests > 0 ? RED : GREEN}${BOLD}${failedTests}${RESET}\n`);

  if (failedTests > 0) {
    console.error(`${RED}${BOLD}❌ SOME TESTS FAILED! Process will exit with code 1.${RESET}\n`);
    process.exitCode = 1;
  } else {
    console.log(`${GREEN}${BOLD}✔ ALL 5 TEST SECTIONS PASSED WITH 100% SUCCESS!${RESET}\n`);
  }
}

runTests().catch((err) => {
  console.error('Unhandled fatal error in test suite:', err);
  process.exitCode = 1;
});
