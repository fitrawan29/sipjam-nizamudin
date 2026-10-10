## 2026-10-10T10:28:36Z
Anda adalah Explorer 2 (explorer_o19_2).
Working directory Anda: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o19_2
Baca file ORIGINAL_REQUEST.md di: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (terutama bagian ## 2026-10-10T10:25:07Z)
Baca juga DISPATCH.md di: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_19\DISPATCH.md

Tugas Anda adalah investigasi teknis (read-only) untuk Phase 2 (R5, R6, R7):
1. R5: Rancang `src/types/user.ts` dengan interface `AppUser`. Periksa tipe `user: any` di `src/components/AppScreen.tsx`, `src/components/HomeView.tsx`, `src/components/LoginScreen.tsx`, dan `src/components/GuruPresensi.tsx`. Identifikasi field apa saja yang diakses dan pastikan interface `AppUser` kompatibel tanpa breaking changes.
2. R6: Investigasi `src/components/AppScreen.tsx`. Periksa baris-baris logic yang akan diekstrak menjadi 4 custom hooks di `src/hooks/`:
   - `useSessionSync(user, onLogout, onUserUpdate)` (sekitar baris 77-162)
   - `useWaliKelas(user, isAdmin, syncKey)` (sekitar baris 210-264)
   - `usePiket(user, isAdmin, isSuperadmin, syncKey)` (sekitar baris 266-291)
   - `useBroadcasts(user, isAdmin, isWaliKelas, syncKey)` (sekitar baris 316-421)
   Tentukan parameter input, return values, dependensi state/ref/import, dan bagaimana `AppScreen.tsx` meng-consume mereka.
3. R7: Investigasi `src/components/HomeView.tsx` (1831 baris). Pahami struktur komponen, state, props, helper function, dan conditional rendering antara tampilan Guru vs tampilan Admin/Superadmin. Rancang pemisahan bersih menjadi:
   - `src/components/HomeViewGuru.tsx`
   - `src/components/HomeViewAdmin.tsx`
   - `src/components/HomeView.tsx` (wrapper tipis < 200 baris yang memilih render berdasarkan role)
   Pastikan tidak ada prop/state yang hilang dan backward-compatibility import tetap terjaga.

Tulis laporan analisis lengkap di `analysis.md` dan ringkasan di `handoff.md` di working directory Anda. Kirim pesan ke parent ketika selesai. JANGAN memodifikasi kode sumber.
