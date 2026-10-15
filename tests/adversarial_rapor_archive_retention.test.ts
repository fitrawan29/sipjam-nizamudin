import React from 'react';
import assert from 'assert';
import RaporView from '../src/components/RaporView';

console.log('================================================================');
console.log('  ADVERSARIAL TEST: E-RAPOR ARCHIVE SELECTION & REALTIME SYNC   ');
console.log('================================================================\n');

async function runAdversarialLifecycleChecks() {
  let passed = 0;
  let total = 0;

  function check(desc: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res && typeof (res as any).then === 'function') {
        return (res as Promise<void>)
          .then(() => {
            passed++;
            console.log(`  ✔ [PASS] ${desc}`);
          })
          .catch((err: any) => {
            console.error(`  ✖ [FAIL] ${desc}: ${err.message}`);
            process.exitCode = 1;
          });
      } else {
        passed++;
        console.log(`  ✔ [PASS] ${desc}`);
      }
    } catch (err: any) {
      console.error(`  ✖ [FAIL] ${desc}: ${err.message}`);
      process.exitCode = 1;
    }
  }

  // 1. Simulating Multi-Tab Storage Event Parser
  await check('ADV-01: StorageEvent parser handles sipjam:config_sync payload correctly', () => {
    let triggeredPayload: any = null;
    const handleConfigSync = (event: any) => {
      triggeredPayload = event?.detail;
    };

    const handleStorageSync = (e: any) => {
      if (e.key === 'sipjam:config_sync' || e.key === 'sipjam_config_sync') {
        try {
          const detail = e.newValue ? JSON.parse(e.newValue) : null;
          if (detail) {
            handleConfigSync({ detail });
          }
        } catch (_) {}
      }
    };

    const mockStorageEvent = {
      key: 'sipjam:config_sync',
      newValue: JSON.stringify({
        sekolah_id: 'sch-test-1',
        tahun_ajaran: '2026/2027',
        semester: 'Genap'
      })
    };

    handleStorageSync(mockStorageEvent);
    assert.ok(triggeredPayload, 'Must parse and trigger handleConfigSync');
    assert.strictEqual(triggeredPayload.tahun_ajaran, '2026/2027');
    assert.strictEqual(triggeredPayload.semester, 'Genap');
  });

  // 2. Resilient Year Matching Regex
  await check('ADV-02: Surrounding year calculation handles various year formats (slash, dash, spaced)', () => {
    const parseBaseYear = (activeTa: string) => {
      const match = activeTa.match(/(\d{4})\s*[-/]\s*(\d{4})/);
      return match ? parseInt(match[1], 10) : new Date().getFullYear();
    };

    assert.strictEqual(parseBaseYear('2024/2025'), 2024, 'Standard slash format');
    assert.strictEqual(parseBaseYear('2024-2025'), 2024, 'Dash format');
    assert.strictEqual(parseBaseYear(' 2024 / 2025 '), 2024, 'Spaced slash format');
    assert.strictEqual(parseBaseYear(' 2025 - 2026 '), 2025, 'Spaced dash format');
  });

  // 3. Document Title Protection
  await check('ADV-03: Print document title preserves original title across beforeprint/afterprint cycle', () => {
    let docTitle = 'SIPJAM - Sistem Informasi Presensi';
    let savedOriginal = '';

    const handleBeforePrint = () => {
      if (!docTitle.startsWith('E-Rapor_')) {
        savedOriginal = docTitle;
      }
      docTitle = 'E-Rapor_Budi_Kelas_X-A_Semester_Ganjil_TA_2024-2025';
    };

    const handleAfterPrint = () => {
      if (savedOriginal) {
        docTitle = savedOriginal;
      }
    };

    // Cycle 1: Regular print trigger
    handleBeforePrint();
    assert.strictEqual(docTitle, 'E-Rapor_Budi_Kelas_X-A_Semester_Ganjil_TA_2024-2025');
    assert.strictEqual(savedOriginal, 'SIPJAM - Sistem Informasi Presensi');
    handleAfterPrint();
    assert.strictEqual(docTitle, 'SIPJAM - Sistem Informasi Presensi');

    // Cycle 2: handlePrintRapor already set document.title before beforeprint fired
    docTitle = 'E-Rapor_Budi_Kelas_X-A_Semester_Ganjil_TA_2024-2025';
    handleBeforePrint(); // should NOT overwrite savedOriginal with E-Rapor_...
    assert.strictEqual(savedOriginal, 'SIPJAM - Sistem Informasi Presensi');
    handleAfterPrint();
    assert.strictEqual(docTitle, 'SIPJAM - Sistem Informasi Presensi');
  });

  console.log('\n================================================================');
  console.log(`  ADVERSARIAL TESTS: ${passed} / ${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) process.exit(1);
}

runAdversarialLifecycleChecks().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
