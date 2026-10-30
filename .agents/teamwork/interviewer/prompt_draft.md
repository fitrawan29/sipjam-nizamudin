This is a single self-contained fix; keep it small and focused. Sesuaikan alur presensi dan jurnal kegiatan guru pada sipjam-app: jika seorang guru melakukan presensi datang dan memiliki jadwal jam pelajaran pada hari tersebut tetapi tidak mengisi jurnal/jam pelajaran kegiatan tersebut serta tidak melakukan presensi pulang, sistem mencatat status presensi guru tersebut sebagai "pulang cepat" dan secara otomatis mengisi/mencatat jurnal kegiatan yang kosong tersebut sebagai "tidak masuk kelas".

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Penyesuaian Status Presensi Guru Menjadi Pulang Cepat
Ketika guru melakukan presensi datang dan memiliki jadwal mengajar pada hari tersebut, namun tidak mengisi jurnal kegiatan / jam pelajaran dan tidak melakukan presensi pulang, status presensi guru tersebut dihitung dan dicatat sebagai "pulang cepat".

### R2. Pengisian Otomatis Jurnal Kosong Menjadi Tidak Masuk Kelas
Untuk jadwal jam pelajaran yang tidak diisi jurnal kegiatannya oleh guru dalam kondisi di R1, aplikasi secara otomatis mencatat dan menyimpan status jurnal kosong tersebut sebagai "tidak masuk kelas".

## Acceptance Criteria

### Kriteria Logika Presensi dan Jurnal
- [ ] Guru yang hanya melakukan presensi datang, memiliki jadwal jam pelajaran, tidak mengisi jurnal mengajar, dan tidak melakukan presensi pulang tercatat memiliki status presensi "pulang cepat".
- [ ] Seluruh jadwal jam pelajaran guru pada hari tersebut yang kosong / tidak diisi jurnalnya otomatis tercatat dengan status "tidak masuk kelas".
- [ ] Guru yang mengisi jurnal kegiatan atau melakukan presensi pulang dengan normal tidak terpengaruh oleh aturan ini.
- [ ] Perubahan alur diverifikasi melalui automated test (unit/integration test) independen yang mencakup skenario di atas dan berhasil lulus.
