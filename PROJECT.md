# Project: SIPJAM - Milestone 6: Full Dashboard, Print, Piket, Perangkat, Broadcast & Transitions Overhaul

## Architecture
- **Framework**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase JS Client.
- **Print Engine**: Dynamic `@page` CSS injection supporting real-time Landscape/Portrait orientation toggle, strict `@media print` layout cleanup (`print:hidden` for navbar/sidebar), justified signature container, high-res activity photos, and professional table borders.
- **Teacher Dashboard Engine**: Live calculation of personal attendance stats (H, TL, I, S), dynamic daily journal target ratio (`jadwal_pelajaran` today), student attendance percentage per subject (`guru_mapel` + `jurnal_pembelajaran.absensi_siswa`), and curriculum document completeness checklist.
- **Admin Dashboard & Verification Engine**: Comprehensive daily teacher status matrix (Presensi Datang, Jurnal, Piket, Presensi Pulang) and reactive client-side dropdown filters ("Sudah" / "Belum") in AdminVerifView.
- **Picket & Learning Devices Management**: Day-by-day picket scheduling ("Penugasan Piket") replacing "Isi Laporan" for Admin, and teacher matrix cards for Perangkat Pembelajaran replacing "Upload Baru" for Admin.
- **Broadcast Information System**: Announcement system (`public.pengumuman` & `public.pengumuman_tanggapan`) replacing "Pantauan Harian" with audience targeting (Semua, Guru, Wali Kelas, Orang Tua), 1-way & 2-way modes, and WhatsApp broadcast integration.
- **Motion & Transition Layer**: Smooth CSS keyframes and transitions for hover states, modals, and page transitions.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Supabase Migration for Pengumuman & Penugasan Piket | Tables `pengumuman`, `pengumuman_tanggapan`, `penugasan_piket`, `bank_dokumen.mapel` | M6.1 | R4, R5 & survey |
| 2 | TypeScript Types Synchronization | Add database types to `src/types/database.ts` | M6.1 | Verification criteria |
| 3 | Print Orientation Toggle (Landscape / Portrait) | Interactive toggle button dynamically injecting `@page { size: A4 orientation }` | M6.2 | R1 |
| 4 | Navbar & Sidebar Print Hiding | Enforce `print:hidden` and `@media print` rules to prevent navigation from printing | M6.2 | R1 |
| 5 | Justified Signature Blocks | Container justified (`justify-between`), elements on individual lines, zero wrapping | M6.2 | R1 |
| 6 | Dynamic Period/Date Range Header | Display formatted date range (e.g. "Periode: September 2026") in print header | M6.2 | R1 |
| 7 | Journal Activity Photo Rendering | Render high-res thumbnail (`getGoogleDriveThumbnailUrl(..., 800)`) with clear aspect ratio | M6.2 | R1 |
| 8 | Professional Table Styling for Rekap Akhir & Siswa | 10-column table for Admin Rekap and enhanced bordered grid for Rekap Siswa | M6.2 | R1 |
| 9 | Teacher Dashboard: Remove "Aktivitas Utama" | Delete deprecated button grid from HomeView | M6.3 | R2 |
| 10 | Teacher Dashboard: Personal Attendance Cards | Cards for Hadir (H), Terlambat (TL), Izin, Sakit from `presensi_guru` | M6.3 | R2 |
| 11 | Teacher Dashboard: Dynamic Target Journal Ratio | Calculate today's journal target from `jadwal_pelajaran` and track completion ratio | M6.3 | R2 |
| 12 | Teacher Dashboard: Student Attendance % per Mapel | Calculate student attendance percentage for each subject taught from journal logs | M6.3 | R2 |
| 13 | Teacher Dashboard: Document Completeness List | Status list of uploaded vs pending documents per subject from 6 standard types | M6.3 | R2 |
| 14 | Admin Dashboard: Daily Teacher Status Matrix | Live matrix mapping all teachers: Datang, Jurnal, Piket, Pulang | M6.3 | R3 |
| 15 | Admin Verification: Reactive Dropdown Filters | Dropdown for "Sudah" / "Belum" completing tasks without page reload or flicker | M6.3 | R3 |
| 16 | Admin Piket: Penugasan Piket System | Day-by-day scheduling for teachers and students replacing "Isi Laporan" tab | M6.4 | R4 |
| 17 | Admin Perangkat: Teacher Matrix Cards | Teacher matrix cards showing subjects and document upload indicators replacing "Upload Baru" | M6.4 | R4 |
| 18 | Navigation: Remove Pantauan Harian & Add Informasi | Remove "Pantauan Harian" from menus; add "Informasi" menu | M6.4 | R5 |
| 19 | Broadcast Information System (`InformasiView.tsx`) | Announcement broadcaster with multi-target audience, 1-way / 2-way modes, WhatsApp share | M6.4 | R5 |
| 20 | Modern UI Transitions & Motion | Smooth hover effects, modal transitions, and page entry animations in `globals.css` | M6.4 | R5 |
| 21 | Full Verification, E2E Testing & Git Push | Type checking, build verification, adversarial review, audit, auto git commit & push | M6.5 | Acceptance & GEMINI.md |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M6.1 | Database Migrations & TypeScript Schema | Supabase SQL execution (`pengumuman`, `penugasan_piket`, `bank_dokumen.mapel`) & `database.ts` | none | DONE |
| M6.2 | Document Printing Redesign (R1) | `RekapJurnalView.tsx`, `AdminRekapView.tsx`, `RekapSiswaView.tsx`, `PrintHeader.tsx` | M6.1 | DONE |
| M6.3 | Teacher & Admin Dashboards & Verification (R2 & R3) | `HomeView.tsx`, `AdminVerifView.tsx` | M6.1 | DONE |
| M6.4 | Piket, Perangkat, Broadcast & Transitions (R4 & R5) | `PiketView.tsx`, `DokumenView.tsx`, `InformasiView.tsx`, `AppScreen.tsx`, `globals.css` | M6.1 | DONE |
| M6.5 | Review, Adversarial Testing, Audit & Git Push | E2E verification, tsc, review, challenger, forensic audit, git commit & push | M6.2, M6.3, M6.4 | DONE |

## Code Layout
- `supabase/migrations/20260912_m6_overhaul.sql` (New) - SQL migration for Pengumuman & Penugasan Piket
- `src/types/database.ts` (Modified) - Updated schema types for new tables
- `src/components/PrintHeader.tsx` (Modified) - Dynamic period header, justified signature container
- `src/components/RekapJurnalView.tsx` (Modified) - Print orientation toggle, photo rendering, table styling
- `src/components/AdminRekapView.tsx` (Modified) - Print orientation toggle, 10-column table layout, print headers
- `src/components/RekapSiswaView.tsx` (Modified) - Print orientation toggle, enhanced bordered table
- `src/components/HomeView.tsx` (Modified) - Remove "Aktivitas Utama", add Teacher stats & target journal ratio, add Admin daily status matrix
- `src/components/AdminVerifView.tsx` (Modified) - Add reactive dropdown filters ("Sudah" / "Belum" & status)
- `src/components/PiketView.tsx` (Modified) - Remove "Isi Laporan" in Admin mode, add "Penugasan Piket" tab
- `src/components/DokumenView.tsx` (Modified) - Remove "Upload Baru" in Admin mode, add Teacher Matrix Cards
- `src/components/InformasiView.tsx` (New) - Broadcast announcement system
- `src/components/AppScreen.tsx` (Modified) - Remove "Pantauan Harian", add "Informasi" navigation, hide header during print
- `src/app/globals.css` (Modified) - Print media CSS, animation keyframes, smooth hover & transitions
