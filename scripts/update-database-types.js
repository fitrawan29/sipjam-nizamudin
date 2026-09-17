const fs = require('fs');
const path = require('path');

const srcJsonPath = 'C:/Users/Fitra/.gemini/antigravity/brain/2d88b62e-4eda-4725-a740-e189a9c1bf0e/.system_generated/steps/110/output.txt';
const targetFilePath = path.join(__dirname, '..', 'src', 'types', 'database.ts');

const generatedJson = JSON.parse(fs.readFileSync(srcJsonPath, 'utf8'));
const baseTypes = generatedJson.types;

const additionalDomainTypes = `
// ==============================================================================
// Domain Entity Type Aliases for High Developer Ergonomics
// ==============================================================================
export type Sekolah = Tables<"sekolah">;
export type SekolahInsert = TablesInsert<"sekolah">;
export type SekolahUpdate = TablesUpdate<"sekolah">;

export type PenugasanPiket = Tables<"penugasan_piket">;
export type PenugasanPiketInsert = TablesInsert<"penugasan_piket">;
export type PenugasanPiketUpdate = TablesUpdate<"penugasan_piket">;

export type Pengumuman = Tables<"pengumuman">;
export type PengumumanInsert = TablesInsert<"pengumuman">;
export type PengumumanUpdate = TablesUpdate<"pengumuman">;

export type PengumumanTanggapan = Tables<"pengumuman_tanggapan">;
export type PengumumanTanggapanInsert = TablesInsert<"pengumuman_tanggapan">;
export type PengumumanTanggapanUpdate = TablesUpdate<"pengumuman_tanggapan">;

export type BankDokumen = Tables<"bank_dokumen">;
export type BankDokumenInsert = TablesInsert<"bank_dokumen">;
export type BankDokumenUpdate = TablesUpdate<"bank_dokumen">;

export type DataGuru = Tables<"data_guru">;
export type DataGuruInsert = TablesInsert<"data_guru">;
export type DataGuruUpdate = TablesUpdate<"data_guru">;

export type DataMapel = Tables<"data_mapel">;
export type DataMapelInsert = TablesInsert<"data_mapel">;
export type DataMapelUpdate = TablesUpdate<"data_mapel">;

export type DataSiswa = Tables<"data_siswa">;
export type DataSiswaInsert = TablesInsert<"data_siswa">;
export type DataSiswaUpdate = TablesUpdate<"data_siswa">;

export type GuruMapel = Tables<"guru_mapel">;
export type GuruMapelInsert = TablesInsert<"guru_mapel">;
export type GuruMapelUpdate = TablesUpdate<"guru_mapel">;

export type JadwalPelajaran = Tables<"jadwal_pelajaran">;
export type JadwalPelajaranInsert = TablesInsert<"jadwal_pelajaran">;
export type JadwalPelajaranUpdate = TablesUpdate<"jadwal_pelajaran">;

export type JadwalPiket = Tables<"jadwal_piket">;
export type JadwalPiketInsert = TablesInsert<"jadwal_piket">;
export type JadwalPiketUpdate = TablesUpdate<"jadwal_piket">;

export type JurnalPembelajaran = Tables<"jurnal_pembelajaran">;
export type JurnalPembelajaranInsert = TablesInsert<"jurnal_pembelajaran">;
export type JurnalPembelajaranUpdate = TablesUpdate<"jurnal_pembelajaran">;

export type KalenderPendidikan = Tables<"kalender_pendidikan">;
export type KalenderPendidikanInsert = TablesInsert<"kalender_pendidikan">;
export type KalenderPendidikanUpdate = TablesUpdate<"kalender_pendidikan">;

export type LaporanPiket = Tables<"laporan_piket">;
export type LaporanPiketInsert = TablesInsert<"laporan_piket">;
export type LaporanPiketUpdate = TablesUpdate<"laporan_piket">;

export type Pengaturan = Tables<"pengaturan">;
export type PengaturanInsert = TablesInsert<"pengaturan">;
export type PengaturanUpdate = TablesUpdate<"pengaturan">;

export type PresensiGuru = Tables<"presensi_guru">;
export type PresensiGuruInsert = TablesInsert<"presensi_guru">;
export type PresensiGuruUpdate = TablesUpdate<"presensi_guru">;

export type RiwayatBackup = Tables<"riwayat_backup">;
export type RiwayatBackupInsert = TablesInsert<"riwayat_backup">;
export type RiwayatBackupUpdate = TablesUpdate<"riwayat_backup">;

export type User = Tables<"users">;
export type UserInsert = TablesInsert<"users">;
export type UserUpdate = TablesUpdate<"users">;

export type GuruKelas = Tables<"guru_kelas">;

// Comprehensive Feature Additions (Milestone 1)
export type WaliKelas = Tables<"wali_kelas">;
export type WaliKelasInsert = TablesInsert<"wali_kelas">;
export type WaliKelasUpdate = TablesUpdate<"wali_kelas">;

export type Absensi = Tables<"absensi">;
export type AbsensiInsert = TablesInsert<"absensi">;
export type AbsensiUpdate = TablesUpdate<"absensi">;

export type TujuanPembelajaran = Tables<"tujuan_pembelajaran">;
export type TujuanPembelajaranInsert = TablesInsert<"tujuan_pembelajaran">;
export type TujuanPembelajaranUpdate = TablesUpdate<"tujuan_pembelajaran">;

export type AsesmenKolom = Tables<"asesmen_kolom">;
export type AsesmenKolomInsert = TablesInsert<"asesmen_kolom">;
export type AsesmenKolomUpdate = TablesUpdate<"asesmen_kolom">;

export type NilaiSiswa = Tables<"nilai_siswa">;
export type NilaiSiswaInsert = TablesInsert<"nilai_siswa">;
export type NilaiSiswaUpdate = TablesUpdate<"nilai_siswa">;

export type PushSubscription = Tables<"push_subscriptions">;
export type PushSubscriptionInsert = TablesInsert<"push_subscriptions">;
export type PushSubscriptionUpdate = TablesUpdate<"push_subscriptions">;

// Useful Enum / Literal Types for Components
export type HariPiket = "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu";
export type TipePetugasPiket = "Guru" | "Siswa";
export type SasaranPengumuman = "Semua" | "Guru" | "Wali Kelas" | "Orang Tua" | string;
export type ModePengumuman = "Satu Arah" | "Dua Arah";
export type StatusVerifikasi = "Menunggu" | "Disetujui" | "Ditolak" | string;
export type JenisDokumenKurikulum =
  | "Analisis Capaian Pembelajaran (CP)"
  | "Alur Tujuan Pembelajaran (ATP)"
  | "Rencana Pekan Efektif (RPE)"
  | "Program Tahunan (Prota)"
  | "Program Semester (Promes)"
  | "Rencana Pembelajaran Mendalam / Modul Ajar (RPM)"
  | string;
export type RoleUser = "Superadmin" | "Admin" | "Guru";
export type StatusSekolah = "aktif" | "nonaktif";
export type StatusKehadiranSiswa = "Hadir" | "Izin" | "Sakit" | "Alpa";
export type KategoriAsesmen = "Diagnostik" | "Formatif" | "Sumatif";
`;

const finalContent = baseTypes + '\n' + additionalDomainTypes;
fs.writeFileSync(targetFilePath, finalContent, 'utf8');
console.log('Successfully wrote', targetFilePath, 'Length:', finalContent.length);
