# Technical Implementation Blueprint: Verifikasi Perangkat Kelas X & Pre-existing Compilation Fixes

**Agent**: `explorer_m1_nov_3`  
**Milestone**: M1 (Pusat Verifikasi Data, Presensi & Jurnal Validation, Verifikasi Perangkat Kelas X, Compilation Fixes)  
**Date**: 2026-11-06T22:55:00Z  

---

## 1. Observation

### 1.1 Pre-existing Compilation & Typecheck Errors (`npx tsc --noEmit`)
When running `npx tsc --noEmit`, the compiler halts with exit code 1 emitting two specific errors:
```
src/components/AdminVerifView.tsx(475,1): error TS1184: Modifiers cannot appear here.
src/components/HomeViewAdmin.tsx(529,11): error TS2322: Type '"blue" | "rose"' is not assignable to type '"green" | "amber" | "rose" | "gray"'.
  Type '"blue"' is not assignable to type '"green" | "amber" | "rose" | "gray"'.
```

#### Detailed Observation in `src/components/AdminVerifView.tsx`:
- At line 26, the component function is declared:
  ```ts
  export default function AdminVerifView({ 
    user, 
    isReadOnly: propReadOnly,
    initialTab 
  }: AdminVerifViewProps) {
  ```
- At lines 474–484, inside the body of `AdminVerifView`, the function `isRealSubmittedJournal` is declared with the `export` keyword:
  ```ts
  // Helper: Memastikan jurnal benar-benar diisi oleh guru dengan materi pembelajaran riil (bukan auto-record delinquency / auto-fill berhalangan)
  export function isRealSubmittedJournal(j: any): boolean {
    if (!j) return false;
    const sv = j.status_verifikasi;
    if (sv === 'Tidak Masuk Kelas' || sv === 'Tidak Melaksanakan Kegiatan' || sv === 'Sakit' || sv === 'Izin') return false;
    const ket = (j.keterangan || '').trim().toLowerCase();
    if (ket === 'tidak masuk kelas' || ket === 'tidak melaksanakan kegiatan apapun' || ket === 'auto-fill sistem karena guru berhalangan hadir') return false;
    const mat = (j.materi || j.materi_pembelajaran || '').trim().toLowerCase();
    if (mat === 'tidak masuk kelas' || mat === 'tidak melaksanakan kegiatan apapun' || mat.startsWith('guru tidak dapat mengisi jurnal karena')) return false;
    return true;
  }
  ```
- In TypeScript/JavaScript grammar, `export` cannot appear inside a function scope (`TS1184`).
- In `tests/admin_jurnal_real_data_verification.test.ts:59-62`, an automated test requires:
  ```ts
  assert(
    adminVerifContent.includes('export function isRealSubmittedJournal'),
    'AdminVerifView.tsx must export isRealSubmittedJournal'
  );
  ```

#### Detailed Observation in `src/components/HomeViewAdmin.tsx`:
- In `interface TeacherStatusRow` (lines 28–33):
  ```ts
  pengisianJurnal: {
    status: string;
    color: 'green' | 'amber' | 'rose' | 'gray';
    filled: number;
    total: number;
  };
  ```
  Note that `presensiDatang.color` (line 25), `laporanPiket.color` (line 36), and `presensiPulang.color` (line 41) all include `'blue'`.
- At line 494:
  ```ts
  let jurnalColor: 'green' | 'amber' | 'rose' | 'gray' = 'gray';
  ```
- At line 527–529:
  ```ts
  } else if (isIzinSakit) {
    jurnalStatus = presensiDatangStatus;
    jurnalColor = presensiDatangStatus === 'Sakit' ? 'rose' : 'blue';
  }
  ```
  When a teacher is excused on leave (`Izin`), `jurnalColor` is set to `'blue'`. However, `'blue'` is not part of `'green' | 'amber' | 'rose' | 'gray'`.
- At line 929, the table badge renderer explicitly handles `'blue'`:
  ```ts
  if (color === 'blue') return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800';
  ```

---

### 1.2 "Mata Pelajaran Umum" Fallback in `src/components/DokumenView.tsx`

#### Data Architecture Discrepancy:
1. **Teacher Names in `data_guru` vs `jadwal_pelajaran`**:
   - In `csv/SIPJAM NIZAMUDIN - Data_Guru (1).csv`:
     - Line 8: `nip: Fitrawan`, `nama_guru: Ade Fitrawan Ibrahim`, `mata_pelajaran: "X Merdeka_MTK, X Merdeka_Informatika, XI Merdeka_MTK, XII Merdeka_MTK"`
     - Line 6: `nip: Ambar`, `nama_guru: Setia Ambar Ningsih Mamonto`, `mata_pelajaran: "X Merdeka_Fisika, X Merdeka_Kimia, XI Merdeka_Kimia, XII Merdeka_Kimia"`
     - Line 7: `nip: Venda`, `nama_guru: Venda Lestari Kairupan`, `mata_pelajaran: "X Merdeka_Geografi, X Merdeka_Biologi, XI Merdeka_Biologi, XII Merdeka_Biologi"`
     - Line 11: `nip: Susana`, `nama_guru: Susana Muliono`, `mata_pelajaran: "X Merdeka_PP, XI Merdeka_PP, XII Merdeka_PP"`
   - In `csv/SIPJAM NIZAMUDIN - Jadwal_Pelajaran.csv`:
     - Line 2: `Senin, Ade, MTK, X Merdeka`
     - Line 17: `Sabtu, Ade, Informatika, X Merdeka`
     - Line 14: `Jumat, Ambar, Fisika, X Merdeka`
     - Line 16: `Sabtu, Ambar, Kimia, X Merdeka`
     - Line 10: `Rabu, Venda, Geografi, X Merdeka`
     - Line 11: `Kamis, Venda, Biologi, X Merdeka`
     - Line 12: `Kamis, Susan, PP, X Merdeka`
     - Line 13: `Kamis, Rizki, Sejarah, X Merdeka`
   - In `csv/SIPJAM NIZAMUDIN - Data_Mapel (1).csv`:
     - Contains all Class X subjects: `X Merdeka_MTK`, `X Merdeka_Informatika`, `X Merdeka_Fisika`, `X Merdeka_Kimia`, `X Merdeka_Biologi`, `X Merdeka_Geografi`, `X Merdeka_Sejarah`, `X Merdeka_Sosiologi`, `X Merdeka_Ekonomi`, `X Merdeka_PP`, `X Merdeka_PJOK`, `X Merdeka_B. Ing`, `X Merdeka_B. Indo`, `X Merdeka_SB`, `X Merdeka_PAI BP`.

2. **Flawed Subject Resolution in `DokumenView.tsx`**:
   - In `DokumenView.tsx:132-156` (`loadAllData()`):
     ```ts
     let guruMapels = ((gm as GuruMapel[]) || []).filter((g: any) => !isInvalidMapel(g.nama_mapel || g.mata_pelajaran));
     if (guruMapels.length === 0) {
       const { data: jadwalData } = await supabase.from('jadwal_pelajaran').select('*');
       ...
     }
     setGuruMapelList(guruMapels);
     ```
     `jadwal_pelajaran` is ONLY queried if `guru_mapel` is globally empty. In production, `guru_mapel` has rows, so `jadwal_pelajaran` is NEVER loaded! Furthermore, `data_mapel` is not queried at all.
   - In `DokumenView.tsx:714-716` (`teacherSubjectCards`):
     ```ts
     teachersList.forEach(teacher => {
       const tName = (teacher.nama_guru || '').trim().toLowerCase();
       // Teacher's assigned subjects
       const teacherGm = guruMapelList.filter(
         gm => (gm.nama_guru || '').trim().toLowerCase() === tName
       );
     ```
     Strict equality `gm.nama_guru === tName` evaluates `'ade' === 'ade fitrawan ibrahim'`, which returns `false`.
   - In `DokumenView.tsx:731-736`:
     ```ts
     if (subjects.length === 0) {
       subjects.push({
         nama_mapel: teacher.mata_pelajaran || 'Mata Pelajaran Umum',
         kelas: ''
       });
     }
     ```
     Because `teacherGm` was empty, `subjects.length === 0`. If `teacher.mata_pelajaran` was empty or generic, it pushed `'Mata Pelajaran Umum'`. Even if `teacher.mata_pelajaran` was populated, it pushed the unparsed string (e.g. `"X Merdeka_MTK, X Merdeka_Informatika, XI Merdeka_MTK, XII Merdeka_MTK"`) with `kelas: ''`.
   - In `DokumenView.tsx:556-562` (`myTeacherSubjects` for logged-in teacher):
     ```ts
     if (list.length === 0) {
       const g = teachersList.find(t => (t.nama_guru || '').trim().toLowerCase() === (user?.nama || '').trim().toLowerCase());
       const rawFallback = g?.mata_pelajaran || user?.mata_pelajaran || 'Mata Pelajaran Umum';
       const fallbackMapel = isInvalidMapel(rawFallback) ? normalizeScheduleMapel(rawFallback) : rawFallback;
       list.push({ nama_mapel: fallbackMapel, kelas: '' });
     }
     ```
     Has the exact same strict match failure and fallback to `'Mata Pelajaran Umum'`.
   - In `DokumenView.tsx:1099-1101` (Card rendering):
     ```tsx
     <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/80 px-2 py-0.5 rounded-md truncate">
       {card.subject.nama_mapel} {card.subject.kelas ? `• Kelas ${card.subject.kelas}` : ''}
     </span>
     ```
     This displayed `Mata Pelajaran Umum` on the card badges for Class X teachers.

---

## 2. Logic Chain

1. **Compiler Constraints**:
   - In TypeScript, top-level exports (`export function foo()`) are valid, but exports within a block/function body are illegal syntax (`TS1184`).
   - Moving `isRealSubmittedJournal` to the module scope (lines 24–25 of `AdminVerifView.tsx`) removes TS1184 while retaining its exported symbol for imports and tests (`tests/admin_jurnal_real_data_verification.test.ts`).
   - In `HomeViewAdmin.tsx`, line 529 assigns `'blue'` for `Izin` teachers. Since `getBadgeClass` already styles `'blue'` as `bg-sky-100 text-sky-800`, aligning `pengisianJurnal.color` and `jurnalColor` union type to include `'blue'` eliminates TS2322 without altering UI logic.

2. **Class X Subject Disconnection Root Cause**:
   - `DokumenView.tsx` suffered from two structural defects:
     a) It did not fetch `jadwal_pelajaran` when `guru_mapel` had data, nor did it fetch `data_mapel`.
     b) It filtered `guruMapelList` using strict string equality (`===`) against `teacher.nama_guru`.
   - In Indonesian school operations and the SIPJAM database, teacher nicknames (`Ade`, `Ambar`, `Fitrawan`, `Rizki`) are recorded in schedule and subject allocations, while full names (`Ade Fitrawan Ibrahim`, `Setia Ambar Ningsih Mamonto`, `Riski Candra Mamangkai`) are in `data_guru`.
   - Because strict comparison failed, `subjects` was empty, triggering the fallback at line 733 to `'Mata Pelajaran Umum'`.

3. **Multi-Source Reconciled Subject Resolution**:
   - By querying `jadwal_pelajaran` and `data_mapel` in parallel within `loadAllData()`, all Class X schedule allocations become available in memory.
   - By implementing tokenized fuzzy matching (`isTeacherEntityMatch`), `Ade` accurately maps to `Ade Fitrawan Ibrahim`, `Ambar` maps to `Setia Ambar Ningsih Mamonto`, `Susan` maps to `Susana Muliono`, and `Rizki` maps to `Riski Candra Mamangkai`.
   - By creating a pure resolver `resolveTeacherSubjects` that aggregates assignments from `jadwal_pelajaran`, `guru_mapel`, and `data_guru.mata_pelajaran`, every Class X assignment is resolved to `{ nama_mapel: 'Matematika', kelas: 'X Merdeka' }`, `{ nama_mapel: 'Informatika', kelas: 'X Merdeka' }`, etc.
   - By expanding abbreviations (`MTK` -> `Matematika`, `SB` -> `Seni Budaya`, etc.) and canonicalizing prefixes (`X Merdeka_MTK` -> subject: `Matematika`, class: `X Merdeka`), specific subjects are shown.
   - By eliminating the `'Mata Pelajaran Umum'` fallback string, no generic placeholder can be displayed.

---

## 3. Caveats

1. **Zero Impact on Extracted Tingkat**:
   `DokumenView.tsx` exports `extractTingkat(kelasStr?: string | null): string`. Several test suites (`adversarial_m2_challenger_2.test.ts`, `adversarial_r1_r5_stress_test.ts`) import `extractTingkat` directly and assert exact behavior. `extractTingkat` must remain unchanged and exported.
2. **Document Requirement Matching with Abbreviations**:
   Teachers may upload documents with mapel `'MTK'`, `'Matematika'`, or `'X Merdeka_MTK'`. The blueprint includes `isMapelMatch` to ensure cross-matching between expanded and abbreviated subject names so uploaded documents are not orphaned.
3. **Multi-Tenant Scoping**:
   Queries for `jadwal_pelajaran` and `data_mapel` in `loadAllData()` should filter by `user.sekolah_id` when present, consistent with `data_siswa` and `syarat_perangkat_pembelajaran`.

---

## 4. Conclusion & Technical Implementation Blueprint

### 4.1 Fix 1: `src/components/AdminVerifView.tsx` (TS1184 Modifiers Error)

#### Target File: `src/components/AdminVerifView.tsx`
- **Location 1 (Placement)**: Relocate `isRealSubmittedJournal` outside `AdminVerifView`, above line 26 (right after `AdminVerifViewProps` interface).
- **Location 2 (Removal)**: Delete lines 474–484 from within the `AdminVerifView` component body.

#### Blueprint Diff:
```diff
--- a/src/components/AdminVerifView.tsx
+++ b/src/components/AdminVerifView.tsx
@@ -23,6 +23,17 @@ export interface AdminVerifViewProps {
   initialTab?: string;
 }
 
+// Helper: Memastikan jurnal benar-benar diisi oleh guru dengan materi pembelajaran riil (bukan auto-record delinquency / auto-fill berhalangan)
+export function isRealSubmittedJournal(j: any): boolean {
+  if (!j) return false;
+  const sv = j.status_verifikasi;
+  if (sv === 'Tidak Masuk Kelas' || sv === 'Tidak Melaksanakan Kegiatan' || sv === 'Sakit' || sv === 'Izin') return false;
+  const ket = (j.keterangan || '').trim().toLowerCase();
+  if (ket === 'tidak masuk kelas' || ket === 'tidak melaksanakan kegiatan apapun' || ket === 'auto-fill sistem karena guru berhalangan hadir') return false;
+  const mat = (j.materi || j.materi_pembelajaran || '').trim().toLowerCase();
+  if (mat === 'tidak masuk kelas' || mat === 'tidak melaksanakan kegiatan apapun' || mat.startsWith('guru tidak dapat mengisi jurnal karena')) return false;
+  return true;
+}
+
 export default function AdminVerifView({ 
   user, 
   isReadOnly: propReadOnly,
@@ -472,14 +483,3 @@ export default function AdminVerifView({ 
   };
-
-// Helper: Memastikan jurnal benar-benar diisi oleh guru dengan materi pembelajaran riil (bukan auto-record delinquency / auto-fill berhalangan)
-export function isRealSubmittedJournal(j: any): boolean {
-  if (!j) return false;
-  const sv = j.status_verifikasi;
-  if (sv === 'Tidak Masuk Kelas' || sv === 'Tidak Melaksanakan Kegiatan' || sv === 'Sakit' || sv === 'Izin') return false;
-  const ket = (j.keterangan || '').trim().toLowerCase();
-  if (ket === 'tidak masuk kelas' || ket === 'tidak melaksanakan kegiatan apapun' || ket === 'auto-fill sistem karena guru berhalangan hadir') return false;
-  const mat = (j.materi || j.materi_pembelajaran || '').trim().toLowerCase();
-  if (mat === 'tidak masuk kelas' || mat === 'tidak melaksanakan kegiatan apapun' || mat.startsWith('guru tidak dapat mengisi jurnal karena')) return false;
-  return true;
-}
```

---

### 4.2 Fix 2: `src/components/HomeViewAdmin.tsx` (TS2322 Type Incompatibility Error)

#### Target File: `src/components/HomeViewAdmin.tsx`
- **Location 1 (Interface)**: Line 30 in `interface TeacherStatusRow`.
- **Location 2 (Declaration)**: Line 494 in `loadAdminMatrix`.

#### Blueprint Diff:
```diff
--- a/src/components/HomeViewAdmin.tsx
+++ b/src/components/HomeViewAdmin.tsx
@@ -28,7 +28,7 @@ interface TeacherStatusRow {
   };
   pengisianJurnal: {
     status: string;
-    color: 'green' | 'amber' | 'rose' | 'gray';
+    color: 'green' | 'amber' | 'blue' | 'rose' | 'gray';
     filled: number;
     total: number;
   };
@@ -492,7 +492,7 @@ export default function HomeViewAdmin({
 
         let jurnalStatus = 'Bebas KBM';
-        let jurnalColor: 'green' | 'amber' | 'rose' | 'gray' = 'gray';
+        let jurnalColor: 'green' | 'amber' | 'blue' | 'rose' | 'gray' = 'gray';
 
         if (isBlokToday) {
```

---

### 4.3 Feature Blueprint: `src/components/DokumenView.tsx` (Class X Subject Resolution & Tokenized Matching)

#### Target File: `src/components/DokumenView.tsx`

#### 1. Add Helper Functions (Top of file, after `extractTingkat` around line 51):
```ts
/**
 * Normalizes name strings by removing academic and honorary titles and unifying spelling.
 */
export function normalizeTeacherToken(s?: string | null): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .split(',')[0] // remove trailing degrees after comma
    .replace(/\b(dr|drs|dra|ir|prof|h|hj|kh|ust|ustadz|ustadzah|s\.?pd\.?i?|m\.?pd\.?|s\.?kom\.?|s\.?si\.?|s\.?ag\.?|s\.?e\.?|s\.?t\.?|gr\.?)\b\.?/gi, '')
    .replace(/z/g, 's') // Normalize Rizki <-> Riski, Azhar <-> Ashar
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenized / fuzzy teacher name matching.
 * Accurately matches "Ade" <-> "Ade Fitrawan Ibrahim", "Ambar" <-> "Setia Ambar Ningsih Mamonto", etc.
 */
export function isTeacherNameMatch(
  teacherName?: string | null,
  candidateName?: string | null
): boolean {
  if (!teacherName || !candidateName) return false;
  const n1 = normalizeTeacherToken(teacherName);
  const n2 = normalizeTeacherToken(candidateName);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  // Prefix matching
  if (n1.startsWith(n2) || n2.startsWith(n1)) return true;

  // Tokenized matching
  const tokens1 = n1.split(' ').filter(t => t.length >= 2);
  const tokens2 = n2.split(' ').filter(t => t.length >= 2);

  if (tokens1.length === 1 && tokens2.includes(tokens1[0])) return true;
  if (tokens2.length === 1 && tokens1.includes(tokens2[0])) return true;

  const all1In2 = tokens1.length > 0 && tokens1.every(t => tokens2.includes(t));
  const all2In1 = tokens2.length > 0 && tokens2.every(t => tokens1.includes(t));
  if (all1In2 || all2In1) return true;

  return false;
}

/**
 * Multi-factor teacher entity matching (name, nip/nickname, user_id).
 */
export function isTeacherEntityMatch(
  teacher: any,
  candidateName?: string | null,
  candidateNip?: string | null,
  candidateUserId?: string | null
): boolean {
  if (!teacher) return false;
  if (candidateUserId && teacher.user_id && candidateUserId === teacher.user_id) return true;
  if (candidateUserId && teacher.id && candidateUserId === teacher.id) return true;
  if (candidateNip && teacher.nip && candidateNip.trim().toLowerCase() === teacher.nip.trim().toLowerCase()) return true;

  const teacherName = teacher.nama_guru || teacher.nama;
  if (isTeacherNameMatch(teacherName, candidateName)) return true;
  if (teacher.nip && isTeacherNameMatch(teacher.nip, candidateName)) return true;
  if (candidateNip && isTeacherNameMatch(teacherName, candidateNip)) return true;

  return false;
}

/**
 * Subject acronym expansion mapping for clean, formal display.
 */
export const MAPEL_EXPANSIONS: Record<string, string> = {
  'mtk': 'Matematika',
  'matematika': 'Matematika',
  'informatika': 'Informatika',
  'fisika': 'Fisika',
  'kimia': 'Kimia',
  'biologi': 'Biologi',
  'geografi': 'Geografi',
  'sosiologi': 'Sosiologi',
  'ekonomi': 'Ekonomi',
  'sejarah': 'Sejarah',
  'pp': 'Pendidikan Pancasila',
  'pkn': 'Pendidikan Pancasila',
  'pjok': 'PJOK',
  'sb': 'Seni Budaya',
  'b. ing': 'Bahasa Inggris',
  'b.ing': 'Bahasa Inggris',
  'b ing': 'Bahasa Inggris',
  'b. indo': 'Bahasa Indonesia',
  'b.indo': 'Bahasa Indonesia',
  'b indo': 'Bahasa Indonesia',
  'pai bp': 'PAI & BP',
  'mtl': 'Matematika Tingkat Lanjut'
};

export function canonicalizeSubjectName(rawMapel: string): string {
  const trimmed = (rawMapel || '').trim();
  if (!trimmed) return '';
  const core = trimmed.includes('_') ? (trimmed.split('_').pop() || '').trim() : trimmed;
  const lowerCore = core.toLowerCase();
  return MAPEL_EXPANSIONS[lowerCore] || core;
}

export function isMapelMatch(m1?: string | null, m2?: string | null): boolean {
  if (!m1 || !m2) return false;
  const s1 = m1.trim().toLowerCase();
  const s2 = m2.trim().toLowerCase();
  if (s1 === s2) return true;

  const c1 = canonicalizeSubjectName(s1).toLowerCase();
  const c2 = canonicalizeSubjectName(s2).toLowerCase();
  if (c1 === c2) return true;

  const core1 = s1.includes('_') ? s1.split('_').slice(1).join('_').trim() : s1;
  const core2 = s2.includes('_') ? s2.split('_').slice(1).join('_').trim() : s2;
  if (core1 === core2) return true;

  return false;
}

export interface TeacherSubjectResolved {
  nama_mapel: string;
  kelas: string;
}

/**
 * Pure multi-source subject resolver for any teacher.
 * Aggregates assignments from jadwal_pelajaran, guru_mapel, and data_guru.mata_pelajaran.
 * Guarantees zero fallback to 'Mata Pelajaran Umum'.
 */
export function resolveTeacherSubjects(
  teacher: any,
  jadwalList: any[] = [],
  dataMapelList: any[] = [],
  guruMapelList: any[] = []
): TeacherSubjectResolved[] {
  if (!teacher) return [];

  const subjects: TeacherSubjectResolved[] = [];
  const seen = new Set<string>();

  const addSubject = (rawMapel?: string | null, rawKelas?: string | null) => {
    if (!rawMapel || isInvalidMapel(rawMapel)) return;
    let mapel = rawMapel.trim();
    let kelas = (rawKelas || '').trim();

    // Handle format "X Merdeka_MTK"
    if (mapel.includes('_')) {
      const parts = mapel.split('_');
      if (!kelas) kelas = parts[0].trim();
      mapel = parts.slice(1).join('_').trim();
    }

    // Look up in dataMapelList if kelas is still missing
    if (!kelas && dataMapelList.length > 0) {
      const dm = dataMapelList.find(m => {
        const nm = (m.nama_mata_pelajaran || m.nama_mapel || '').trim().toLowerCase();
        return nm === rawMapel.trim().toLowerCase() || nm.endsWith(`_${mapel.toLowerCase()}`);
      });
      if (dm) {
        kelas = (dm.kategori || dm.kelompok || (dm.nama_mata_pelajaran?.includes('_') ? dm.nama_mata_pelajaran.split('_')[0].trim() : '')).trim();
      }
    }

    // Canonicalize subject name (e.g. MTK -> Matematika)
    const canonicalMapel = canonicalizeSubjectName(mapel);
    const key = `${canonicalMapel.toLowerCase()}__${kelas.toLowerCase()}`;

    if (canonicalMapel && !seen.has(key)) {
      seen.add(key);
      subjects.push({
        nama_mapel: canonicalMapel,
        kelas: kelas
      });
    }
  };

  // 1. Resolve from jadwal_pelajaran (Primary truth for teaching schedule)
  const matchingJadwal = jadwalList.filter(j =>
    isTeacherEntityMatch(teacher, j.nama_guru, j.nip, j.user_id)
  );
  matchingJadwal.forEach(j => {
    addSubject(j.mata_pelajaran || j.mapel, j.kelas);
  });

  // 2. Resolve from guru_mapel relations
  const matchingGm = guruMapelList.filter(gm =>
    isTeacherEntityMatch(teacher, gm.nama_guru, gm.nip, gm.user_id || gm.guru_id)
  );
  matchingGm.forEach(gm => {
    addSubject(gm.nama_mapel || gm.mapel_singkat, gm.kelas);
  });

  // 3. Resolve from teacher.mata_pelajaran in data_guru (e.g. "X Merdeka_MTK, X Merdeka_Informatika")
  const rawMataPelajaran = teacher.mata_pelajaran;
  if (rawMataPelajaran && typeof rawMataPelajaran === 'string') {
    const tokens = rawMataPelajaran
      .split(',')
      .map(s => s.trim())
      .filter(s => s && !isInvalidMapel(s));
    tokens.forEach(tok => {
      addSubject(tok, '');
    });
  }

  // 4. Sort Class X subjects logically first
  subjects.sort((a, b) => {
    const tA = extractTingkat(a.kelas);
    const tB = extractTingkat(b.kelas);
    if (tA === 'X' && tB !== 'X') return -1;
    if (tA !== 'X' && tB === 'X') return 1;
    return a.nama_mapel.localeCompare(b.nama_mapel);
  });

  return subjects;
}
```

#### 2. Update Component States & `loadAllData()` in `DokumenView.tsx`:
```ts
// Add states inside DokumenView:
const [jadwalList, setJadwalList] = useState<any[]>([]);
const [dataMapelList, setDataMapelList] = useState<any[]>([]);

// In loadAllData:
const loadAllData = useCallback(async () => {
  try {
    setFetching(true);
    let docQuery = supabase
      .from('bank_dokumen')
      .select('*')
      .order('timestamp', { ascending: false });

    if (!isAdmin && user?.nama) {
      docQuery = docQuery.eq('nama_guru', user.nama);
    }

    let siswaQuery = supabase.from('data_siswa').select('kelas');
    if (user?.sekolah_id) {
      siswaQuery = siswaQuery.eq('sekolah_id', user.sekolah_id);
    }

    let syaratQuery = supabase
      .from('syarat_perangkat_pembelajaran')
      .select('*')
      .order('urutan', { ascending: true });
    if (user?.sekolah_id) {
      syaratQuery = syaratQuery.eq('sekolah_id', user.sekolah_id);
    }

    // Parallel fetch of all master data tables
    const [
      { data: docs, error: docError },
      { data: teachers, error: teacherError },
      { data: gm, error: gmError },
      { data: jadwalData, error: jadwalError },
      { data: mapelData, error: mapelError },
      { data: siswaData },
      { data: syaratData }
    ] = await Promise.all([
      docQuery,
      supabase.from('data_guru').select('*').order('nama_guru', { ascending: true }),
      supabase.from('guru_mapel').select('*'),
      supabase.from('jadwal_pelajaran').select('*'),
      supabase.from('data_mapel').select('*'),
      siswaQuery,
      syaratQuery
    ]);

    if (docError) console.error('Error fetching bank_dokumen:', docError);
    if (docs) setDokumenList(docs as BankDokumen[]);

    if (teacherError) console.error('Error fetching data_guru:', teacherError);
    if (teachers) setTeachersList(teachers as DataGuru[]);

    const validGm = ((gm as GuruMapel[]) || []).filter((g: any) => !isInvalidMapel(g.nama_mapel || g.mata_pelajaran));
    setGuruMapelList(validGm);

    const validJadwal = (jadwalData || []).filter((j: any) => !isInvalidMapel(j.mata_pelajaran || j.mapel));
    setJadwalList(validJadwal);

    const validMapel = (mapelData || []).filter((m: any) => !isInvalidMapel(m.nama_mata_pelajaran || m.nama_mapel));
    setDataMapelList(validMapel);

    if (siswaData) {
      const uniqueKls = Array.from(new Set(siswaData.map((s: any) => s.kelas).filter(Boolean))) as string[];
      setKelasList(uniqueKls.sort());
    }

    if (syaratData) setSyaratList(syaratData as SyaratPerangkatPembelajaranRow[]);
  } catch (err) {
    console.error('loadAllData exception:', err);
  } finally {
    setFetching(false);
  }
}, [isAdmin, user?.nama, user?.sekolah_id]);
```

#### 3. Update `myTeacherSubjects` (lines 537–564):
```ts
// Subjects assigned to the currently logged in teacher
const myTeacherSubjects = useMemo(() => {
  const currentTeacher = teachersList.find(t =>
    isTeacherEntityMatch(t, user?.nama, user?.nip, user?.id)
  ) || {
    nama_guru: user?.nama,
    nip: user?.nip,
    user_id: user?.id,
    mata_pelajaran: user?.mata_pelajaran
  };

  return resolveTeacherSubjects(currentTeacher, jadwalList, dataMapelList, guruMapelList);
}, [teachersList, jadwalList, dataMapelList, guruMapelList, user]);
```

#### 4. Update `teacherSubjectCards` (lines 711–742):
```ts
teachersList.forEach(teacher => {
  const tName = (teacher.nama_guru || '').trim().toLowerCase();
  
  // Resolve teacher's subjects across jadwal, guru_mapel, and data_guru
  const subjects = resolveTeacherSubjects(teacher, jadwalList, dataMapelList, guruMapelList);

  // Teacher's uploaded docs (tokenized match)
  const teacherDocs = dokumenList.filter(d =>
    isTeacherEntityMatch(teacher, d.nama_guru)
  );

  subjects.forEach(sub => {
    // Find requirements for this subject in syarat_perangkat_pembelajaran
    let reqs = syaratList.filter(
      s => isMapelMatch(s.nama_mapel, sub.nama_mapel)
    );
    if (reqs.length === 0) {
      reqs = syaratList.filter(s => (s.nama_mapel || '').trim().toLowerCase() === 'semua mapel');
    }
...
```

#### 5. Update Mapel Matching in Uploaded Doc Checker (lines 778–785):
```ts
// Check mapel match
if (sub.nama_mapel && d.mapel) {
  if (!isMapelMatch(sub.nama_mapel, d.mapel)) {
    if (!d.judul || !d.judul.toLowerCase().includes(sub.nama_mapel.toLowerCase())) {
      return false;
    }
  }
}
```

---

## 5. Verification Method

To independently verify all findings and test subsequent implementation:

1. **Verify Static Compilation Fixes**:
   Run TypeScript compiler without emitting JS:
   ```powershell
   npx tsc --noEmit
   ```
   **Expected**: 0 errors. (Exit code 0). Both TS1184 and TS2322 must be 100% resolved.

2. **Verify Invariant Test Suites**:
   Run existing verification suites:
   ```powershell
   npx tsx tests/admin_jurnal_real_data_verification.test.ts
   npx tsx tests/m10_r2_r3.test.ts
   npx tsx tests/adversarial_m2_challenger_2.test.ts
   ```
   **Expected**: All suites pass with 100% PASS rate.

3. **Verify Class X Subject Resolution Unit Test**:
   Execute a focused script verifying that:
   - `resolveTeacherSubjects({ nama_guru: 'Ade Fitrawan Ibrahim', nip: 'Fitrawan' }, mockJadwal, mockDataMapel)` returns `Matematika` and `Informatika` with `kelas: 'X Merdeka'`.
   - `resolveTeacherSubjects` returns 0 instances of `'Mata Pelajaran Umum'`.
   - `isTeacherNameMatch('Ade Fitrawan Ibrahim', 'Ade') === true`.
   - `isTeacherNameMatch('Setia Ambar Ningsih Mamonto', 'Ambar') === true`.
   - `isTeacherNameMatch('Susana Muliono', 'Susan') === true`.
   - `isTeacherNameMatch('Riski Candra Mamangkai', 'Rizki') === true`.

4. **Invalidation Conditions**:
   - If any teacher card renders `'Mata Pelajaran Umum'` when class schedules exist, the resolution logic is invalidated.
   - If `npx tsc --noEmit` fails on `AdminVerifView.tsx` or `HomeViewAdmin.tsx`, the compilation fixes are invalidated.
   - If any existing test in `tests/m10_r2_r3.test.ts` or `tests/adversarial_m2_challenger_2.test.ts` fails, the blueprint is invalidated.
