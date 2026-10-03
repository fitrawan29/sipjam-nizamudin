# DISPATCH — worker_o10_m2_fix

## Milestone
Milestone 2 (M2) Remediation: Fix QR Format Information Bits & Code Quality in qrSiswa.ts and AdminDataView.tsx

## Problem Description & Review Feedback
Reviewer 1 (`reviewer_o10_m2_1`) identified a critical bug in `src/lib/qrSiswa.ts` causing real-world QR scanners and cameras to fail to decode generated student QR codes:
1. Format Information Bits Encoding (`src/lib/qrSiswa.ts` lines 269–291):
   - Replace the format bits constant `0x77a5` with standard ISO/IEC 18004 Level L Mask 0 constant `0x77c4`.
   - In the format bits assignment loop, evaluate `const bit = ((formatBits >> i) & 1) === 1;` (LSB first) instead of `14 - i`.
   - Specifically:
     ```typescript
     // 7. Format Information (Level L, Mask 0: 0x77c4)
     const formatBits = 0x77c4;
     for (let i = 0; i < 15; i++) {
       const bit = ((formatBits >> i) & 1) === 1;
       if (i < 6) {
         matrix[8][i] = bit;
       } else if (i === 6) {
         matrix[8][7] = bit;
       } else if (i === 7) {
         matrix[8][8] = bit;
       } else if (i === 8) {
         matrix[7][8] = bit;
       } else {
         matrix[14 - i][8] = bit;
       }

       if (i < 8) {
         matrix[size - 1 - i][8] = bit;
       } else {
         matrix[8][size - 15 + i] = bit;
       }
     }
     ```
2. Wildcard Sanitization (`src/lib/qrSiswa.ts`):
   - In `resolveStudentByCode`, strip or escape `%` and `_` from `cleanCode` prior to `ilike('nisn', cleanCode)`.
3. HTML Escaping (`src/components/AdminDataView.tsx`):
   - Add HTML entity escaping (for `&`, `<`, `>`, `"`, `'`) when interpolating student fields (`nama_siswa`, `kelas`, `nisn`) in `printStudentQrCard`, `handleShowStudentQr`, and `handlePrintBatchQrCards`.

## Verification & Git Instructions
1. Run `npx tsc --noEmit` (must pass with 0 errors).
2. Run `npm test` (all tests must pass).
3. Run `npm run build` (Turbopack production build must pass).
4. Follow GEMINI.md:
   a. git status
   b. git add .
   c. git commit -m "fix(qr): correct ISO/IEC 18004 format info bits in qrSiswa and sanitize inputs"
   d. git push origin main
5. Write handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o10_m2_fix\handoff.md`.
