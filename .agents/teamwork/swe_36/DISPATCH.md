# Task Dispatch: swe_36

## Identity & Workspace
- Agent Type: `teamwork_preview_swe`
- Agent Instance: `swe_36`
- Working Directory: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_36`
- Authoritative Request: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (Header: `## 2026-10-27T02:19:25Z`)

---

## User Request

This is a single self-contained fix; keep it small and focused.

Perbaikan data user di sistem: menggantikan user "FITRA SURYAZANA MAMONTO" menjadi "Fitra Suryazana Mamonto" (standardisasi nama akun dan data transaksi terkait), serta menghapus seluruh data user / presensi tersisa milik "Drs. Ahmad Dahlan, M.Pd.".

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Standardisasi Akun & Riwayat Guru Fitra Suryazana Mamonto
- Di tabel `users`, perbarui nama pengguna dari `"FITRA SURYAZANA MAMONTO"` (huruf kapital semua) menjadi `"Fitra Suryazana Mamonto"` (Title Case).
- Di tabel transaksi (`presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`), selaraskan nama guru yang sebelumnya `"FITRA SURYAZANA MAMONTO"` menjadi `"Fitra Suryazana Mamonto"` sehingga konsisten dengan data guru dan akun user.
- Pastikan relasi akun di `data_guru` (NIP/username `'Fitra'`) tetap utuh dan aktif.
- Perbarui file CSV sumber (seperti di folder `csv/`) yang masih mencatat nama kapital `"FITRA SURYAZANA MAMONTO"` agar konsisten menjadi `"Fitra Suryazana Mamonto"`.

### R2. Pembersihan Total User & Data Usang Drs. Ahmad Dahlan, M.Pd.
- Hapus seluruh sisa rekaman yang memuat `"Drs. Ahmad Dahlan, M.Pd."` dari tabel database, termasuk rekaman presensi usang di tabel `presensi_guru` (misal ID `e1144f72-2ec4-43f2-aebb-10a59063a906`).
- Pastikan tidak ada data guru, user, presensi, jurnal, atau laporan piket yang masih mereferensikan `"Drs. Ahmad Dahlan, M.Pd."`.

## Acceptance Criteria

### Verifikasi Database & Konsistensi Data
- [ ] Query ke tabel `users` untuk nama `FITRA SURYAZANA MAMONTO` mengembalikan 0 baris, dan nama untuk username `'Fitra'` terverifikasi menjadi `'Fitra Suryazana Mamonto'`.
- [ ] Query ke tabel `presensi_guru`, `jurnal_pembelajaran`, dan `laporan_piket` untuk nama guru `FITRA SURYAZANA MAMONTO` mengembalikan 0 baris, seluruhnya telah terstandardisasi menjadi `'Fitra Suryazana Mamonto'`.
- [ ] Query ke seluruh tabel database (`users`, `data_guru`, `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`, `data_siswa`) untuk nama `"Drs. Ahmad Dahlan, M.Pd."` mengembalikan tepat 0 baris.
- [ ] Seluruh suite pengujian otomatis (`npm test`) tetap lulus 100% tanpa regresi.

---

## Mandatory Constraints & Workflow Rules

1. **Git Workflow Rule (MANDATORY)**:
   Setiap kali selesai melakukan modifikasi, penambahan, atau penghapusan file dalam proyek ini:
   - Cek status git (`git status`)
   - Lakukan staging pada file yang berubah (`git add .`)
   - Buat commit dengan pesan yang deskriptif dan sesuai (`git commit -m "..."`)
   - Lakukan push ke branch utama: `git push origin main`

2. **Next.js & Code Rules**:
   - Perhatikan Next.js 16 breaking changes.
   - Terapkan prinsip Ponytail: fewest files changed, do not add unnecessary abstractions or packages.

3. **Lifecycle & Coordination**:
   - Tulis rencana kerja di `plan.md` di folder kerja Anda.
   - Update `progress.md` secara berkala dengan progress terkini agar sentinel dapat memantau liveness dan melaporkan kemajuan.
   - Tulis laporan akhir di `handoff.md` di folder kerja Anda ketika seluruh kriteria penerimaan terpenuhi.
