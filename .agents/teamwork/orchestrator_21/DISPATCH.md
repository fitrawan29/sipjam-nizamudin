# Dispatch Instructions for Orchestrator 21

## Mission
Rombak ulang modul daftar nilai (`GradebookView.tsx`) pada aplikasi SIPJAM (Next.js + Supabase) agar mengikuti alur CP → TP → Asesmen (Diagnostik/Formatif/Sumatif) → Nilai Akhir (R1-R5).

## Working Directory
- Project Root: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`
- Agent Workspace: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_21`
- Original Request File: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (see latest entry at 2026-10-10T22:56:05Z)
- Prior Orchestrator Briefing (for reference): `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_20\BRIEFING.md`

## Requirements
- **R1. Hierarki CP → TP di UI**: Guru melihat dan mengelola CP (Capaian Pembelajaran) terlebih dahulu sebelum bisa menambahkan TP. Satu CP bisa memiliki banyak TP. CP tersimpan di tabel baru `capaian_pembelajaran` yang berelasi ke `guru_mapel`.
- **R2. Asesmen per TP dengan tipe dan keterangan**: Setiap TP memiliki tiga jenis asesmen: Diagnostik (dibatasi maks. 1 per TP — validasi di UI & DB), Formatif (min. 1), Sumatif (min. 1). Setiap asesmen memiliki field keterangan bebas yang tersimpan di kolom `keterangan` pada tabel `asesmen_kolom`.
- **R3. Formula Nilai Akhir**: Nilai akhir mapel = (bobot_kehadiran × rata kehadiran) + (bobot_formatif × rata formatif) + (bobot_sumatif × rata sumatif), di mana rata kehadiran dihitung dari data absensi siswa di mapel tersebut. Asesmen Diagnostik tidak masuk perhitungan. Rekap semester dan data rapor menggunakan formula ini.
- **R4. Pengaturan Bobot (Admin Only)**: Admin dapat mengubah persentase bobot (kehadiran/formatif/sumatif) melalui form pengaturan. Total harus selalu 100% (validasi). Bobot tersimpan di tabel `pengaturan` sebagai key `bobot_nilai_mapel` (value: JSON string) dan berlaku untuk seluruh sekolah.
- **R5. Migrasi Database & Tipe**: Sediakan SQL migration untuk tabel `capaian_pembelajaran` dan kolom baru `keterangan` di `asesmen_kolom`. Perbarui `src/types/database.ts` agar sinkron. Gunakan prinsip ponytail: sesedikit mungkin perubahan skema yang masih cukup untuk fitur ini.

## Acceptance Criteria
- Database:
  - Tabel `capaian_pembelajaran` tersedia dengan kolom: `id`, `sekolah_id`, `guru_mapel_id`, `kode_cp`, `deskripsi`, `semester`, `tahun_ajaran`, timestamps
  - Kolom `keterangan` ada di `asesmen_kolom`
  - Baris di `pengaturan` dengan key `bobot_nilai_mapel` dapat disimpan dan dibaca (value: JSON `{ kehadiran, formatif, sumatif }`)
- Alur Input Guru:
  - Guru dapat menambah/edit/hapus CP dari UI tanpa error
  - Guru dapat menambah TP di bawah CP yang dipilih
  - Untuk setiap TP: form asesmen menolak penambahan Diagnostik ke-2 (validasi di UI)
  - Formatif dan Sumatif dapat ditambah lebih dari satu
  - Field keterangan tersedia dan tersimpan untuk setiap asesmen
- Perhitungan Nilai Akhir:
  - Nilai akhir mapel = (bobot_kehadiran × rata kehadiran) + (bobot_formatif × rata formatif) + (bobot_sumatif × rata sumatif)
  - Asesmen Diagnostik tidak masuk perhitungan nilai akhir
  - Jika tidak ada data formatif atau sumatif, nilai akhir menampilkan `-` / null (tidak error)
- Pengaturan Bobot (Admin):
  - Form pengaturan bobot hanya tampil untuk role Admin/Superadmin
  - Validasi: total bobot harus = 100% sebelum bisa disimpan
  - Bobot yang tersimpan ter-load saat halaman dibuka kembali
- Rekap & Rapor:
  - Tab rekap semester menampilkan nilai akhir dari formula baru
  - Tidak ada regresi: fitur print, analitik, dan rekap siswa tetap berfungsi
- Quality & Git:
  - Semua test lulus (`npm test`), build lulus (`npm run build`)
  - Jalankan git workflow: status, add, commit, push sesuai GEMINI.md

Please orchestrate your team and deliver a complete, verified solution.


## 2026-10-11T00:40:44Z
You are the Project Orchestrator (orchestrator_21).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_21
Authoritative requirements: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see latest entry at 2026-10-10T22:56:05Z)
Dispatch briefing: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_21\DISPATCH.md
Prior orchestrator briefing (for reference): c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_20\BRIEFING.md

Task:
Rombak ulang modul daftar nilai (GradebookView) pada aplikasi SIPJAM (Next.js + Supabase) agar mengikuti alur CP → TP → Asesmen (Diagnostik/Formatif/Sumatif) → Nilai Akhir (R1-R5).
- Stack: Next.js 15 (App Router, 'use client'), Supabase (PostgreSQL + RLS), Tailwind CSS, SweetAlert2.
- File utama: src/components/GradebookView.tsx (2814 baris).
- Tabel DB baru: capaian_pembelajaran.
- Kolom baru: keterangan di asesmen_kolom, bobot_nilai_mapel di pengaturan.
- Types: perbarui src/types/database.ts.
- Formula nilai akhir: (bobot_kehadiran × rata kehadiran) + (bobot_formatif × rata formatif) + (bobot_sumatif × rata sumatif). Diagnostik tidak masuk perhitungan nilai akhir.
- Pengaturan bobot: Admin/Superadmin form dengan validasi total = 100%.
- Ponytail principle: minimal schema diff, minimal bloat.
- Git Workflow Rule: otomatis git status, git add ., git commit -m "..." dan git push origin main saat selesai.
