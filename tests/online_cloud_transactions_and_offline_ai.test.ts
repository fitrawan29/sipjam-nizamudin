import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { findBestAnswers, getFallbackResponse } from '../src/components/AIAssistant/faqMatcher';
import { FAQ_DATABASE } from '../src/components/AIAssistant/knowledgeBase';

console.log('====================================================');
console.log('VERIFICATION: ONLINE CLOUD TRANSACTIONS & OFFLINE AI');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res.then(() => {
        console.log(`✅ PASS: ${name}`);
        passed++;
      }).catch((err) => {
        console.error(`❌ FAIL: ${name}`);
        console.error(err);
        failed++;
      });
    }
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

async function run() {
  const root = path.join(__dirname, '..');

  // --- R1: GuruPresensi Online-Only Cloud Transactions ---
  test('R1.1: GuruPresensi has zero offline localStorage queue writes', () => {
    const presensiCode = fs.readFileSync(path.join(root, 'src', 'components', 'GuruPresensi.tsx'), 'utf-8');
    assert(!presensiCode.includes("localStorage.setItem('sipjam_offline_presensi'"), 'Must not write to sipjam_offline_presensi');
    assert(!presensiCode.includes("localStorage.setItem('sipjam_offline_presensi_queue'"), 'Must not write to sipjam_offline_presensi_queue');
  });

  test('R1.2: GuruPresensi purges legacy offline queue keys on mount', () => {
    const presensiCode = fs.readFileSync(path.join(root, 'src', 'components', 'GuruPresensi.tsx'), 'utf-8');
    assert(presensiCode.includes("localStorage.removeItem('sipjam_offline_presensi')"), 'Must purge sipjam_offline_presensi on mount');
    assert(presensiCode.includes("localStorage.removeItem('sipjam_offline_presensi_queue')"), 'Must purge sipjam_offline_presensi_queue on mount');
  });

  test('R1.3: GuruPresensi warns user interactively when attempting submission offline', () => {
    const presensiCode = fs.readFileSync(path.join(root, 'src', 'components', 'GuruPresensi.tsx'), 'utf-8');
    assert(presensiCode.includes('Koneksi Internet Diperlukan'), 'Must show interactive warning when offline');
    assert(presensiCode.includes('navigator.onLine'), 'Must check navigator.onLine');
  });

  test('R1.4: GuruPresensi communicates directly to Supabase cloud table', () => {
    const presensiCode = fs.readFileSync(path.join(root, 'src', 'components', 'GuruPresensi.tsx'), 'utf-8');
    assert(presensiCode.includes("supabase.from('presensi_guru').insert"), 'Must insert directly to presensi_guru');
  });

  // --- R1: GuruJurnal Online-Only Cloud Transactions ---
  test('R1.5: GuruJurnal warns user interactively when offline & writes to Supabase', () => {
    const jurnalCode = fs.readFileSync(path.join(root, 'src', 'components', 'GuruJurnal.tsx'), 'utf-8');
    assert(jurnalCode.includes('Koneksi Internet Diperlukan'), 'GuruJurnal must require active internet connection');
    assert(jurnalCode.includes("supabase.from('jurnal_pembelajaran').insert"), 'GuruJurnal must insert directly to cloud');

    // Assert that offline check is upfront at handleJurnalSubmit before field validations
    const submitStartIdx = jurnalCode.indexOf('const handleJurnalSubmit = async');
    assert(submitStartIdx !== -1, 'handleJurnalSubmit must exist');
    const offlineCheckIdx = jurnalCode.indexOf("if (typeof navigator !== 'undefined' && !navigator.onLine)", submitStartIdx);
    const fieldValIdx = jurnalCode.indexOf("if (tipeJurnal === 'Jurnal KBM')", submitStartIdx);
    assert(offlineCheckIdx !== -1, 'Offline check must exist in handleJurnalSubmit');
    assert(offlineCheckIdx < fieldValIdx, 'Offline check must precede field validations to warn user upfront');
  });

  // --- R1: PiketView Online-Only Cloud Transactions ---
  test('R1.6: PiketView warns user interactively when offline on scan and manual attendance', () => {
    const piketCode = fs.readFileSync(path.join(root, 'src', 'components', 'PiketView.tsx'), 'utf-8');
    assert(piketCode.includes('Koneksi Internet Diperlukan'), 'PiketView must warn when offline');
    assert(piketCode.includes("supabase.from('presensi_siswa')") || piketCode.includes("recordPresensiSiswa"), 'Must record to Supabase');
  });

  // --- R1: GradebookView Online-Only Cloud Transactions ---
  test('R1.7: GradebookView warns user interactively when offline on save grades, TP, columns, CP, and bobot', () => {
    const gradebookCode = fs.readFileSync(path.join(root, 'src', 'components', 'GradebookView.tsx'), 'utf-8');
    assert(gradebookCode.includes('Koneksi Internet Diperlukan'), 'GradebookView must warn when offline');
    assert(gradebookCode.includes("supabase.from('nilai_siswa')") || gradebookCode.includes(".from('nilai_siswa')"), 'Must upsert directly to cloud');

    const mutationHandlers = [
      'handleSaveGrades',
      'handleSaveTp',
      'handleDeleteTp',
      'handleSaveCol',
      'handleDeleteCol',
      'handleSaveCp',
      'handleDeleteCp',
      'handleSaveBobot'
    ];
    for (const handler of mutationHandlers) {
      assert(gradebookCode.includes(handler), `GradebookView must include ${handler}`);
      const handlerIdx = gradebookCode.indexOf(`const ${handler} = `);
      assert(handlerIdx !== -1, `${handler} definition must exist`);
      const handlerBody = gradebookCode.slice(handlerIdx, handlerIdx + 800);
      assert(handlerBody.includes('navigator.onLine'), `${handler} must guard with navigator.onLine check`);
      assert(handlerBody.includes('Koneksi Internet Diperlukan'), `${handler} must warn with Koneksi Internet Diperlukan`);
    }
  });

  // --- R1: Adversarial Resiliency & Captive Portal / Fluctuation Coverage ---
  test('R1.8: GuruPresensi enforces upfront offline check and safe try-catch-finally state recovery', () => {
    const presensiCode = fs.readFileSync(path.join(root, 'src', 'components', 'GuruPresensi.tsx'), 'utf-8');
    // Ensure handlePresensiSubmit immediately guards upfront before loading state
    const submitStartIdx = presensiCode.indexOf('const handlePresensiSubmit = async');
    const offlineCheckIdx = presensiCode.indexOf("if (typeof navigator !== 'undefined' && !navigator.onLine)", submitStartIdx);
    const setLoadingIdx = presensiCode.indexOf('setLoading(true)', submitStartIdx);
    assert(submitStartIdx !== -1, 'handlePresensiSubmit must exist');
    assert(offlineCheckIdx !== -1, 'navigator.onLine check must exist in handlePresensiSubmit');
    assert(offlineCheckIdx < setLoadingIdx, 'Offline check must precede setLoading(true) to avoid UI flicker');
    // Ensure getGuruDailyState refresh has try/catch/finally setLoading(false)
    assert(presensiCode.includes('try {\n      const state = await getGuruDailyState') || presensiCode.includes('try {\r\n      const state = await getGuruDailyState'), 'getGuruDailyState must be wrapped in try-catch');
    assert(presensiCode.includes('if (isMountedRef.current) setLoading(false);'), 'setLoading(false) must be in finally block');
  });

  test('R1.9: PiketView protects scans, manual entries, submissions, assignments, and verification against offline executions', () => {
    const piketCode = fs.readFileSync(path.join(root, 'src', 'components', 'PiketView.tsx'), 'utf-8');
    const piketHandlers = [
      'handleProcessScan',
      'handleManualMark',
      'handleManualFormSubmit',
      'handleCancelManualPresensi',
      'handlePiketAbsensiChange',
      'handlePiketSubmit',
      'handleAddGuruPiket',
      'handleAddSiswaPiket',
      'handleDeletePenugasan',
      'updatePiketStatus'
    ];
    for (const handler of piketHandlers) {
      assert(piketCode.includes(handler), `PiketView must include ${handler}`);
      const handlerIdx = piketCode.indexOf(`const ${handler} = `);
      assert(handlerIdx !== -1, `${handler} definition must exist`);
      const handlerBody = piketCode.slice(handlerIdx, handlerIdx + 800);
      assert(handlerBody.includes('navigator.onLine'), `${handler} must guard with navigator.onLine check`);
      assert(handlerBody.includes('Koneksi Internet Diperlukan'), `${handler} must warn with Koneksi Internet Diperlukan`);
    }
  });

  test('R1.10: Captive portal & mid-flight failure leaves zero localStorage queue traces across failure paths', () => {
    const presensiCode = fs.readFileSync(path.join(root, 'src', 'components', 'GuruPresensi.tsx'), 'utf-8');
    const submitStartIdx = presensiCode.indexOf('const handlePresensiSubmit = async');
    const submitEndIdx = presensiCode.indexOf('const isPulangLocked =', submitStartIdx);
    const submitBody = presensiCode.slice(submitStartIdx, submitEndIdx);

    // Assert that inside handlePresensiSubmit, localStorage.setItem is NEVER called under any condition
    assert(!submitBody.includes('localStorage.setItem'), 'handlePresensiSubmit must never call localStorage.setItem under any circumstance');

    // Assert that in failure path (!insertSuccess), error toast is returned with no local fallback save
    assert(submitBody.includes('if (!insertSuccess) {'), 'Must check !insertSuccess');
    assert(submitBody.includes('Gagal Menyimpan Presensi'), 'Must show Gagal Menyimpan Presensi toast');
    assert(submitBody.includes('Koneksi internet aktif diwajibkan untuk menyimpan transaksi presensi.'), 'Must explain internet requirement');

    // Check AdminVerifView.tsx verifyItem has offline guard
    const verifCode = fs.readFileSync(path.join(root, 'src', 'components', 'AdminVerifView.tsx'), 'utf-8');
    const verifyItemIdx = verifCode.indexOf('const verifyItem = async');
    const verifyItemBody = verifCode.slice(verifyItemIdx, verifyItemIdx + 400);
    assert(verifyItemBody.includes('navigator.onLine'), 'AdminVerifView verifyItem must guard against offline attempts');
    assert(verifyItemBody.includes('Koneksi Internet Diperlukan'), 'AdminVerifView verifyItem must warn with Koneksi Internet Diperlukan');
  });

  test('R1.11: RekapSiswaView guards homeroom teacher (Wali Kelas) attendance against offline saves', () => {
    const rekapSiswaCode = fs.readFileSync(path.join(root, 'src', 'components', 'RekapSiswaView.tsx'), 'utf-8');
    const handlerIdx = rekapSiswaCode.indexOf('const handleSaveWaliAttendance = async');
    assert(handlerIdx !== -1, 'handleSaveWaliAttendance must exist');
    const handlerBody = rekapSiswaCode.slice(handlerIdx, handlerIdx + 500);
    assert(handlerBody.includes('navigator.onLine'), 'handleSaveWaliAttendance must guard with navigator.onLine check');
    assert(handlerBody.includes('Koneksi Internet Diperlukan'), 'handleSaveWaliAttendance must warn with Koneksi Internet Diperlukan');
    assert(rekapSiswaCode.includes("supabase.from('absensi').upsert"), 'Must persist directly to supabase absensi table');
  });

  // --- R2: Offline AI Assistant Preservation ---
  test('R2.1: AI Assistant components contain zero external API network calls', () => {
    const aiAssistantCode = fs.readFileSync(path.join(root, 'src', 'components', 'AIAssistant', 'AIAssistant.tsx'), 'utf-8');
    const faqMatcherCode = fs.readFileSync(path.join(root, 'src', 'components', 'AIAssistant', 'faqMatcher.ts'), 'utf-8');
    const kbCode = fs.readFileSync(path.join(root, 'src', 'components', 'AIAssistant', 'knowledgeBase.ts'), 'utf-8');

    assert(!aiAssistantCode.includes('fetch(') && !aiAssistantCode.includes('axios'), 'AIAssistant.tsx must have no network calls');
    assert(!faqMatcherCode.includes('fetch(') && !faqMatcherCode.includes('axios'), 'faqMatcher.ts must have no network calls');
    assert(!kbCode.includes('fetch(') && !kbCode.includes('axios'), 'knowledgeBase.ts must have no network calls');
  });

  test('R2.2: AI Assistant maintains 100% Offline FAQ badge and greeting', () => {
    const aiAssistantCode = fs.readFileSync(path.join(root, 'src', 'components', 'AIAssistant', 'AIAssistant.tsx'), 'utf-8');
    assert(aiAssistantCode.includes('100% Offline FAQ'), 'Must render 100% Offline FAQ header badge');
    assert(aiAssistantCode.includes('100% offline & cepat'), 'Greeting must state 100% offline & cepat');
  });

  test('R2.3: FAQ matcher operates purely offline with static knowledge base', () => {
    // Intercept fetch to prove zero network requests occur
    const originalFetch = global.fetch;
    let networkCallAttempted = false;
    (global as any).fetch = () => {
      networkCallAttempted = true;
      throw new Error('NETWORK CALL DETECTED: AI Assistant must remain 100% offline!');
    };

    try {
      const results = findBestAnswers('bagaimana cara melakukan presensi datang');
      assert(results.length > 0, 'Should find matches offline');
      assert.strictEqual(results[0].id, 'faq-presensi-1');
      assert(results[0].answer.length > 0, 'Answer must be provided');

      const fallback = getFallbackResponse('kata acak yang tidak ada di faq xyz123', 'view-guru-presensi');
      assert(fallback.message && fallback.message.length > 0, 'Fallback should return response offline');
      assert.strictEqual(networkCallAttempted, false, 'No network calls during offline match');
    } finally {
      global.fetch = originalFetch;
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL ONLINE CLOUD TRANSACTIONS & OFFLINE AI TESTS PASSED!\n');
  }
}

run();
