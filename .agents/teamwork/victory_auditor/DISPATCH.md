## 2026-10-02T09:58:44Z

<original_task>
# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Small focused team

This is a single self-contained fix; keep it small and focused.

Tiga perbaikan bug/fitur kecil: (1) Pengecualian presensi/jurnal/piket untuk guru saat sistem blok berdasarkan jadwal mengajar, (2) Penyesuaian ukuran foto pada hasil cetak dokumen agar memenuhi kolom, (3) Pembaruan format tanggal dashboard menjadi [hari, tanggal-bulan-tahun] yang responsif.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

## Requirements

### R1. Pengecualian Sistem Blok
Guru yang diatur wajib hadir hanya pada hari mengajar tidak perlu melakukan presensi, mengisi jurnal, dan laporan piket saat sistem blok aktif, kecuali jika mereka memang memiliki jadwal pada hari tersebut.

### R2. Ukuran Foto Dokumen Cetak
Foto kegiatan pada hasil cetak dokumen harus mengisi penuh kolom yang tersedia tanpa terdistorsi atau memiliki tinggi absolut (fixed height) yang merusak layout.

### R3. Format Tanggal Dashboard
Tanggal di dashboard harus berformat `[hari, tanggal-bulan-tahun]` (contoh: Jumat, 02-10-2026) dan tampilannya harus rapi (responsif) tanpa terpotong baik di desktop maupun mobile.

## Acceptance Criteria

### Verifikasi Fitur
- [ ] Sistem tidak memblokir atau memaksa presensi bagi guru pengecualian di hari tanpa jadwal, meskipun periode blok aktif (mereka akan terbaca bebas presensi, bebas jurnal, dan bebas piket).
- [ ] Foto di mode cetak (`print` CSS) memenuhi kolom (`w-full` dan `h-auto` atau setara) tanpa merusak baris.
- [ ] Tanggal di dashboard menampilkan hari dan tanggal penuh (misal: DD-MM-YYYY) dan menyesuaikan ruang di mobile (bisa wrap jika perlu, tapi tidak `truncate`).
</original_task>

Additional Context:
- Your working directory for auditor metadata: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor
- Project root: c:\Users\Fitra\OneDrive\Documents\sipjam-app
- Conduct an independent post-victory audit (timeline, cheating detection, independent test execution, requirements fulfillment verification).
- Check the git log, diff, tests (`npm test`, `npm run test:e2e`, `npm run build`), and verify all acceptance criteria for R1, R2, and R3.
- Write your structured verdict report to: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor\handoff.md
- Use send_message to report your verdict back to the orchestrator.
