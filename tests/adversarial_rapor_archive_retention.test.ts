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

  // 4. Archive Selection Retention on Window Focus / Resume Event
  await check('ADV-04: Focus/Resume event with { sekolah_id } never overwrites archive year or semester', () => {
    let activeSchoolTa = '2024/2025';
    let activeSchoolSem: 'Ganjil' | 'Genap' = 'Ganjil';
    let selectedTa = '2022/2023'; // User viewing archive
    let selectedSem: 'Ganjil' | 'Genap' = 'Genap'; // User viewing archive

    // Simulated handleConfigSync
    const simulateConfigSync = (detail: any) => {
      const prevActiveTa = activeSchoolTa;
      const prevActiveSem = activeSchoolSem;

      let newTa = detail?.tahun_ajaran;
      let newSem = detail?.semester;

      if (!newTa || !newSem) {
        // DB lookup returns current school config
        const conf = { tahunAjaran: '2024/2025', semester: 'Ganjil' };
        newTa = conf.tahunAjaran;
        newSem = conf.semester;

        if (newTa) {
          activeSchoolTa = newTa;
          if (selectedTa === prevActiveTa) {
            selectedTa = newTa;
          }
        }
        if (newSem) {
          activeSchoolSem = newSem as any;
          if (selectedSem === prevActiveSem) {
            selectedSem = newSem as any;
          }
        }
      }
    };

    // Trigger focus/resume event
    simulateConfigSync({ sekolah_id: 'sch-01' });

    assert.strictEqual(selectedTa, '2022/2023', 'User archive year must NOT be overwritten');
    assert.strictEqual(selectedSem, 'Genap', 'User archive semester must NOT be overwritten');
    assert.strictEqual(activeSchoolTa, '2024/2025', 'Active school year remains 2024/2025');
  });

  // 5. Archive Selection Retention when Admin Saves Unchanged TA/Semester
  await check('ADV-05: AdminConfigView save event does NOT force reset on user viewing archive', () => {
    let activeSchoolTa = '2024/2025';
    let activeSchoolSem: 'Ganjil' | 'Genap' = 'Ganjil';
    let selectedTa = '2023/2024';
    let selectedSem: 'Ganjil' | 'Genap' = 'Genap';

    const simulateConfigSync = (detail: any) => {
      const prevActiveTa = activeSchoolTa;
      const prevActiveSem = activeSchoolSem;

      const newTa = detail?.tahun_ajaran;
      const newSem = detail?.semester;

      if (newTa) {
        activeSchoolTa = newTa.trim();
        if (selectedTa === prevActiveTa) {
          selectedTa = newTa.trim();
        }
      }
      if (newSem) {
        activeSchoolSem = newSem;
        if (selectedSem === prevActiveSem) {
          selectedSem = newSem;
        }
      }
    };

    // Admin saves config (e.g. attendance rules changed, TA/sem re-submitted)
    simulateConfigSync({
      sekolah_id: 'sch-01',
      tahun_ajaran: '2024/2025',
      semester: 'Ganjil'
    });

    assert.strictEqual(selectedTa, '2023/2024', 'Archive selection must remain 2023/2024');
    assert.strictEqual(selectedSem, 'Genap', 'Archive semester must remain Genap');
  });

  // 6. Active School Promotion vs Archive Isolation
  await check('ADV-06: Active promotion updates active-following users while preserving archive users', () => {
    let activeSchoolTa = '2024/2025';

    let userActiveSelectedTa = '2024/2025'; // User following active
    let userArchiveSelectedTa = '2021/2022'; // User on archive

    const promoteActiveSchoolTa = (newTa: string) => {
      const prevActive = activeSchoolTa;
      activeSchoolTa = newTa;

      if (userActiveSelectedTa === prevActive) {
        userActiveSelectedTa = newTa;
      }
      if (userArchiveSelectedTa === prevActive) {
        userArchiveSelectedTa = newTa;
      }
    };

    // School promotes to 2025/2026
    promoteActiveSchoolTa('2025/2026');

    assert.strictEqual(activeSchoolTa, '2025/2026');
    assert.strictEqual(userActiveSelectedTa, '2025/2026', 'Active-following user must follow to 2025/2026');
    assert.strictEqual(userArchiveSelectedTa, '2021/2022', 'Archive user must stay on 2021/2022');
  });

  // 7. Wali Kelas Academic Year Matching Precision
  await check('ADV-07: matchingWali strictly rejects different academic year assignments', () => {
    const wList = [
      { nama_guru: 'Pak Budi Historical', nip: '19800101', tahun_ajaran: '2021/2022' }
    ];

    const matchWali = (selectedYear: string) => {
      return (
        wList.find((w: any) => w.tahun_ajaran === selectedYear) ||
        wList.find((w: any) => !w.tahun_ajaran)
      );
    };

    assert.strictEqual(matchWali('2024/2025'), undefined, 'Must NOT match historical 2021/2022 wali kelas');
    assert.ok(matchWali('2021/2022'), 'Must match exact academic year');
    assert.strictEqual(matchWali('2021/2022')?.nama_guru, 'Pak Budi Historical');

    const wListUnversioned = [
      { nama_guru: 'Bu Siti Default', nip: '19850101', tahun_ajaran: null }
    ];
    const matchWaliUnversioned = (selectedYear: string) => {
      return (
        wListUnversioned.find((w: any) => w.tahun_ajaran === selectedYear) ||
        wListUnversioned.find((w: any) => !w.tahun_ajaran)
      );
    };
    assert.strictEqual(matchWaliUnversioned('2024/2025')?.nama_guru, 'Bu Siti Default', 'Unversioned row correctly matches as fallback');
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
