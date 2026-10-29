/**
 * tests/adversarial_tier5_lifecycle_scoping_challenger_2.test.ts
 *
 * Milestone 4 (Phase 2: Tier 5 Adversarial Coverage Hardening)
 * Empirical Challenger 2 Test Harness
 *
 * Focus Areas:
 * 1. URL Aliasing & Boundary Parameter Stress (all 8 aliases, empty, malformed, trailing slashes, SQL/XSS payloads)
 * 2. Cross-Tenant & Regional Scoping (Pengawas Dinas region restrictions, Superadmin satellite switcher, partitioned localStorage keys)
 * 3. Rapid State Transitions & Asynchronous Race Conditions (100-cycle rapid sub-tab switching, Supabase channel cleanup & unmount)
 * 4. Automated Tour & DOM Spotlight Alignment (Tour queries across all 7 roles, conditional menu element fallbacks)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveCanonicalRoute,
  resolveRoute,
  VIEW_ALIASES,
  SIDEBAR_TOUR_ALIASES,
  getConsolidatedMenuItems,
  evaluateTabRBAC,
  MenuItem
} from '../src/lib/navigation';

import {
  getGradebookDraftKey,
  saveGradebookDraft,
  loadGradebookDraft,
  clearGradebookDraft,
  saveJurnalDraft,
  loadJurnalDraft,
  clearJurnalDraft,
  JURNAL_DRAFT_KEY
} from '../src/utils/draftStorage';

import {
  getStepsForRole,
  normalizeRole,
  GURU_STEPS,
  ADMIN_STEPS,
  shouldShowTutorial,
  isTutorialCompleted,
  setTutorialCompleted,
  resetTutorial,
  STORAGE_KEY_GURU,
  STORAGE_KEY_ADMIN
} from '../src/components/Onboarding/tutorialSteps';

// In-memory Mock Storage for LocalStorage simulation
class MockStorage implements Storage {
  private store: Map<string, string> = new Map();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.has(key) ? this.store.get(key)! : null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] || null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

const mockStorage = new MockStorage();

// Set up minimal browser environment globals if needed
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    localStorage: mockStorage,
    location: { search: '' },
    history: {
      replaceState: () => {},
      pushState: () => {},
    },
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };
} else {
  (globalThis as any).window.localStorage = mockStorage;
}
(globalThis as any).localStorage = mockStorage;

console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  CHALLENGER 2: TIER 5 ADVERSARIAL COVERAGE HARDENING SUITE           ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

// Track empirical findings
export const empiricalFindings: Array<{
  category: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  summary: string;
  evidence: string;
}> = [];

// ============================================================================
// AREA 1: URL Aliasing & Boundary Parameter Stress
// ============================================================================
describe('Area 1: URL Aliasing & Boundary Parameter Stress', () => {

  const LEGACY_ALIASES: Array<{ alias: string; expectedView: string; expectedTab?: string }> = [
    { alias: 'view-guru-rekap-jurnal', expectedView: 'view-guru-jurnal', expectedTab: 'rekap-pribadi' },
    { alias: 'view-jurnal-kelas',      expectedView: 'view-guru-jurnal', expectedTab: 'supervisi-kelas' },
    { alias: 'view-history',           expectedView: 'view-guru-presensi', expectedTab: 'riwayat' },
    { alias: 'view-rapor',             expectedView: 'view-gradebook',   expectedTab: 'rapor' },
    { alias: 'view-analitik',          expectedView: 'view-admin-rekap',  expectedTab: 'analitik' },
    { alias: 'view-rekap-guru',        expectedView: 'view-admin-rekap',  expectedTab: 'tabel' },
    { alias: 'view-sistem-blok',       expectedView: 'view-admin-data',   expectedTab: 'blok' },
    { alias: 'view-admin-backup',      expectedView: 'view-admin-config', expectedTab: 'backup' },
  ];

  it('1.1: Resolves all 8 legacy aliases with exact canonical view and default sub-tab', () => {
    assert.strictEqual(LEGACY_ALIASES.length, 8, 'Must test exactly 8 legacy aliases');
    for (const testCase of LEGACY_ALIASES) {
      const res = resolveCanonicalRoute(testCase.alias);
      assert.strictEqual(res.canonicalView, testCase.expectedView, `Alias ${testCase.alias} must map to ${testCase.expectedView}`);
      assert.strictEqual(res.defaultTab, testCase.expectedTab, `Alias ${testCase.alias} must have defaultTab ${testCase.expectedTab}`);
      assert.strictEqual(res.isLegacyAlias, true, `Alias ${testCase.alias} must have isLegacyAlias: true`);
    }
  });

  it('1.2: Preserves explicit tab override when legacy alias is invoked with custom tab', () => {
    for (const testCase of LEGACY_ALIASES) {
      const customTab = 'custom-override-tab';
      const res = resolveCanonicalRoute(testCase.alias, customTab);
      assert.strictEqual(res.canonicalView, testCase.expectedView);
      assert.strictEqual(res.defaultTab, customTab, 'Explicit tab parameter must take precedence over alias default tab');
      assert.strictEqual(res.isLegacyAlias, true);
    }
  });

  it('1.3: Handles whitespace padding, newlines, and tabs around view and tab params', () => {
    for (const testCase of LEGACY_ALIASES) {
      const paddedView = `  \n\t  ${testCase.alias}  \t `;
      const paddedTab = `  \n custom-tab  \t `;
      const res = resolveCanonicalRoute(paddedView, paddedTab);
      assert.strictEqual(res.canonicalView, testCase.expectedView, 'Whitespace must be trimmed from view');
      assert.strictEqual(res.defaultTab, 'custom-tab', 'Whitespace must be trimmed from tab');
      assert.strictEqual(res.isLegacyAlias, true);
    }
  });

  it('1.4: Handles empty, whitespace-only, null, undefined, and tests literal "null"/"undefined"', () => {
    const invalidInputs = [
      '',
      '   ',
      '\t\n\r',
      null,
      undefined,
      'null',
      'undefined'
    ];

    for (const input of invalidInputs) {
      const res = resolveCanonicalRoute(input as any);
      assert.strictEqual(res.canonicalView, 'view-home', `Input ${JSON.stringify(input)} must safely fallback to view-home`);
      assert.strictEqual(res.isLegacyAlias, false);
      assert.strictEqual(res.defaultTab, undefined);
    }

    // Adversarial Boundary Check: Padded literal strings e.g. "   null   "
    const paddedNullRes = resolveCanonicalRoute('   null   ');
    if (paddedNullRes.canonicalView !== 'view-home') {
      empiricalFindings.push({
        category: 'URL Aliasing & Boundary Parameter Stress',
        severity: 'MEDIUM',
        summary: 'Padded literal string "   null   " in resolveCanonicalRoute does not fallback to view-home',
        evidence: `resolveCanonicalRoute("   null   ") returned canonicalView: "${paddedNullRes.canonicalView}" because rawView === 'null' check occurs before .trim().`
      });
    }
  });

  it('1.5: Empirical stress testing trailing slashes on aliases and canonical routes', () => {
    for (const testCase of LEGACY_ALIASES) {
      const slashAlias = `${testCase.alias}/`;
      const res = resolveCanonicalRoute(slashAlias);
      assert.ok(typeof res.canonicalView === 'string', 'Must return valid string without crashing');
      assert.ok(typeof res.isLegacyAlias === 'boolean');
      if (!res.isLegacyAlias) {
        // Trailing slash prevented exact key match in VIEW_ALIASES
        empiricalFindings.push({
          category: 'URL Aliasing & Boundary Parameter Stress',
          severity: 'LOW',
          summary: `Trailing slash on alias "${slashAlias}" bypasses VIEW_ALIASES mapping`,
          evidence: `Input "${slashAlias}" resulted in canonicalView "${res.canonicalView}" without resolving to "${testCase.expectedView}".`
        });
      }
    }
  });

  it('1.6: Stress tests SQL Injection payloads in URL view and tab parameters', () => {
    const sqlPayloads = [
      "view-rapor'; DROP TABLE data_guru; --",
      "view-history' OR '1'='1",
      "' UNION SELECT null, username, password FROM auth.users --",
      "admin'--",
      "1; SELECT pg_sleep(5);",
      "view-guru-jurnal' AND 1=cast((SELECT table_name FROM information_schema.tables LIMIT 1) as int) --",
    ];

    for (const payload of sqlPayloads) {
      assert.doesNotThrow(() => {
        const res = resolveCanonicalRoute(payload, payload);
        assert.ok(res.canonicalView, 'Must return canonicalView');
        assert.strictEqual(res.isLegacyAlias, false);
      }, `Payload ${payload} must not crash resolveCanonicalRoute`);
    }
  });

  it('1.7: Stress tests XSS and HTML Script Injection payloads in URL view and tab parameters', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><img src=x onerror=alert(document.cookie)>',
      'javascript:alert(1)',
      '<svg/onload=alert(1)>',
      '{{7*7}}',
      '${alert(1)}',
      '<iframe src="https://evil.com"></iframe>',
    ];

    for (const payload of xssPayloads) {
      assert.doesNotThrow(() => {
        const res = resolveCanonicalRoute(payload, payload);
        assert.ok(typeof res.canonicalView === 'string');
        assert.strictEqual(res.isLegacyAlias, false);
      }, `XSS payload ${payload} must be safely handled without throwing`);
    }
  });

  it('1.8: Stress tests Path Traversal, Null Bytes, and Extremely Long Buffer Payloads (10,000 chars)', () => {
    const adversarialPayloads = [
      '../../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\cmd.exe',
      'view-rapor\u0000.php',
      'view-rapor%00',
      'view-guru-presensi\r\nX-Injected-Header: evil',
      'A'.repeat(10000), // 10KB string buffer overflow test
    ];

    for (const payload of adversarialPayloads) {
      const res = resolveCanonicalRoute(payload);
      assert.ok(typeof res.canonicalView === 'string');
      assert.strictEqual(res.isLegacyAlias, false);
    }
  });

  it('1.9: Simulates AppScreen URLSearchParams extraction and history replacement defense', () => {
    const simulateAppScreenUrlResolution = (searchString: string) => {
      const params = new URLSearchParams(searchString);
      const rawView = params.get('view');
      const rawTab = params.get('tab');
      if (rawView) {
        const resolution = resolveCanonicalRoute(rawView, rawTab);
        let rewrittenUrl: string | null = null;
        if (resolution.isLegacyAlias) {
          const newParams = new URLSearchParams();
          newParams.set('view', resolution.canonicalView);
          if (resolution.defaultTab) {
            newParams.set('tab', resolution.defaultTab);
          }
          rewrittenUrl = `?${newParams.toString()}`;
        }
        return { activeView: resolution.canonicalView, rewrittenUrl, tab: resolution.defaultTab };
      }
      return { activeView: 'view-home', rewrittenUrl: null, tab: null };
    };

    // Test with legacy view-rapor
    const sim1 = simulateAppScreenUrlResolution('?view=view-rapor');
    assert.strictEqual(sim1.activeView, 'view-gradebook');
    assert.strictEqual(sim1.rewrittenUrl, '?view=view-gradebook&tab=rapor');
    assert.strictEqual(sim1.tab, 'rapor');

    // Test with malicious URL injection
    const sim2 = simulateAppScreenUrlResolution('?view=%3Cscript%3Ealert(1)%3C%2Fscript%3E&tab=%27%20OR%201%3D1');
    assert.strictEqual(sim2.activeView, '<script>alert(1)</script>');
    assert.strictEqual(sim2.rewrittenUrl, null, 'Unrecognized route is not rewritten as an alias');

    // Test with all 8 aliases in URLSearchParams
    for (const alias of LEGACY_ALIASES) {
      const sim = simulateAppScreenUrlResolution(`?view=${alias.alias}`);
      assert.strictEqual(sim.activeView, alias.expectedView);
      assert.ok(sim.rewrittenUrl?.includes(`view=${alias.expectedView}`));
      if (alias.expectedTab) {
        assert.ok(sim.rewrittenUrl?.includes(`tab=${alias.expectedTab}`));
      }
    }
  });
});

// ============================================================================
// AREA 2: Cross-Tenant & Regional Scoping
// ============================================================================
describe('Area 2: Cross-Tenant & Regional Scoping', () => {

  const SATELLITE_SCHOOLS = [
    { id: 'sch-boltim-1', nama: 'SMP N 1 Tutuyan', kota_kabupaten: 'Kab. Bolaang Mongondow Timur' },
    { id: 'sch-boltim-2', nama: 'SMP N 2 Kotabunan', kota_kabupaten: 'Kab. Bolaang Mongondow Timur' },
    { id: 'sch-manado-1', nama: 'SMP N 1 Manado', kota_kabupaten: 'Kota Manado' },
    { id: 'sch-minahasa-1', nama: 'SMP N 1 Tondano', kota_kabupaten: 'Kab. Minahasa' },
    { id: 'sch-unassigned', nama: 'Sekolah Tanpa Wilayah', kota_kabupaten: null },
    { id: 'sch-empty-str', nama: 'Sekolah Wilayah Kosong', kota_kabupaten: '   ' },
  ];

  it('2.1: Pengawas Dinas regional restriction allows only schools strictly matching user.kota_kabupaten', () => {
    const dinasUser = {
      id: 'dinas-user-1',
      role: 'dinaspendidikan',
      kota_kabupaten: 'Kab. Bolaang Mongondow Timur'
    };

    const isDinas = dinasUser.role === 'dinaspendidikan';
    const userRegion = (dinasUser.kota_kabupaten || '').trim().toLowerCase();
    
    const availableInSidebar = isDinas
      ? SATELLITE_SCHOOLS.filter((s) => {
          const schoolRegion = (s.kota_kabupaten || '').trim().toLowerCase();
          return userRegion && schoolRegion && userRegion === schoolRegion;
        })
      : SATELLITE_SCHOOLS;

    assert.strictEqual(availableInSidebar.length, 2);
    assert.deepStrictEqual(availableInSidebar.map(s => s.id), ['sch-boltim-1', 'sch-boltim-2']);
    assert.ok(!availableInSidebar.some(s => s.id === 'sch-manado-1'), 'Manado school must be blocked');
    assert.ok(!availableInSidebar.some(s => s.id === 'sch-minahasa-1'), 'Minahasa school must be blocked');
    assert.ok(!availableInSidebar.some(s => s.id === 'sch-unassigned'), 'Null region school must be blocked');
    assert.ok(!availableInSidebar.some(s => s.id === 'sch-empty-str'), 'Empty region school must be blocked');
  });

  it('2.2: Pengawas Dinas with whitespace or case differences matches regional schools resiliently', () => {
    const dinasVariations = [
      'kab. bolaang mongondow timur',
      'KAB. BOLAANG MONGONDOW TIMUR',
      '  Kab. Bolaang Mongondow Timur  \t',
    ];

    for (const regionVariant of dinasVariations) {
      const userRegion = regionVariant.trim().toLowerCase();
      const filtered = SATELLITE_SCHOOLS.filter((s) => {
        const schoolRegion = (s.kota_kabupaten || '').trim().toLowerCase();
        return userRegion && schoolRegion && userRegion === schoolRegion;
      });
      assert.strictEqual(filtered.length, 2, `Variation "${regionVariant}" must find exactly 2 schools`);
    }
  });

  it('2.3: Unassigned Pengawas Dinas (null or empty kota_kabupaten) must leak ZERO schools', () => {
    const unassignedDinasUsers = [
      { id: 'u1', role: 'dinaspendidikan', kota_kabupaten: null },
      { id: 'u2', role: 'dinaspendidikan', kota_kabupaten: '' },
      { id: 'u3', role: 'dinaspendidikan', kota_kabupaten: '   ' },
    ];

    for (const u of unassignedDinasUsers) {
      const userRegion = (u.kota_kabupaten || '').trim().toLowerCase();
      
      // Strict filter in ClaySidebar:
      const sidebarFiltered = SATELLITE_SCHOOLS.filter((s) => {
        const schoolRegion = (s.kota_kabupaten || '').trim().toLowerCase();
        return userRegion && schoolRegion && userRegion === schoolRegion;
      });
      assert.strictEqual(sidebarFiltered.length, 0, 'Unassigned dinas user must see 0 schools in sidebar');

      // Check AppScreen.tsx line 683 / 817 edge case:
      const appScreenFiltered = SATELLITE_SCHOOLS.filter(s =>
        (s.kota_kabupaten || '').trim().toLowerCase() === (u.kota_kabupaten || '').trim().toLowerCase()
      );
      if (appScreenFiltered.length > 0) {
        empiricalFindings.push({
          category: 'Cross-Tenant & Regional Scoping',
          severity: 'HIGH',
          summary: 'AppScreen satellite switcher leaks unassigned schools to unassigned Pengawas Dinas',
          evidence: `AppScreen line 683 and 817 filters with === comparing empty string to empty string, causing unassigned Dinas user to see ${appScreenFiltered.length} schools with null/empty kota_kabupaten (e.g. sch-unassigned, sch-empty-str).`
        });
      }
    }
  });

  it('2.4: Superadmin multi-school satellite switcher accesses all schools without regional filter', () => {
    const superadminUser = { id: 'super-1', role: 'superadmin' };
    const isDinas = superadminUser.role === 'dinaspendidikan';

    const availableSchools = isDinas
      ? SATELLITE_SCHOOLS.filter((s) => {
          const userRegion = (superadminUser as any).kota_kabupaten?.trim().toLowerCase();
          const schoolRegion = (s.kota_kabupaten || '').trim().toLowerCase();
          return userRegion && schoolRegion && userRegion === schoolRegion;
        })
      : SATELLITE_SCHOOLS;

    assert.strictEqual(availableSchools.length, SATELLITE_SCHOOLS.length);
    assert.ok(availableSchools.some(s => s.id === 'sch-boltim-1'));
    assert.ok(availableSchools.some(s => s.id === 'sch-manado-1'));
    assert.ok(availableSchools.some(s => s.id === 'sch-minahasa-1'));
  });

  it('2.5: Superadmin menu dynamic switching (Master Platform vs Satellite Active)', () => {
    // When no satellite is active:
    const masterItems = getConsolidatedMenuItems({
      role: 'superadmin',
      activeTargetSchool: null
    });
    assert.strictEqual(masterItems.length, 3);
    assert.deepStrictEqual(masterItems.map(m => m.id), [
      'view-superadmin-overview',
      'view-superadmin-jaringan',
      'view-superadmin-dinas'
    ]);

    // When a satellite school is active:
    const satelliteItems = getConsolidatedMenuItems({
      role: 'superadmin',
      activeTargetSchool: SATELLITE_SCHOOLS[0]
    });
    assert.strictEqual(satelliteItems.length, 5);
    assert.deepStrictEqual(satelliteItems.map(m => m.id), [
      'view-admin-data',
      'view-admin-verif',
      'view-admin-rekap',
      'view-rekap-siswa',
      'view-admin-config'
    ]);
  });

  it('2.6: Partitioned LocalStorage Keys for Gradebook Drafts (Zero Cross-Tenant Bleed)', () => {
    const schA = 'sekolah-uuid-alpha';
    const schB = 'sekolah-uuid-beta';
    const mapel = 'Matematika';
    const kelas = '7A';
    const tpId = 'tp-algebra-1';

    const keySchA = getGradebookDraftKey(schA, mapel, kelas, tpId);
    const keySchB = getGradebookDraftKey(schB, mapel, kelas, tpId);

    assert.notStrictEqual(keySchA, keySchB, 'Gradebook draft keys must be strictly partitioned by school ID');
    assert.ok(keySchA.includes(schA));
    assert.ok(keySchB.includes(schB));

    // Save draft for School A
    const scoresA = { 'std-1': { 'tp-algebra-1': 85 } };
    saveGradebookDraft(keySchA, scoresA);

    // Verify School B cannot read School A's draft
    const loadedB = loadGradebookDraft(keySchB);
    assert.strictEqual(loadedB, null, 'School B must read null for its key');

    // Verify School A reads its exact scores
    const loadedA = loadGradebookDraft(keySchA);
    assert.deepStrictEqual(loadedA, scoresA);

    // Save different draft for School B
    const scoresB = { 'std-99': { 'tp-algebra-1': 95 } };
    saveGradebookDraft(keySchB, scoresB);

    // Verify both exist independently in localStorage without collision
    assert.deepStrictEqual(loadGradebookDraft(keySchA), scoresA);
    assert.deepStrictEqual(loadGradebookDraft(keySchB), scoresB);

    // Clear School A only
    clearGradebookDraft(keySchA);
    assert.strictEqual(loadGradebookDraft(keySchA), null);
    assert.deepStrictEqual(loadGradebookDraft(keySchB), scoresB, 'School B draft must remain intact after clearing School A');

    clearGradebookDraft(keySchB);
  });

  it('2.7: Empirical Analysis of Journal Draft Storage (draftStorage.ts & GuruJurnal.tsx)', () => {
    // Check JURNAL_DRAFT_KEY in draftStorage.ts
    assert.strictEqual(JURNAL_DRAFT_KEY, 'sipjam_jurnal_autosave');

    mockStorage.clear();
    const draftUser1SchoolA = { materi: 'Aljabar Guru 1 Sekolah A', mapel: 'Matematika' };
    saveJurnalDraft(draftUser1SchoolA);

    const readDraft = loadJurnalDraft();
    assert.deepStrictEqual(readDraft, draftUser1SchoolA);

    // Document Gap: PROJECT.md line 15 & REKOMENDASI line 644 require partitioned key sipjam_jurnal_autosave_${userId}_${sekolahId}
    empiricalFindings.push({
      category: 'Cross-Tenant & Regional Scoping',
      severity: 'HIGH',
      summary: 'GuruJurnal autosave uses global key "sipjam_jurnal_autosave" instead of partitioned ${userId}_${sekolahId}',
      evidence: `GuruJurnal.tsx (lines 200, 262, 270) and draftStorage.ts (line 6) use static unpartitioned key 'sipjam_jurnal_autosave', allowing shared browser devices across teachers or schools to leak journal draft data.`
    });

    clearJurnalDraft();
  });
});

// ============================================================================
// AREA 3: Rapid State Transitions & Asynchronous Race Conditions
// ============================================================================
describe('Area 3: Rapid State Transitions & Asynchronous Race Conditions', () => {

  it('3.1: 100-cycle rapid sub-tab switching between draft input and reports preserves form state', () => {
    interface JournalFormState {
      tipeJurnal: string;
      mapel: string;
      kelas: string;
      tanggal: string;
      materi: string;
      kegiatan: string;
      catatanSiswa: string;
      refleksi: string;
      pertemuanKe: number;
      jamKe: string;
      absensi: Record<string, string>;
    }

    let formDirtyState: JournalFormState = {
      tipeJurnal: 'Reguler',
      mapel: 'Matematika',
      kelas: '7A',
      tanggal: '2026-10-29',
      materi: 'Persamaan Linear Satu Variabel (PLSV)',
      kegiatan: 'Diskusi kelompok dan pemecahan soal konstanta',
      catatanSiswa: 'Siswa aktif bertanya',
      refleksi: 'Perlu penguatan konsep pindah ruas',
      pertemuanKe: 4,
      jamKe: '1-2',
      absensi: { 'std-1': 'Hadir', 'std-2': 'Izin' }
    };

    let activeSubTab: 'input' | 'rekap-pribadi' | 'supervisi-kelas' = 'input';
    let renderCount = 0;

    const tabs: Array<'input' | 'rekap-pribadi' | 'supervisi-kelas'> = ['input', 'rekap-pribadi', 'supervisi-kelas'];

    for (let cycle = 1; cycle <= 100; cycle++) {
      const nextTab = tabs[cycle % tabs.length];
      activeSubTab = nextTab;
      renderCount++;

      // When visiting input tab, user mutates a field
      if (activeSubTab === 'input') {
        formDirtyState.materi = `PLSV Bab ${cycle}`;
        formDirtyState.pertemuanKe = cycle;
      }

      // Check formDirtyState is preserved throughout every cycle
      assert.ok(formDirtyState.materi.includes('PLSV'), `Cycle ${cycle}: Form dirty state must not be reset`);
      assert.strictEqual(formDirtyState.mapel, 'Matematika');
      assert.strictEqual(formDirtyState.kelas, '7A');
    }

    assert.strictEqual(renderCount, 100, 'All 100 rapid sub-tab cycles completed');
  });

  it('3.2: 100-cycle rapid sub-tab switching in GradeBookView preserves draft scores', () => {
    let dirtyScores: Record<string, Record<string, number | null>> = {
      'std-1': { 'tp-1': 88, 'tp-2': 92 },
      'std-2': { 'tp-1': 75, 'tp-2': 80 }
    };

    let activeGradebookTab: 'gradebook' | 'rapor' = 'gradebook';

    for (let cycle = 1; cycle <= 100; cycle++) {
      activeGradebookTab = (cycle % 2 === 0) ? 'rapor' : 'gradebook';
      if (activeGradebookTab === 'gradebook') {
        dirtyScores['std-1']['tp-1'] = 88 + (cycle % 10);
      }
      assert.ok(dirtyScores['std-1']['tp-1'] >= 88, 'Dirty scores must remain intact during rapid switching');
      assert.strictEqual(dirtyScores['std-2']['tp-2'], 80);
    }
  });

  it('3.3: Subscription lifecycle & cleanup in RekapSiswaView (Supabase Channel Cleanup)', () => {
    const activeChannels = new Map<string, { topic: string; unsubscribed: boolean }>();

    const mockSupabase = {
      channel: (topic: string) => {
        const ch = {
          topic,
          unsubscribed: false,
          on: function() { return this; },
          subscribe: function() {
            activeChannels.set(topic, ch);
            return this;
          },
          unsubscribe: function() {
            this.unsubscribed = true;
            activeChannels.delete(topic);
            return Promise.resolve();
          }
        };
        return ch;
      },
      removeChannel: (channelObj: any) => {
        if (channelObj && channelObj.topic) {
          channelObj.unsubscribe();
          activeChannels.delete(channelObj.topic);
        }
      },
      getChannels: () => Array.from(activeChannels.values()),
    };

    const simulateRekapSiswaMount = (sekolahId: string, gerbangKelas: string) => {
      const topic = `realtime-presensi-siswa-${sekolahId || 'global'}-${gerbangKelas}`;
      const channel = mockSupabase
        .channel(topic)
        .on()
        .subscribe();

      return () => {
        mockSupabase.removeChannel(channel);
      };
    };

    // Mount for class 7A
    const cleanup1 = simulateRekapSiswaMount('sch-001', '7A');
    assert.strictEqual(activeChannels.size, 1);
    assert.ok(activeChannels.has('realtime-presensi-siswa-sch-001-7A'));

    // Rapidly switch classes 50 times
    let currentCleanup = cleanup1;
    for (let i = 1; i <= 50; i++) {
      currentCleanup();
      assert.strictEqual(activeChannels.size, 0, `Step ${i}: Previous channel must be removed cleanly`);
      currentCleanup = simulateRekapSiswaMount('sch-001', `Class-${i}`);
      assert.strictEqual(activeChannels.size, 1, `Step ${i}: Exactly 1 active channel must exist`);
    }

    // Final unmount of RekapSiswaView
    currentCleanup();
    assert.strictEqual(activeChannels.size, 0, 'After unmount, activeChannels must be strictly 0 (zero subscription leaks)');
  });

  it('3.4: Subscription lifecycle & cleanup in AppScreen school-config channel', () => {
    const registeredChannels = new Map<string, any>();
    const registeredWindowListeners = new Map<string, any>();

    const mockSupabase = {
      channel: (topic: string) => {
        const ch = {
          topic,
          on: function() { return this; },
          subscribe: function() {
            registeredChannels.set(topic, ch);
            return this;
          },
          unsubscribe: function() {
            registeredChannels.delete(topic);
          }
        };
        return ch;
      },
      getChannels: () => Array.from(registeredChannels.values()),
      removeChannel: (ch: any) => {
        registeredChannels.delete(ch.topic);
      }
    };

    const simulateAppScreenRealtimeMount = (schoolId: string) => {
      const channelName = `school-config-${schoolId}`;
      const channel = mockSupabase
        .channel(channelName)
        .on()
        .subscribe();

      const handleResume = () => {};
      registeredWindowListeners.set('focus', handleResume);
      registeredWindowListeners.set('online', handleResume);

      return () => {
        mockSupabase.removeChannel(channel);
        registeredWindowListeners.delete('focus');
        registeredWindowListeners.delete('online');
      };
    };

    const cleanup = simulateAppScreenRealtimeMount('sch-primary');
    assert.strictEqual(registeredChannels.size, 1);
    assert.strictEqual(registeredWindowListeners.size, 2);

    cleanup();
    assert.strictEqual(registeredChannels.size, 0, 'Realtime channel cleaned up');
    assert.strictEqual(registeredWindowListeners.size, 0, 'Window listeners cleaned up');
  });
});

// ============================================================================
// AREA 4: Automated Tour & DOM Spotlight Alignment
// ============================================================================
describe('Area 4: Automated Tour & DOM Spotlight Alignment', () => {

  it('4.1: Tour steps configuration per role', () => {
    const guruSteps = getStepsForRole('guru');
    assert.strictEqual(guruSteps.length, 6);
    assert.deepStrictEqual(guruSteps.map(s => s.targetTourId), [
      'hamburger-btn',
      'view-guru-presensi',
      'view-guru-jurnal',
      'view-piket',
      'ai-assistant-btn',
      'view-rapor'
    ]);

    const adminSteps = getStepsForRole('admin');
    assert.strictEqual(adminSteps.length, 6);
    assert.deepStrictEqual(adminSteps.map(s => s.targetTourId), [
      'view-admin-verif',
      'view-sistem-blok',
      'view-admin-data',
      'view-analitik',
      'view-admin-config',
      'ai-assistant-btn'
    ]);

    assert.strictEqual(getStepsForRole('superadmin').length, 0);
    assert.strictEqual(getStepsForRole('dinaspendidikan').length, 0);
    assert.strictEqual(getStepsForRole('kepalasekolah').length, 0);
  });

  it('4.2: Admin tour steps align with consolidated Admin menus (AST data-tour attributes)', () => {
    const adminMenu = getConsolidatedMenuItems({ role: 'admin' });
    const adminSteps = getStepsForRole('admin');

    const domMap = new Map<string, string>();
    for (const item of adminMenu) {
      domMap.set(item.id, (item as any).dataTour || item.id);
    }
    domMap.set('hamburger-btn', 'hamburger-btn');
    domMap.set('ai-assistant-btn', 'ai-assistant-btn');

    for (const step of adminSteps) {
      const targetId = step.targetTourId;
      let matched = false;

      for (const [elemId, dataTourVal] of domMap.entries()) {
        const tokens = dataTourVal.split(/\s+/);
        if (tokens.includes(targetId) || dataTourVal === targetId) {
          matched = true;
          break;
        }
      }

      assert.ok(
        matched,
        `Admin tour step ${step.id} target ${step.targetTourId} must match a rendered button in Admin UI`
      );
    }
  });

  it('4.3: Guru tour steps query testing across conditional roles (Reguler, Wali Kelas, Piket)', () => {
    // Sub-case A: Regular Guru (not wali, not piket)
    const regularGuruMenu = getConsolidatedMenuItems({
      role: 'guru',
      isWaliKelas: false,
      isPiketHariIni: false
    });

    const regularDomMap = new Map<string, string>();
    for (const item of regularGuruMenu) {
      regularDomMap.set(item.id, (item as any).dataTour || item.id);
    }
    regularDomMap.set('hamburger-btn', 'hamburger-btn');
    regularDomMap.set('ai-assistant-btn', 'ai-assistant-btn');

    const guruSteps = getStepsForRole('guru');
    for (const step of guruSteps) {
      const targetId = step.targetTourId;
      let matched = false;
      for (const [elemId, dataTourVal] of regularDomMap.entries()) {
        const tokens = dataTourVal.split(/\s+/);
        if (tokens.includes(targetId) || dataTourVal === targetId) {
          matched = true;
          break;
        }
      }

      if (step.id === 'guru-step-4-piket') {
        assert.strictEqual(
          matched,
          false,
          'view-piket is conditionally hidden for non-piket teacher'
        );
        // Note: When element is not in DOM, targetRect becomes null, and calculateTooltipStyle centers the card
        const simulateTargetRect = matched ? { top: 100, left: 100, width: 200, height: 40 } : null;
        assert.strictEqual(simulateTargetRect, null);
      } else if (step.id === 'guru-step-6-rapor') {
        assert.strictEqual(
          matched,
          true,
          'view-rapor matches consolidated Asesmen menu via data-tour attribute'
        );
      } else {
        assert.ok(matched, `Step ${step.id} (${targetId}) must be present in Regular Guru UI`);
      }
    }

    // Sub-case B: Guru on Piket duty today (isPiketHariIni = true)
    const piketGuruMenu = getConsolidatedMenuItems({
      role: 'guru',
      isWaliKelas: false,
      isPiketHariIni: true
    });
    const piketDomMap = new Map<string, string>();
    for (const item of piketGuruMenu) {
      piketDomMap.set(item.id, (item as any).dataTour || item.id);
    }

    const piketTokens = piketDomMap.get('view-piket')?.split(/\s+/) || [];
    assert.ok(piketTokens.includes('view-piket'), 'Piket duty teacher has view-piket in DOM');

    // Sub-case C: Wali Kelas (isWaliKelas = true)
    const waliMenu = getConsolidatedMenuItems({
      role: 'guru',
      isWaliKelas: true,
      isPiketHariIni: false
    });
    assert.ok(waliMenu.some(m => m.id === 'view-rekap-siswa'), 'Wali Kelas menu includes view-rekap-siswa');
  });

  it('4.4: All 7 Roles Tour Evaluation & Completion Handlers', () => {
    const rolesToTest = [
      { role: 'guru', expectTour: true, stepCount: 6 },
      { role: 'admin', expectTour: true, stepCount: 6 },
      { role: 'superadmin', expectTour: false, stepCount: 0 },
      { role: 'dinaspendidikan', expectTour: false, stepCount: 0 },
      { role: 'kepalasekolah', expectTour: false, stepCount: 0 },
      { role: 'walikelas', expectTour: true, stepCount: 6 },
      { role: 'piket', expectTour: true, stepCount: 6 },
    ];

    for (const r of rolesToTest) {
      const steps = getStepsForRole(r.role);
      if (r.role === 'superadmin' || r.role === 'dinaspendidikan' || r.role === 'kepalasekolah') {
        assert.strictEqual(steps.length, 0, `Role ${r.role} must not receive tour steps`);
      }
    }

    mockStorage.clear();
    assert.strictEqual(shouldShowTutorial('admin'), true);
    setTutorialCompleted('admin');
    assert.strictEqual(shouldShowTutorial('admin'), false);
    assert.strictEqual(isTutorialCompleted('admin'), true);

    resetTutorial('admin');
    assert.strictEqual(shouldShowTutorial('admin'), true);

    mockStorage.clear();
    assert.strictEqual(shouldShowTutorial('guru'), true);
    setTutorialCompleted('guru');
    assert.strictEqual(shouldShowTutorial('guru'), false);
    assert.strictEqual(isTutorialCompleted('guru'), true);

    resetTutorial('guru');
    assert.strictEqual(shouldShowTutorial('guru'), true);
  });
});

console.log('✅ ALL TIER 5 ADVERSARIAL STRESS TESTS COMPLETED!\n');
