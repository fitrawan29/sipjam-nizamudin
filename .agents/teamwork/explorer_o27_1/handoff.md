# Handoff Report: Investigation of R1, R3, & R2 Requirements

**Agent**: explorer_o27_1  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o27_1\`  
**Target Milestone**: Admin Portal Optimization  
**Handoff Type**: Hard  

---

## 1. Observation

Direct observations from codebase inspection:

### 1.1 R1: Dashboard Operasional
1. In `src/components/HomeViewAdmin.tsx` lines 539–550:
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
   When `user.nama` is `"Admin SMA NIZAMUDIN"`, line 541 outputs `"Admin SMA NIZAMUDIN"` and line 548 outputs `"SMA NIZAMUDIN"`, causing the school name to be duplicated.
2. In `src/components/HomeViewAdmin.tsx` lines 691–722:
   ```tsx
   691:           {/* Quick Action: Informasi & Pengumuman Sekolah */}
   692:           <div className="clay-card clay-card-purple p-4 rounded-2xl border-2 border-white/90 dark:border-purple-800/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
   ...
   700:                     Pusat Informasi
   ...
   718:               className="clay-btn clay-btn-purple btn-click self-start sm:self-auto px-3.5 py-2 rounded-xl text-xs font-bold text-purple-950 dark:text-purple-100 shadow-sm flex items-center gap-1.5 transition"
   719:             >
   720:               <i className="fa-solid fa-bullhorn text-[11px]"></i> Kelola Pengumuman
   721:             </button>
   722:           </div>
   ```
   A distinct card titled "Pusat Informasi" is rendered in the operational dashboard.

### 1.2 R3: Laporan Analitik Kerja
1. In `src/components/AdminRekapView.tsx` lines 209–241:
   ```tsx
   209:       // Seed map with all teachers from data_guru (excluding test accounts)
   210:       const pMap: Record<string, any> = {};
   211:       guruList?.forEach(g => {
   212:         const rawName = g.nama_guru?.trim();
   213:         if (g.nama_guru && rawName && !isTestGuruName(g.nama_guru) && !isTestGuruName(rawName)) {
   214:           pMap[rawName] = { nama: rawName, hadir: 0, izin: 0, sakit: 0, ... };
   ...
   228:       presensi?.forEach(p => {
   229:         const nama = p.nama_guru?.trim();
   230:         if (!nama || isTestGuruName(nama)) return;
   231:         if (!pMap[nama]) {
   232:           pMap[nama] = { nama, hadir: 0, izin: 0, sakit: 0, ... };
   ```
2. When `data_guru` has `"Ade Fitrawan Ibrahim"` (without academic title), `pMap["Ade Fitrawan Ibrahim"]` is seeded.
3. Historical records in `presensi_guru` have `nama_guru = "Ade Fitrawan Ibrahim, M.Pd., Gr."`. Because `pMap` uses exact string equality, `pMap["Ade Fitrawan Ibrahim, M.Pd., Gr."]` is created as a second map entry.
4. When `Object.keys(pMap)` is mapped to `pArr` (line 274) and rendered in `filteredPresensi` (line 726–745), two rows appear:
   - Row A: `"Ade Fitrawan Ibrahim"` (0 attendance)
   - Row B: `"Ade Fitrawan Ibrahim, M.Pd., Gr."` (actual attendance counts)

### 1.3 R2: Pusat Verifikasi dan Revisi (Presensi)
1. In `src/components/AdminVerifView.tsx` lines 668–691:
   ```tsx
   668:             <button
   669:               type="button"
   670:               onClick={() => {
   671:                 Swal.fire({
   672:                   title: 'Pedoman Kebijakan & SOP SIPJAM',
   ...
   690:               <span className="hidden sm:inline">SOP Disiplin</span>
   691:             </button>
   ```
   This button renders "SOP Disiplin" and opens a modal titled "Pedoman Kebijakan & SOP SIPJAM".
2. In `src/components/AdminVerifView.tsx` line 139:
   `query = query.order('timestamp', { ascending: false }).limit(200);`
   However, `displayList` useMemo (lines 561–646) does not explicitly sort `filteredSubmitted` or `[...filteredSubmitted, ...filteredUnsubmitted]` in JavaScript, leading to potential sequence anomalies if timestamps are in varied string formats or when modified.
3. In `src/components/AdminVerifView.tsx` lines 442–474:
   `unsubmittedPresensi` flags every teacher in `allTeachers` who hasn't submitted with:
   - `pesan_belum: 'Belum melakukan presensi datang maupun pulang'`
   - Badge: `'Belum Selesai'` (line 928)
   It does not inspect `allJadwalPelajaran` to check if a teacher has classes today, or if they are categorized as "wajib hadir hanya mengajar" (`wajib_hadir_hanya_mengajar === true` / global `Hari_Mengajar_Saja`).
4. In `src/components/AdminVerifView.tsx` lines 966–981:
   The card header badge only displays `status_verifikasi` (`Menunggu`, `Disetujui`, `Ditolak`). The attendance category is only rendered in text: `Jenis: {item.jenis_presensi} ({item.detail_izin})`, showing confusing text like `Jenis: Izin (Sakit)`.

---

## 2. Logic Chain

1. **R1**: Because line 541 renders `{user.nama}` (which contains "Admin SMA NIZAMUDIN") and line 548 directly follows with hardcoded `"SMA NIZAMUDIN"`, the school name appears twice. Conditional checking (or rendering the school name only when it is not already present in `user.nama`) eliminates the duplication. Lines 691–722 contain the complete, self-contained JSX for the "Pusat Informasi" card; deleting or omitting this block completely removes the section from the dashboard without breaking other components.
2. **R3**: Because `AdminRekapView.tsx` uses raw string keys for `pMap`, any variation between the seeded name (`"Ade Fitrawan Ibrahim"`) and the transaction name (`"Ade Fitrawan Ibrahim, M.Pd., Gr."`) creates two rows in the recap table. By canonicalizing any variant matching "Ade Fitrawan Ibrahim" to the clean core name `"Ade Fitrawan Ibrahim"` (stripping the titles) and aggregating counts into that single key, the untitled empty entry is merged with the titled entry, leaving exactly one entry without title displaying all attendance metrics.
3. **R2**:
   - Deleting lines 668–691 in `AdminVerifView.tsx` removes the "Pedoman Kebijakan & SOP SIPJAM" button while keeping the data refresh button intact.
   - Adding a JavaScript sort `.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())` in `displayList` guarantees that presence records are ordered strictly from newest to oldest.
   - By cross-referencing `allJadwalPelajaran` and `aturan_kehadiran_guru` for teachers in `unsubmittedPresensi`, teachers who have no scheduled classes on that day and are categorized as "wajib hadir pada jadwal KBM" can be recognized as exempt and rendered with label `"Bebas Hadir"` (without warning text).
   - Evaluating `item.jenis_presensi` and `item.detail_izin` to render explicit badges for **Sakit**, **Izin**, **Dinas Luar**, and **Hadir di Sekolah** resolves visual ambiguity.

---

## 3. Caveats

- **Scope boundary**: This investigation is read-only. No source files have been edited.
- **Existing AST Invariants**: `tests/adversarial_ast_invariants_challenger.test.ts` and `tests/adversarial_m2_empirical_challenger.test.ts` verify specific prop contracts (`isReadOnly`) and badges (`Sakit >= 3`, `Izin > 3`, `Auto-Checkout`). Any styling adjustments must retain these existing badge selectors and text invariants.
- **Dinas Pendidikan mode**: `AdminRekapView.tsx` and `AdminVerifView.tsx` also serve Dinas Pendidikan read-only mode; ensure `isReadOnly` logic is preserved.

---

## 4. Conclusion

The root causes for all requirements across R1, R3, and R2 have been pinpointed with exact file locations and line numbers. Clean, minimally invasive solutions have been defined in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o27_1\report.md` for seamless execution by the builder/implementer agent.

---

## 5. Verification Method

To verify the subsequent implementation:

1. **R1**:
   - Inspect `src/components/HomeViewAdmin.tsx` line 540–550; verify school name is not duplicated when admin logs in.
   - Verify lines 691–722 are removed and "Pusat Informasi" is absent from the dashboard.
2. **R3**:
   - Run unit test or test script verifying `AdminRekapView.tsx` outputs only 1 row for `"Ade Fitrawan Ibrahim"` and that no title (`M.Pd., Gr.`) is displayed.
3. **R2**:
   - Inspect `src/components/AdminVerifView.tsx`: verify "SOP Disiplin" / "Pedoman Kebijakan & SOP SIPJAM" button is gone.
   - Verify presensi items in `AdminVerifView.tsx` are sorted descending by timestamp.
   - Verify teachers with no KBM on that day display `"Bebas Hadir"` without delinquency warnings.
   - Verify attendance cards render clear category badges for Sakit, Izin, and Dinas Luar.
4. **Project Test Suite**:
   - Run `npx vitest run` or project test command to confirm 0 regressions.
