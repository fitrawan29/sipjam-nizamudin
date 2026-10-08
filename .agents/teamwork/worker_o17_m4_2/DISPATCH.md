## 2026-10-08T21:09:12Z

You are Worker M4 (worker_o17_m4_2) implementing Milestone 4 (R4 Academic Merdeka Calculations, Wali Kelas Rapor Menu, In-app Tutorials).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o17_m4_2

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INPUT FILES:
1. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (under header '## 2026-10-08T11:11:29Z').
2. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md.
3. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o16_3\report.md.

YOUR SCOPE & EXCLUSIVE WRITE OWNERSHIP:
- src/components/GradebookView.tsx
- src/components/AppScreen.tsx
- src/components/RaporView.tsx
- src/components/Onboarding/tutorialSteps.ts
- src/components/Tutorial/tutorialData.ts
- tests/m4_academic_merdeka_rapor.test.ts

TASK INSTRUCTIONS (Follow explorer_o16_3/report.md blueprint):
1. Kurikulum Merdeka Capaian Pembelajaran Calculations in `src/components/GradebookView.tsx`:
   - Implement and export `generateKurikulumMerdekaDeskripsi(studentName, tpScores)`:
     - Sort valid TP scores descending. Identify `highestTp` and `lowestTp`.
     - Calculate `nilaiRapor` (average of TP scores) and `predikat` (Sangat Baik >=85, Baik >=75, Cukup >=65, Perlu Bimbingan <65).
     - Synthesize descriptions:
       - If lowest.score >= 85 or single TP: `Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran, terutama dalam ${highest.deskripsi}.`
       - If highest.score < 70: `Perlu bimbingan dan pendampingan lebih lanjut dalam menguasai seluruh capaian pembelajaran, khususnya dalam ${lowest.deskripsi}.`
       - Otherwise: `Menunjukkan penguasaan yang baik dalam ${highest.deskripsi}, namun perlu bimbingan dan peningkatan dalam ${lowest.deskripsi}.`
   - Integrate into Tab 2 (`rekap-semester`) in `GradebookView.tsx` with a dedicated column: "Deskripsi Capaian Pembelajaran".

2. Wali Kelas "Rapor" Menu & View in `src/components/AppScreen.tsx` and `src/components/RaporView.tsx`:
   - In `AppScreen.tsx`:
     - In `menuItemsGuru`: add `{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' }` when `isWaliKelas === true`.
     - In `menuItemsAdmin`: add `{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' }`.
     - In `handleNavigation`: if `targetId === 'view-rapor'`, verify `isAdmin || isSuperadmin || isWaliKelas`. If unauthorized, show Swal warning "Akses Ditolak".
     - In views render: when `currentView === 'view-rapor'`, render `<RaporView user={user} assignedKelas={assignedKelas} />` if authorized, or "Akses Terblokir" card if unauthorized.
   - Implement `src/components/RaporView.tsx`:
     - Displays students for `assignedKelas`, student selector, Kurikulum Merdeka subject scores with Capaian Pembelajaran descriptions, attendance summary (Hadir, Sakit, Izin, Alpa), teacher reflection/catatan, and official print button using `triggerPrintWithGps()`.

3. In-App Tutorial Updates:
   - In `src/components/Onboarding/tutorialSteps.ts`: update steps for multi-state & 30-min snooze, truancy detection, concurrency lock, and Wali Kelas Rapor menu.
   - In `src/components/Tutorial/tutorialData.ts`: update `guru-presensi`, `guru-jurnal`, `guru-piket`, `admin-verif`, and add `guru-rapor` tutorial.

4. Dedicated Verification Suite (`tests/m4_academic_merdeka_rapor.test.ts`):
   - Validates Kurikulum Merdeka calculation logic and narrative synthesis across all boundary cases.
   - Validates Wali Kelas "Rapor" menu visibility (included when `isWaliKelas === true`, excluded when `false`).
   - Validates navigation guard and RaporView authorization.
   - Validates tutorial updates.

5. Verification Commands:
   - `npx tsc --noEmit`
   - `npx tsx tests/m4_academic_merdeka_rapor.test.ts`
   - `npx tsx tests/m3_student_attendance_piket_lock.test.ts`
   - `npx tsx tests/m2_teacher_attendance_verification.test.ts`
   - `npm test`
   - `npx tsx tests/e2e/run_all_e2e.ts`
   - `npm run build`

6. Git Workflow per GEMINI.md:
   - `git status`, `git add .`, `git commit -m "feat(m4): implement kurikulum merdeka cp calculations, wali kelas rapor menu, and tutorial updates"`, `git push origin main`.
