## 2026-10-10T13:04:10Z

Anda adalah Worker 2 (worker_o19_2) untuk proyek SIPJAM di `c:\Users\Fitra\OneDrive\Documents\sipjam-app`.
Working directory Anda: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o19_2`.

BACA SUMBER BERIKUT:
1. ORIGINAL_REQUEST.md: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (bagian ## 2026-10-10T10:25:07Z)
2. DISPATCH.md: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_19\DISPATCH.md`
3. Progres sebelumnya: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o19_1\progress.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

STATUS SAAT INI:
Worker sebelumnya telah menyelesaikan sebagian besar implementasi:
- R1 s/d R4, R8, R9, R10 sudah diimplementasikan di kode
- R5: `src/types/user.ts` sudah dibuat
- R6: 4 hooks di `src/hooks/` sudah dibuat (`useSessionSync.ts`, `useWaliKelas.ts`, `usePiket.ts`, `useBroadcasts.ts`)
- R7: `HomeViewGuru.tsx`, `HomeViewAdmin.tsx`, dan `HomeView.tsx` (< 200 baris) sudah dipisah

TUGAS ANDA:
1. Verifikasi kelengkapan R1 s/d R10:
   - Cek `src/app/api/attendance/route.ts` dan `.env.local` (pastikan tidak ada password hardcoded 'SipjamSuperAdmin', dan SUPERADMIN_API_PASSWORD ada di .env.local).
   - Cek `src/app/page.tsx` (pastikan tidak ada `supabase.auth`, render MainApp langsung).
   - Cek `src/components/HomeView.tsx` (isGuru = !isAdmin, line count < 200).
   - Cek `src/components/AdminVerifView.tsx` (channel verif mengandung user?.sekolah_id || 'global').
   - Cek `src/app/layout.tsx` (preconnect cdnjs sebelum Font Awesome link).
   - Cek `src/lib/supabaseClient.ts` (once-flag `_connectivityChecked`).
   - Cek `src/app/api/sync-spreadsheet` (pastikan sudah dihapus).
   - Cek `src/types/user.ts` (export AppUser) dan pastikan digunakan di `AppScreen.tsx`, `HomeView.tsx`, `LoginScreen.tsx`, `GuruPresensi.tsx`.
   - Cek `AppScreen.tsx` (pastikan mengimport dan meng-consume keempat hooks dari `src/hooks/`).
2. Buat file tes verifikasi programmatik `tests/r1_r10_ponytail_verification.test.ts` yang menguji semua Acceptance Criteria:
   - Grep 'SipjamSuperAdmin' di src/ (harus 0)
   - .env.local memiliki SUPERADMIN_API_PASSWORD
   - Grep 'supabase.auth' di src/app/page.tsx (harus 0)
   - Grep "verif-presensi'" di src/components/AdminVerifView.tsx (harus 0)
   - src/types/user.ts mengekspor AppUser
   - Keempat hooks ada di src/hooks/ dan diimport di AppScreen.tsx
   - HomeViewGuru.tsx dan HomeViewAdmin.tsx ada
   - HomeView.tsx baris < 200
   - preconnect di src/app/layout.tsx
   - once-flag di src/lib/supabaseClient.ts
   - src/app/api/sync-spreadsheet tidak ada
3. Verifikasi legacy tests:
   Jika ada test usang di `tests/` yang membaca file statis (misal membaca `HomeView.tsx` dan gagal karena HomeView sekarang split ke HomeViewGuru/HomeViewAdmin), sesuaikan test tersebut atau sesuaikan script `test` di `package.json` agar `npm test` menjalankan test suite yang valid dan keluar dengan exit code 0.
4. Jalankan `npm test` dan pastikan lulus 100% (exit code 0).
5. Jalankan `npm run build` dan pastikan kompilasi Next.js berhasil tanpa error TypeScript.
6. Jalankan Git Workflow sesuai aturan GEMINI.md:
   - `git status`
   - `git add .`
   - `git commit -m "ponytail: security fix, bug fixes, refactor & perf improvements"`
   - `git push origin main`
7. Tulis laporan hasil di `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o19_2\handoff.md` dan kirim pesan selesai ke orchestrator.
