# Dispatch: Reviewer Round 1 (teamwork_preview_reviewer)

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_blok_r1
Parent Orchestrator: swe_4 (Conversation ID: 7c1be4a3-fd8c-43e3-a13f-9548be42a2e6)

<original_task>
Fitur Sistem Blok: Membuat fitur manajemen sistem blok waktu. Rentang waktu yang diblokir akan menandakan bahwa tidak ada jadwal mengajar reguler, melainkan digantikan oleh kegiatan khusus. Selama periode ini, guru hanya bertugas mengisi jurnal kegiatan.
Ini adalah tugas yang relatif terisolasi, gunakan tim kecil yang fokus.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Halaman Manajemen Sistem Blok (CRUD)
Buat halaman (UI) untuk mengelola (menambah, mengedit, menghapus) periode sistem blok. Data yang disimpan minimal mencakup tanggal mulai, tanggal selesai, dan nama/deskripsi kegiatan.

### R2. Penyesuaian Tampilan Jadwal
Modifikasi tampilan jadwal mengajar. Jika suatu rentang waktu masuk dalam periode sistem blok yang aktif, jadwal reguler di database tidak boleh dihapus, namun di UI jadwal tersebut harus disembunyikan/ditutupi dan diganti dengan informasi kegiatan blok.

### R3. Jurnal Kegiatan Guru
Selama rentang waktu sistem blok, alur pengisian jurnal guru harus disesuaikan. Guru hanya perlu/bisa mengisi "jurnal kegiatan" untuk periode tersebut, bukan jurnal absensi/mengajar kelas reguler.

### R4. Batasan Implementasi
Gunakan komponen UI dan styling yang sudah ada di dalam project (jangan install library eksternal baru). Ikuti prinsip minimalis (hanya buat apa yang benar-benar dibutuhkan agar fitur ini jalan).

## Acceptance Criteria

### Manajemen Blok (R1)
- [ ] Terdapat form untuk menambahkan periode blok baru yang menyimpan data ke database.
- [ ] Daftar periode blok yang sudah dibuat dapat dilihat dan dihapus/diedit.

### Tampilan Jadwal (R2)
- [ ] Jadwal mengajar reguler yang bertabrakan dengan tanggal blok tidak ditampilkan seperti biasa.
- [ ] Halaman jadwal menampilkan informasi kegiatan blok pada tanggal-tanggal yang terpengaruh.
- [ ] Data jadwal asli di database terbukti tidak terhapus.

### Jurnal Kegiatan (R3)
- [ ] Terdapat form atau penyesuaian UI agar guru dapat mengisi jurnal kegiatan (bukan jurnal reguler) pada hari yang masuk dalam periode blok.
</original_task>

<prior_attempt>
Commit 9a1eaaf51dc9b05edcc4f15e5572f1c39b8eb7e7 ("feat: implementasi sistem blok (CRUD, schedule masking, jurnal guru)"):
- `src/components/SistemBlokView.tsx`: Form CRUD untuk sistem blok (tambah, edit, hapus) dengan tanggal mulai, tanggal selesai, nama kegiatan, deskripsi.
- `src/components/AppScreen.tsx`: Menghubungkan navigasi dan view Sistem Blok ke Admin/Superadmin.
- `src/components/HomeView.tsx`: Pengecekan blok aktif untuk jadwal mengajar; jika ada rentang tanggal blok aktif, jadwal mengajar di-mask/diganti informasi kegiatan blok, jadwal asli di DB tidak terhapus.
- `src/components/GuruJurnal.tsx`: Form jurnal guru beralih ke Jurnal Kegiatan khusus ketika tanggal berada dalam periode blok aktif, bukan jurnal reguler.
- `src/lib/workflow.ts`: Helper checking untuk rentang waktu blok aktif.
- `src/types/database.ts`: TypeScript definition untuk tabel `sistem_blok`.
- `supabase/migrations/20260927_sistem_blok_schema.sql`: Definisi tabel dan RLS policy `sistem_blok`.
</prior_attempt>

<additional_context>
Observed facts:
1. The implementation in commit 9a1eaaf was committed without an automated test suite verifying R1, R2, R3, R4 and the acceptance criteria.
2. Check whether the migration in supabase/migrations/20260927_sistem_blok_schema.sql is applied to the live database or whether public.sistem_blok table exists and has proper permissions.
3. You must independently re-derive the requirements, write a comprehensive verification test suite (e.g., in tests/sistem_blok_verification.test.ts) covering all acceptance criteria for R1, R2, R3, and R4, actively try to break the current implementation, fix any bugs or omissions you find, verify tests pass, and report full verification details.
4. Remember the Git Workflow Rule in GEMINI.md: check git status, stage changed files, commit with descriptive message, and push to origin main.
5. Write your handoff report to c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_blok_r1\handoff.md.
</additional_context>
