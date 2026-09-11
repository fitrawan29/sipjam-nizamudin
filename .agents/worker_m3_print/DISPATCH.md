## 2026-09-11T13:09:05Z

You are Worker M3 implementing Milestone 3: Strict Print Formatting (PrintHeader & Signatures) for sipjam-app.

CRITICAL INSTRUCTIONS & INTEGRITY WARNING:
- First read the authoritative user requirements in:
  `c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md` (specifically ## 2026-09-11T12:54:07Z, Requirement R3).
- Read the project specification in:
  `c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md`.
- Read the detailed survey and implementation blueprint in:
  `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m3_survey\handoff.md`.
- Your working directory for coordination files is:
  `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m3_print`.
- Maintain `progress.md` and write your completion handoff report to:
  `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m3_print\handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE FILE OWNERSHIP:
You have exclusive write ownership of:
- `src/components/PrintHeader.tsx`
- `src/app/globals.css`
- `src/components/AdminConfigView.tsx` (for `kota_ttd` field addition)

Do NOT touch `GuruJurnal.tsx`, `AppScreen.tsx`, or `layout.tsx`.

IMPLEMENTATION REQUIREMENTS:
1. `src/components/PrintHeader.tsx` - `PrintHeader` component:
   - Import `transformGoogleDriveUrl` from `@/lib/imageUrl` and use it on `config.logo_kiri` and `config.logo_kanan` inside `<img src={...} />`.
   - Ensure logos container has `shrink-0 w-24 h-24`.
   - The school address line must remain on a single horizontal line (`white-space: nowrap !important;` or `whitespace-nowrap`).
   - If the school address is long or risks overlapping left/right logos, its font size must dynamically shrink. Implement dynamic font size scaling (character-length based calculation e.g. `getAddressFontSize` in React and container queries / `clamp()` in CSS).
   - Line spacing (`line-height`) for the header text must be exactly `1` (`leading-none`). Ensure `leading-none` or `line-height: 1` on the wrapper, h1, h2, and p elements.

2. `src/components/PrintHeader.tsx` - `PrintSignature` component:
   - In the signature block, append the dynamic string `"[Kabupaten/Kota], [Date]"` immediately above the `"Kepala Sekolah"` designation.
   - Pull the region dynamically from settings (`config.kota_ttd || config.KOTA_TTD` or fallback to extracting from `config.kop_alamat`).
   - Format the date in Indonesian format using WITA timezone (`timeZone: 'Asia/Makassar'`, e.g., `"11 September 2026"`).
   - Display: `<p className="leading-tight text-xs sm:text-sm">{region ? `${region}, ` : ''}{dateStr}</p>` immediately preceding `<p className="mb-24 leading-tight text-xs sm:text-sm">Kepala Sekolah</p>`.

3. `src/app/globals.css` Print Media Rules:
   - Under `@media print`:
     * Enforce `.print-header, .print-header h1, .print-header h2, .print-header p, .print-header div, .print-header span { line-height: 1 !important; }`.
     * Add `.print-address { white-space: nowrap !important; line-height: 1 !important; font-size: clamp(6.5pt, 1.35vw, 9.5pt) !important; overflow: hidden !important; text-overflow: clip !important; }`.
     * Add container query `@container (max-width: 550px) { .print-address { font-size: clamp(6pt, 2.1cqw, 9pt) !important; } }`.
     * Add pagination protection: `.print-signature, .print-header, table, tr, img { page-break-inside: avoid !important; break-inside: avoid !important; }`.

4. `src/components/AdminConfigView.tsx`:
   - Add input field for `kota_ttd` (Kabupaten/Kota untuk Tanda Tangan) in the settings form, enabling administrators to configure the region.

5. Verification:
   - Run `npm run build` to verify clean compilation with 0 errors.
   - Document all changes and verification output in your handoff report.
   - Notify parent via `send_message` when complete.
