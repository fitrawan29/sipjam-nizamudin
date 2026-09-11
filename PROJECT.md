# Project: SIPJAM UI/UX, Relational Schema & Print Standardization

## Architecture
- **Framework**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase JS Client.
- **Theme Layer**: `ThemeContext` providing `'light'` and `'dark'` modes, strictly defaulting to `'light'` for all unconfigured sessions and persisting manual user toggles in `localStorage.getItem('sipjam_theme')`.
- **Media / Image Layer**: `src/lib/imageUrl.ts` utility converting all Google Drive sharing URLs (`/file/d/{id}/view`, `open?id={id}`, `uc?id={id}`) into direct image streaming URLs (`drive.google.com/uc?export=view&id={id}`), integrated across print headers, admin verification, and history cards.
- **Relational Data Layer**: `public.guru_mapel` table in Supabase mapping `(guru_id, nip, nama_guru, mapel_id, nama_mapel, kelas)`, populated via SQL migration and kept synchronized with `data_guru` via PostgreSQL trigger `trg_sync_guru_mapel`.
- **Form Dynamic Filtering Layer**: `src/components/GuruJurnal.tsx` querying `public.guru_mapel` to dynamically restrict Mapel and Kelas dropdowns exclusively to the authenticated teacher's assigned subjects and classes.
- **Print Standardization Layer**: `PrintHeader.tsx` enforcing strict `line-height: 1` and single-line address with dynamic font shrinking (`clamp()` and character-length scaling), plus `PrintSignature` rendering dynamic `"[Kabupaten/Kota], [Date]"` above `"Kepala Sekolah"`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Default Light Mode | Enforce Light Mode as default theme; ignore OS dark mode preference; persist manual toggles in `localStorage` | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Google Drive Image Transformer | Transform Google Drive share links into direct renderable image stream URLs across app | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Image Thumbnails in Admin & History | Display direct image previews in AdminVerifView, HistoryView, PiketView, and AdminConfigView | M1 | ORIGINAL_REQUEST §R1 & survey |
| 4 | Relational Schema (`guru_mapel`) | Create `guru_mapel` table with DDL, indexes, RLS, seed data (39 items), and auto-sync trigger | M2 | ORIGINAL_REQUEST §R2 |
| 5 | Dynamic Jurnal KBM Form Filtering | Filter Mata Pelajaran and Kelas dropdowns in GuruJurnal based on logged-in teacher identity | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Jurnal Dropdown Interactivity | Auto-sync Mapel and Kelas selection, handle Admin bypass and empty state notices | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Strict PrintHeader CSS Constraints | Single-line address (`white-space: nowrap !important;`) with dynamic font shrinking without logo overlap | M3 | ORIGINAL_REQUEST §R3 |
| 8 | Header Exact Line-Height 1 | Enforce `line-height: 1` (`leading-none`) on header text and Kop Surat elements | M3 | ORIGINAL_REQUEST §R3 |
| 9 | Dynamic Signature Block | Append `"[Kabupaten/Kota], [Date]"` immediately above "Kepala Sekolah" pulling region from `pengaturan.KOTA_TTD` | M3 | ORIGINAL_REQUEST §R3 |
| 10 | SweetAlert2 Standardization | Replace native `alert()` in RekapSiswaView with SweetAlert2 (`Swal.fire`) | M4 | ORIGINAL_REQUEST §R4 |
| 11 | Empty State Handling in Admin Rekap | Add empty state feedback for searches returning 0 records | M4 | ORIGINAL_REQUEST §R4 |
| 12 | Production Build & Git Push | Verify `npm run build` exits with 0 errors, execute git status/add/commit/push per GEMINI.md | M4 | ORIGINAL_REQUEST §R4 & GEMINI.md |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Default Theme & Google Drive Image Rendering | `ThemeContext.tsx`, `layout.tsx`, `AppScreen.tsx`, `imageUrl.ts`, `next.config.ts`, thumbnail renderers | none | PLANNED |
| M2 | Dynamic KBM Journal Filtering & Relational Schema | Supabase migration for `guru_mapel`, triggers, `GuruJurnal.tsx` dynamic queries & cascading dropdowns | none | PLANNED |
| M3 | Strict Print Formatting | `PrintHeader.tsx`, `globals.css` print styles, dynamic signature line, `AdminConfigView.tsx` `kota_ttd` field | M1 | PLANNED |
| M4 | Quality-of-Life Audit, Build Verification & Git Push | SweetAlert polish, empty states, `npm run build` verification, `git push origin main` | M1, M2, M3 | PLANNED |

## Interface Contracts

### `src/context/ThemeContext.tsx`
```typescript
export type Theme = 'light' | 'dark';
export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}
export function ThemeProvider({ children, defaultTheme = 'light' }: { children: React.ReactNode; defaultTheme?: Theme }): JSX.Element;
export function useTheme(): ThemeContextType;
```

### `src/lib/imageUrl.ts`
```typescript
export function getGoogleDriveFileId(url: string | null | undefined): string | null;
export function transformGoogleDriveUrl(url: string | null | undefined): string;
export function getGoogleDriveThumbnailUrl(url: string | null | undefined, size?: number): string;
export function isGoogleDriveUrl(url: string | null | undefined): boolean;
```

### Database Relational Schema `public.guru_mapel`
```sql
CREATE TABLE public.guru_mapel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id UUID REFERENCES public.data_guru(id) ON DELETE CASCADE,
    nip TEXT NOT NULL,
    nama_guru TEXT NOT NULL,
    mapel_id TEXT REFERENCES public.data_mapel(id) ON DELETE CASCADE,
    nama_mapel TEXT NOT NULL,
    mapel_singkat TEXT,
    kelas TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_guru_mapel UNIQUE (nip, nama_mapel)
);
```

## Code Layout
- `src/context/ThemeContext.tsx` (New) - React context for Light/Dark mode
- `src/lib/imageUrl.ts` (New) - URL parser and transformer for Google Drive and external images
- `supabase/migrations/20260911_guru_mapel_relational.sql` (New) - Migration script for relational tables
- `src/app/layout.tsx` (Modified) - Mount ThemeProvider
- `src/components/AppScreen.tsx` (Modified) - Integrate useTheme(), remove matchMedia override
- `src/components/GuruJurnal.tsx` (Modified) - Filter Mapel/Kelas dropdowns per teacher from `guru_mapel`
- `src/components/PrintHeader.tsx` (Modified) - Single-line address with dynamic shrinking, line-height: 1, dynamic signature
- `src/app/globals.css` (Modified) - Strict print media styles
- `src/components/AdminConfigView.tsx` (Modified) - Logo previews and `kota_ttd` configuration
- `src/components/AdminVerifView.tsx` (Modified) - Image thumbnails for Jurnal/Piket/Presensi
- `src/components/HistoryView.tsx` (Modified) - Image thumbnails
- `src/components/PiketView.tsx` (Modified) - Image thumbnails
- `src/components/RekapSiswaView.tsx` (Modified) - Replace native alert() with Swal.fire
- `next.config.ts` (Modified) - Remote image patterns for Google Drive / Google usercontent
