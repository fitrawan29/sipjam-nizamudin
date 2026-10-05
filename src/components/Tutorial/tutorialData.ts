export interface TutorialItem {
  id: string;
  viewId: string;
  title: string;
  icon: string;
  role: 'guru' | 'admin' | 'superadmin' | 'all';
  summary: string;
  prerequisites?: string;
  steps: string[];
  keyTips: string[];
}

export const TUTORIAL_DATA: TutorialItem[] = [
  // ==========================================
  // GURU MENUS (11 Menus)
  // ==========================================
  {
    id: 'guru-dashboard',
    viewId: 'view-home',
    title: 'Dashboard Guru',
    icon: 'fa-house',
    role: 'guru',
    summary: 'Pusat ringkasan aktivitas harian guru, pantauan 4 langkah kerja harian, status kehadiran, akumulasi keterlambatan, dan jadwal KBM hari ini.',
    prerequisites: 'Akun guru aktif terdaftar di sekolah.',
    steps: [
      'Buka menu Dashboard untuk melihat status 4 langkah kerja harian: Presensi Datang, Jurnal Pembelajaran, Laporan Piket (jika terjadwal), dan Presensi Pulang.',
      'Periksa kartu akumulasi keterlambatan bulan berjalan dan status kehadiran hari ini.',
      'Lihat jadwal mengajar hari ini untuk mengetahui kelas, mata pelajaran, dan jam mengajar.',
      'Pantau siaran pengumuman penting dari manajemen sekolah pada bagian atas halaman.'
    ],
    keyTips: [
      'Indikator 4 langkah kerja otomatis mencentang hijau setelah masing-masing aktivitas berhasil disubmit.',
      'Jika periode Sistem Blok sedang aktif, pengumuman kegiatan khusus akan ditampilkan secara jelas di dashboard.'
    ]
  },
  {
    id: 'guru-presensi',
    viewId: 'view-guru-presensi',
    title: 'Presensi Guru',
    icon: 'fa-right-to-bracket',
    role: 'guru',
    summary: 'Pencatatan kehadiran mandiri (Datang & Pulang) dengan kamera potret anti-zoom, deteksi radius geofence GPS, dan pengajuan izin/sakit/dinas luar.',
    prerequisites: 'Izinkan akses kamera dan lokasi (GPS) pada browser/perangkat Anda.',
    steps: [
      'Buka menu Presensi Guru pada rentang jam presensi yang telah ditetapkan sekolah.',
      'Pilih status presensi: Hadir Datang, Hadir Pulang, Izin, Sakit, Izin Terlambat, atau Dinas Luar.',
      'Untuk Hadir Datang/Pulang: Ambil foto selfie tegak (kamera otomatis mode portrait 1:1 tanpa zoom) dalam radius geofence sekolah.',
      'Untuk Izin/Sakit/Izin Terlambat/Dinas Luar: Unggah foto surat keterangan pendukung dan tuliskan alasan secara jelas.',
      'Klik tombol "Kirim Presensi". Jika koneksi terputus, sistem menyimpan ke antrean offline lokal dan menyinkronkan otomatis saat online kembali.'
    ],
    keyTips: [
      'Pastikan GPS akurat dan tidak menggunakan aplikasi pemalsu lokasi (Fake GPS / Mock Location).',
      'Pengajuan Izin, Sakit, dan Izin Terlambat akan berstatus "Menunggu Verifikasi" hingga diverifikasi oleh Administrator sekolah.',
      'Tombol Hadir Pulang hanya aktif setelah jam kepulangan resmi sekolah tiba.'
    ]
  },
  {
    id: 'guru-jurnal',
    viewId: 'view-guru-jurnal',
    title: 'Jurnal Pembelajaran',
    icon: 'fa-book-journal-whills',
    role: 'guru',
    summary: 'Pengisian jurnal KBM harian terstruktur dengan auto-save lokal, mode Guru Inval, live absensi murid H/I/S/A, kamera lanskap, dan switch ke Jurnal Kegiatan saat Sistem Blok aktif.',
    prerequisites: 'Telah melakukan Presensi Datang pada hari tersebut.',
    steps: [
      'Buka menu Jurnal Pembelajaran. Formulir KBM otomatis memuat tanggal hari ini.',
      'Isi formulir terstruktur: Tujuan Pembelajaran (wajib) dan KKTP / Kriteria Ketercapaian Tujuan Pembelajaran (wajib).',
      'Ketik Konten materi yang diajarkan dan Kegiatan Pembelajaran yang berlangsung.',
      'Pilih Mata Pelajaran dan Kelas. Jika menggantikan rekan guru yang berhalangan, aktifkan toggle "Saya sebagai Guru Inval" lalu pilih nama guru yang digantikan.',
      'Lakukan absensi murid secara langsung dengan menandai status Hadir, Izin, Sakit, atau Alpa (H/I/S/A) per siswa.',
      'Ketik Lokasi KBM (misal: "Ruang Kelas 7A" atau "Laboratorium IPA") dan ambil foto dokumentasi KBM menggunakan kamera mode lanskap.',
      'Tambahkan Catatan / Refleksi pembelajaran jika ada, lalu klik tombol "Simpan Jurnal".'
    ],
    keyTips: [
      'Formulir otomatis tersimpan di penyimpanan lokal browser (auto-save), sehingga aman dari kehilangan data saat jaringan terputus.',
      'Saat periode Sistem Blok aktif, formulir beralih otomatis ke Jurnal Kegiatan khusus tanpa absensi kelas reguler.'
    ]
  },
  {
    id: 'guru-jurnal-kelas',
    viewId: 'view-jurnal-kelas',
    title: 'Jurnal Kelas',
    icon: 'fa-chalkboard-user',
    role: 'guru',
    summary: 'Pemantauan rekapitulasi keterisian jurnal pembelajaran seluruh mata pelajaran khusus pada kelas binaan Wali Kelas.',
    prerequisites: 'Akun ditugaskan sebagai Wali Kelas aktif di sekolah.',
    steps: [
      'Buka menu Jurnal Kelas dari sidebar (menu ini khusus tampil bagi Wali Kelas).',
      'Pilih tanggal atau rentang waktu pemantauan kelas binaan Anda.',
      'Tinjau daftar jurnal KBM yang telah dimasukkan oleh seluruh guru mata pelajaran di kelas Anda.',
      'Periksa ketercapaian materi, absensi siswa per jam pelajaran, serta catatan khusus dari guru mapel.'
    ],
    keyTips: [
      'Wali kelas dapat memantau siswa yang alpa atau tidak hadir pada mata pelajaran tertentu meskipun hadir di awal hari.',
      'Menu ini otomatis tersembunyi bagi guru yang bukan merupakan wali kelas.'
    ]
  },
  {
    id: 'guru-piket',
    viewId: 'view-piket',
    title: 'Modul Piket Guru',
    icon: 'fa-shield-halved',
    role: 'guru',
    summary: 'Pengoperasian presensi siswa (scan QR kamera browser / scanner USB HID hardware hingga 10 unit / input manual), buku tamu, dan laporan piket harian.',
    prerequisites: 'Guru memiliki jadwal penugasan piket pada hari ini.',
    steps: [
      'Buka menu Modul Piket (hanya aktif dan dapat dibuka pada hari Anda bertugas piket).',
      'Pada tab Presensi Siswa, tentukan mode pencatatan: Scan QR atau Manual Checklist.',
      'Untuk Mode QR: Arahkan QR code kartu siswa ke kamera browser atau sambungkan barcode scanner USB HID eksternal (otomatis tekan Enter).',
      'Untuk Mode Manual: Cari nama siswa lalu klik tombol "Tandai Datang" atau "Tandai Pulang" (daftar siswa tetap utuh setelah ditandai).',
      'Catat tamu sekolah pada tab Buku Tamu dan kejadian penting pada tab Catatan Kejadian/Ketertiban.',
      'Ambil foto dokumentasi piket (kamera lanskap) dan kirimkan Laporan Piket Harian sebelum jam piket berakhir.'
    ],
    keyTips: [
      'Presensi siswa yang discan guru piket langsung tersinkronisasi ke daftar siswa guru mata pelajaran di jurnal KBM dan rekap wali kelas.',
      'Mendukung hingga 10 unit hardware scanner USB di beberapa komputer/laptop piket secara bersamaan.'
    ]
  },
  {
    id: 'guru-dokumen',
    viewId: 'view-dokumen',
    title: 'Perangkat Pembelajaran',
    icon: 'fa-folder-open',
    role: 'guru',
    summary: 'Pengunggahan berkas administrasi guru (CP, ATP, RPE, Prota, Promes, Modul Ajar) dan pemantauan status validasi/verifikasi oleh admin.',
    prerequisites: 'Berkas administrasi kurikulum dalam format PDF atau dokumen pendukung.',
    steps: [
      'Buka menu Perangkat Pembelajaran.',
      'Pilih jenis dokumen yang ingin diunggah: CP, ATP, RPE, Program Tahunan, Program Semester, atau Modul Ajar/RPP.',
      'Pilih tingkat kelas, semester, dan mata pelajaran yang relevan.',
      'Unggah file dokumen dan beri keterangan/catatan jika diperlukan, lalu klik "Unggah Perangkat".',
      'Pantau status telaah: "Menunggu", "Disetujui", atau "Perlu Revisi" dari pihak Kurikulum/Admin.'
    ],
    keyTips: [
      'Jika dokumen membutuhkan revisi, baca catatan revisi dari admin lalu unggah kembali berkas perbaikan.',
      'Dokumen yang disetujui akan diarsipkan secara rapi untuk bukti portofolio supervisi akademik.'
    ]
  },
  {
    id: 'guru-gradebook',
    viewId: 'view-gradebook',
    title: 'Daftar Nilai (Gradebook)',
    icon: 'fa-graduation-cap',
    role: 'guru',
    summary: 'Buku nilai digital Kurikulum Merdeka untuk input asesmen formatif & sumatif per TP, pembobotan nilai, dan ekspor ke lembar kerja Excel.',
    prerequisites: 'Penugasan mata pelajaran dan kelas sudah terdaftar di Master Data.',
    steps: [
      'Buka menu Daftar Nilai dari sidebar.',
      'Pilih kelas, mata pelajaran, dan semester yang ingin diinputkan nilainya.',
      'Tentukan Tujuan Pembelajaran (TP) atau lingkup materi yang dinilai.',
      'Masukkan nilai formatif dan nilai sumatif untuk setiap siswa pada tabel penilaian.',
      'Sistem otomatis menghitung nilai akhir, rata-rata kelas, dan predikat capaian kompetensi.',
      'Gunakan tombol "Ekspor Excel" untuk mengunduh rekap nilai dalam format spreadsheet (.xlsx).'
    ],
    keyTips: [
      'Simpan perubahan nilai secara berkala saat mengisi daftar nilai dalam jumlah besar.',
      'Nilai yang telah diinput dapat digunakan wali kelas untuk penyusunan rapor siswa.'
    ]
  },
  {
    id: 'guru-informasi',
    viewId: 'view-informasi',
    title: 'Informasi & Siaran Sekolah',
    icon: 'fa-bullhorn',
    role: 'guru',
    summary: 'Pusat pengumuman resmi sekolah, surat edaran kedinasan, agenda kegiatan, dan forum diskusi/komentar interaktif.',
    prerequisites: 'Akun guru aktif.',
    steps: [
      'Buka menu Informasi untuk membaca daftar siaran resmi dari manajemen sekolah.',
      'Klik pada judul pengumuman untuk melihat isi lengkap serta lampiran pengumuman.',
      'Jika pengumuman mengaktifkan mode diskusi dua arah, Anda dapat mengirim komentar atau tanggapan di bawah pengumuman.',
      'Pengumuman baru yang belum dibaca ditandai dengan ikon lonceng bergetar di bilah header atas.'
    ],
    keyTips: [
      'Gunakan filter kategori (Semua, Penting, Agenda) untuk menemukan pengumuman spesifik dengan cepat.'
    ]
  },
  {
    id: 'guru-history',
    viewId: 'view-history',
    title: 'Riwayat Aktivitas',
    icon: 'fa-clock-rotate-left',
    role: 'guru',
    summary: 'Pencarian arsip catatan presensi dan riwayat pengisian jurnal pembelajaran masa lalu beserta detail status dan foto selfie.',
    prerequisites: 'Akun guru aktif.',
    steps: [
      'Buka menu Riwayat untuk melihat jejak rekam presensi dan jurnal yang pernah Anda buat.',
      'Gunakan tab "Riwayat Presensi" untuk mengecek jam datang, jam pulang, menit keterlambatan, dan foto selfie tiap hari.',
      'Gunakan tab "Riwayat Jurnal" untuk meninjau kembali jurnal KBM yang pernah Anda kirimkan beserta siswa yang hadir/absen.',
      'Gunakan filter bulan dan tahun untuk melihat arsip bulan-bulan sebelumnya.'
    ],
    keyTips: [
      'Cocok digunakan untuk mencocokkan laporan kinerja pribadi atau klarifikasi jam presensi.'
    ]
  },
  {
    id: 'guru-rekap-jurnal',
    viewId: 'view-guru-rekap-jurnal',
    title: 'Rekap Jurnal Guru',
    icon: 'fa-book-open',
    role: 'guru',
    summary: 'Pencetakan laporan rekapitulasi jurnal pembelajaran bulanan format resmi 10 kolom standar dengan tanda tangan kepala sekolah.',
    prerequisites: 'Telah mengisi jurnal KBM pada periode bulan yang akan dicetak.',
    steps: [
      'Buka menu Rekap Jurnal dari sidebar.',
      'Pilih bulan dan tahun atau tentukan rentang tanggal kustom yang ingin direkap.',
      'Tinjau tampilan tabel 10 kolom: No, Hari/Tanggal, Tujuan Pembelajaran, KKTP, Konten, Kegiatan Pembelajaran, Kelas, Mata Pelajaran, Absensi Murid (H/I/S/A), Lokasi KBM, Foto Dokumentasi Lanskap, dan Catatan.',
      'Klik tombol "Cetak Dokumen" (Ctrl+P). Tata letak cetak otomatis bersih tanpa tombol UI, mempertahankan watermark sekolah.',
      'Dokumen siap dicetak langsung atau disimpan ke format PDF untuk pelaporan kinerja.'
    ],
    keyTips: [
      'Tata letak cetak dokumen guru sudah terstandarisasi identik dengan dokumen admin dan ramah kertas (print-friendly).'
    ]
  },
  {
    id: 'guru-rekap-siswa',
    viewId: 'view-rekap-siswa',
    title: 'Presensi Siswa (Wali Kelas)',
    icon: 'fa-users-viewfinder',
    role: 'guru',
    summary: 'Rekapitulasi absensi harian dan bulanan siswa khusus untuk kelas binaan wali kelas, input/koreksi absensi, dan persentase kehadiran.',
    prerequisites: 'Akun ditugaskan sebagai Wali Kelas aktif di sekolah.',
    steps: [
      'Buka menu Presensi Siswa dari sidebar (menu ini khusus tampil bagi Wali Kelas).',
      'Filter kelas otomatis terkunci pada kelas binaan Anda untuk menjamin privasi siswa kelas lain.',
      'Pilih bulan dan tahun untuk melihat matriks absensi harian (Hadir, Sakit, Izin, Alpa) seluruh siswa binaan.',
      'Jika terdapat kekeliruan absensi dari guru piket atau guru mapel, wali kelas dapat melakukan koreksi status kehadiran.',
      'Unduh laporan rekapitulasi kehadiran siswa dalam format dokumen cetak resmi atau file Excel.'
    ],
    keyTips: [
      'Guru biasa yang bukan wali kelas tidak memiliki akses ke rekap menyeluruh ini demi privasi data kelas.'
    ]
  },

  // ==========================================
  // ADMIN MENUS (14 Menus)
  // ==========================================
  {
    id: 'admin-dashboard',
    viewId: 'view-home',
    title: 'Dashboard Administrator',
    icon: 'fa-house',
    role: 'admin',
    summary: 'Pusat komando operasional sekolah: statistik kehadiran guru real-time, grafik keterlambatan, guru belum presensi/jurnal, dan shortcut verifikasi.',
    prerequisites: 'Akun administrator sekolah terverifikasi.',
    steps: [
      'Pantau metrik utama: total guru hadir tepat waktu, guru terlambat, izin/sakit, dan alpa hari ini.',
      'Periksa daftar guru yang belum melakukan presensi datang atau belum mengisi jurnal mengajar hari ini.',
      'Lihat grafik tren keterlambatan dan rasio disiplin mengajar mingguan.',
      'Buka jalan pintas langsung ke Verifikasi Cepat untuk menindaklanjuti pengajuan guru yang tertunda.'
    ],
    keyTips: [
      'Gunakan fitur pengingat guru otomatis untuk mengirimkan notifikasi bagi guru yang belum absen/jurnal.'
    ]
  },
  {
    id: 'admin-verif',
    viewId: 'view-admin-verif',
    title: 'Pusat Verifikasi',
    icon: 'fa-clipboard-check',
    role: 'admin',
    summary: 'Pusat persetujuan perizinan guru (Izin, Sakit, Izin Terlambat, Dinas Luar), validasi jurnal KBM, dan pengesahan perangkat pembelajaran.',
    prerequisites: 'Terdapat pengajuan tertunda dari guru di sekolah.',
    steps: [
      'Buka menu Verifikasi. Pilih tab permohonan yang ingin diproses: Presensi/Izin, Jurnal Mengajar, atau Perangkat Pembelajaran.',
      'Klik pada nama guru untuk melihat rincian bukti: surat keterangan dokter, surat tugas dinas, atau berkas perangkat.',
      'Untuk pengajuan Izin Terlambat: Verifikasi alasan keterlambatan, lalu klik "Setujui" agar dihitung hadir atau "Tolak" jika tidak valid.',
      'Untuk pengajuan Izin/Sakit: Klik "Setujui" untuk mengesahkan status atau "Tolak" disertai alasan penolakan.',
      'Status guru akan langsung diperbarui secara real-time pada dashboard dan rekap kehadiran.'
    ],
    keyTips: [
      'Tersedia tombol "Reset Status" apabila admin perlu membatalkan keputusan verifikasi yang keliru.'
    ]
  },
  {
    id: 'admin-sistem-blok',
    viewId: 'view-sistem-blok',
    title: 'Manajemen Sistem Blok',
    icon: 'fa-layer-group',
    role: 'admin',
    summary: 'Pengelolaan periode kegiatan khusus sekolah (Ujian, PTS, Pesantren Kilat, Classmeeting) di mana jadwal KBM reguler dialihkan ke Jurnal Kegiatan.',
    prerequisites: 'Akun administrator sekolah.',
    steps: [
      'Buka menu Sistem Blok untuk melihat daftar periode blok yang sedang aktif atau terjadwal.',
      'Klik "Tambah Periode Blok" untuk membuat jadwal baru: isi Nama Kegiatan, Tanggal Mulai, dan Tanggal Selesai.',
      'Simpan periode blok. Selama rentang tanggal tersebut aktif, jadwal KBM reguler di UI guru akan disembunyikan dan diganti informasi kegiatan blok.',
      'Guru cukup mengisi Jurnal Kegiatan khusus tanpa harus mengabsen KBM kelas reguler.',
      'Jadwal pelajaran asli di database tetap aman dan tidak terhapus sama sekali.'
    ],
    keyTips: [
      'Guru yang diatur wajib hadir hanya pada hari mengajar akan dibebaskan presensi saat sistem blok aktif jika tidak memiliki jadwal pada hari itu.'
    ]
  },
  {
    id: 'admin-jurnal-kelas',
    viewId: 'view-jurnal-kelas',
    title: 'Supervisi Jurnal Kelas',
    icon: 'fa-chalkboard-user',
    role: 'admin',
    summary: 'Pemantauan komprehensif keterisian jurnal pembelajaran seluruh rombongan belajar dan kelas di sekolah secara real-time.',
    prerequisites: 'Akun administrator sekolah.',
    steps: [
      'Buka menu Jurnal Kelas.',
      'Pilih rombel atau kelas yang ingin disupervisi, serta tanggal KBM.',
      'Tinjau setiap mata pelajaran yang terjadwal: apakah guru sudah masuk, materi yang diajarkan, dan catatan ketidakhadiran murid.',
      'Identifikasi kelas-kelas yang jam pelajarannya kosong atau belum diisi jurnal oleh guru mapel.'
    ],
    keyTips: [
      'Sangat efektif untuk supervisi harian kepala sekolah dan wakil kepala kurikulum.'
    ]
  },
  {
    id: 'admin-piket',
    viewId: 'view-piket',
    title: 'Kelola & Pantau Piket',
    icon: 'fa-shield-halved',
    role: 'admin',
    summary: 'Penyusunan jadwal guru piket mingguan (Senin–Sabtu), supervisi ketertiban sekolah, buku tamu, dan laporan presensi siswa harian.',
    prerequisites: 'Akun administrator sekolah.',
    steps: [
      'Buka menu Kelola Piket dari sidebar. Tampilan admin menyajikan versi detail lengkap (jadwal, riwayat, dan laporan).',
      'Atur daftar nama guru piket untuk setiap hari kerja (Senin sampai Sabtu) pada tab Pengaturan Jadwal Piket.',
      'Pantau laporan piket yang disubmit guru piket hari ini, termasuk catatan ketertiban dan dokumentasi foto.',
      'Akses data presensi siswa yang dicatat piket (QR code maupun manual checklist) secara menyeluruh.'
    ],
    keyTips: [
      'Admin memiliki hak akses membuka seluruh modul piket setiap saat tanpa terikat jadwal piket harian.'
    ]
  },
  {
    id: 'admin-dokumen',
    viewId: 'view-dokumen',
    title: 'Supervisi Perangkat Pembelajaran',
    icon: 'fa-folder-open',
    role: 'admin',
    summary: 'Penelaahan berkas kurikulum seluruh dewan guru (CP, ATP, Modul Ajar, Prota, Promes), pemberian catatan revisi, dan pengesahan.',
    prerequisites: 'Akun administrator sekolah.',
    steps: [
      'Buka menu Perangkat Pembelajaran untuk melihat repositori administrasi kurikulum guru.',
      'Filter berdasarkan nama guru, mata pelajaran, tingkat kelas, atau jenis dokumen.',
      'Klik ikon unduh untuk meninjau berkas dokumen guru.',
      'Klik tombol "Verifikasi": Berikan status "Disetujui" jika berkas lengkap atau "Perlu Revisi" disertai catatan perbaikan spesifik.'
    ],
    keyTips: [
      'Guru akan menerima notifikasi status pada akun mereka ketika perangkat disetujui atau ditolak.'
    ]
  },
  {
    id: 'admin-gradebook',
    viewId: 'view-gradebook',
    title: 'Monitoring Daftar Nilai',
    icon: 'fa-graduation-cap',
    role: 'admin',
    summary: 'Supervisi pengisian nilai asesmen dewan guru, monitoring capaian kompetensi siswa lintas kelas, dan ekspor data nilai sekolah.',
    prerequisites: 'Akun administrator sekolah.',
    steps: [
      'Buka menu Daftar Nilai dari sidebar.',
      'Pilih kelas dan mata pelajaran yang ingin dipantau.',
      'Periksa progres pengisian nilai formatif dan sumatif oleh masing-masing guru mapel.',
      'Unduh data kumpulan nilai dalam format spreadsheet Excel (.xlsx) untuk kebutuhan pengolahan rapor semester.'
    ],
    keyTips: [
      'Memudahkan tim kurikulum memastikan seluruh guru telah merampungkan asesmen sebelum batas akhir pencetakan rapor.'
    ]
  },
  {
    id: 'admin-informasi',
    viewId: 'view-informasi',
    title: 'Manajemen Informasi & Pengumuman',
    icon: 'fa-bullhorn',
    role: 'admin',
    summary: 'Penerbitan siaran pengumuman resmi sekolah, penetapan target sasaran (Semua / Guru / Wali Kelas), pin pengumuman, dan moderasi komentar.',
    prerequisites: 'Akun administrator sekolah.',
    steps: [
      'Buka menu Informasi lalu klik tombol "Buat Pengumuman Baru".',
      'Isi Judul, Konten Pengumuman, dan unggah lampiran gambar/dokumen jika ada.',
      'Tentukan Target Sasaran: Semua Pengguna, Khusus Guru, atau Khusus Wali Kelas.',
      'Pilih opsi: Sematkan di atas (Pin), serta izin komentar (1 arah tanpa komentar, atau 2 arah interaktif).',
      'Klik "Terbitkan". Notifikasi lonceng bergetar akan langsung terkirim secara real-time ke akun target.'
    ],
    keyTips: [
      'Admin dapat menghapus komentar yang tidak pantas atau menutup sesi diskusi kapan saja.'
    ]
  },
  {
    id: 'admin-analitik',
    viewId: 'view-analitik',
    title: 'Analitik & Kedisiplinan',
    icon: 'fa-chart-pie',
    role: 'admin',
    summary: 'Dasbor metrik kedisiplinan guru: tren kehadiran, persentase keterlambatan, rasio pemenuhan jurnal, dan Leaderboard Guru Terdisiplin bulanan.',
    prerequisites: 'Data presensi dan jurnal guru telah berjalan.',
    steps: [
      'Buka menu Analitik untuk meninjau statistik performa tenaga pendidik.',
      'Pilih rentang bulan evaluasi yang diinginkan.',
      'Analisis grafik rata-rata jam kedatangan, total akumulasi menit keterlambatan, dan distribusi izin/sakit.',
      'Tinjau tabel Leaderboard Guru Terdisiplin berdasarkan ketepatan waktu hadir dan konsistensi pengisian jurnal KBM.'
    ],
    keyTips: [
      'Gunakan data analitik ini sebagai bahan evaluasi rapat bulanan dewan guru dan reward guru teladan.'
    ]
  },
  {
    id: 'admin-rekap',
    viewId: 'view-admin-rekap',
    title: 'Rekap Akhir & Laporan Bulanan',
    icon: 'fa-file-invoice',
    role: 'admin',
    summary: 'Penyusunan rekapitulasi kehadiran dan kinerja mengajar bulanan seluruh guru untuk yayasan/dinas, cetak format resmi, dan ekspor Excel.',
    prerequisites: 'Akun administrator sekolah.',
    steps: [
      'Buka menu Rekap Akhir dari sidebar.',
      'Pilih periode bulan dan tahun pelaporan.',
      'Tinjau tabel master rekapitulasi: Total Hari Kerja, Jumlah Hadir, Terlambat, Izin, Sakit, Alpa, dan Jumlah Jam KBM terealisasi per guru.',
      'Klik "Cetak Dokumen" untuk menghasilkan laporan cetak resmi ber-KOP sekolah dengan tanda tangan Kepala Sekolah.',
      'Klik "Ekspor Excel (.xlsx)" untuk mengunduh rekapitulasi mentah untuk keperluan penggajian atau arsip digital.'
    ],
    keyTips: [
      'Pastikan seluruh permohonan izin pada bulan tersebut sudah diverifikasi di menu Verifikasi sebelum mencetak rekap akhir.'
    ]
  },
  {
    id: 'admin-rekap-siswa',
    viewId: 'view-rekap-siswa',
    title: 'Rekap Presensi Siswa Seluruh Kelas',
    icon: 'fa-users-viewfinder',
    role: 'admin',
    summary: 'Rekapitulasi absensi siswa harian dan bulanan seluruh kelas di sekolah, filter rombel, pemantauan angka ketidakhadiran, dan ekspor laporan.',
    prerequisites: 'Akun administrator sekolah.',
    steps: [
      'Buka menu Presensi Siswa dari sidebar.',
      'Pilih kelas dan rentang tanggal yang ingin direkap (Admin memiliki hak akses seluruh rombel/kelas).',
      'Pantau rekapitulasi akumulasi Hadir, Sakit, Izin, dan Alpa per siswa.',
      'Lakukan perbaikan data absensi jika diperlukan atau cetak laporan presensi siswa.'
    ],
    keyTips: [
      'Membantu bimbingan konseling (BK) dan kesiswaan mendeteksi siswa yang sering alpa secara dini.'
    ]
  },
  {
    id: 'admin-data',
    viewId: 'view-admin-data',
    title: 'Master Data Sekolah',
    icon: 'fa-database',
    role: 'admin',
    summary: 'Pusat manajemen database sekolah: Siswa (CRUD, cetak kartu QR, kenaikan kelas massal), Guru (CRUD, ubah username, reset password), Mapel, Kalender Libur, Jadwal Pelajaran, dan Wali Kelas.',
    prerequisites: 'Akun administrator sekolah.',
    steps: [
      'Buka menu Master Data. Pilih sub-tab yang ingin dikelola: Siswa, Guru, Mapel, Kalender Libur, Jadwal KBM, atau Wali Kelas.',
      'Sub-tab Siswa: Tambah/edit data siswa, cetak kartu presensi QR individual/massal, dan lakukan fitur Naik Kelas massal di akhir tahun ajaran.',
      'Sub-tab Guru: Tambah/edit data guru, ubah username guru jika diperlukan, atau lakukan reset kata sandi ke default.',
      'Sub-tab Jadwal & Mapel: Atur mata pelajaran, rombel kelas, jam mengajar, dan penugasan guru pengampu.',
      'Sub-tab Kalender Libur: Tetapkan hari libur nasional atau libur khusus sekolah agar sistem tidak menandai guru alpa pada hari tersebut.',
      'Sub-tab Wali Kelas: Tetapkan guru sebagai wali kelas untuk rombel tertentu.'
    ],
    keyTips: [
      'Hanya role Admin yang berwenang mengubah username akun guru. Guru tidak dapat mengubah username sendiri.',
      'Admin dapat mendownload kartu presensi ber-QR code untuk tiap siswa secara langsung.'
    ]
  },
  {
    id: 'admin-backup',
    viewId: 'view-admin-backup',
    title: 'Akses Data & Pencadangan',
    icon: 'fa-hard-drive',
    role: 'admin',
    summary: 'Pencadangan database transaksi, sinkronisasi otomatis data presensi dan jurnal ke Google Spreadsheet, dan pembersihan arsip lama.',
    prerequisites: 'Koneksi internet dan konfigurasi webhook Google Sheets (opsional).',
    steps: [
      'Buka menu Akses Data / Backup dari sidebar.',
      'Pilih opsi pencadangan data: Presensi, Jurnal KBM, atau Data Siswa/Guru.',
      'Konfigurasikan integrasi sinkronisasi otomatis ke Google Sheets jika sekolah menggunakan spreadsheet cadangan.',
      'Unduh backup arsip data berkala dalam format JSON atau CSV untuk arsip offline mandiri sekolah.'
    ],
    keyTips: [
      'Lakukan backup berkala setiap akhir semester sebelum melakukan proses kenaikan kelas atau pembersihan tahun ajaran.'
    ]
  },
  {
    id: 'admin-config',
    viewId: 'view-admin-config',
    title: 'Konfigurasi Sistem Sekolah',
    icon: 'fa-gears',
    role: 'admin',
    summary: 'Pengaturan profil sekolah, batas toleransi jam presensi (datang, pulang reguler & Jumat), titik koordinat GPS geofence dan radius meter, serta mode upload foto kamera.',
    prerequisites: 'Akun administrator sekolah.',
    steps: [
      'Buka menu Sistem (Konfigurasi).',
      'Atur Profil Sekolah: Nama resmi sekolah, NPSN, alamat, nama Kepala Sekolah, NIP Kepala Sekolah, dan unggah logo resmi sekolah.',
      'Atur Jam Kerja: Jam buka presensi datang, batas jam terlambat, jam pulang Senin–Kamis, dan jam pulang khusus hari Jumat.',
      'Atur Geofence GPS: Masukkan koordinat Latitude dan Longitude sekolah serta radius toleransi (misal 50–100 meter).',
      'Atur Mode Dokumentasi Jurnal: Pilih kebijakan sekolah untuk pengambilan foto KBM (Live Camera saja atau Live Camera + Galeri).',
      'Klik "Simpan Konfigurasi" untuk menerapkan aturan ke seluruh pengguna sekolah.'
    ],
    keyTips: [
      'Perubahan batas toleransi jam presensi langsung berlaku secara instan pada perhitungan keterlambatan presensi guru.'
    ]
  },

  // ==========================================
  // SUPERADMIN MENUS (3 Menus)
  // ==========================================
  {
    id: 'superadmin-overview',
    viewId: 'view-superadmin-overview',
    title: 'Ringkasan Platform Multi-Tenant',
    icon: 'fa-gauge-high',
    role: 'superadmin',
    summary: 'Dasbor monitoring menyeluruh ekosistem SIPJAM: total sekolah terdaftar, sekolah aktif vs non-aktif, total akun admin, guru, dan siswa di seluruh sekolah.',
    prerequisites: 'Akun Superadmin platform.',
    steps: [
      'Masuk dengan kredensial Superadmin (akun otomatis diarahkan ke Portal Superadmin).',
      'Pantau metrik global: Jumlah sekolah aktif, total pengguna terdaftar, dan status operasional cloud database.',
      'Tinjau log aktivitas platform terbaru dan status sinkronisasi sistem.'
    ],
    keyTips: [
      'Superadmin memiliki akses multi-tenant global lintas sekolah dan tidak terikat pada satu sekolah_id.'
    ]
  },
  {
    id: 'superadmin-sekolah',
    viewId: 'view-superadmin-sekolah',
    title: 'Kelola Sekolah & Lisensi',
    icon: 'fa-school',
    role: 'superadmin',
    summary: 'Pendaftaran sekolah baru, pengaktifan/penonaktifan lisensi sekolah, pengaturan paket langganan, dan konfigurasi fitur khusus per-sekolah.',
    prerequisites: 'Akun Superadmin platform.',
    steps: [
      'Buka menu Kelola Sekolah dari sidebar Superadmin.',
      'Klik "Tambah Sekolah Baru" untuk mendaftarkan institusi sekolah baru (Nama Sekolah, NPSN, Alamat, Jenjang).',
      'Atur status keaktifan sekolah (Aktif / Non-aktif) dan masa berlaku lisensi.',
      'Buka form "Edit Sekolah" untuk mengatur fitur per-sekolah: misalnya Mode Jurnal Pembelajaran (Live Camera saja atau Live Camera + Upload Galeri).',
      'Simpan data sekolah. Sekolah baru langsung siap ditautkan dengan Administrator Sekolah.'
    ],
    keyTips: [
      'Setiap data sekolah terisolasi secara aman menggunakan skema multi-tenant berbasis sekolah_id.'
    ]
  },
  {
    id: 'superadmin-admins',
    viewId: 'view-superadmin-admins',
    title: 'Manajemen Administrator Sekolah',
    icon: 'fa-user-shield',
    role: 'superadmin',
    summary: 'Pengelolaan akun Administrator sekolah: pembuatan admin baru, penautan ke instansi sekolah, reset kredensial, dan pemantauan status akun.',
    prerequisites: 'Akun Superadmin platform.',
    steps: [
      'Buka menu Admin Sekolah dari sidebar Superadmin.',
      'Klik "Buat Akun Admin" untuk membuat kredensial baru bagi pengelola sekolah.',
      'Isi Nama Admin, Username, Password, dan pilih Sekolah yang akan dikelola oleh admin tersebut.',
      'Jika admin sekolah lupa password atau terkunci, gunakan tombol "Reset Password" untuk memperbarui kata sandi.',
      'Pantau status login terakhir dan keaktifan akun admin.'
    ],
    keyTips: [
      'Satu sekolah dapat memiliki lebih dari satu akun Administrator jika didelegasikan oleh Superadmin.'
    ]
  }
];

export function getTutorialsByRole(role?: string): TutorialItem[] {
  if (!role || role.toLowerCase() === 'semua' || role.toLowerCase() === 'all') {
    return TUTORIAL_DATA;
  }
  const cleanRole = role.toLowerCase().replace(/\s+/g, '');
  if (cleanRole.includes('superadmin')) {
    return TUTORIAL_DATA.filter(t => t.role === 'superadmin' || t.role === 'all');
  }
  if (cleanRole.includes('admin')) {
    return TUTORIAL_DATA.filter(t => t.role === 'admin' || t.role === 'all');
  }
  return TUTORIAL_DATA.filter(t => t.role === 'guru' || t.role === 'all');
}

export function searchTutorials(query: string, roleFilter?: string): TutorialItem[] {
  const base = getTutorialsByRole(roleFilter);
  if (!query || !query.trim()) return base;
  
  const q = query.toLowerCase().trim();
  return base.filter(item => {
    return (
      item.title.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      item.steps.some(s => s.toLowerCase().includes(q)) ||
      item.keyTips.some(k => k.toLowerCase().includes(q)) ||
      (item.prerequisites && item.prerequisites.toLowerCase().includes(q))
    );
  });
}
