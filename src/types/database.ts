export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      bank_dokumen: {
        Row: {
          catatan_admin: string | null;
          id: string;
          jenis_dokumen: string | null;
          judul: string | null;
          kelas: string | null;
          link_file: string | null;
          mapel: string | null;
          nama_guru: string | null;
          status_verifikasi: string | null;
          timestamp: string | null;
        };
        Insert: {
          catatan_admin?: string | null;
          id?: string;
          jenis_dokumen?: string | null;
          judul?: string | null;
          kelas?: string | null;
          link_file?: string | null;
          mapel?: string | null;
          nama_guru?: string | null;
          status_verifikasi?: string | null;
          timestamp?: string | null;
        };
        Update: {
          catatan_admin?: string | null;
          id?: string;
          jenis_dokumen?: string | null;
          judul?: string | null;
          kelas?: string | null;
          link_file?: string | null;
          mapel?: string | null;
          nama_guru?: string | null;
          status_verifikasi?: string | null;
          timestamp?: string | null;
        };
        Relationships: [];
      };
      data_guru: {
        Row: {
          email: string | null;
          id: string;
          mata_pelajaran: string | null;
          nama_guru: string | null;
          nip: string | null;
          no_hp: string | null;
          status: string | null;
        };
        Insert: {
          email?: string | null;
          id?: string;
          mata_pelajaran?: string | null;
          nama_guru?: string | null;
          nip?: string | null;
          no_hp?: string | null;
          status?: string | null;
        };
        Update: {
          email?: string | null;
          id?: string;
          mata_pelajaran?: string | null;
          nama_guru?: string | null;
          nip?: string | null;
          no_hp?: string | null;
          status?: string | null;
        };
        Relationships: [];
      };
      data_mapel: {
        Row: {
          id: string;
          kategori: string | null;
          nama_mata_pelajaran: string | null;
        };
        Insert: {
          id: string;
          kategori?: string | null;
          nama_mata_pelajaran?: string | null;
        };
        Update: {
          id?: string;
          kategori?: string | null;
          nama_mata_pelajaran?: string | null;
        };
        Relationships: [];
      };
      data_siswa: {
        Row: {
          gender: string | null;
          id: string;
          kelas: string | null;
          nama_siswa: string | null;
          nisn: string | null;
          no_hp_ortu: string | null;
          status: string | null;
        };
        Insert: {
          gender?: string | null;
          id?: string;
          kelas?: string | null;
          nama_siswa?: string | null;
          nisn?: string | null;
          no_hp_ortu?: string | null;
          status?: string | null;
        };
        Update: {
          gender?: string | null;
          id?: string;
          kelas?: string | null;
          nama_siswa?: string | null;
          nisn?: string | null;
          no_hp_ortu?: string | null;
          status?: string | null;
        };
        Relationships: [];
      };
      guru_mapel: {
        Row: {
          created_at: string | null;
          guru_id: string | null;
          id: string;
          kelas: string;
          mapel_id: string | null;
          mapel_singkat: string | null;
          nama_guru: string;
          nama_mapel: string;
          nip: string;
        };
        Insert: {
          created_at?: string | null;
          guru_id?: string | null;
          id?: string;
          kelas: string;
          mapel_id?: string | null;
          mapel_singkat?: string | null;
          nama_guru: string;
          nama_mapel: string;
          nip: string;
        };
        Update: {
          created_at?: string | null;
          guru_id?: string | null;
          id?: string;
          kelas?: string;
          mapel_id?: string | null;
          mapel_singkat?: string | null;
          nama_guru?: string;
          nama_mapel?: string;
          nip?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guru_mapel_guru_id_fkey";
            columns: ["guru_id"];
            isOneToOne: false;
            referencedRelation: "data_guru";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guru_mapel_mapel_id_fkey";
            columns: ["mapel_id"];
            isOneToOne: false;
            referencedRelation: "data_mapel";
            referencedColumns: ["id"];
          }
        ];
      };
      jadwal_pelajaran: {
        Row: {
          hari: string | null;
          id: string;
          kelas: string | null;
          mata_pelajaran: string | null;
          nama_guru: string | null;
        };
        Insert: {
          hari?: string | null;
          id?: string;
          kelas?: string | null;
          mata_pelajaran?: string | null;
          nama_guru?: string | null;
        };
        Update: {
          hari?: string | null;
          id?: string;
          kelas?: string | null;
          mata_pelajaran?: string | null;
          nama_guru?: string | null;
        };
        Relationships: [];
      };
      jadwal_piket: {
        Row: {
          daftar_guru: string | null;
          hari: string | null;
          id: string;
        };
        Insert: {
          daftar_guru?: string | null;
          hari?: string | null;
          id?: string;
        };
        Update: {
          daftar_guru?: string | null;
          hari?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      jurnal_pembelajaran: {
        Row: {
          absensi_siswa: string | null;
          catatan_khusus_siswa: string | null;
          catatan_refleksi: string | null;
          detail_absen: string | null;
          foto_kegiatan: string | null;
          id: string;
          jam_ke: string | null;
          kegiatan: string | null;
          kehadiran_murid: string | null;
          kelas: string | null;
          keterangan: string | null;
          link_bukti_foto: string | null;
          mapel: string | null;
          materi: string | null;
          materi_pembelajaran: string | null;
          nama_guru: string | null;
          pertemuan_ke: string | null;
          refleksi: string | null;
          status_verifikasi: string | null;
          tanggal: string | null;
          timestamp: string | null;
          tujuan_pembelajaran: string | null;
        };
        Insert: {
          absensi_siswa?: string | null;
          catatan_khusus_siswa?: string | null;
          catatan_refleksi?: string | null;
          detail_absen?: string | null;
          foto_kegiatan?: string | null;
          id?: string;
          jam_ke?: string | null;
          kegiatan?: string | null;
          kehadiran_murid?: string | null;
          kelas?: string | null;
          keterangan?: string | null;
          link_bukti_foto?: string | null;
          mapel?: string | null;
          materi?: string | null;
          materi_pembelajaran?: string | null;
          nama_guru?: string | null;
          pertemuan_ke?: string | null;
          refleksi?: string | null;
          status_verifikasi?: string | null;
          tanggal?: string | null;
          timestamp?: string | null;
          tujuan_pembelajaran?: string | null;
        };
        Update: {
          absensi_siswa?: string | null;
          catatan_khusus_siswa?: string | null;
          catatan_refleksi?: string | null;
          detail_absen?: string | null;
          foto_kegiatan?: string | null;
          id?: string;
          jam_ke?: string | null;
          kegiatan?: string | null;
          kehadiran_murid?: string | null;
          kelas?: string | null;
          keterangan?: string | null;
          link_bukti_foto?: string | null;
          mapel?: string | null;
          materi?: string | null;
          materi_pembelajaran?: string | null;
          nama_guru?: string | null;
          pertemuan_ke?: string | null;
          refleksi?: string | null;
          status_verifikasi?: string | null;
          tanggal?: string | null;
          timestamp?: string | null;
          tujuan_pembelajaran?: string | null;
        };
        Relationships: [];
      };
      kalender_pendidikan: {
        Row: {
          id: string;
          keterangan: string | null;
          tanggal: string | null;
          tipe: string | null;
        };
        Insert: {
          id?: string;
          keterangan?: string | null;
          tanggal?: string | null;
          tipe?: string | null;
        };
        Update: {
          id?: string;
          keterangan?: string | null;
          tanggal?: string | null;
          tipe?: string | null;
        };
        Relationships: [];
      };
      laporan_piket: {
        Row: {
          catatan_apel: string | null;
          guru_pelapor: string | null;
          id: string;
          kehadiran_guru_piket: string | null;
          link_foto: string | null;
          rekap_absen_kelas: string | null;
          status_verifikasi: string | null;
          tanggal: string | null;
          timestamp: string | null;
        };
        Insert: {
          catatan_apel?: string | null;
          guru_pelapor?: string | null;
          id?: string;
          kehadiran_guru_piket?: string | null;
          link_foto?: string | null;
          rekap_absen_kelas?: string | null;
          status_verifikasi?: string | null;
          tanggal?: string | null;
          timestamp?: string | null;
        };
        Update: {
          catatan_apel?: string | null;
          guru_pelapor?: string | null;
          id?: string;
          kehadiran_guru_piket?: string | null;
          link_foto?: string | null;
          rekap_absen_kelas?: string | null;
          status_verifikasi?: string | null;
          tanggal?: string | null;
          timestamp?: string | null;
        };
        Relationships: [];
      };
      pengaturan: {
        Row: {
          id: string;
          key: string | null;
          value: string | null;
        };
        Insert: {
          id?: string;
          key?: string | null;
          value?: string | null;
        };
        Update: {
          id?: string;
          key?: string | null;
          value?: string | null;
        };
        Relationships: [];
      };
      pengumuman: {
        Row: {
          created_at: string | null;
          id: string;
          is_pinned: boolean | null;
          judul: string;
          konten: string;
          lampiran_url: string | null;
          mode: string;
          penulis_nama: string;
          penulis_role: string;
          sasaran: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_pinned?: boolean | null;
          judul: string;
          konten: string;
          lampiran_url?: string | null;
          mode?: string;
          penulis_nama: string;
          penulis_role?: string;
          sasaran?: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_pinned?: boolean | null;
          judul?: string;
          konten?: string;
          lampiran_url?: string | null;
          mode?: string;
          penulis_nama?: string;
          penulis_role?: string;
          sasaran?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      pengumuman_tanggapan: {
        Row: {
          created_at: string | null;
          id: string;
          komentar: string;
          pengumuman_id: string;
          user_nama: string;
          user_role: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          komentar: string;
          pengumuman_id: string;
          user_nama: string;
          user_role: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          komentar?: string;
          pengumuman_id?: string;
          user_nama?: string;
          user_role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pengumuman_tanggapan_pengumuman_id_fkey";
            columns: ["pengumuman_id"];
            isOneToOne: false;
            referencedRelation: "pengumuman";
            referencedColumns: ["id"];
          }
        ];
      };
      penugasan_piket: {
        Row: {
          created_at: string | null;
          guru_id: string | null;
          guru_nama: string | null;
          guru_nip: string | null;
          hari: string;
          id: string;
          kelas: string | null;
          siswa_nama: string | null;
          siswa_nisn: string | null;
          tahun_ajaran: string | null;
          tipe_petugas: string;
        };
        Insert: {
          created_at?: string | null;
          guru_id?: string | null;
          guru_nama?: string | null;
          guru_nip?: string | null;
          hari: string;
          id?: string;
          kelas?: string | null;
          siswa_nama?: string | null;
          siswa_nisn?: string | null;
          tahun_ajaran?: string | null;
          tipe_petugas?: string;
        };
        Update: {
          created_at?: string | null;
          guru_id?: string | null;
          guru_nama?: string | null;
          guru_nip?: string | null;
          hari?: string;
          id?: string;
          kelas?: string | null;
          siswa_nama?: string | null;
          siswa_nisn?: string | null;
          tahun_ajaran?: string | null;
          tipe_petugas?: string;
        };
        Relationships: [
          {
            foreignKeyName: "penugasan_piket_guru_id_fkey";
            columns: ["guru_id"];
            isOneToOne: false;
            referencedRelation: "data_guru";
            referencedColumns: ["id"];
          }
        ];
      };
      presensi_guru: {
        Row: {
          detail_izin: string | null;
          id: string;
          jarak: string | null;
          jenis_presensi: string | null;
          keterlambatan_detik: number | null;
          link_bukti: string | null;
          lokasi: string | null;
          nama_guru: string | null;
          status_verifikasi: string | null;
          timestamp: string | null;
          tipe_absen: string | null;
        };
        Insert: {
          detail_izin?: string | null;
          id?: string;
          jarak?: string | null;
          jenis_presensi?: string | null;
          keterlambatan_detik?: number | null;
          link_bukti?: string | null;
          lokasi?: string | null;
          nama_guru?: string | null;
          status_verifikasi?: string | null;
          timestamp?: string | null;
          tipe_absen?: string | null;
        };
        Update: {
          detail_izin?: string | null;
          id?: string;
          jarak?: string | null;
          jenis_presensi?: string | null;
          keterlambatan_detik?: number | null;
          link_bukti?: string | null;
          lokasi?: string | null;
          nama_guru?: string | null;
          status_verifikasi?: string | null;
          timestamp?: string | null;
          tipe_absen?: string | null;
        };
        Relationships: [];
      };
      riwayat_backup: {
        Row: {
          id: string;
          keterangan: string | null;
          link_file: string | null;
          status: string | null;
          tahun_backup: string | null;
          timestamp: string | null;
        };
        Insert: {
          id?: string;
          keterangan?: string | null;
          link_file?: string | null;
          status?: string | null;
          tahun_backup?: string | null;
          timestamp?: string | null;
        };
        Update: {
          id?: string;
          keterangan?: string | null;
          link_file?: string | null;
          status?: string | null;
          tahun_backup?: string | null;
          timestamp?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          nama: string | null;
          password: string | null;
          role: string | null;
          username: string | null;
        };
        Insert: {
          id?: string;
          nama?: string | null;
          password?: string | null;
          role?: string | null;
          username?: string | null;
        };
        Update: {
          id?: string;
          nama?: string | null;
          password?: string | null;
          role?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      guru_kelas: {
        Row: {
          guru_id: string | null;
          kelas: string | null;
          nama_guru: string | null;
          nip: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "guru_mapel_guru_id_fkey";
            columns: ["guru_id"];
            isOneToOne: false;
            referencedRelation: "data_guru";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

// ==============================================================================
// Domain Entity Type Aliases for High Developer Ergonomics
// ==============================================================================
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
