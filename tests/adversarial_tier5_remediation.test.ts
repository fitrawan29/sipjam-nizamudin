/**
 * tests/adversarial_tier5_remediation.test.ts
 *
 * Verification suite for Tier 5 Adversarial Hardening Remediation:
 * 1. KBM Journal Autosave Partitioning (getJurnalDraftKey, saveJurnalDraft, loadJurnalDraft, clearJurnalDraft)
 * 2. Pengawas Dinas Regional Scoping (zero leak for unassigned Dinas users in AppScreen)
 * 3. URL Route Parameter Sanitization (padded null/undefined, trailing slash removal)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getJurnalDraftKey,
  saveJurnalDraft,
  loadJurnalDraft,
  clearJurnalDraft,
  JURNAL_DRAFT_KEY
} from '../src/utils/draftStorage';

import {
  resolveCanonicalRoute
} from '../src/lib/navigation';

// Mock localStorage for test environment
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
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = { localStorage: mockStorage };
} else {
  (globalThis as any).window.localStorage = mockStorage;
}
(globalThis as any).localStorage = mockStorage;

describe('Tier 5 Adversarial Hardening Remediation', () => {

  // ============================================================================
  // Task 1: KBM Journal Autosave Partitioning
  // ============================================================================
  describe('Task 1: KBM Journal Autosave Partitioning', () => {
    it('1.1: getJurnalDraftKey produces partitioned key when userId & sekolahId are present', () => {
      const key = getJurnalDraftKey('guru-123', 'sch-456');
      assert.strictEqual(key, 'sipjam_jurnal_autosave_guru-123_sch-456');
    });

    it('1.2: getJurnalDraftKey falls back to global key when either parameter is missing or whitespace', () => {
      assert.strictEqual(getJurnalDraftKey(undefined, 'sch-456'), 'sipjam_jurnal_autosave');
      assert.strictEqual(getJurnalDraftKey('guru-123', undefined), 'sipjam_jurnal_autosave');
      assert.strictEqual(getJurnalDraftKey(null, 'sch-456'), 'sipjam_jurnal_autosave');
      assert.strictEqual(getJurnalDraftKey('guru-123', null), 'sipjam_jurnal_autosave');
      assert.strictEqual(getJurnalDraftKey('', 'sch-456'), 'sipjam_jurnal_autosave');
      assert.strictEqual(getJurnalDraftKey('guru-123', '   '), 'sipjam_jurnal_autosave');
      assert.strictEqual(getJurnalDraftKey(), 'sipjam_jurnal_autosave');
    });

    it('1.3: Partitioned autosave isolates drafts between teachers and schools (Zero Cross-Tenant Bleed)', () => {
      mockStorage.clear();

      const draftTeacherA = { materi: 'Fisika Kuantum', kelas: '12-IPA' };
      const draftTeacherB = { materi: 'Biologi Sel', kelas: '10-A' };

      // Save for Teacher A at School 1
      saveJurnalDraft(draftTeacherA, 'teacher-A', 'school-1');

      // Save for Teacher B at School 2
      saveJurnalDraft(draftTeacherB, 'teacher-B', 'school-2');

      // Verify Teacher A loads only Teacher A's draft
      const loadedA = loadJurnalDraft('teacher-A', 'school-1');
      assert.deepStrictEqual(loadedA, draftTeacherA);

      // Verify Teacher B loads only Teacher B's draft
      const loadedB = loadJurnalDraft('teacher-B', 'school-2');
      assert.deepStrictEqual(loadedB, draftTeacherB);

      // Verify Teacher C at School 1 has no draft
      const loadedC = loadJurnalDraft('teacher-C', 'school-1');
      assert.strictEqual(loadedC, null);

      // Clear Teacher A
      clearJurnalDraft('teacher-A', 'school-1');
      assert.strictEqual(loadJurnalDraft('teacher-A', 'school-1'), null);

      // Teacher B's draft remains untouched
      assert.deepStrictEqual(loadJurnalDraft('teacher-B', 'school-2'), draftTeacherB);

      mockStorage.clear();
    });

    it('1.4: Backward compatibility: loadJurnalDraft falls back to unpartitioned draft if partitioned is absent', () => {
      mockStorage.clear();

      // Legacy draft stored in global key
      const legacyDraft = { materi: 'Matematika Dasar Lama', kelas: '7-A' };
      mockStorage.setItem(JURNAL_DRAFT_KEY, JSON.stringify(legacyDraft));

      // User with credentials reads partitioned key, falls back to legacy
      const loaded = loadJurnalDraft('user-new', 'school-new');
      assert.deepStrictEqual(loaded, legacyDraft);

      // Once user saves a new partitioned draft, partitioned key takes precedence
      const newDraft = { materi: 'Matematika Aljabar Baru', kelas: '7-A' };
      saveJurnalDraft(newDraft, 'user-new', 'school-new');

      const loadedPrecedence = loadJurnalDraft('user-new', 'school-new');
      assert.deepStrictEqual(loadedPrecedence, newDraft);

      // Clearing clears both
      clearJurnalDraft('user-new', 'school-new');
      assert.strictEqual(loadJurnalDraft('user-new', 'school-new'), null);
      assert.strictEqual(mockStorage.getItem(JURNAL_DRAFT_KEY), null);

      mockStorage.clear();
    });
  });

  // ============================================================================
  // Task 2: Regional Scoping for Dinas in AppScreen
  // ============================================================================
  describe('Task 2: Regional Scoping for Dinas in AppScreen', () => {
    const satelliteSchools = [
      { id: 'sch-1', nama: 'SMP N 1 Tutuyan', kota_kabupaten: 'Kab. Bolaang Mongondow Timur' },
      { id: 'sch-2', nama: 'SMP N 2 Kotabunan', kota_kabupaten: 'Kab. Bolaang Mongondow Timur' },
      { id: 'sch-3', nama: 'SMP N 1 Manado', kota_kabupaten: 'Kota Manado' },
      { id: 'sch-unassigned', nama: 'Sekolah Wilayah Null', kota_kabupaten: null },
      { id: 'sch-empty', nama: 'Sekolah Wilayah Kosong', kota_kabupaten: '   ' },
    ];

    const filterSchoolsForDinas = (user: any, isDinas: boolean) => {
      return isDinas
        ? satelliteSchools.filter(s => {
            const userRegion = (user?.kota_kabupaten || '').trim().toLowerCase();
            const schoolRegion = (s.kota_kabupaten || '').trim().toLowerCase();
            return Boolean(userRegion && schoolRegion && userRegion === schoolRegion);
          })
        : satelliteSchools;
    };

    it('2.1: Unassigned Dinas user (null/empty/whitespace) sees ZERO schools', () => {
      const testCases = [
        { kota_kabupaten: null },
        { kota_kabupaten: undefined },
        { kota_kabupaten: '' },
        { kota_kabupaten: '     ' },
        { kota_kabupaten: '\t\n' },
      ];

      for (const tc of testCases) {
        const filtered = filterSchoolsForDinas({ role: 'dinaspendidikan', ...tc }, true);
        assert.strictEqual(filtered.length, 0, `Unassigned user with ${JSON.stringify(tc)} must see 0 schools`);
      }
    });

    it('2.2: Assigned Dinas user sees only schools matching assigned region', () => {
      const user = { role: 'dinaspendidikan', kota_kabupaten: '  kab. bolaang mongondow timur  ' };
      const filtered = filterSchoolsForDinas(user, true);
      assert.strictEqual(filtered.length, 2);
      assert.deepStrictEqual(filtered.map(s => s.id), ['sch-1', 'sch-2']);
    });

    it('2.3: Non-Dinas user (Superadmin) sees all schools without regional filter', () => {
      const user = { role: 'superadmin', kota_kabupaten: null };
      const filtered = filterSchoolsForDinas(user, false);
      assert.strictEqual(filtered.length, 5);
    });
  });

  // ============================================================================
  // Task 3: URL Route Parameter Sanitization
  // ============================================================================
  describe('Task 3: URL Route Parameter Sanitization', () => {
    it('3.1: Sanitizes padded literal "null" and "undefined" to view-home fallback', () => {
      const paddedNullCases = [
        '   null   ',
        '\t null \n',
        'null',
        '   undefined   ',
        '\t undefined \n',
        'undefined',
        '',
        '   ',
        null,
        undefined
      ];

      for (const input of paddedNullCases) {
        const res = resolveCanonicalRoute(input as any);
        assert.strictEqual(
          res.canonicalView,
          'view-home',
          `Input ${JSON.stringify(input)} must resolve to view-home`
        );
        assert.strictEqual(res.isLegacyAlias, false);
      }
    });

    it('3.2: Strips trailing slashes from legacy aliases and resolves canonical view and tab', () => {
      const slashCases = [
        { raw: 'view-rapor/', expectedView: 'view-gradebook', expectedTab: 'rapor' },
        { raw: 'view-rapor///', expectedView: 'view-gradebook', expectedTab: 'rapor' },
        { raw: '   view-rapor/   ', expectedView: 'view-gradebook', expectedTab: 'rapor' },
        { raw: 'view-guru-rekap-jurnal/', expectedView: 'view-guru-jurnal', expectedTab: 'rekap-pribadi' },
        { raw: 'view-jurnal-kelas/', expectedView: 'view-guru-jurnal', expectedTab: 'supervisi-kelas' },
        { raw: 'view-history/', expectedView: 'view-guru-presensi', expectedTab: 'riwayat' },
        { raw: 'view-analitik/', expectedView: 'view-admin-rekap', expectedTab: 'analitik' },
        { raw: 'view-sistem-blok/', expectedView: 'view-admin-data', expectedTab: 'blok' },
        { raw: 'view-admin-backup/', expectedView: 'view-admin-config', expectedTab: 'backup' },
      ];

      for (const tc of slashCases) {
        const res = resolveCanonicalRoute(tc.raw);
        assert.strictEqual(res.canonicalView, tc.expectedView, `Raw "${tc.raw}" must resolve to ${tc.expectedView}`);
        assert.strictEqual(res.defaultTab, tc.expectedTab, `Raw "${tc.raw}" must have defaultTab ${tc.expectedTab}`);
        assert.strictEqual(res.isLegacyAlias, true, `Raw "${tc.raw}" must be recognized as legacy alias`);
      }
    });

    it('3.3: Trailing slash on root "/" resolves cleanly to view-home', () => {
      const res = resolveCanonicalRoute('/');
      assert.strictEqual(res.canonicalView, 'view-home');
      assert.strictEqual(res.isLegacyAlias, false);

      const resMultiSlash = resolveCanonicalRoute('///');
      assert.strictEqual(resMultiSlash.canonicalView, 'view-home');
      assert.strictEqual(resMultiSlash.isLegacyAlias, false);
    });
  });
});
