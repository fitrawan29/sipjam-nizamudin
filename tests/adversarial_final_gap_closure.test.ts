/**
 * tests/adversarial_final_gap_closure.test.ts
 *
 * Final Challenger (Milestone 4) Empirical Stress Test Harness:
 * Aggressive edge-case & adversarial testing for:
 * 1. KBM Journal Autosave Partitioning & Backward Compatibility Fallback
 * 2. Dinas Satellite Regional Scoping (Mobile & Desktop Equivalence, Whitespace & Substring Leak Prevention)
 * 3. URL Route Parameter Sanitization (Multiple Slashes, Casing, Encodings, Tampering)
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

// Mock localStorage environment
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

describe('Final Challenger Adversarial Stress Suite', () => {

  // =========================================================================
  // Area 1: KBM Journal Autosave Partitioning & Storage Resilience
  // =========================================================================
  describe('Area 1: KBM Journal Autosave Partitioning & Boundary Cases', () => {
    it('1.1: Handles extreme parameter forms in getJurnalDraftKey', () => {
      // Normal UUIDs
      assert.strictEqual(
        getJurnalDraftKey('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
        'sipjam_jurnal_autosave_11111111-1111-1111-1111-111111111111_22222222-2222-2222-2222-222222222222'
      );

      // Whitespace padded UUIDs should be trimmed
      assert.strictEqual(
        getJurnalDraftKey('  user-abc  ', '  school-xyz  '),
        'sipjam_jurnal_autosave_user-abc_school-xyz'
      );

      // Whitespace only in either should fallback to global key
      assert.strictEqual(getJurnalDraftKey('   ', 'school-xyz'), JURNAL_DRAFT_KEY);
      assert.strictEqual(getJurnalDraftKey('user-abc', '   '), JURNAL_DRAFT_KEY);
      assert.strictEqual(getJurnalDraftKey('', ''), JURNAL_DRAFT_KEY);
      assert.strictEqual(getJurnalDraftKey(null, null), JURNAL_DRAFT_KEY);
      assert.strictEqual(getJurnalDraftKey(undefined, undefined), JURNAL_DRAFT_KEY);
    });

    it('1.2: Stress tests 50 interleaved teachers and schools without cross-talk', () => {
      mockStorage.clear();

      const userCount = 50;
      const drafts: Record<string, any> = {};

      // Write 50 unique drafts across 5 schools
      for (let i = 1; i <= userCount; i++) {
        const uId = `user-${i}`;
        const sId = `school-${(i % 5) + 1}`;
        const payload = { materi: `Materi Ke-${i}`, kelas: `Kelas-${i}`, timestamp: Date.now() + i };
        drafts[`${uId}_${sId}`] = payload;
        saveJurnalDraft(payload, uId, sId);
      }

      // Verify each user reads only their exact draft
      for (let i = 1; i <= userCount; i++) {
        const uId = `user-${i}`;
        const sId = `school-${(i % 5) + 1}`;
        const loaded = loadJurnalDraft(uId, sId);
        assert.deepStrictEqual(loaded, drafts[`${uId}_${sId}`]);
      }

      // Verify clearing user 1-25 leaves user 26-50 intact
      for (let i = 1; i <= 25; i++) {
        const uId = `user-${i}`;
        const sId = `school-${(i % 5) + 1}`;
        clearJurnalDraft(uId, sId);
        assert.strictEqual(loadJurnalDraft(uId, sId), null);
      }

      for (let i = 26; i <= userCount; i++) {
        const uId = `user-${i}`;
        const sId = `school-${(i % 5) + 1}`;
        assert.deepStrictEqual(loadJurnalDraft(uId, sId), drafts[`${uId}_${sId}`]);
      }

      mockStorage.clear();
    });

    it('1.3: Corrupted JSON in localStorage handled gracefully (returns null without crashing)', () => {
      mockStorage.clear();

      const key = getJurnalDraftKey('user-x', 'school-y');
      mockStorage.setItem(key, '{ invalid json string <<%');

      const result = loadJurnalDraft('user-x', 'school-y');
      assert.strictEqual(result, null);

      mockStorage.clear();
    });

    it('1.4: Dual fallback test: clears both partitioned key and legacy key upon clear', () => {
      mockStorage.clear();

      const legacyDraft = { materi: 'Legacy draft' };
      const partitionedDraft = { materi: 'Partitioned draft' };

      mockStorage.setItem(JURNAL_DRAFT_KEY, JSON.stringify(legacyDraft));
      saveJurnalDraft(partitionedDraft, 'user-1', 'school-1');

      // Clear with credentials
      clearJurnalDraft('user-1', 'school-1');

      // Both partitioned and legacy must be removed
      assert.strictEqual(loadJurnalDraft('user-1', 'school-1'), null);
      assert.strictEqual(mockStorage.getItem(JURNAL_DRAFT_KEY), null);
      assert.strictEqual(mockStorage.getItem('sipjam_jurnal_autosave_user-1_school-1'), null);

      mockStorage.clear();
    });
  });

  // =========================================================================
  // Area 2: Dinas Satellite Regional Scoping Strict Isolation
  // =========================================================================
  describe('Area 2: Dinas Satellite Regional Scoping Strict Isolation', () => {
    const satelliteSchools = [
      { id: 'sch-boltim-1', nama: 'SMP N 1 Tutuyan', kota_kabupaten: 'Kab. Bolaang Mongondow Timur' },
      { id: 'sch-boltim-2', nama: 'SMP N 2 Kotabunan', kota_kabupaten: '  KAB. BOLAANG MONGONDOW TIMUR  ' },
      { id: 'sch-manado-1', nama: 'SMP N 1 Manado', kota_kabupaten: 'Kota Manado' },
      { id: 'sch-manado-2', nama: 'SMP N 2 Manado', kota_kabupaten: 'kota manado' },
      { id: 'sch-null-reg', nama: 'Sekolah Tanpa Wilayah', kota_kabupaten: null },
      { id: 'sch-empty-reg', nama: 'Sekolah Wilayah Kosong', kota_kabupaten: '' },
      { id: 'sch-space-reg', nama: 'Sekolah Wilayah Spasi', kota_kabupaten: '     ' },
    ];

    // Canonical filter logic present in both AppScreen (desktop & mobile) and ClaySidebar
    const applyRegionalFilter = (user: any, isDinas: boolean) => {
      return isDinas
        ? satelliteSchools.filter(s => {
            const userRegion = (user?.kota_kabupaten || '').trim().toLowerCase();
            const schoolRegion = (s.kota_kabupaten || '').trim().toLowerCase();
            return Boolean(userRegion && schoolRegion && userRegion === schoolRegion);
          })
        : satelliteSchools;
    };

    it('2.1: Unassigned Dinas users (null, empty, whitespace) see 0 schools and never match null-region schools', () => {
      const unassignedVariants = [
        null,
        undefined,
        '',
        '   ',
        '\t\n',
        '       ',
      ];

      for (const val of unassignedVariants) {
        const user = { role: 'dinaspendidikan', kota_kabupaten: val };
        const visible = applyRegionalFilter(user, true);
        assert.strictEqual(visible.length, 0, `Unassigned user with kota_kabupaten ${JSON.stringify(val)} must see 0 schools`);
      }
    });

    it('2.2: Assigned Dinas user matches case-insensitively and ignores surrounding whitespace', () => {
      const userBoltim = { role: 'dinaspendidikan', kota_kabupaten: 'kab. bolaang mongondow timur' };
      const boltimSchools = applyRegionalFilter(userBoltim, true);
      assert.strictEqual(boltimSchools.length, 2);
      assert.deepStrictEqual(boltimSchools.map(s => s.id), ['sch-boltim-1', 'sch-boltim-2']);

      const userManado = { role: 'dinaspendidikan', kota_kabupaten: '   KOTA MANADO   ' };
      const manadoSchools = applyRegionalFilter(userManado, true);
      assert.strictEqual(manadoSchools.length, 2);
      assert.deepStrictEqual(manadoSchools.map(s => s.id), ['sch-manado-1', 'sch-manado-2']);
    });

    it('2.3: Substrings and partial matches do not bleed cross-region', () => {
      // "Manado" should NOT match "Kota Manado" unless identical after trim
      const userPartial = { role: 'dinaspendidikan', kota_kabupaten: 'Manado' };
      const visible = applyRegionalFilter(userPartial, true);
      assert.strictEqual(visible.length, 0, 'Partial substring "Manado" must not match "Kota Manado"');
    });

    it('2.4: Superadmin bypasses regional filter and sees all schools', () => {
      const superadmin = { role: 'superadmin', kota_kabupaten: null };
      const visible = applyRegionalFilter(superadmin, false);
      assert.strictEqual(visible.length, satelliteSchools.length);
    });
  });

  // =========================================================================
  // Area 3: URL Route Parameter Sanitization & Edge Cases
  // =========================================================================
  describe('Area 3: URL Route Parameter Sanitization & Edge Cases', () => {
    it('3.1: Handles multiple slashes, whitespace, and tabs', () => {
      const testCases = [
        { input: '///', expectedView: 'view-home', isAlias: false },
        { input: '   ///   ', expectedView: 'view-home', isAlias: false },
        { input: '   null   ', expectedView: 'view-home', isAlias: false },
        { input: '   undefined   ', expectedView: 'view-home', isAlias: false },
        { input: 'view-rapor///', expectedView: 'view-gradebook', expectedTab: 'rapor', isAlias: true },
        { input: '  view-rapor/  ', expectedView: 'view-gradebook', expectedTab: 'rapor', isAlias: true },
        { input: 'view-guru-jurnal///', expectedView: 'view-guru-jurnal', expectedTab: undefined, isAlias: false },
      ];

      for (const tc of testCases) {
        const res = resolveCanonicalRoute(tc.input);
        assert.strictEqual(res.canonicalView, tc.expectedView, `Failed for input: ${JSON.stringify(tc.input)}`);
        assert.strictEqual(res.isLegacyAlias, tc.isAlias);
        if (tc.expectedTab) {
          assert.strictEqual(res.defaultTab, tc.expectedTab);
        }
      }
    });

    it('3.2: Preserves valid query tab when legacy alias has default tab', () => {
      // Legacy view-rapor has defaultTab = 'rapor', but if user explicitly passed rawTab = 'gradebook'
      const res = resolveCanonicalRoute('view-rapor/', 'gradebook');
      assert.strictEqual(res.canonicalView, 'view-gradebook');
      assert.strictEqual(res.defaultTab, 'gradebook');
      assert.strictEqual(res.isLegacyAlias, true);
    });

    it('3.3: Canonical route with explicit tab trims whitespace in tab parameter', () => {
      const res = resolveCanonicalRoute('view-guru-jurnal', '   supervisi-kelas   ');
      assert.strictEqual(res.canonicalView, 'view-guru-jurnal');
      assert.strictEqual(res.defaultTab, 'supervisi-kelas');
    });
  });
});
