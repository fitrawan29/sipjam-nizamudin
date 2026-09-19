# Project: SIPJAM Milestone 10 Enhancements

## Architecture
SIPJAM is a Next.js (App Router) + Supabase application with multi-tenant RLS, role-based access (Superadmin, Admin, Guru, Wali Kelas), PWA capabilities, real-time sync, and client-side camera/watermark processing.

### Modules & Boundaries
1. **Database & Schema Layer (`supabase/migrations/`, `src/types/database.ts`)**:
   - `syarat_perangkat_pembelajaran`: document requirements per subject (types, formats, wajib, urutan) with RLS.
   - `catatan_admin` column additions on `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`.
2. **Print Layout & Letterhead Layer (`src/components/PrintHeader.tsx`, `src/app/globals.css`, print views)**:
   - Removal of forced `@page` orientation settings; reliance on browser print settings.
   - Responsive print table styles, continuous pagination without vertical 600px clipping.
   - Symmetric 3-column Kop Surat with reliable Google Drive thumbnail streaming (`lh3.googleusercontent.com/d/{id}=w800`), tenant logo resolution, and text overlap prevention.
3. **Admin Perangkat Pembelajaran & Status Matrix (`src/components/DokumenView.tsx`, `src/components/HomeView.tsx`)**:
   - Admin CRUD for document requirements and formats per subject.
   - Teacher document completeness tracking by subject (`uploaded / required * 100%`).
   - Minimalist progress cards with click-to-expand drawer.
   - Accurate DB aggregation for Admin Daily Status Matrix in `HomeView.tsx` (resilient date filtering, direct `penugasan_piket` check, multi-tenant isolation, Dinas Luar / holiday support).
4. **Teacher Dashboard, Camera Geolocation & Attendance (`src/components/HomeView.tsx`, `CameraSelfieCapture.tsx`, `watermarkCanvas.ts`, `RekapSiswaView.tsx`)**:
   - Strict 3-section Teacher Dashboard: (1) Personal Stats, (2) Today's Task Status, (3) Teaching Schedule. Extraneous widgets removed.
   - OpenStreetMap Nominatim reverse geocoding: `[desa/kelurahan, kecamatan, kota/kabupaten, provinsi]` on front and rear camera watermarks.
   - Student attendance percentage formula fix: `(total_present / total_students) * 100`.
5. **User Prompts & Rejection Feedback Flows (`src/components/PWAInstallPrompt.tsx`, `public/manifest.json`, `src/components/AdminVerifView.tsx`)**:
   - PWA install prompt at application start, persistent dismissal / standalone mode detection.
   - Mandatory admin rejection feedback modal blocking submission until reason is populated, saving to backend.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | DB Migration & Types | `syarat_perangkat_pembelajaran` table, `catatan_admin` columns, TS types | M10.1 | R2, R4 |
| 2 | Free Browser Print Orientation | Remove forced `@page size: A4 ${orientation} !important;` | M10.2 | R1 |
| 3 | Print Table Responsive Pagination | Prevent vertical clipping (`max-height: none`, `overflow: visible`), prevent column cutoff | M10.2 | R1 |
| 4 | Kop Surat Logo & Text Layout | High-res image streaming, tenant logos, balanced 3-column layout without text overlap | M10.2 | R1 |
| 5 | PWA Install Prompt | First-load install prompt with standalone check & dismissal persistence | M10.2 | R4 |
| 6 | Mandatory Admin Rejection Feedback | Require reason before rejecting presensi, jurnal, or piket, save to DB | M10.2 | R4 |
| 7 | Perangkat Pembelajaran CRUD | Admin UI to manage document types and formats per subject | M10.3 | R2 |
| 8 | Document Progress Cards | Minimalist cards per teacher per subject with click-to-expand details | M10.3 | R2 |
| 9 | Admin Daily Status Matrix Fix | Resilient date queries, `penugasan_piket` sync, `sekolah_id`, Dinas Luar & holiday rules | M10.3 | R2 |
| 10 | Teacher Dashboard Reordering | Strictly (1) Personal Stats, (2) Task Status, (3) Teaching Schedule | M10.3 | R3 |
| 11 | OSM Nominatim Camera Location | Reverse geocode coordinates to `[desa, kecamatan, kota, provinsi]` on watermark | M10.3 | R3 |
| 12 | Student Attendance Percentage Fix | Correct formula `(total_present / total_students) * 100` in RekapSiswa | M10.3 | R3 |
| 13 | E2E Acceptance, Audit & Git Delivery | Comprehensive automated tests, Reviewers, Challengers, Forensic Auditor, Git commit & push | M10.4 | All |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M10.1 | DB Schema & Migrations | Migration SQL for `syarat_perangkat_pembelajaran` & `catatan_admin` + TS types | none | PLANNED |
| M10.2 | Print Layout, Logos, PWA & Rejection | R1 (Print orientation, tables, kop surat) & R4 (PWA prompt, rejection feedback) | M10.1 | PLANNED |
| M10.3 | Perangkat, Matrix, Dashboard, Camera & Attendance | R2 (Perangkat CRUD, cards, admin matrix) & R3 (Teacher dashboard, OSM camera, attendance %) | M10.1 | PLANNED |
| M10.4 | E2E Testing, Review, Forensic Audit & Git Delivery | Regression test suite, Reviewers, Challengers, Forensic Auditor, Git push | M10.2, M10.3 | PLANNED |

---

## Code Layout
- `supabase/migrations/20260919_milestone10_schema.sql`: Migration script for `syarat_perangkat_pembelajaran` and `catatan_admin`
- `src/types/database.ts`: TypeScript types for new tables and updated schema
- `src/components/PrintHeader.tsx`: Browser-native print settings, Kop Surat logos & 3-column layout
- `src/app/globals.css`: Print media styles for tables, overflow reset, and pagination
- `src/components/GradebookView.tsx`: Print table responsive pagination
- `src/components/PWAInstallPrompt.tsx`: PWA install prompt banner/modal
- `public/manifest.json`: Web app manifest configuration
- `src/components/AdminVerifView.tsx`: Mandatory rejection feedback dialog and backend mutation
- `src/components/DokumenView.tsx`: Admin Perangkat Pembelajaran CRUD, teacher progress cards
- `src/components/HomeView.tsx`: Admin Daily Status Matrix data aggregation fix & Teacher Dashboard reordering
- `src/components/CameraSelfieCapture.tsx`: Geolocation reverse geocoding via Nominatim
- `src/lib/watermarkCanvas.ts`: 4-line watermark badge with formatted location string
- `src/components/RekapSiswaView.tsx`: Student attendance percentage calculation fix
- `tests/m10_comprehensive.test.ts`: Milestone 10 automated test suite

---

## Interface Contracts
### `public.syarat_perangkat_pembelajaran`
- `id`: UUID (PK, DEFAULT gen_random_uuid())
- `sekolah_id`: UUID (FK to `sekolah.id`, NOT NULL)
- `nama_mapel`: TEXT (DEFAULT 'Semua Mapel')
- `kode_dokumen`: TEXT (NOT NULL)
- `nama_dokumen`: TEXT (NOT NULL)
- `format_dokumen`: TEXT (DEFAULT 'PDF, DOCX')
- `wajib`: BOOLEAN (DEFAULT TRUE)
- `urutan`: INTEGER (DEFAULT 0)
- `created_at`: TIMESTAMPTZ (DEFAULT NOW())

### Rejection Feedback Column Additions
- `public.presensi_guru`: `catatan_admin TEXT DEFAULT NULL`
- `public.jurnal_pembelajaran`: `catatan_admin TEXT DEFAULT NULL`
- `public.laporan_piket`: `catatan_admin TEXT DEFAULT NULL`

### Nominatim Reverse Geocoding Format
- Format: `[desa/kelurahan, kecamatan, kota/kabupaten, provinsi]`
- Fallback: `[Lat: X, Lng: Y]` if reverse geocoding fails or offline
