## 2026-10-15T17:38:10Z

You are teamwork_preview_victory_auditor. Conduct an independent post-victory audit for the task below.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_victory_auditor
Ensure you write your progress heartbeat and write your full audit report to:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_victory_auditor\handoff.md`
Report with a structured verdict: either CONFIRMED or REJECTED. Send a completion message back to the orchestrator.

<original_task>
This is a single self-contained fix; keep it small and focused.

Sesuaikan menu E-Rapor pada akun Admin agar terhubung 100% dengan data real di database Supabase (menggantikan data mock dan skor pseudo-random seed), menyinkronkan catatan wali & observasi deep learning ke database, serta menyesuaikan UI dan tanda tangan wali kelas.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Real Data Pipeline Penilaian Kurikulum Merdeka
Gantikan kalkulasi dummy/mock di `src/components/RaporView.tsx` dengan data aktual dari Supabase:
- Ambil daftar mata pelajaran aktif untuk kelas terpilih dari `guru_mapel` / `data_mapel` yang terikat pada `sekolah_id`.
- Ambil capaian pembelajaran (`capaian_pembelajaran`), tujuan pembelajaran (`tujuan_pembelajaran`), kolom asesmen (`asesmen_kolom`), dan nilai siswa (`nilai_siswa`).
- Hitung nilai akhir semester per mapel secara konsisten dengan logika `GradebookView.tsx` menggunakan `generateKurikulumMerdekaDeskripsi`.
- Jika mata pelajaran belum memiliki nilai asesmen, tampilkan tanda `-` / status belum dinilai secara elegan tanpa nilai buatan/palsu.

### R2. Penyesuaian UI & Konteks Akun Admin
- Sesuaikan tampilan header Rapor ketika diakses oleh Admin atau Superadmin agar menampilkan badge konteks "Administrator" (bukan badge statis "Wali Kelas").
- Pastikan dropdown pemilih kelas memuat seluruh kelas aktif di sekolah yang sedang dikelola Admin.
- Pada lembar cetak rapor (Print Signature), otomatis tampilkan nama dan NIP Wali Kelas yang sebenarnya ditugaskan untuk kelas tersebut (diambil dari penugasan guru / wali kelas), mendampingi Kepala Sekolah dan Orang Tua Siswa.

### R3. Sinkronisasi Database untuk Catatan & Observasi Rapor
- Gantikan penyimpanan Catatan Wali Kelas dan Observasi Deep Learning (Mindful, Meaningful, Joyful) yang saat ini berbasis `localStorage` lokal agar tersimpan secara persisten ke database Supabase (tabel rapor / pengaturan terstruktur per `sekolah_id`, `kelas`, `semester`, `tahun_ajaran`, dan `nisn`).
- Sediakan mekanisme simpan/autosave yang dapat diakses oleh Wali Kelas maupun Admin pengelola.

## Verification Resources
- Test suite: `npm test` mencakup `tests/m4_academic_merdeka_rapor.test.ts` dan `tests/adversarial_rapor_wali_security.test.ts`.
- Build verification: `npm run build` harus bebas dari TypeScript/linter error.

## Acceptance Criteria

### Real Data & Calculation
- [ ] Kode kalkulasi acak/mock (`student.nisn.charCodeAt`, `DEFAULT_MAPEL_LIST` statis tanpa filter database) telah sepenuhnya dihapus dari `RaporView.tsx`.
- [ ] Nilai siswa dan capaian kompetensi yang ditampilkan pada Rapor bersumber langsung dari tabel `nilai_siswa`, `asesmen_kolom`, dan `tujuan_pembelajaran`.
- [ ] Mata pelajaran tanpa nilai asesmen menampilkan nilai `-` atau keterangan belum ada penilaian tanpa menghasilkan NaN atau error.

### Admin Experience & Signatures
- [ ] Akun Admin dapat memilih seluruh kelas sekolah tanpa error akses.
- [ ] Header UI Rapor menampilkan badge identitas Administrator saat dibuka oleh Admin.
- [ ] Tanda tangan wali kelas pada lembar cetak rapor mencantumkan nama dan NIP guru wali kelas yang sebenarnya dari kelas terpilih.

### Database Persistence
- [ ] Catatan wali kelas dan refleksi deep learning tersimpan ke Supabase sehingga dapat dibaca bersama oleh Admin dan Wali Kelas lintas peramban/perangkat.

### System Stability
- [ ] Seluruh unit dan adversarial test suite (`npm test`) lulus 100% tanpa regresi.
- [ ] Perubahan mematuhi kaidah Ponytail: diff minimal, tepat sasaran pada file yang relevan, tanpa scaffolding/abstraksi yang tidak diminta.
</original_task>
