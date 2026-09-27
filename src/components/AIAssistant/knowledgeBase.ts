/**
 * Knowledge Base for SIPJAM Offline AI Assistant
 * Contains static FAQ items covering all 19 main application menus and general help.
 * 100% offline, pure string and keyword matching without external API dependencies.
 */

export type UserRole = 'guru' | 'admin' | 'all';

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  relatedViews: string[];
  userRoles?: UserRole[];
}

export interface MenuCategoryMeta {
  id: string;
  viewId: string;
  name: string;
  icon: string;
  description: string;
}

export const MENU_CATEGORIES: MenuCategoryMeta[] = [
  { id: 'home', viewId: 'view-home', name: 'Dashboard', icon: 'fa-house', description: 'Beranda alur kerja harian dan ringkasan kedisiplinan' },
  { id: 'guru-presensi', viewId: 'view-guru-presensi', name: 'Presensi Guru', icon: 'fa-right-to-bracket', description: 'Presensi datang, pulang, dan izin/sakit mandiri guru' },
  { id: 'guru-jurnal', viewId: 'view-guru-jurnal', name: 'Jurnal Pembelajaran', icon: 'fa-book-journal-whills', description: 'Pencatatan kegiatan KBM dan absensi siswa di kelas' },
  { id: 'piket', viewId: 'view-piket', name: 'Modul Piket', icon: 'fa-shield-halved', description: 'Laporan piket harian, ketertiban, dan penugasan guru piket' },
  { id: 'dokumen', viewId: 'view-dokumen', name: 'Perangkat Pembelajaran', icon: 'fa-folder-open', description: 'Arsip administrasi kurikulum (CP, ATP, Modul Ajar/RPM)' },
  { id: 'gradebook', viewId: 'view-gradebook', name: 'Daftar Nilai', icon: 'fa-graduation-cap', description: 'Buku nilai digital kurikulum merdeka dan ekspor rapor' },
  { id: 'chat', viewId: 'view-chat', name: 'Chat Guru', icon: 'fa-comments', description: 'Komunikasi dan pesan instan internal antar dewan guru' },
  { id: 'informasi', viewId: 'view-informasi', name: 'Informasi', icon: 'fa-bullhorn', description: 'Papan pengumuman resmi dan siaran sekolah' },
  { id: 'history', viewId: 'view-history', name: 'Riwayat', icon: 'fa-clock-rotate-left', description: 'Log catatan presensi lampau dan arsip jurnal KBM pribadi' },
  { id: 'guru-rekap-jurnal', viewId: 'view-guru-rekap-jurnal', name: 'Rekap Jurnal', icon: 'fa-book-open', description: 'Rekapitulasi dan cetak jurnal mengajar resmi bulanan' },
  { id: 'rekap-siswa', viewId: 'view-rekap-siswa', name: 'Presensi Siswa', icon: 'fa-users-viewfinder', description: 'Rekapitulasi kehadiran siswa dan input absensi wali kelas' },
  { id: 'admin-verif', viewId: 'view-admin-verif', name: 'Verifikasi', icon: 'fa-clipboard-check', description: 'Persetujuan presensi izin/sakit, jurnal, dan piket guru' },
  { id: 'sistem-blok', viewId: 'view-sistem-blok', name: 'Sistem Blok', icon: 'fa-layer-group', description: 'Pengaturan periode khusus ujian/jeda dan jurnal kegiatan' },
  { id: 'jurnal-kelas', viewId: 'view-jurnal-kelas', name: 'Jurnal Kelas', icon: 'fa-chalkboard-user', description: 'Pemantauan jurnal kelas terpadu untuk wali kelas' },
  { id: 'analitik', viewId: 'view-analitik', name: 'Analitik', icon: 'fa-chart-pie', description: 'Statistik KPI kehadiran, grafik keterlambatan, dan leaderboard' },
  { id: 'admin-rekap', viewId: 'view-admin-rekap', name: 'Rekap Akhir', icon: 'fa-file-invoice', description: 'Laporan bulanan menyeluruh seluruh guru (PDF/Excel)' },
  { id: 'admin-data', viewId: 'view-admin-data', name: 'Master Data', icon: 'fa-database', description: 'Pengelolaan data siswa, guru, mapel, jadwal, dan kalender' },
  { id: 'admin-backup', viewId: 'view-admin-backup', name: 'Akses Data / Backup', icon: 'fa-hard-drive', description: 'Pencadangan data ke cloud/spreadsheet dan pengosongan arsip' },
  { id: 'admin-config', viewId: 'view-admin-config', name: 'Sistem Konfigurasi', icon: 'fa-gears', description: 'Konfigurasi tahun ajaran, koordinat GPS geofence, dan jam kerja' },
  { id: 'general', viewId: 'view-home', name: 'Umum & Bantuan', icon: 'fa-circle-question', description: 'Panduan dasar, profil akun, dan bantuan aplikasi' }
];

export const FAQ_ITEMS: FAQItem[] = [
  // 1. Dashboard (view-home)
  {
    id: 'faq-home-1',
    category: 'Dashboard',
    question: 'Apa saja informasi penting yang ditampilkan di halaman Dashboard guru?',
    answer: 'Di halaman Dashboard guru, Anda dapat melihat widget Alur 4 Langkah Tugas Harian (Presensi Datang, Jurnal Mengajar, Laporan Piket, Presensi Pulang), status akumulasi keterlambatan dalam bulan berjalan (WITA), peringatan disiplin kehadiran (jika ada alpa), banner siaran sekolah, serta jadwal mengajar kelas Anda hari ini.',
    keywords: ['dashboard', 'informasi', 'tampilan', 'beranda', 'langkah', 'harian', 'alur', 'jadwal'],
    relatedViews: ['view-home'],
    userRoles: ['guru', 'all']
  },
  {
    id: 'faq-home-2',
    category: 'Dashboard',
    question: 'Mengapa di Dashboard guru terdapat indikator 4 langkah kerja harian?',
    answer: 'Indikator 4 langkah harian dirancang untuk memandu guru menyelesaikan kewajiban administrasi secara berurutan: (1) Presensi Datang pagi hari, (2) Pengisian Jurnal KBM di kelas, (3) Laporan Piket (khusus bagi yang bertugas piket hari ini), dan (4) Presensi Pulang. Menyelesaikan jurnal dan piket adalah syarat wajib sebelum tombol Presensi Pulang dapat dibuka.',
    keywords: ['indikator', 'langkah', 'kerja', 'dashboard', 'alur', 'tugas', 'kewajiban', 'urutan', 'tahapan'],
    relatedViews: ['view-home'],
    userRoles: ['guru', 'all']
  },

  // 2. Presensi Datang/Pulang (view-guru-presensi)
  {
    id: 'faq-presensi-1',
    category: 'Presensi Guru',
    question: 'Bagaimana cara melakukan presensi datang atau presensi pulang?',
    answer: 'Buka menu Presensi Guru, pastikan izin lokasi GPS aktif di browser Anda dan Anda berada di dalam radius sekolah. Pilih jenis presensi (Datang di pagi hari atau Pulang saat jam kerja berakhir), ambil swafoto (selfie) langsung melalui kamera aplikasi, lalu klik tombol Kirim Presensi Sekarang. Sistem akan merekam koordinat dan waktu WITA secara otomatis.',
    keywords: ['cara', 'presensi', 'datang', 'pulang', 'absen', 'selfie', 'kamera', 'gps', 'masuk'],
    relatedViews: ['view-guru-presensi'],
    userRoles: ['guru', 'all']
  },
  {
    id: 'faq-presensi-2',
    category: 'Presensi Guru',
    question: 'Mengapa tombol Presensi Pulang saya terkunci dan tidak bisa diklik?',
    answer: 'Tombol Presensi Pulang terkunci secara otomatis jika Anda belum menyelesaikan seluruh Jurnal Pembelajaran untuk kelas yang Anda ajar hari ini, atau Anda belum mengirimkan Laporan Piket jika hari ini Anda terjadwal sebagai guru piket. Pastikan semua jurnal KBM hari ini sudah berstatus terisi di menu Jurnal Pembelajaran.',
    keywords: ['presensi', 'pulang', 'terkunci', 'kunci', 'gembok', 'tidak bisa', 'jurnal', 'belum', 'syarat pulang'],
    relatedViews: ['view-guru-presensi', 'view-guru-jurnal', 'view-home'],
    userRoles: ['guru', 'all']
  },
  {
    id: 'faq-presensi-3',
    category: 'Presensi Guru',
    question: 'Bagaimana cara mengajukan izin, sakit, atau dinas luar jika tidak bisa hadir ke sekolah?',
    answer: 'Buka menu Presensi Guru, ubah pilihan jenis kehadiran dari Sekolah menjadi Izin, Sakit, atau Dinas Luar. Lengkapi keterangan alasan tidak hadir serta unggah foto surat dokter, surat dinas, atau bukti pendukung. Pengajuan Anda akan masuk ke menu Verifikasi Admin untuk disetujui.',
    keywords: ['izin', 'sakit', 'dinas luar', 'surat', 'pengajuan', 'tidak hadir', 'keterangan', 'dispensasi', 'berhalangan'],
    relatedViews: ['view-guru-presensi', 'view-admin-verif'],
    userRoles: ['guru', 'all']
  },

  // 3. Jurnal Mengajar (view-guru-jurnal)
  {
    id: 'faq-jurnal-1',
    category: 'Jurnal Pembelajaran',
    question: 'Bagaimana cara mengisi Jurnal Pembelajaran (KBM) harian?',
    answer: 'Buka menu Jurnal Pembelajaran, pilih mata pelajaran dan kelas yang Anda ajar sesuai jadwal hari ini. Masukkan nomor pertemuan, jam pelajaran, materi pokok yang disampaikan, kegiatan belajar, catatan khusus siswa, dan refleksi. Ambil swafoto/foto kegiatan di dalam kelas, catat absensi siswa yang tidak hadir, lalu klik Simpan Jurnal.',
    keywords: ['isi', 'jurnal', 'pembelajaran', 'kbm', 'mengajar', 'materi', 'kelas', 'simpan', 'foto kelas'],
    relatedViews: ['view-guru-jurnal'],
    userRoles: ['guru', 'all']
  },
  {
    id: 'faq-jurnal-2',
    category: 'Jurnal Pembelajaran',
    question: 'Bagaimana cara mencatat absensi siswa (Sakit, Izin, Alpa) saat mengisi jurnal?',
    answer: 'Pada formulir Jurnal Pembelajaran, di bagian bawah terdapat daftar siswa kelas tersebut. Secara default seluruh siswa berstatus Hadir (H). Klik tombol status pada nama siswa yang berhalangan hadir untuk mengubahnya menjadi S (Sakit), I (Izin), atau A (Alpa). Ringkasan kehadiran akan terhitung otomatis ke dalam jurnal.',
    keywords: ['absensi', 'siswa', 'murid', 'jurnal', 'sakit', 'izin', 'alpa', 'hadir', 'kehadiran siswa'],
    relatedViews: ['view-guru-jurnal', 'view-rekap-siswa'],
    userRoles: ['guru', 'all']
  },
  {
    id: 'faq-jurnal-3',
    category: 'Jurnal Pembelajaran',
    question: 'Mengapa formulir jurnal saya otomatis berubah menjadi Jurnal Kegiatan?',
    answer: 'Jika tanggal hari ini termasuk ke dalam periode Sistem Blok yang diaktifkan oleh administrator (misalnya saat Ujian Sekolah, Pesantren Kilat, atau Kegiatan Jeda), jadwal KBM reguler digantikan oleh kegiatan khusus, sehingga guru hanya bertugas mengisi Jurnal Kegiatan bukan jurnal KBM per kelas.',
    keywords: ['jurnal kegiatan', 'sistem blok', 'berubah', 'kegiatan', 'ujian', 'khusus', 'pts', 'pas'],
    relatedViews: ['view-guru-jurnal', 'view-sistem-blok'],
    userRoles: ['guru', 'admin', 'all']
  },

  // 4. Piket (view-piket)
  {
    id: 'faq-piket-1',
    category: 'Modul Piket',
    question: 'Bagaimana cara guru piket membuat dan mengirimkan laporan piket harian?',
    answer: 'Buka menu Modul Piket, pilih tab Lapor Piket. Periksa dan catat absensi siswa lintas kelas jika diperlukan, tuliskan catatan kejadian harian (kondisi ketertiban, tamu dinas, siswa terlambat atau pulang dini), ambil foto dokumentasi piket, lalu klik tombol Kirim Laporan Piket.',
    keywords: ['lapor', 'piket', 'laporan piket', 'tugas piket', 'kejadian', 'tamu', 'catatan', 'foto piket'],
    relatedViews: ['view-piket'],
    userRoles: ['guru', 'all']
  },
  {
    id: 'faq-piket-2',
    category: 'Modul Piket',
    question: 'Bagaimana administrator mengatur penugasan guru piket harian?',
    answer: 'Administrator dapat membuka menu Kelola Piket, masuk ke tab Penugasan, pilih hari kerja (Senin–Sabtu), lalu pilih nama guru yang ditugaskan bertugas piket pada hari tersebut. Penugasan ini akan otomatis menghubungkan guru dengan kewajiban laporan piket di Dashboard.',
    keywords: ['penugasan', 'guru piket', 'jadwal piket', 'admin', 'atur piket', 'kelola piket', 'jadwal piket'],
    relatedViews: ['view-piket'],
    userRoles: ['admin', 'all']
  },

  // 5. Perangkat Pembelajaran (view-dokumen)
  {
    id: 'faq-dokumen-1',
    category: 'Perangkat Pembelajaran',
    question: 'Dokumen kurikulum apa saja yang wajib diunggah oleh guru di Perangkat Pembelajaran?',
    answer: 'Terdapat 6 jenis dokumen administrasi utama: (1) Analisis CP (Capaian Pembelajaran), (2) ATP (Alur Tujuan Pembelajaran), (3) RPE (Rencana Pekan Efektif), (4) Prota (Program Tahunan), (5) Promes (Program Semester), dan (6) Modul Ajar / RPM (Rencana Pembelajaran Mendalam).',
    keywords: ['perangkat pembelajaran', 'dokumen', 'cp', 'atp', 'rpe', 'prota', 'promes', 'rpm', 'modul ajar', 'syarat'],
    relatedViews: ['view-dokumen'],
    userRoles: ['guru', 'admin', 'all']
  },
  {
    id: 'faq-dokumen-2',
    category: 'Perangkat Pembelajaran',
    question: 'Bagaimana cara mengunggah dokumen modul ajar atau perangkat pembelajaran?',
    answer: 'Buka menu Perangkat Pembelajaran, klik tab Upload Dokumen. Pilih jenis dokumen (CP/ATP/RPM/dll), pilih mata pelajaran dan kelas terkait, beri judul dokumen, lalu pilih berkas (format PDF atau DOCX) dari perangkat Anda dan klik Unggah Dokumen. Berkas akan tersimpan aman di Google Drive sekolah.',
    keywords: ['upload', 'unggah', 'dokumen', 'modul ajar', 'file', 'pdf', 'docx', 'drive'],
    relatedViews: ['view-dokumen'],
    userRoles: ['guru', 'all']
  },
  {
    id: 'faq-dokumen-3',
    category: 'Perangkat Pembelajaran',
    question: 'Bagaimana cara mengetahui apakah dokumen perangkat saya sudah diverifikasi oleh admin?',
    answer: 'Pada tab Daftar Dokumen, setiap berkas yang diunggah memiliki lencana status: Disetujui (hijau), Perlu Revisi (merah disertai catatan masukan dari admin/kepsek), atau Menunggu Verifikasi (kuning).',
    keywords: ['status', 'verifikasi', 'dokumen', 'disetujui', 'revisi', 'menunggu', 'perangkat', 'catatan'],
    relatedViews: ['view-dokumen', 'view-admin-verif'],
    userRoles: ['guru', 'admin', 'all']
  },

  // 6. Daftar Nilai (view-gradebook)
  {
    id: 'faq-gradebook-1',
    category: 'Daftar Nilai',
    question: 'Bagaimana cara menginput nilai formatif dan sumatif siswa di Daftar Nilai?',
    answer: 'Buka menu Daftar Nilai, pilih mata pelajaran, kelas, dan semester aktif. Buat atau pilih Tujuan Pembelajaran (TP) yang dinilai, tambahkan kolom asesmen (Formatif atau Sumatif), lalu masukkan nilai numerik siswa pada tabel matriks yang tersedia. Nilai akan tersimpan otomatis saat Anda berpindah baris.',
    keywords: ['daftar nilai', 'nilai', 'input nilai', 'tp', 'formatif', 'sumatif', 'asesmen', 'gradebook', 'angka'],
    relatedViews: ['view-gradebook'],
    userRoles: ['guru', 'admin', 'all']
  },
  {
    id: 'faq-gradebook-2',
    category: 'Daftar Nilai',
    question: 'Bagaimana cara mengekspor rekap daftar nilai siswa ke format Excel?',
    answer: 'Buka menu Daftar Nilai, pilih tab Rekap Semester, pilih kelas dan mapel yang diinginkan, kemudian klik tombol Ekspor Excel di sudut kanan atas tabel untuk mengunduh rekap nilai lengkap beserta bobot dan rata-ratanya.',
    keywords: ['ekspor excel', 'unduh nilai', 'download excel', 'daftar nilai', 'rapor', 'rekap nilai', 'spreadsheet'],
    relatedViews: ['view-gradebook'],
    userRoles: ['guru', 'admin', 'all']
  },

  // 7. Chat Guru (view-chat)
  {
    id: 'faq-chat-1',
    category: 'Chat Guru',
    question: 'Bagaimana cara mengirim pesan kepada rekan guru di Chat Guru?',
    answer: 'Buka menu Chat Guru, klik nama rekan guru dari daftar guru di bilah kiri, ketik pesan Anda pada kolom percakapan di bagian bawah, lalu tekan tombol kirim atau Enter. Pesan diterima secara real-time.',
    keywords: ['chat guru', 'pesan', 'kirim pesan', 'obrolan', 'komunikasi', 'rekan', 'kirim chat'],
    relatedViews: ['view-chat'],
    userRoles: ['guru', 'admin', 'all']
  },
  {
    id: 'faq-chat-2',
    category: 'Chat Guru',
    question: 'Apakah obrolan di Chat Guru bersifat pribadi?',
    answer: 'Ya, percakapan di Chat Guru adalah pesan pribadi (direct message) antar akun pengirim dan penerima yang terenkripsi dan terhubung secara langsung antar pengguna dalam sekolah yang sama.',
    keywords: ['chat pribadi', 'keamanan', 'rahasia', 'direct message', 'chat guru', 'privasi'],
    relatedViews: ['view-chat'],
    userRoles: ['guru', 'admin', 'all']
  },

  // 8. Informasi (view-informasi)
  {
    id: 'faq-info-1',
    category: 'Informasi',
    question: 'Bagaimana cara membaca dan memberikan komentar tanggapan pada pengumuman sekolah?',
    answer: 'Buka menu Informasi. Pilih pengumuman yang ingin Anda baca. Jika pengumuman disetel sebagai komunikasi dua arah oleh admin, Anda dapat mengetik pertanyaan atau konfirmasi pada kolom tanggapan di bawah pengumuman tersebut.',
    keywords: ['informasi', 'pengumuman', 'baca', 'tanggapan', 'komentar', 'balas', 'siaran', 'berita'],
    relatedViews: ['view-informasi'],
    userRoles: ['guru', 'admin', 'all']
  },
  {
    id: 'faq-info-2',
    category: 'Informasi',
    question: 'Bagaimana administrator menerbitkan dan menyematkan pengumuman baru?',
    answer: 'Administrator membuka menu Informasi, klik tombol + Buat Pengumuman. Tuliskan judul, isi berita, tentukan sasaran (Semua/Guru/Wali Kelas/Orang Tua), centang opsi Sematkan Pengumuman (Pin) agar berada di posisi paling atas, dan pilih mode komunikasi (Satu Arah atau Dua Arah).',
    keywords: ['buat pengumuman', 'terbitkan', 'pin', 'sematkan', 'admin', 'informasi', 'siaran', 'publikasi'],
    relatedViews: ['view-informasi'],
    userRoles: ['admin', 'all']
  },

  // 9. Riwayat (view-history)
  {
    id: 'faq-history-1',
    category: 'Riwayat',
    question: 'Bagaimana cara mengecek riwayat absensi dan keterlambatan saya di masa lalu?',
    answer: 'Buka menu Riwayat, pilih tab Presensi. Anda akan melihat daftar seluruh presensi datang dan pulang yang pernah Anda lakukan, lengkap dengan jam tercatat, jumlah menit keterlambatan, foto selfie, dan status verifikasi admin.',
    keywords: ['riwayat', 'history', 'riwayat absensi', 'cek keterlambatan', 'catatan kehadiran', 'menit telat'],
    relatedViews: ['view-history'],
    userRoles: ['guru', 'all']
  },
  {
    id: 'faq-history-2',
    category: 'Riwayat',
    question: 'Di mana saya bisa meninjau arsip jurnal KBM yang pernah saya buat sebelumnya?',
    answer: 'Di menu Riwayat, pilih tab Jurnal. Anda dapat menelusuri seluruh jurnal pembelajaran lampau, melihat materi yang pernah diajarkan, catatan khusus siswa, dan dokumentasi foto KBM.',
    keywords: ['riwayat jurnal', 'arsip jurnal', 'cek jurnal lama', 'riwayat mengajar', 'arsip kbm'],
    relatedViews: ['view-history'],
    userRoles: ['guru', 'all']
  },

  // 10. Rekap Jurnal (view-guru-rekap-jurnal)
  {
    id: 'faq-rekap-jurnal-1',
    category: 'Rekap Jurnal',
    question: 'Bagaimana cara mencetak rekapitulasi jurnal mengajar bulanan saya?',
    answer: 'Buka menu Rekap Jurnal, pilih bulan yang ingin dicetak, lalu periksa daftar jurnal yang tampil. Klik tombol Cetak Halaman di kanan atas. Tampilan cetak otomatis memuat kop surat resmi sekolah, tabel rekapitulasi materi, dan kolom tanda tangan Kepala Sekolah.',
    keywords: ['cetak jurnal', 'rekap jurnal', 'print jurnal', 'bulanan', 'laporan jurnal', 'kop surat', 'tanda tangan'],
    relatedViews: ['view-guru-rekap-jurnal'],
    userRoles: ['guru', 'admin', 'all']
  },
  {
    id: 'faq-rekap-jurnal-2',
    category: 'Rekap Jurnal',
    question: 'Bisakah saya memfilter rekap jurnal berdasarkan rentang tanggal tertentu?',
    answer: 'Ya, di menu Rekap Jurnal, Anda dapat membuka opsi Filter Rentang Khusus untuk menentukan Tanggal Mulai dan Tanggal Selesai secara bebas di luar periode bulanan standar.',
    keywords: ['filter rentang', 'tanggal custom', 'rekap jurnal', 'periode', 'rentang tanggal', 'kustom'],
    relatedViews: ['view-guru-rekap-jurnal'],
    userRoles: ['guru', 'admin', 'all']
  },

  // 11. Presensi Siswa (view-rekap-siswa)
  {
    id: 'faq-rekap-siswa-1',
    category: 'Presensi Siswa',
    question: 'Bagaimana cara wali kelas memperbarui atau menginput absensi harian kelas binaan?',
    answer: 'Wali kelas membuka menu Presensi Siswa, lalu klik tab Input Absensi Wali Kelas. Pilih tanggal hari ini, lalu ubah status siswa yang berhalangan hadir menjadi Sakit, Izin, atau Alpa beserta keterangannya, kemudian klik Simpan Absensi.',
    keywords: ['presensi siswa', 'wali kelas', 'input absensi', 'kehadiran siswa', 'rekap siswa', 'absen harian'],
    relatedViews: ['view-rekap-siswa'],
    userRoles: ['guru', 'admin', 'all']
  },
  {
    id: 'faq-rekap-siswa-2',
    category: 'Presensi Siswa',
    question: 'Bagaimana cara melihat persentase kehadiran siswa per mata pelajaran?',
    answer: 'Di menu Presensi Siswa, pilih kelas dan mata pelajaran pada dropdown filter, lalu klik tombol Tampilkan. Anda akan melihat rekapitulasi total hadir, sakit, izin, dan alpa setiap murid beserta persentase kehadirannya.',
    keywords: ['persentase kehadiran', 'kehadiran murid', 'rekap absensi siswa', 'presensi siswa', 'persen'],
    relatedViews: ['view-rekap-siswa'],
    userRoles: ['guru', 'admin', 'all']
  },

  // 12. Verifikasi (view-admin-verif)
  {
    id: 'faq-verif-1',
    category: 'Verifikasi',
    question: 'Bagaimana administrator menyetujui atau menolak permohonan izin/sakit guru?',
    answer: 'Buka menu Verifikasi, pilih tab Presensi. Cari pengajuan guru yang bertanda Menunggu. Klik tombol Setujui untuk memvalidasi izin/sakit, atau klik Tolak dan masukkan alasan penolakan agar guru dapat merevisi pengajuannya.',
    keywords: ['verifikasi', 'setujui izin', 'tolak izin', 'verifikasi presensi', 'admin verifikasi', 'validasi', 'alasan tolak'],
    relatedViews: ['view-admin-verif'],
    userRoles: ['admin', 'all']
  },
  {
    id: 'faq-verif-2',
    category: 'Verifikasi',
    question: 'Bagaimana jika admin salah menekan tombol verifikasi dan ingin membatalkannya?',
    answer: 'Pada kartu pengajuan yang sudah diverifikasi di menu Verifikasi, terdapat tombol Reset Status (ikon panah melingkar). Klik tombol tersebut untuk mengembalikan status pengajuan kembali menjadi Menunggu.',
    keywords: ['reset status', 'batal verifikasi', 'salah verifikasi', 'kembalikan verifikasi', 'urungkan'],
    relatedViews: ['view-admin-verif'],
    userRoles: ['admin', 'all']
  },

  // 13. Sistem Blok (view-sistem-blok)
  {
    id: 'faq-blok-1',
    category: 'Sistem Blok',
    question: 'Apa kegunaan fitur Sistem Blok dan bagaimana cara membuatnya?',
    answer: 'Fitur Sistem Blok digunakan untuk menandai periode kegiatan khusus sekolah (misal: Ujian Semester, AKM, Masa Jeda, atau Pondok Ramadhan). Untuk membuatnya, administrator membuka menu Sistem Blok, klik + Tambah Periode Blok, masukkan nama kegiatan, tanggal mulai, tanggal selesai, dan deskripsi, lalu klik Simpan.',
    keywords: ['sistem blok', 'buat blok', 'periode blok', 'ujian sekolah', 'kegiatan khusus', 'jadwal jeda'],
    relatedViews: ['view-sistem-blok'],
    userRoles: ['admin', 'all']
  },
  {
    id: 'faq-blok-2',
    category: 'Sistem Blok',
    question: 'Apakah jadwal pelajaran reguler di database akan terhapus saat Sistem Blok aktif?',
    answer: 'Tidak sama sekali! Data jadwal mengajar reguler tetap utuh tersimpan di database. Sistem Blok hanya menyembunyikan jadwal reguler dari antarmuka guru selama tanggal blok tersebut berlangsung dan mengalihkan guru untuk mengisi Jurnal Kegiatan. Setelah periode blok berakhir, jadwal reguler otomatis kembali tampil normal.',
    keywords: ['jadwal terhapus', 'database jadwal', 'sistem blok aktif', 'jadwal reguler hilang', 'aman', 'tetap utuh'],
    relatedViews: ['view-sistem-blok', 'view-guru-jurnal'],
    userRoles: ['admin', 'guru', 'all']
  },

  // 14. Jurnal Kelas (view-jurnal-kelas)
  {
    id: 'faq-jurnal-kelas-1',
    category: 'Jurnal Kelas',
    question: 'Siapa saja yang memiliki hak akses untuk membuka halaman Jurnal Kelas?',
    answer: 'Halaman Jurnal Kelas secara eksklusif hanya dapat diakses oleh Administrator dan guru yang ditugaskan sebagai Wali Kelas. Guru biasa yang bukan wali kelas tidak dapat membukanya.',
    keywords: ['jurnal kelas', 'akses ditolak', 'wali kelas', 'siapa bisa buka', 'hak akses', 'izin akses'],
    relatedViews: ['view-jurnal-kelas'],
    userRoles: ['guru', 'admin', 'all']
  },
  {
    id: 'faq-jurnal-kelas-2',
    category: 'Jurnal Kelas',
    question: 'Bagaimana cara wali kelas memantau aktivitas mengajar guru lain di kelas binaannya?',
    answer: 'Di menu Jurnal Kelas, wali kelas dapat melihat seluruh jurnal pembelajaran yang diisi oleh guru mapel apa saja pada kelas binaan tersebut setiap harinya, termasuk materi yang diajarkan dan siswa yang tidak hadir pada jam tersebut.',
    keywords: ['pantau kelas', 'jurnal kelas', 'wali kelas pantau', 'guru mapel masuk', 'pengawasan kelas'],
    relatedViews: ['view-jurnal-kelas'],
    userRoles: ['guru', 'admin', 'all']
  },

  // 15. Analitik (view-analitik)
  {
    id: 'faq-analitik-1',
    category: 'Analitik',
    question: 'Data statistik apa saja yang disajikan di menu Analitik?',
    answer: 'Menu Analitik menyajikan ringkasan metrik sekolah bulanan: total kehadiran tepat waktu, jumlah keterlambatan, pengajuan izin/sakit/dinas luar, total jurnal KBM terverifikasi, laporan piket, serta Leaderboard (peringkat guru paling disiplin).',
    keywords: ['analitik', 'statistik', 'kpi', 'kehadiran tepat waktu', 'grafik', 'leaderboard', 'kinerja'],
    relatedViews: ['view-analitik'],
    userRoles: ['admin', 'all']
  },
  {
    id: 'faq-analitik-2',
    category: 'Analitik',
    question: 'Bagaimana cara melihat peringkat kedisiplinan guru (Leaderboard)?',
    answer: 'Buka menu Analitik, pilih bulan yang ingin dianalisis. Di bagian bawah dasbor terdapat kartu Leaderboard Guru yang mengurutkan guru berdasarkan tingkat kehadiran tertinggi dan menit keterlambatan terendah.',
    keywords: ['leaderboard', 'peringkat guru', 'guru disiplin', 'analitik guru', 'juara', 'terajin'],
    relatedViews: ['view-analitik'],
    userRoles: ['admin', 'all']
  },

  // 16. Rekap Akhir (view-admin-rekap)
  {
    id: 'faq-admin-rekap-1',
    category: 'Rekap Akhir',
    question: 'Bagaimana cara mencetak laporan rekapitulasi bulanan seluruh guru untuk yayasan/dinas?',
    answer: 'Administrator membuka menu Rekap Akhir, pilih bulan berjalan atau tentukan rentang tanggal kustom, pastikan seluruh data sudah terangkum, lalu klik tombol Cetak Halaman untuk mencetak laporan resmi berstempel dan bertanda tangan Kepala Sekolah.',
    keywords: ['rekap akhir', 'laporan bulanan', 'cetak rekap guru', 'dinas', 'yayasan', 'print rekap', 'laporan kepala sekolah'],
    relatedViews: ['view-admin-rekap'],
    userRoles: ['admin', 'all']
  },
  {
    id: 'faq-admin-rekap-2',
    category: 'Rekap Akhir',
    question: 'Bisakah laporan rekapitulasi akhir diekspor ke file Excel?',
    answer: 'Ya, di sudut kanan atas menu Rekap Akhir terdapat tombol Ekspor Excel. Klik tombol tersebut untuk mengunduh seluruh data presensi, menit telat, jurnal, dan piket ke format spreadsheet .xlsx.',
    keywords: ['ekspor excel', 'rekap akhir excel', 'unduh laporan', 'download excel rekap', 'file excel'],
    relatedViews: ['view-admin-rekap'],
    userRoles: ['admin', 'all']
  },

  // 17. Master Data (view-admin-data)
  {
    id: 'faq-master-data-1',
    category: 'Master Data',
    question: 'Bagaimana cara mengelola data siswa, data guru, dan jadwal KBM di Master Data?',
    answer: 'Buka menu Master Data, pilih tab yang ingin dikelola: Siswa untuk data murid, Guru untuk data pengajar & reset akun, Mapel untuk mata pelajaran, Kalender untuk hari libur, Jadwal untuk alokasi jam KBM mingguan, dan Wali Kelas untuk penugasan wali kelas. Anda dapat menambah, mengedit, atau menghapus data langsung dari tabel.',
    keywords: ['master data', 'kelola siswa', 'kelola guru', 'jadwal pelajaran', 'tambah data', 'edit guru', 'tabel data'],
    relatedViews: ['view-admin-data'],
    userRoles: ['admin', 'all']
  },
  {
    id: 'faq-master-data-2',
    category: 'Master Data',
    question: 'Bagaimana cara melakukan kenaikan kelas atau kelulusan siswa secara massal?',
    answer: 'Di menu Master Data, buka tab Siswa, lalu klik tombol Proses Naik Kelas di atas tabel. Pilih kelas asal dan kelas tujuan untuk memindahkan murid secara massal, atau tentukan status lulus bagi kelas akhir.',
    keywords: ['naik kelas', 'kenaikan kelas', 'kelulusan', 'massal', 'tahun ajaran baru', 'pindah kelas'],
    relatedViews: ['view-admin-data'],
    userRoles: ['admin', 'all']
  },
  {
    id: 'faq-master-data-3',
    category: 'Master Data',
    question: 'Bagaimana cara mereset password akun guru yang lupa kata sandi?',
    answer: 'Masuk ke menu Master Data, pilih tab Guru, cari nama guru yang bersangkutan, klik ikon kunci atau edit data guru, lalu masukkan kata sandi baru dan klik Simpan. Guru dapat langsung login dengan kata sandi baru tersebut.',
    keywords: ['lupa password', 'reset password', 'ganti sandi guru', 'kata sandi akun', 'buka sandi'],
    relatedViews: ['view-admin-data'],
    userRoles: ['admin', 'all']
  },

  // 18. Akses Data/Backup (view-admin-backup)
  {
    id: 'faq-backup-1',
    category: 'Akses Data / Backup',
    question: 'Kapan dan bagaimana cara melakukan backup data tahunan di aplikasi?',
    answer: 'Backup data disarankan dilakukan setiap akhir semester atau akhir tahun ajaran. Buka menu Akses Data / Backup, masukkan tahun ajaran yang akan dicadangkan, lalu klik Backup Sekarang. Data transaksi presensi dan jurnal akan disinkronkan ke Google Spreadsheet/Cloud dan riwayat backup akan dicatat.',
    keywords: ['backup', 'pencadangan', 'akses data', 'spreadsheet', 'arsip data', 'simpan data', 'cadangkan'],
    relatedViews: ['view-admin-backup'],
    userRoles: ['admin', 'all']
  },
  {
    id: 'faq-backup-2',
    category: 'Akses Data / Backup',
    question: 'Apakah data di aplikasi akan hilang setelah proses backup dijalankan?',
    answer: 'Data presensi dan jurnal yang telah dicadangkan ke Google Spreadsheet dapat dibersihkan dari database lokal untuk menghemat kuota dan mempercepat respon aplikasi, sementara arsip permanen tetap aman tersimpan di Spreadsheet.',
    keywords: ['hapus data', 'kosongkan data', 'keamanan backup', 'database ringan', 'bersihkan riwayat'],
    relatedViews: ['view-admin-backup'],
    userRoles: ['admin', 'all']
  },

  // 19. Sistem Konfigurasi (view-admin-config)
  {
    id: 'faq-config-1',
    category: 'Sistem Konfigurasi',
    question: 'Bagaimana cara mengatur titik lokasi GPS dan radius presensi sekolah?',
    answer: 'Masuk ke menu Sistem, gulir ke bagian Pengaturan Lokasi GPS Absensi. Anda bisa mengklik tombol Deteksi Lokasi Saat Ini atau memasukkan Latitude dan Longitude sekolah secara manual, serta mengisi batas Radius Presensi (meter) (misalnya 100 meter). Setelah selesai, klik Simpan Konfigurasi.',
    keywords: ['pengaturan gps', 'radius presensi', 'titik lokasi sekolah', 'geofence', 'latitude', 'longitude', 'jarak meter'],
    relatedViews: ['view-admin-config'],
    userRoles: ['admin', 'all']
  },
  {
    id: 'faq-config-2',
    category: 'Sistem Konfigurasi',
    question: 'Bagaimana cara mengubah jam presensi datang dan jam kepulangan guru?',
    answer: 'Di menu Sistem, pada bagian Pengaturan Jam Presensi, Anda dapat mengatur Jam Datang Mulai, Jam Batas Tepat Waktu (batas toleransi keterlambatan), Jam Datang Akhir, Jam Pulang Mulai, Jam Pulang Hari Jumat, dan Jam Pulang Akhir, lalu klik Simpan Konfigurasi.',
    keywords: ['jam kerja', 'jam presensi', 'jam datang', 'jam pulang', 'toleransi telat', 'atur jam', 'waktu kerja'],
    relatedViews: ['view-admin-config'],
    userRoles: ['admin', 'all']
  },

  // 20. Umum & Bantuan (view-home)
  {
    id: 'faq-general-1',
    category: 'Umum & Bantuan',
    question: 'Apa itu aplikasi SIPJAM dan siapa saja penggunanya?',
    answer: 'SIPJAM (Sistem Informasi Presensi dan Jurnal Mengajar) adalah aplikasi terintegrasi untuk mencatat presensi guru berbasis GPS/swafoto, jurnal kegiatan pembelajaran (KBM), laporan ketertiban piket, serta buku nilai digital. Aplikasi ini digunakan oleh Dewan Guru, Wali Kelas, dan Administrator Sekolah.',
    keywords: ['tentang sipjam', 'aplikasi apa', 'pengguna', 'fungsi', 'fitur utama', 'bantuan'],
    relatedViews: ['view-home'],
    userRoles: ['all']
  },
  {
    id: 'faq-general-2',
    category: 'Umum & Bantuan',
    question: 'Bagaimana cara mengganti profil, password akun, atau logout dari aplikasi?',
    answer: 'Klik ikon foto profil Anda di sudut kanan atas layar (atau buka menu Pengaturan Akun di bilah sisi). Anda dapat memperbarui foto profil, nomor WhatsApp, mengubah kata sandi lama ke sandi baru, mengulang tutorial interaktif, atau menekan tombol Keluar (Logout).',
    keywords: ['ganti profil', 'ubah sandi', 'logout', 'keluar', 'pengaturan akun', 'edit profil'],
    relatedViews: ['view-home'],
    userRoles: ['all']
  }
];
