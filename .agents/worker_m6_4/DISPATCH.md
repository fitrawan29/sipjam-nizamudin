## 2026-09-12T05:09:36Z

Task Scope (Milestone M6.4: Piket, Perangkat, Broadcast & Transitions - R4 & R5):
1. Write ownership:
   - src/components/PiketView.tsx
   - src/components/DokumenView.tsx
   - src/components/InformasiView.tsx (New component)
   - src/components/AppScreen.tsx
   - src/app/globals.css

2. Detailed Requirements:
   a. R4.1 Manajemen Piket (src/components/PiketView.tsx):
      - When `user?.role === 'Admin'`:
        * Remove tab "Isi Laporan" (`lapor`).
        * Build tab "Penugasan Piket" (`penugasan`):
          - Schedule/assign picket duty day-by-day (Senin–Sabtu) for Teachers (`tipe_petugas: 'Guru'`, choosing from `data_guru`) and Students (`tipe_petugas: 'Siswa'`, choosing from `data_siswa` or manual entry with NISN & kelas).
          - Connect to `public.penugasan_piket` (already created & seeded in M6.1).
          - Support adding and removing picket assignments per day with optimistic UI or live reload.
      - Teachers can still submit reports when on duty.

   b. R4.2 Perangkat Pembelajaran (src/components/DokumenView.tsx):
      - When `user?.role === 'Admin'`:
        * Remove tab "Upload Baru" (`upload`).
        * Transform the document list into a Teacher Matrix Card System:
          - Render cards for all 13 teachers.
          - Each card displays the teacher's name, NIP, assigned subjects from `guru_mapel`, and visual matrix/checklist of the 6 Kurikulum Merdeka documents:
            1. CP (Analisis Capaian Pembelajaran)
            2. ATP (Alur Tujuan Pembelajaran)
            3. RPE (Rencana Pekan Efektif)
            4. Prota (Program Tahunan)
            5. Promes (Program Semester)
            6. RPM (Rencana Pembelajaran Mendalam)
          - Indicator showing uploaded (green badge with link/preview icon) vs pending (red/gray dash).
          - KPI bar showing completion rate (e.g. "6/6 (100%)").
          - Quick verify or preview modal for uploaded documents.
      - Teachers can still upload their own documents when logged in as teacher.

   c. R5.1 Navigation & Menu (src/components/AppScreen.tsx):
      - Remove "Pantauan Harian" (`view-admin-monitor`) from Admin navigation menus.
      - Add "Informasi" (`view-informasi`) to both Admin and Guru navigation menus:
        * Label: "Informasi", Icon: "fa-bullhorn".
      - Render `<InformasiView user={user} setView={handleNavigation} />` when `currentView === 'view-informasi'`.
      - In the `<header>` element of `AppScreen.tsx`, add `print:hidden no-print` so the navbar never prints.

   d. R5.2 Broadcast System (src/components/InformasiView.tsx):
      - Build full-featured announcement view:
        * Queries `public.pengumuman` and `public.pengumuman_tanggapan`.
        * Filter announcements by audience (`sasaran`: 'Semua' | 'Guru' | 'Wali Kelas' | 'Orang Tua').
        * Modes: "Satu Arah" (broadcast only) and "Dua Arah" (allows comments/feedback from teachers/users in `pengumuman_tanggapan`).
        * Pinned announcements pinned to the top (`is_pinned`).
        * Admin can compose new announcements (title, content, target audience, communication mode, pin option), edit, and delete.
        * One-click "Kirim via WhatsApp" (`https://wa.me/?text=...`) to broadcast formatted announcement to WhatsApp groups.
        * Clean responsive design with badges, author info, timestamp, and modern glassmorphic styling.

   e. R5.3 UI Smooth Transitions (src/app/globals.css):
      - Add `@keyframes pageEnter` and apply to views for smooth entrance.
      - Add `@keyframes modalPop` for smooth dialog/modal appearance.
      - Add smooth hover transitions on buttons, cards, and interactive pills (`transition-all duration-200 ease-in-out`).
      - Add strict `@media print { header, nav, aside, .no-print { display: none !important; } }` and reset margins/paddings.

3. Verification:
   - Run `npx tsc --noEmit` and ensure 0 TypeScript errors.
   - Run test suites if applicable.
   - Run git status, git add ., git commit -m "feat(piket-info): implement picket assignment, teacher document matrix, broadcast system, and smooth UI transitions", git push origin main.
   - Deliver handoff.md with all 5 required sections (Observation, Logic Chain, Caveats, Conclusion, Verification).
   - Send completion message to parent.
