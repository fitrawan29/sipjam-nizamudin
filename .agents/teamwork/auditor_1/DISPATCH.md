## 2026-11-09T03:55:55Z
<original_task>
This is a single self-contained fix; keep it small and focused. Tambahkan fitur pemisahan siswa berdasarkan status agama untuk mata pelajaran Pendidikan Agama Islam (PAI) dan Pendidikan Agama Kristen (PAK) dalam satu kelas di aplikasi sipjam-app, di mana siswa yang terbaca di PAI hanya siswa berstatus agama Islam dan di PAK hanya siswa berstatus agama Kristen, tanpa mengubah fitur dan logika lain yang tidak terdampak.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Pemisahan Siswa Berdasarkan Agama pada PAI dan PAK
Pada kelas yang sama, daftar siswa yang dimuat untuk mata pelajaran Pendidikan Agama Islam (PAI) hanya memuat siswa dengan status agama Islam, dan untuk mata pelajaran Pendidikan Agama Kristen (PAK) hanya memuat siswa dengan status agama Kristen. Pemfilteran ini berlaku di seluruh bagian di mana daftar siswa dimuat per mata pelajaran dalam kelas, termasuk presensi/absensi, jurnal mengajar, penilaian/rekap nilai, dan daftar siswa kelas.

### R2. Preservasi Logika dan Fitur Lain (Non-Regresi)
Mata pelajaran lain di luar PAI dan PAK harus tetap memuat seluruh siswa di kelas tersebut sesuai logika yang sudah berjalan sebelumnya. Seluruh alur data, komponen UI, dan fitur yang tidak terkait langsung dengan pemisahan agama PAI dan PAK tidak boleh mengalami perubahan perilaku atau kerusakan.

## Acceptance Criteria

### Filter Agama pada PAI dan PAK
- [ ] Ketika mengakses kelas untuk mata pelajaran Pendidikan Agama Islam (PAI), daftar siswa yang ditampilkan di presensi/absensi, jurnal mengajar, penilaian/rekap nilai, dan daftar siswa kelas hanya mencakup siswa yang memiliki status agama Islam.
- [ ] Ketika mengakses kelas untuk mata pelajaran Pendidikan Agama Kristen (PAK), daftar siswa yang ditampilkan di presensi/absensi, jurnal mengajar, penilaian/rekap nilai, dan daftar siswa kelas hanya mencakup siswa yang memiliki status agama Kristen.

### Non-Regresi Mata Pelajaran Lain
- [ ] Ketika mengakses kelas untuk mata pelajaran umum/selain PAI dan PAK, seluruh siswa di kelas tersebut tetap terbaca dan ditampilkan lengkap tanpa pemfilteran agama.
- [ ] Seluruh skrip pengujian atau tes otomatis yang memverifikasi fitur pemfilteran agama dan non-regresi mata pelajaran umum berhasil lulus (exit code 0).
</original_task>

<instructions>
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\auditor_1
Please write your progress to progress.md and your structured victory audit report to report.md in your working directory.
Conduct your 3-phase audit:
1. Timeline & requirements audit
2. Cheating detection (ensure tests are genuine, no hardcoded cheating, no disabled assertions)
3. Independent test execution (run the tests yourself: npx tsx tests/agama_pai_pak_isolation.test.ts, npm test, npx tsc --noEmit, npm run build)
Report your structured verdict (VICTORY CONFIRMED or VICTORY REJECTED) with clear evidence.
When finished, send a message back to the orchestrator.
</instructions>
