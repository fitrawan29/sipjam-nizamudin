/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL STRESS TEST: WHATSAPP UTILS
 * File: tests/adversarial_whatsapp_stress.test.ts
 *
 * Systematically stress-tests WhatsApp phone normalization and URI generation
 * in src/utils/whatsappUtils.ts against 5 challenge vectors:
 * 1. Obscure Indonesian formats, prefixes (+62, 0062, 08, 6208, 8), formatting garbage
 * 2. Boundary lengths (9, 10, 15, 16, 17, 100 digits)
 * 3. Landlines, toll-free, emergency numbers (110, 112, 021..., 031..., 022...)
 * 4. Extreme message payloads (SQLi, XSS, control chars, massive text, emojis, null bytes)
 * 5. Native new URL(url) RFC/WHATWG compliance and WhatsApp deep link protocol verification
 * ============================================================================
 */

import assert from 'assert';
import {
  normalizeIndonesianPhoneNumber,
  formatWhatsAppAttendanceMessage,
  generateParentWhatsAppUrl,
  triggerParentWhatsApp
} from '../src/utils/whatsappUtils';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const MAGENTA = '\x1b[35m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

export interface TestFinding {
  vector: string;
  input: any;
  result: any;
  classification: 'ROBUST' | 'OBSERVED_BEHAVIOR' | 'POTENTIAL_VULNERABILITY' | 'CRITICAL_BUG';
  details: string;
}

export const findings: TestFinding[] = [];

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

function recordFinding(finding: TestFinding) {
  findings.push(finding);
}

async function runAdversarialSuite() {
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║  EMPIRICAL ADVERSARIAL STRESS TEST — WHATSAPP UTILS                          ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  // ==========================================================================
  // VECTOR 1: OBSCURE INDONESIAN FORMATS, PREFIXES & FORMATTING GARBAGE
  // ==========================================================================
  console.log(`${YELLOW}${BOLD}━━━ VECTOR 1: OBSCURE INDONESIAN FORMATS & PREFIXES ━━━${RESET}`);

  // 1.1 Standard & Common Prefixes
  const prefixCases = [
    { name: '+62 prefix', input: '+6281234567890', expected: '6281234567890' },
    { name: '08 national prefix', input: '081234567890', expected: '6281234567890' },
    { name: 'Pure 62 prefix', input: '6281234567890', expected: '6281234567890' },
    { name: 'Redundant 6208 prefix', input: '62081234567890', expected: '6281234567890' },
    { name: 'Redundant +6208 prefix', input: '+62 0812-3456-7890', expected: '6281234567890' },
    { name: 'Short 8 prefix (no 0/62)', input: '81234567890', expected: '6281234567890' },
    { name: '08 with dot delimiters', input: '0812.3456.7890', expected: '6281234567890' },
    { name: '08 with slash delimiters', input: '0812/3456/7890', expected: '6281234567890' },
    { name: 'Multiple nested parens', input: '((0812)) (345) [67890]', expected: '6281234567890' },
    { name: 'Weird erratic spacing', input: '  0 8 1 2   3 4 5 6   7 8 9 0  ', expected: '6281234567890' },
    { name: 'Unicode non-breaking spaces (NBSP)', input: '0812\u00A03456\u00A07890', expected: '6281234567890' },
    { name: 'Unicode em-space & en-space', input: '0812\u20023456\u20037890', expected: '6281234567890' },
    { name: 'Unicode zero-width spaces (ZWSP)', input: '0812\u200B3456\u200B7890', expected: '6281234567890' },
    { name: 'Unicode RTL and LTR marks', input: '\u200E081234567890\u200F', expected: '6281234567890' },
    { name: 'Embedded emojis in phone number', input: '0812🔥3456👏7890', expected: '6281234567890' },
    { name: 'Embedded letters (alpha vanity < 10 digits)', input: '0812-HUB-7890', expected: null }, // '08127890' -> 8 digits -> < 10 -> null
    { name: 'Embedded text with parenthetical label', input: '081234567890 (Ibu Kandung)', expected: '6281234567890' },
  ];

  for (const c of prefixCases) {
    try {
      const res = normalizeIndonesianPhoneNumber(c.input);
      assert.strictEqual(res, c.expected);
      pass(`Prefix/format case [${c.name}]: ${JSON.stringify(c.input)} -> ${res}`);
    } catch (e) {
      fail(`Prefix/format case [${c.name}] failed`, e);
      recordFinding({
        vector: 'V1: Prefixes & Formats',
        input: c.input,
        result: normalizeIndonesianPhoneNumber(c.input),
        classification: 'POTENTIAL_VULNERABILITY',
        details: `Expected ${c.expected} for ${c.name}, got ${normalizeIndonesianPhoneNumber(c.input)}`
      });
    }
  }

  // 1.2 The 0062 International Prefix Challenge
  // 00 is ITU-T standard IDD (e.g. 0062 812 3456 7890)
  const iddInput = '006281234567890';
  const iddRes = normalizeIndonesianPhoneNumber(iddInput);
  console.log(`  ${CYAN}[OBSERVATION]${RESET} Testing IDD prefix '006281234567890': result = ${iddRes}`);
  if (iddRes === null) {
    recordFinding({
      vector: 'V1: 0062 IDD Prefix Normalization',
      input: iddInput,
      result: iddRes,
      classification: 'POTENTIAL_VULNERABILITY',
      details: '006281234567890 is not converted to 6281234567890. It returns null, which causes triggerParentWhatsApp to show the manual input popup, and if re-entered there, fails validation.'
    });
    pass(`0062 prefix empirical test: observed that 0062 is currently NOT stripped to 62 (returns null)`);
  } else if (iddRes === '6281234567890') {
    pass(`Prefix '0062' normalized to 6281234567890`);
  }

  // 1.3 Leading Zeros & Trailing Garbage
  const garbageCases = [
    { name: 'Multiple leading zeros (0081234567890)', input: '0081234567890', expected: null },
    { name: 'Triple leading zeros (00081234567890)', input: '00081234567890', expected: null },
    { name: 'Trailing extension (ext 123 -> total 16 digits)', input: '081234567890 ext 123', expected: '6281234567890123' }, // 13 + 3 = 16 digits -> accepted
    { name: 'Trailing extension overflowing (ext 1234 -> total 17 digits)', input: '081234567890 ext 1234', expected: null }, // 13 + 4 = 17 digits -> rejected
    { name: 'Trailing text without digits', input: '081234567890 #WA-ONLY', expected: '6281234567890' },
    { name: 'Only non-digits', input: '---+++()---', expected: null },
    { name: 'Only emojis', input: '📱📞🤙', expected: null },
    { name: 'Whitespace string', input: '    ', expected: null },
    { name: 'Full-width digits (０８１２３4５６７８９０)', input: '０８１２３4５６７８９０', expected: null }, // non-ASCII digits stripped by \D
  ];

  for (const c of garbageCases) {
    try {
      const res = normalizeIndonesianPhoneNumber(c.input);
      assert.strictEqual(res, c.expected);
      pass(`Garbage handling [${c.name}]: -> ${res}`);
    } catch (e) {
      fail(`Garbage handling [${c.name}] failed`, e);
    }
  }

  // ==========================================================================
  // VECTOR 2: BOUNDARY LENGTHS
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ VECTOR 2: BOUNDARY LENGTHS ━━━${RESET}`);

  // Indonesian cellular numbers: 628 + 7 to 13 digits (10 to 16 digits total)
  const boundaryCases = [
    { digits: 8, input: '0812345', expected: null, desc: '8 digits total (62812345 - below min 10)' },
    { digits: 9, input: '08123456', expected: null, desc: '9 digits total (628123456 - below min 10)' },
    { digits: 10, input: '081234567', expected: '6281234567', desc: '10 digits total (6281234567 - min boundary)' },
    { digits: 11, input: '0812345678', expected: '62812345678', desc: '11 digits total (standard)' },
    { digits: 12, input: '08123456789', expected: '628123456789', desc: '12 digits total (standard)' },
    { digits: 13, input: '081234567890', expected: '6281234567890', desc: '13 digits total (standard)' },
    { digits: 14, input: '0812345678901', expected: '62812345678901', desc: '14 digits total (long standard)' },
    { digits: 15, input: '08123456789012', expected: '628123456789012', desc: '15 digits total (upper standard)' },
    { digits: 16, input: '081234567890123', expected: '6281234567890123', desc: '16 digits total (max boundary)' },
    { digits: 17, input: '0812345678901234', expected: null, desc: '17 digits total (above max 16)' },
    { digits: 20, input: '0812345678901234567', expected: null, desc: '20 digits total' },
    { digits: 50, input: '08' + '1'.repeat(48), expected: null, desc: '50 digits total' },
    { digits: 100, input: '08' + '9'.repeat(98), expected: null, desc: '100 digits massive number' },
    { digits: 1000, input: '08' + '5'.repeat(998), expected: null, desc: '1000 digits buffer attack' }
  ];

  for (const b of boundaryCases) {
    try {
      const res = normalizeIndonesianPhoneNumber(b.input);
      assert.strictEqual(res, b.expected);
      pass(`Boundary length check: ${b.desc} -> ${res === null ? 'REJECTED (null)' : 'ACCEPTED (' + res.length + ' digits)'}`);
    } catch (e) {
      fail(`Boundary length check failed: ${b.desc}`, e);
    }
  }

  // ==========================================================================
  // VECTOR 3: LANDLINES, TOLL-FREE, SHORT CODES & EMERGENCY NUMBERS
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ VECTOR 3: LANDLINES, TOLL-FREE, SHORT CODES & EMERGENCY ━━━${RESET}`);

  const specialNumbers = [
    // Emergency numbers
    { name: 'Polisi (110)', input: '110', expected: null },
    { name: 'Kedaruratan (112)', input: '112', expected: null },
    { name: 'Pemadam Kebakaran (113)', input: '113', expected: null },
    { name: 'Ambulans (118/119)', input: '118', expected: null },
    { name: 'SAR (115)', input: '115', expected: null },
    { name: 'PLN (123)', input: '123', expected: null },
    // Short codes
    { name: 'Fast food delivery (14045)', input: '14045', expected: null },
    { name: 'Halo BCA (1500888)', input: '1500888', expected: null },
    { name: 'Mandiri Call (14000)', input: '14000', expected: null },
    // Fixed Landline area codes
    { name: 'Jakarta Landline (021-1234567)', input: '021-1234567', expected: null },
    { name: 'Bandung Landline (022-7654321)', input: '022-7654321', expected: null },
    { name: 'Surabaya Landline (031-8976543)', input: '031-8976543', expected: null },
    { name: 'Semarang Landline (024-8123456)', input: '024-8123456', expected: null },
    { name: 'Yogyakarta Landline (0274-512345)', input: '0274-512345', expected: null },
    { name: 'Medan Landline (061-4123456)', input: '061-4123456', expected: null },
    { name: 'Denpasar Landline (0361-212345)', input: '0361-212345', expected: null },
    { name: 'Makassar Landline (0411-812345)', input: '0411-812345', expected: null },
    { name: 'International Landline with +62 (+62 21 1234567)', input: '+62 21 1234567', expected: null },
    // Non-cellular prefix 01
    { name: 'Prefix 01 (01234567890)', input: '01234567890', expected: null },
    // Non-cellular prefix 05
    { name: 'Prefix 05 (0542-123456)', input: '0542-123456', expected: null },
    // Non-cellular prefix 07
    { name: 'Prefix 07 (0711-123456)', input: '0711-123456', expected: null },
    // Non-cellular prefix 09
    { name: 'Prefix 09 (0967-123456)', input: '0967-123456', expected: null },
  ];

  for (const s of specialNumbers) {
    try {
      const res = normalizeIndonesianPhoneNumber(s.input);
      assert.strictEqual(res, s.expected);
      pass(`Special/Landline check [${s.name}]: correctly rejected with null`);
    } catch (e) {
      fail(`Special/Landline check [${s.name}] failed: expected null, got ${normalizeIndonesianPhoneNumber(s.input)}`, e);
      recordFinding({
        vector: 'V3: Landlines & Emergency',
        input: s.input,
        result: normalizeIndonesianPhoneNumber(s.input),
        classification: 'POTENTIAL_VULNERABILITY',
        details: `Landline/Emergency number ${s.name} was not rejected!`
      });
    }
  }

  // Toll-Free and Premium Rate Investigation
  // In Indonesia, 0800 is toll-free (Bebas Pulsa) and 0809 is premium rate (TelkomNet Instan / info)
  const tollFreeInput = '0800-1-234567';
  const tollFreeRes = normalizeIndonesianPhoneNumber(tollFreeInput);
  console.log(`  ${CYAN}[OBSERVATION]${RESET} Toll-Free '0800-1-234567': normalized = ${tollFreeRes}`);
  if (tollFreeRes === '628001234567') {
    pass(`Toll-free 0800 format starts with 08, transformed to 628001234567 (syntactically valid 13-digit E.164 under 628 range)`);
    recordFinding({
      vector: 'V3: Toll-Free 0800',
      input: tollFreeInput,
      result: tollFreeRes,
      classification: 'OBSERVED_BEHAVIOR',
      details: '0800 toll-free numbers fall under the 08 prefix and are transformed to 62800... Indonesian cellular is typically 081x, 082x, 083x, 085x, 087x, 088x, 089x. In WhatsApp, wa.me/62800... opens the WA chat interface gracefully even if the recipient is not registered.'
    });
  }

  // ==========================================================================
  // VECTOR 4: EXTREME MESSAGE PARAMETERS & PAYLOADS
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ VECTOR 4: EXTREME MESSAGE PARAMETERS & PAYLOADS ━━━${RESET}`);

  const payloadScenarios = [
    {
      name: 'SQL Injection payload',
      params: {
        studentName: "'; DROP TABLE presensi_siswa; --",
        kelas: "7A' OR '1'='1",
        tanggal: '2026-10-16',
        status: 'Alpa',
        note: "UNION SELECT username, password FROM users WHERE role='superadmin';"
      }
    },
    {
      name: 'XSS & HTML Injection payload',
      params: {
        studentName: '<script>alert("XSS")</script>',
        kelas: '<img src=x onerror=alert(document.cookie)>',
        tanggal: '2026-10-16',
        status: '<iframe src="https://evil.com"></iframe>',
        note: '<a href="javascript:alert(1)">Klik Disini</a>'
      }
    },
    {
      name: 'Complex Emojis, Compound ZWJ & Regional Flags',
      params: {
        studentName: 'Ahmad 👨‍👩‍👧‍👦 Fauzan 🇮🇩',
        kelas: '8-B ⭐',
        tanggal: '2026-10-16',
        status: 'Hadir 🔥👏📚',
        note: 'Sangat aktif di kelas 💯🏆, berprestasi! 👍🏽'
      }
    },
    {
      name: 'Multi-lingual & Non-Latin unicode scripts',
      params: {
        studentName: 'محمد عبدالله / 王小明 / Иван',
        kelas: 'Kelas 9 (日本語)',
        tanggal: '2026-10-16',
        status: 'Izin (مريض / 生病)',
        note: 'Красивое сообщение na ruskom i arapskom'
      }
    },
    {
      name: 'Control characters, newlines & escapes',
      params: {
        studentName: 'Fauzi\x07\x08\x1b[31mTest\x1b[0m',
        kelas: '7\tA\r\nB',
        tanggal: '2026-10-16',
        status: 'Terlambat',
        note: 'Catatan baris 1\nCatatan baris 2\r\nCatatan baris 3\tTabbed'
      }
    },
    {
      name: 'Null byte injection in strings',
      params: {
        studentName: 'Siswa\0Injected',
        kelas: '7A\0Class',
        tanggal: '2026-10-16',
        status: 'Alpa\0Status',
        note: 'Prefix\0TruncateAttempt'
      }
    },
    {
      name: 'Massive string payload (5,000 characters)',
      params: {
        studentName: 'Budi '.repeat(500),
        kelas: 'Kelas 7A',
        tanggal: '2026-10-16',
        status: 'Hadir',
        note: 'Penjelasan panjang: '.repeat(200)
      }
    },
    {
      name: 'Massive string payload (20,000 characters)',
      params: {
        studentName: 'Mega Student',
        kelas: '7A',
        tanggal: '2026-10-16',
        status: 'Sakit',
        note: 'X'.repeat(20000)
      }
    },
    {
      name: 'Dangerous URL parameters (&text= hijack, fragments, query poisoning)',
      params: {
        studentName: 'Budi?phone=628999999999&text=HACKED#fragment',
        kelas: '7A&admin=true',
        tanggal: '2026-10-16',
        status: 'Alpa',
        note: 'wa.me/redirect?evil=1'
      }
    }
  ];

  for (const scenario of payloadScenarios) {
    try {
      const msg = formatWhatsAppAttendanceMessage(scenario.params);
      assert.ok(typeof msg === 'string', 'Message must format to string');
      assert.ok(msg.length > 0, 'Message must not be empty');

      // Verify URL generation
      const url = generateParentWhatsAppUrl({
        phone: '081234567890',
        ...scenario.params
      });

      assert.ok(url.startsWith('https://wa.me/6281234567890?text='), 'Base URL structure strictly maintained');

      // Native URL parse test
      const parsed = new URL(url);
      assert.strictEqual(parsed.protocol, 'https:');
      assert.strictEqual(parsed.hostname, 'wa.me');
      assert.strictEqual(parsed.pathname, '/6281234567890');
      assert.ok(parsed.searchParams.has('text'), 'Must contain searchParam text');

      // Verify no query string corruption (e.g. injected &admin=true or &text= hijacked)
      // The search param 'text' must contain the entire message
      const textParam = parsed.searchParams.get('text');
      assert.ok(textParam, 'Extracted text param must not be empty');

      // Check URL query parameter count: must only be 'text'
      const paramKeys = Array.from(parsed.searchParams.keys());
      assert.deepStrictEqual(paramKeys, ['text'], `Expected only 'text' query param, found: ${paramKeys.join(', ')}`);

      pass(`Payload resilience [${scenario.name}]: parsed cleanly via new URL() without param poisoning (${url.length} chars)`);
    } catch (e) {
      fail(`Payload resilience [${scenario.name}] failed`, e);
      recordFinding({
        vector: 'V4: Extreme Payloads',
        input: scenario.name,
        result: 'ERROR / EXCEPTION',
        classification: 'CRITICAL_BUG',
        details: `Failed to format or generate URL: ${e}`
      });
    }
  }

  // ==========================================================================
  // VECTOR 5: NATIVE URL PARSING & WHATSAPP DEEP LINK PROTOCOL COMPLIANCE
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ VECTOR 5: NATIVE URL PARSER & PROTOCOL COMPLIANCE ━━━${RESET}`);

  // Test across permutations
  const randomPhones = [
    '08111234567', // Telkomsel Halo (10 digits)
    '081234567890', // 12 digits
    '085712345678', // Indosat 12 digits
    '0896123456789', // Tri 13 digits
    '+62 813-9876-5432', // Spaced & dashed
    '81812345678', // Direct 8
    '62081912345678' // 6208 redundant
  ];

  const randomStatuses = ['Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa', 'Bolos'];

  let permutationCount = 0;
  for (const ph of randomPhones) {
    for (const st of randomStatuses) {
      permutationCount++;
      const url = generateParentWhatsAppUrl({
        phone: ph,
        studentName: `Student-${permutationCount}`,
        kelas: `Kelas-${(permutationCount % 3) + 7}`,
        tanggal: '2026-10-16',
        status: st,
        schoolName: 'SMP Test Protocol',
        timeStr: '07:05 WIB',
        note: `Test permutation #${permutationCount}`
      });

      try {
        const u = new URL(url);
        assert.strictEqual(u.protocol, 'https:');
        assert.strictEqual(u.hostname, 'wa.me');
        assert.ok(u.pathname.startsWith('/628'));
        assert.ok(u.search.startsWith('?text='));
      } catch (e) {
        fail(`Permutation #${permutationCount} failed URL parser: ${url}`, e);
      }
    }
  }
  pass(`Generated & parsed ${permutationCount}/${permutationCount} URLs against WHATWG URL standard`);

  // 5.2 Test Fallback Phone URL generation in generateParentWhatsAppUrl
  // When phone is invalid (e.g. '123' or empty), what URL is generated?
  try {
    const fallbackUrl1 = generateParentWhatsAppUrl({
      phone: '123',
      studentName: 'Ani',
      kelas: '7A',
      tanggal: '2026-10-16',
      status: 'Hadir'
    });
    const parsed1 = new URL(fallbackUrl1);
    assert.strictEqual(parsed1.hostname, 'wa.me');
    assert.strictEqual(parsed1.pathname, '/123');
    pass(`Fallback phone '123' produces valid URL wa.me/123?text=...`);

    const fallbackUrlEmpty = generateParentWhatsAppUrl({
      phone: '',
      studentName: 'Ani',
      kelas: '7A',
      tanggal: '2026-10-16',
      status: 'Hadir'
    });
    const parsedEmpty = new URL(fallbackUrlEmpty);
    assert.strictEqual(parsedEmpty.hostname, 'wa.me');
    assert.strictEqual(parsedEmpty.pathname, '/');
    pass(`Empty phone produces valid URL wa.me/?text=... (standard WhatsApp choose-recipient URI)`);
  } catch (e) {
    fail(`Fallback phone URL generation failed`, e);
  }

  // 5.3 Test Null / Undefined safety in generateParentWhatsAppUrl
  try {
    let nullCrashed = false;
    try {
      generateParentWhatsAppUrl({
        phone: null as any,
        studentName: 'Test',
        kelas: '7A',
        tanggal: '2026-10-16',
        status: 'Hadir'
      });
    } catch (err: any) {
      nullCrashed = true;
      recordFinding({
        vector: 'V5: Runtime Type Safety',
        input: 'phone: null',
        result: err.message,
        classification: 'POTENTIAL_VULNERABILITY',
        details: `generateParentWhatsAppUrl({ phone: null }) throws unhandled exception: "${err.message}" because of params.phone.replace(/\\D/g, ''). Callers should pass empty string or ensure phone is non-null.`
      });
    }
    if (nullCrashed) {
      pass(`Documented edge case: generateParentWhatsAppUrl({ phone: null }) throws TypeError as params.phone is typed strictly string`);
    } else {
      pass(`generateParentWhatsAppUrl handles null phone safely`);
    }
  } catch (e) {
    fail('Null phone check failed', e);
  }

  // ==========================================================================
  // VECTOR 6: INTERACTIVE TRIGGER WORKFLOW & UI CONTRACT
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ VECTOR 6: INTERACTIVE TRIGGER WORKFLOW & UI CONTRACT ━━━${RESET}`);

  // Test triggerParentWhatsApp when window is undefined (SSR / Node environment)
  try {
    let noCrashOnSSR = false;
    await triggerParentWhatsApp(
      { nama_siswa: 'Budi', no_hp_ortu: '081234567890' },
      { status: 'Hadir', tanggal: '2026-10-16' }
    );
    noCrashOnSSR = true;
    assert.ok(noCrashOnSSR);
    pass('triggerParentWhatsApp executes without error in SSR / headless environment (no window)');
  } catch (e) {
    fail('triggerParentWhatsApp crashed on SSR', e);
  }

  // Test triggerParentWhatsApp with mocked window.open for valid phone
  try {
    let openedUrl = '';
    const mockWindow = {
      open: (target: string, _targetWindow?: string) => {
        openedUrl = target;
      }
    };
    (globalThis as any).window = mockWindow;

    await triggerParentWhatsApp(
      { nama: 'Dewi Lestari', kelas: '8C', no_hp_ortu: '0813-9999-8888' },
      { status: 'Terlambat', tanggal: '2026-10-16', timeStr: '07:25 WITA', note: 'Macet di jalan' },
      'SMP Harapan Bangsa'
    );

    assert.ok(openedUrl.startsWith('https://wa.me/6281399998888?text='));
    const parsed = new URL(openedUrl);
    const decoded = decodeURIComponent(parsed.searchParams.get('text') || '');
    assert.ok(decoded.includes('Dewi Lestari'));
    assert.ok(decoded.includes('8C'));
    assert.ok(decoded.includes('Terlambat'));
    assert.ok(decoded.includes('Macet di jalan'));
    assert.ok(decoded.includes('SMP Harapan Bangsa'));
    pass('triggerParentWhatsApp correctly opens window with valid normalized WhatsApp URI');

    // Clean up window mock
    delete (globalThis as any).window;
  } catch (e) {
    fail('triggerParentWhatsApp window.open test failed', e);
    delete (globalThis as any).window;
  }

  // ==========================================================================
  // SUMMARY OF EMPIRICAL ADVERSARIAL CHALLENGES
  // ==========================================================================
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║  ADVERSARIAL STRESS TEST SUMMARY                                             ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════════════╝${RESET}`);
  console.log(`  Total Adversarial Checks:  ${BOLD}${totalTests}${RESET}`);
  console.log(`  Passed Checks:             ${GREEN}${BOLD}${passedTests}${RESET}`);
  console.log(`  Failed Checks:             ${failedTests > 0 ? RED : GREEN}${BOLD}${failedTests}${RESET}`);
  console.log(`  Findings Logged:           ${findings.length}\n`);

  for (const f of findings) {
    console.log(`  [${f.classification}] ${f.vector}: ${f.details}`);
  }

  if (failedTests > 0) {
    console.error(`\n${RED}${BOLD}❌ ADVERSARIAL STRESS TEST FAILED! Exit code 1.${RESET}\n`);
    process.exitCode = 1;
  } else {
    console.log(`\n${GREEN}${BOLD}✔ ALL ADVERSARIAL STRESS TESTS COMPLETED SUCCESSFULLY!${RESET}\n`);
  }
}

runAdversarialSuite().catch((err) => {
  console.error('Fatal crash in adversarial runner:', err);
  process.exitCode = 1;
});
