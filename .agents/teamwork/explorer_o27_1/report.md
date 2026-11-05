# Comprehensive Investigation Report: R1, R3, & R2 Requirements

**Author**: explorer_o27_1  
**Target Milestone**: Admin Portal Optimization (Production Polish)  
**Investigation Date**: 2026-11-05  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o27_1\`  
**Scope**: Read-only codebase investigation covering Dashboard Operasional (R1), Laporan Analitik Kerja (R3), and Pusat Verifikasi dan Revisi - Presensi (R2).

---

## Executive Summary

This investigation analyzed three distinct functional areas in `sipjam-app`:
1. **R1 (Dashboard Operasional)**: Identified the duplicate display of school name ("Admin [nama sekolah]") in `src/components/HomeViewAdmin.tsx` line 540–550, and located the "Pusat Informasi" card component in lines 691–722 for removal.
2. **R3 (Laporan Analitik Kerja)**: Identified the duplication of teacher "Ade Fitrawan Ibrahim" in `src/components/AdminRekapView.tsx` (lines 208–300). Diagnosed that one record lacks academic titles while other transaction records contain titles (e.g. `M.Pd., Gr.`), causing separate map keys in `pMap`. Outlined an exact deduplication and title-stripping normalization strategy.
3. **R2 (Pusat Verifikasi dan Revisi - Presensi)**:
   - Located the "Pedoman Kebijakan & SOP SIPJAM" button in `src/components/AdminVerifView.tsx` (lines 668–691) for clean elimination.
   - Identified the presence list sorting mechanism in `AdminVerifView.tsx` (`loadData` & `displayList`) to enforce strict descending order (newest to oldest timestamp).
   - Diagnosed why teachers categorized as "wajib hadir pada jadwal KBM" currently get flagged as "Belum Selesai / Belum melakukan presensi", and designed the logic to display `"Bebas Hadir"` (without other text) when they have no classes/piket scheduled for that day.
   - Evaluated the status badges and labels for "Izin", "Sakit", "Dinas Luar", and "Terlambat" in `AdminVerifView.tsx` (lines 966–1005) to ensure distinct visual clarity.

---

## 1. Focus 1: R1 — Dashboard Operasional

### 1.1 Duplication of School Name ("admin [nama sekolah]")

#### A. Exact Location & Direct Observation
- **File**: `src/components/HomeViewAdmin.tsx`
- **Lines**: 539–551

```tsx
539:             <div className="min-w-0">
540:               <div className="flex items-center gap-2">
541:                 <h2 className="font-bold text-sm sm:text-base leading-tight truncate">{user.nama}</h2>
542:                 <span className="bg-nizamudin-gold/90 text-green-900 px-2 py-0.5 rounded-full font-bold text-[8px] sm:text-[9px] uppercase shadow-sm shrink-0">
543:                   {user.role}
544:                 </span>
545:               </div>
546:               <p className="text-[10px] text-green-100/80 font-mono mt-0.5 tracking-wider truncate flex items-center gap-1.5">
547:                 <span>{user.username}</span>
548:                 <span className="truncate font-sans font-medium">SMA NIZAMUDIN</span>
549:               </p>
550:             </div>
```

#### B. Root Cause Analysis
1. In production and database instances, the administrator account `user.nama` is set to `"Admin SMA NIZAMUDIN"` (or `"Admin [Nama Sekolah]"`).
2. In line 541, `{user.nama}` is rendered as the primary header (`<h2>`).
3. In line 548, `<span className="truncate font-sans font-medium">SMA NIZAMUDIN</span>` is hardcoded directly underneath next to `{user.username}`.
4. Consequently, on the dashboard banner, the school name is displayed twice in immediate succession:
   - Primary line: `"Admin SMA NIZAMUDIN"`
   - Secondary line: `"admin • SMA NIZAMUDIN"`
5. Furthermore, when `user.sekolah_nama` or dynamic multi-tenant school names are used, line 548 does not reference the dynamic school context or check if `user.nama` already contains the school name.

#### C. Proposed Fix Strategy
To prevent duplication:
- In `src/components/HomeViewAdmin.tsx`:
  - Either display `user.nama` in line 541 cleaned of redundant school prefix/suffix if the school is shown on line 548, OR if `user.nama` already contains the school name or "Admin", line 548 should only render the school name if not already in `user.nama`.
  - Recommended clean pattern:
    ```tsx
    const schoolName = user?.sekolah_nama || 'SMA NIZAMUDIN';
    // If user.nama already includes the school name, render user.nama without repeating schoolName below,
    // or format clean title:
    const cleanAdminName = user?.nama?.toLowerCase().includes(schoolName.toLowerCase())
      ? user.nama
      : `${user.nama || 'Admin'}`;
    ```
  - In JSX line 546–549:
    ```tsx
    <p className="text-[10px] text-green-100/80 font-mono mt-0.5 tracking-wider truncate flex items-center gap-1.5">
      <span>{user.username}</span>
      {!user?.nama?.toLowerCase().includes((user?.sekolah_nama || 'SMA NIZAMUDIN').toLowerCase()) && (
        <span className="truncate font-sans font-medium">{user?.sekolah_nama || 'SMA NIZAMUDIN'}</span>
      )}
    </p>
    ```

---

### 1.2 Removal of "Pusat Informasi" Section

#### A. Exact Location & Direct Observation
- **File**: `src/components/HomeViewAdmin.tsx`
- **Lines**: 691–722

```tsx
691:           {/* Quick Action: Informasi & Pengumuman Sekolah */}
692:           <div className="clay-card clay-card-purple p-4 rounded-2xl border-2 border-white/90 dark:border-purple-800/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
693:             <div className="flex items-center gap-3">
694:               <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-lg shadow-sm shrink-0">
695:                 <i className="fa-solid fa-bullhorn"></i>
696:               </div>
697:               <div>
698:                 <div className="flex items-center gap-2">
699:                   <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-200">
700:                     Pusat Informasi
701:                   </span>
702:                   <span className="text-xs text-gray-500 dark:text-gray-400">
703:                     Pengumuman &amp; Siaran Sekolah
704:                   </span>
705:                 </div>
706:                 <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
707:                   Publikasikan Informasi Sekolah
708:                 </h4>
709:                 <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
710:                   Buat, edit, dan siarkan pengumuman resmi ke Guru, Wali Murid, dan Siswa.
711:                 </p>
712:               </div>
713:             </div>
714: 
715:             <button
716:               type="button"
717:               onClick={() => setView('view-informasi')}
718:               className="clay-btn clay-btn-purple btn-click self-start sm:self-auto px-3.5 py-2 rounded-xl text-xs font-bold text-purple-950 dark:text-purple-100 shadow-sm flex items-center gap-1.5 transition"
719:             >
720:               <i className="fa-solid fa-bullhorn text-[11px]"></i> Kelola Pengumuman
721:             </button>
722:           </div>
```

#### B. Impact & Proposed Removal Strategy
- This block is a standalone quick-action banner card situated directly between the "Active Blok Alert" (lines 655–689) and the "Matriks Controls" (line 725).
- Removing lines 691–722 completely eliminates "Pusat Informasi" from the operational dashboard without altering any surrounding state, hooks, or matrix layout.
- The standalone "Informasi" menu (`InformasiView.tsx`) remains accessible from the main navigation sidebar/drawer (`item.id: 'view-informasi'`).

---

## 2. Focus 2: R3 — Laporan Analitik Kerja (Deduplication of "Ade Fitrawan Ibrahim")

### 2.1 Problem Description
In the recap table (`sub-tab: tabel`) of "Laporan & Analitik Kinerja" (`AdminRekapView.tsx`), the teacher "Ade Fitrawan Ibrahim" appears duplicated across two rows:
1. One row without academic title: `"Ade Fitrawan Ibrahim"` (typically containing 0s or empty attendance).
2. One row with academic title: `"Ade Fitrawan Ibrahim, M.Pd., Gr."` (containing the verified attendance and journal records).

**User Requirement**:
"hilangkan entri yang tidak memiliki gelar, dan pada entri yang memiliki gelar, hilangkan gelarnya sehingga hanya tersisa satu entri nama tanpa gelar."

### 2.2 Exact Location & Direct Observation
- **File**: `src/components/AdminRekapView.tsx`
- **Lines**: 137–148 (`guruQuery`), 209–224 (seeding `pMap`), 227–254 (aggregating `presensi`), 257–273 (aggregating `jurnal` & `piket`), 274–290 (`pArr` generation), and lines 308–310 (`filteredPresensi`).

```tsx
137:       // 1. Fetch all teachers from data_guru to seed the map (ensures 0 attendance teachers appear)
138:       let guruQuery = supabase
139:         .from('data_guru')
140:         .select('nama_guru')
141:         .not('nama_guru', 'ilike', '%test guru%')
142:         .not('nama_guru', 'ilike', '%guru test%')
143:         .order('nama_guru', { ascending: true });
...
209:       // Seed map with all teachers from data_guru (excluding test accounts)
210:       const pMap: Record<string, any> = {};
211:       guruList?.forEach(g => {
212:         const rawName = g.nama_guru?.trim();
213:         if (g.nama_guru && rawName && !isTestGuruName(g.nama_guru) && !isTestGuruName(rawName)) {
214:           pMap[rawName] = {
215:             nama: rawName,
216:             hadir: 0,
217:             izin: 0,
218:             sakit: 0,
219:             dinasLuar: 0,
220:             telatDetik: 0,
221:             piket: 0,
222:             jurnal: 0
223:           };
224:         }
225:       });
226: 
227:       // Aggregate presensi
228:       presensi?.forEach(p => {
229:         const nama = p.nama_guru?.trim();
230:         if (!nama || isTestGuruName(nama)) return;
231:         if (!pMap[nama]) {
232:           pMap[nama] = {
233:             nama,
234:             hadir: 0,
...
```

### 2.3 Root Cause Analysis
1. `data_guru` has a record for `"Ade Fitrawan Ibrahim"` (seeded in `pMap["Ade Fitrawan Ibrahim"]`).
2. Historical transactions (`presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`, or historical CSV data) contain records with `nama_guru = "Ade Fitrawan Ibrahim, M.Pd., Gr."` (or similar titled variants).
3. In `AdminRekapView.tsx`, map lookups use the exact raw string: `pMap[nama]`.
4. Because `"Ade Fitrawan Ibrahim, M.Pd., Gr." !== "Ade Fitrawan Ibrahim"`, line 231 `if (!pMap[nama])` evaluates to true, creating a second entry in `pMap`: `pMap["Ade Fitrawan Ibrahim, M.Pd., Gr."]`.
5. As a result:
   - Row 1: `"Ade Fitrawan Ibrahim"` shows `0` attendance.
   - Row 2: `"Ade Fitrawan Ibrahim, M.Pd., Gr."` shows the actual attendance.
6. When `Object.keys(pMap)` is mapped to `pArr` (line 274), both entries are produced and rendered in the 11-column table, print document, and CSV export.

### 2.4 Proposed Implementation Strategy
In `src/components/AdminRekapView.tsx`:
1. Use an explicit teacher name canonicalizer for Ade Fitrawan Ibrahim. We can use a targeted helper:
   ```ts
   function canonicalizeTeacherRekapName(rawName?: string | null): string {
     if (!rawName) return '';
     const trimmed = rawName.trim();
     // Target Ade Fitrawan Ibrahim variations
     if (trimmed.toLowerCase().includes('ade fitrawan ibrahim')) {
       return 'Ade Fitrawan Ibrahim';
     }
     return trimmed;
   }
   ```
2. When seeding `pMap` from `guruList`:
   ```ts
   guruList?.forEach(g => {
     const rawName = g.nama_guru?.trim();
     if (g.nama_guru && rawName && !isTestGuruName(g.nama_guru) && !isTestGuruName(rawName)) {
       const key = canonicalizeTeacherRekapName(rawName);
       if (!pMap[key]) {
         pMap[key] = {
           nama: key,
           hadir: 0,
           izin: 0,
           sakit: 0,
           dinasLuar: 0,
           telatDetik: 0,
           piket: 0,
           jurnal: 0
         };
       }
     }
   });
   ```
3. When aggregating `presensi`, `jurnal`, and `piket`:
   - Resolve `const nama = canonicalizeTeacherRekapName(p.nama_guru);`
   - Accumulate all transactions under the canonical key `pMap[nama]`.
   - In `jMap` and `pkMap`, also use `canonicalizeTeacherRekapName`.
4. Result:
   - The un-titled empty entry and titled entry collapse into a single entry with `nama: 'Ade Fitrawan Ibrahim'`.
   - The title (`M.Pd., Gr.`) is removed.
   - All attendance, journal, and piket counts are preserved in the single row.

---

## 3. Focus 3: R2 — Pusat Verifikasi dan Revisi (Presensi)

### 3.1 Removal of "Pedoman Kebijakan dan SOP SIPJAM"

#### A. Exact Location & Direct Observation
- **File**: `src/components/AdminVerifView.tsx`
- **Lines**: 668–691

```tsx
668:             <button
669:               type="button"
670:               onClick={() => {
671:                 Swal.fire({
672:                   title: 'Pedoman Kebijakan & SOP SIPJAM',
673:                   html: `
674:                     <div class="text-left text-xs space-y-2 text-gray-700 dark:text-gray-200">
675:                       <p><strong>1. Kategori Pelanggaran:</strong> Kelalaian Tiket (Piket/Izin/Terlambat/Dinas), Jurnal KBM, dan Jurnal Kegiatan.</p>
676:                       <p><strong>2. Konsekuensi Bertingkat:</strong> Teguran Lisan &rarr; SP 1 &rarr; SP 2 (potong insentif 25-50%) &rarr; SP 3 (penangguhan penuh 100%) &rarr; Sidang Disiplin Pimpinan/Yayasan/Dinas.</p>
677:                       <p><strong>3. Batas Klarifikasi/Dispensasi:</strong> Maksimal 2x24 jam kerja (Formulir F-SIPJAM-01 & F-SIPJAM-02). Perpanjangan otomatis berlaku untuk Extended Force Majeure & wilayah 3T.</p>
678:                       <p class="text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-700">Rujukan Regulasi Lengkap: <code>docs/KONSEKUENSI_PELANGGARAN.md</code></p>
679:                     </div>
680:                   `,
681:                   icon: 'info',
682:                   confirmButtonText: 'Tutup',
683:                   confirmButtonColor: '#0B4619'
684:                 });
685:               }}
686:               className="btn-click bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-2.5 h-8 rounded-lg text-xs font-bold shadow-sm border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5"
687:               title="Lihat SOP & Regulasi Konsekuensi Pelanggaran"
688:             >
689:               <i className="fa-solid fa-scale-balanced text-xs"></i>
690:               <span className="hidden sm:inline">SOP Disiplin</span>
691:             </button>
```

#### B. Proposed Removal Strategy
- Remove lines 668–691 from `AdminVerifView.tsx`.
- Keep the adjacent reload button (`loadData`, line 692–700) intact.

---

### 3.2 Sorting Presence History from Newest to Oldest

#### A. Exact Location & Direct Observation
- **File**: `src/components/AdminVerifView.tsx`
- **Lines**: 139 in `loadData`, and lines 561–646 in `displayList` useMemo.

#### B. Root Cause Analysis
1. While `loadData` line 139 executes `.order('timestamp', { ascending: false })`, the client-side `displayList` does not explicitly sort `filteredSubmitted` in JavaScript.
2. If real-time PostgreSQL events trigger or date filters change, or if timestamps are formatted differently (ISO-8601 string vs `YYYY-MM-DD HH:mm:ss`), records may appear out of sequence.
3. When `verifFilter === 'Semua'` and `taskFilter === 'Semua'`, submitted items are combined with unsubmitted items without explicit client-side sorting guarantee.

#### C. Proposed Implementation Strategy
In `displayList` useMemo (lines 588–645):
Ensure `filteredSubmitted` is explicitly sorted by timestamp in descending order:
```ts
const sortedSubmitted = filteredSubmitted.slice().sort((a: any, b: any) => {
  const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
  const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
  return tB - tA; // Newest first
});
```
Return `sortedSubmitted` (or `[...sortedSubmitted, ...filteredUnsubmitted]`).

---

### 3.3 Attendance Category "Bebas Hadir" for Non-Teaching Schedule Teachers

#### A. Exact Location & Direct Observation
- **File**: `src/components/AdminVerifView.tsx`
- **Lines**: 442–474 (`unsubmittedPresensi`) and 910–956 (Unsubmitted Card Rendering).

#### B. Root Cause Analysis
1. In `AdminVerifView.tsx`:
   ```tsx
   457:     return allTeachers
   458:       .filter(t => {
   459:         const hasSubmitted = submittedList.some(p => 
   460:           isTeacherMatch(t.nama_guru, p.nama_guru, t.nip)
   461:         );
   462:         return !hasSubmitted;
   463:       })
   464:       .map(t => ({
   465:         id: `unsub-presensi-${t.id}`,
   466:         nama_guru: t.nama_guru,
   467:         nip: t.nip || '-',
   468:         mata_pelajaran: t.mata_pelajaran || 'Guru',
   469:         task_type: 'Presensi',
   470:         pesan_belum: 'Belum melakukan presensi datang maupun pulang',
   471:         tanggal: targetDate,
   472:         isUnsubmitted: true
   473:       }));
   ```
2. In contrast to `HomeViewAdmin.tsx` (which checks `isExemptNonTeaching` based on whether the teacher is configured as `wajib_hadir_hanya_mengajar` and has 0 classes on that day), `AdminVerifView.tsx` currently labels **ALL** unsubmitted teachers as:
   - Badge: `"Belum Selesai"`
   - Message: `"Belum melakukan presensi datang maupun pulang"`
   - Footer: `"Menunggu pengajuan dari guru"`
3. For teachers whose policy is "wajib hadir pada jadwal KBM" (i.e. only required to be present when teaching), when they have no classes on that day and no piket duty, they are not delinquent—their correct operational state is `"Bebas Hadir"`.
4. Requirement: "tampilkan keterangan 'bebas hadir' (tanpa keterangan lainnya) untuk guru yang masuk kategori wajib hadir pada jadwal KBM".

#### C. Proposed Implementation Strategy
1. Load `aturan_kehadiran_guru` from `pengaturan` in `loadAuxData`:
   ```ts
   const { data: cfg } = await supabase.from('pengaturan').select('key, value, aturan_kehadiran_guru');
   ```
2. In `unsubmittedPresensi` calculation:
   For each teacher `t`:
   - Check if `t.wajib_hadir_hanya_mengajar === true` or if the global rule is `'Hari_Mengajar_Saja'`.
   - Check if `allJadwalPelajaran` has any class for `t` on `effectiveDayName`.
   - Check if `allPiketSchedule` assigns `t` on `effectiveDayName`.
   - If teacher is in the "wajib hadir hanya mengajar" category AND has 0 classes scheduled today AND no piket duty:
     - Mark `isFreeFromPresence: true`
     - Set `pesan_belum: 'Bebas Hadir'`
     - Set `status_label: 'Bebas Hadir'`
3. In JSX card rendering (line 911–956):
   - When `item.isFreeFromPresence` or `item.pesan_belum === 'Bebas Hadir'`:
     - Render badge: `<span className="... bg-blue-100 text-blue-800 ...">Bebas Hadir</span>`
     - Render message: `<p className="font-semibold text-blue-900">Bebas Hadir</p>` (without appending "Belum melakukan presensi datang maupun pulang" or other warnings).
     - Footer: `<div className="... text-blue-600">Bebas Hadir (Jadwal KBM Kosong)</div>` or clean placeholder.

---

### 3.4 Visual Clarity of Presence Categories ("Izin", "Sakit", "Dinas Luar", etc.)

#### A. Exact Location & Direct Observation
- **File**: `src/components/AdminVerifView.tsx`
- **Lines**: 966–981

```tsx
966:                   <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
967:                       item.status_verifikasi === 'Disetujui' || item.status_verifikasi === 'Diverifikasi' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
968:                       item.status_verifikasi === 'Ditolak' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
969:                       (item.status_verifikasi === 'Pulang Cepat' || item.status_verifikasi === 'Tidak Masuk Kelas' || item.jenis_presensi === 'Pulang Cepat') ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
970:                       'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
971:                     }`}>{item.status_verifikasi || 'Menunggu'}</span>
...
978:                     <p><span className="font-semibold">Jenis:</span> {item.jenis_presensi} {item.detail_izin && `(${item.detail_izin})`}</p>
```

#### B. Deficiencies Identified
1. The badge at the top right of each card only indicates `status_verifikasi` (`Menunggu`, `Disetujui`, `Ditolak`).
2. The presence category is rendered only as small plain text: `Jenis: {item.jenis_presensi} ({item.detail_izin})`.
3. If `item.jenis_presensi === 'Izin'` and `item.detail_izin === 'Sakit'`, it displays ambiguously as `Jenis: Izin (Sakit)`.
4. An admin reviewing attendance cannot immediately see whether an entry is **Sakit**, **Izin**, **Dinas Luar**, or **Hadir di Sekolah** at a glance.

#### C. Proposed Implementation Strategy
Add a distinctive attendance category pill/badge right next to the teacher name or status badge:
- **Sakit**:
  - Condition: `item.jenis_presensi === 'Sakit' || item.detail_izin?.toLowerCase().includes('sakit')`
  - Badge: `<span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-300">Sakit</span>`
- **Izin**:
  - Condition: `item.jenis_presensi === 'Izin' && !item.detail_izin?.toLowerCase().includes('sakit')`
  - Badge: `<span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300">Izin</span>`
- **Dinas Luar**:
  - Condition: `item.jenis_presensi === 'Dinas Luar'`
  - Badge: `<span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-300">Dinas Luar</span>`
- **Hadir / Sekolah**:
  - Condition: `item.jenis_presensi === 'Sekolah'`
  - Badge: `<span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300">Hadir di Sekolah</span>`

---

## 4. Synthesis & Dependency Matrix

| Req | Component / File | Specific Lines | Action Summary | Risk / Invariants to Maintain |
|---|---|---|---|---|
| **R1.1** | `src/components/HomeViewAdmin.tsx` | Lines 540–550 | Prevent duplicate school name in admin greeting | Ensure `user.nama` & `user.role` remain accessible; preserve avatar rendering. |
| **R1.2** | `src/components/HomeViewAdmin.tsx` | Lines 691–722 | Remove "Pusat Informasi" quick-action card | Check that `InformasiView.tsx` remains accessible via sidebar navigation. |
| **R3.1** | `src/components/AdminRekapView.tsx` | Lines 208–300 | Deduplicate "Ade Fitrawan Ibrahim" and strip academic title | Preserve exact count totals; do not break AST invariants tested by `adversarial_ast_invariants_challenger.test.ts`. |
| **R2.1** | `src/components/AdminVerifView.tsx` | Lines 668–691 | Remove "Pedoman Kebijakan & SOP SIPJAM" button | Keep `loadData` reload button intact. |
| **R2.2** | `src/components/AdminVerifView.tsx` | Lines 561–646 | Sort presensi items descending (newest to oldest) | Ensure combined array keeps valid timestamps sorted. |
| **R2.3** | `src/components/AdminVerifView.tsx` | Lines 442–474, 910–956 | Set "Bebas Hadir" for teachers exempt from attendance | Do not affect teachers who actually have scheduled KBM classes on that day. |
| **R2.4** | `src/components/AdminVerifView.tsx` | Lines 966–1005 | Display explicit badges for Sakit, Izin, Dinas Luar | Preserve existing long-term sick (>3 days) & auto-checkout badges tested by `adversarial_m2_empirical_challenger.test.ts`. |

---

## 5. Next Steps for Implementation

1. **Dashboard Operasional (`HomeViewAdmin.tsx`)**:
   - Apply clean formatting so school name is not repeated.
   - Delete lines 691–722 ("Pusat Informasi" card).
2. **Laporan Analitik Kerja (`AdminRekapView.tsx`)**:
   - Apply `canonicalizeTeacherRekapName` when building `pMap`, `jMap`, and `pkMap`.
   - Verify that only one entry for "Ade Fitrawan Ibrahim" without title appears in the table.
3. **Pusat Verifikasi dan Revisi (`AdminVerifView.tsx`)**:
   - Delete the "SOP Disiplin" button.
   - Add explicit timestamp descending sort to `displayList`.
   - Compute `isFreeFromPresence` and render `"Bebas Hadir"` for exempt teachers.
   - Add distinct category badges for Sakit, Izin, Dinas Luar, and Hadir.
