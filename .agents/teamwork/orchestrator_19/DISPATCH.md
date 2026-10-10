# Orchestrator Dispatch — orchestrator_19

## Mission
Lakukan perbaikan komprehensif pada aplikasi SIPJAM (Next.js 16 + Supabase) sesuai spesifikasi pada user request terbaru (2026-10-10T10:25:07Z): dari isu keamanan kritis (hardcoded password, duplikasi auth) hingga bug korektif (isGuru check, realtime channel scoping) dan optimasi performa (preconnect CDN, connectivity test once-flag, pemecahan komponen besar), menggunakan pendekatan ponytail: solusi paling minimal yang berfungsi, tanpa menambah dependency baru.

## Identity & Paths
- **Role**: Project Orchestrator (`orchestrator_19`)
- **Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_19`
- **Original Request**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (bagian `## 2026-10-10T10:25:07Z`)

## Context & Integrity Mode
- Working directory: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`
- Integrity mode: `development`
- Stack: Next.js 16.3.4, React 19, TypeScript, Supabase JS v2, TailwindCSS v4, SweetAlert2, web-push
- Test runner: `tsx` — jalankan dengan `npm test`

## Requirements
- **R1. Keamanan: Hapus Hardcoded Credentials**:
  File `src/app/api/attendance/route.ts` memiliki password Superadmin dalam plaintext sebagai fallback. Pindahkan ke environment variable `SUPERADMIN_API_PASSWORD` di `.env.local`. Jika env var tidak tersedia, fungsi `resolveSessionToken` cukup return `null` tanpa mencoba auto-login.
- **R2. Hapus Duplikasi Auth State**:
  Komponen `Home()` di `src/app/page.tsx` memanggil `supabase.auth.getSession()` dan mendengarkan `onAuthStateChange`, namun hasilnya tidak pernah digunakan — `MainApp` hanya membaca `sipjam_user` dari localStorage. Hapus seluruh auth check di `Home()` dan render `MainApp` langsung (dengan loading state minimal jika diperlukan).
- **R3. Fix Bug isGuru di HomeView**:
  Di `src/components/HomeView.tsx` baris 78, perbaiki agar `isGuru = !isAdmin`, konsisten dengan pola di `AppScreen.tsx`:
  ```ts
  const role = (user?.role || '').toLowerCase().replace(/\s+/g, '');
  const isSuperadmin = role === 'superadmin';
  const isAdmin = isSuperadmin || role === 'admin';
  const isGuru = !isAdmin;
  ```
- **R4. Scope Realtime Channel per Sekolah di AdminVerifView**:
  Di `src/components/AdminVerifView.tsx`, channel names `'verif-presensi'`, `'verif-jurnal'`, `'verif-piket'` harus ditambahkan `sekolah_id`:
  ```ts
  supabase.channel(`verif-presensi-${user?.sekolah_id || 'global'}`)
  ```
  Lakukan untuk ketiga channel.
- **R5. Tambah AppUser Interface**:
  Buat file `src/types/user.ts` dengan interface `AppUser`:
  ```ts
  export interface AppUser {
    id: string;
    username: string;
    nama: string;
    role: string;
    sekolah_id: string;
    session_token: string;
    avatar?: string | null;
    wali_kelas?: string | { kelas: string } | null;
  }
  ```
  Ganti `user: any` di setidaknya komponen utama: `AppScreen.tsx`, `HomeView.tsx`, `LoginScreen.tsx`, dan `GuruPresensi.tsx`.
- **R6. Extract Hooks dari AppScreen.tsx**:
  Extract logic berikut ke custom hooks di `src/hooks/`:
  - `useSessionSync(user, onLogout, onUserUpdate)` — idle revalidation
  - `useWaliKelas(user, isAdmin, syncKey)` — cek wali kelas
  - `usePiket(user, isAdmin, isSuperadmin, syncKey)` — cek piket
  - `useBroadcasts(user, isAdmin, isWaliKelas, syncKey)` — pengumuman realtime
  `AppScreen.tsx` kemudian consume keempat hooks tersebut. Jangan ubah behavior — hanya pindahkan logic.
- **R7. Split HomeView menjadi Dua Komponen**:
  Pisahkan `HomeView.tsx` menjadi:
  - `src/components/HomeViewGuru.tsx` — dashboard khusus Guru
  - `src/components/HomeViewAdmin.tsx` — dashboard khusus Admin
  - `src/components/HomeView.tsx` — wrapper kecil yang memilih komponen berdasarkan role (< 200 baris)
- **R8. Tambah preconnect Font Awesome di layout.tsx**:
  Di `src/app/layout.tsx`, tambahkan `<link rel="preconnect" href="https://cdnjs.cloudflare.com" />` sebelum tag stylesheet Font Awesome.
- **R9. Fix Connectivity Test Supabase — Once-Flag**:
  Di `src/lib/supabaseClient.ts`, tambahkan once flag agar connectivity test hanya dijalankan sekali.
- **R10. Investigasi dan Bersihkan Dead Code sync-spreadsheet**:
  Direktori `src/app/api/sync-spreadsheet/` jika benar dead code, hapus. Laporan temuan harus disebutkan dalam commit message.

## Acceptance Criteria
- Keamanan: `grep -r 'SipjamSuperAdmin' src/` return kosong; `.env.local` memiliki `SUPERADMIN_API_PASSWORD`.
- Korektifitas: `npm test` exit code 0; `npm run build` sukses; `grep -n 'supabase.auth' src/app/page.tsx` kosong; `grep "verif-presensi'" src/components/AdminVerifView.tsx` kosong.
- Arsitektur: `src/types/user.ts` ada & export `AppUser`; 4 hooks ada di `src/hooks/`; `AppScreen.tsx` import keempat hooks; `HomeViewGuru.tsx` & `HomeViewAdmin.tsx` ada; `HomeView.tsx` < 200 baris.
- Performa & Kebersihan: preconnect ada di `layout.tsx`; once-flag di `supabaseClient.ts`; `git status` clean.
- Git Workflow Rule: commit and push automatically:
  `git add . && git commit -m "ponytail: security fix, bug fixes, refactor & perf improvements" && git push origin main`
- Jangan install dependency baru.

## Completion
Tulis `handoff.md` di working directory Anda dan laporkan hasil akhir kepada Sentinel.
