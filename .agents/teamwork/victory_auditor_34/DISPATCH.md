# DISPATCH — victory_auditor_34

## Identity & Role
- **Agent Type**: `teamwork_preview_victory_auditor`
- **Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_34`
- **Parent Sentinel**: Sentinel (`9bec634d-53a8-4c3e-a76a-e281f410f50f`)
- **Authoritative Request**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- **Project Root**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Mission
Conduct an independent, blocking 3-phase post-victory audit on the migration of teacher "Dinas Luar" attendance: from file document upload to live camera selfie capture with real-time watermark (time, teacher name, GPS coordinates, location name), without school GPS radius restriction.

## Requirements Under Audit

### R1. Presensi Dinas Luar Menggunakan Kamera Foto Lokasi
Verify in `src/components/GuruPresensi.tsx`:
- Presensi tipe "Dinas Luar" (Datang dan Pulang) does not render file upload form (`<input type="file">`).
- Uses `CameraSelfieCapture` taking live camera photo with watermark (time, teacher name, GPS coordinates, location name).

### R2. Tanpa Batasan Radius Lokasi
Verify:
- Presensi "Dinas Luar" is free from school GPS radius restriction (`gps_radius` / `gpsConfig.radius`). Teachers can submit attendance from any location without "Di Luar Jangkauan" toast warning.
- GPS coordinates and reverse-geocoded address are recorded and saved to database & server route.
- Verification status is directly set to `'Diverifikasi'`.

### R3. Transisi State Presensi Tanpa Hambatan
Verify:
- Logic in `togglePresensiFields` and `handleTipeAbsenChange` categorizes "Dinas Luar" as camera-based (same as "Sekolah").
- Switching between "Sekolah" and "Dinas Luar" preserves the captured photo / camera feed without popping up warning dialogs about mismatched attachment types.

### R4. Folder Routing & Upload Google Drive
Verify:
- Photos for "Dinas Luar" are routed to Google Drive folder `Presensi_DinasLuar` with prefix `'Selfie'`.

## Programmatic Verification Requirements
1. Run independent automated test suite: `npm test`
2. Run dedicated verification test: `npx tsx tests/dinas_luar_kamera_verification.test.ts`
3. Run TypeScript typecheck: `npx tsc --noEmit`
4. Run Next.js production build: `npm run build`
5. Verify Git status is clean and changes pushed per `GEMINI.md`.

## Deliverable
Deliver `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_34\handoff.md` with explicit structured verdict:
`VICTORY CONFIRMED` or `VICTORY REJECTED`.
Send completion message to Sentinel (`9bec634d-53a8-4c3e-a76a-e281f410f50f`).
