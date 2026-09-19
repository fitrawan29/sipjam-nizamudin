export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      absensi: {
        Row: {
          created_at: string | null
          diubah_oleh: string
          id: string
          kelas: string
          keterangan: string | null
          log_perubahan: string[] | null
          nama_siswa: string
          nisn: string
          sekolah_id: string
          siswa_id: string | null
          status: string
          sumber_perubahan: string
          tanggal: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          diubah_oleh: string
          id?: string
          kelas: string
          keterangan?: string | null
          log_perubahan?: string[] | null
          nama_siswa: string
          nisn: string
          sekolah_id?: string
          siswa_id?: string | null
          status: string
          sumber_perubahan: string
          tanggal: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          diubah_oleh?: string
          id?: string
          kelas?: string
          keterangan?: string | null
          log_perubahan?: string[] | null
          nama_siswa?: string
          nisn?: string
          sekolah_id?: string
          siswa_id?: string | null
          status?: string
          sumber_perubahan?: string
          tanggal?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "absensi_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      asesmen_kolom: {
        Row: {
          bobot: number | null
          created_at: string | null
          id: string
          kategori: string
          nama: string
          sekolah_id: string
          tp_id: string
          updated_at: string | null
          urutan: number
        }
        Insert: {
          bobot?: number | null
          created_at?: string | null
          id?: string
          kategori: string
          nama: string
          sekolah_id?: string
          tp_id: string
          updated_at?: string | null
          urutan?: number
        }
        Update: {
          bobot?: number | null
          created_at?: string | null
          id?: string
          kategori?: string
          nama?: string
          sekolah_id?: string
          tp_id?: string
          updated_at?: string | null
          urutan?: number
        }
        Relationships: [
          {
            foreignKeyName: "asesmen_kolom_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asesmen_kolom_tp_id_fkey"
            columns: ["tp_id"]
            isOneToOne: false
            referencedRelation: "tujuan_pembelajaran"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_dokumen: {
        Row: {
          catatan_admin: string | null
          id: string
          jenis_dokumen: string | null
          judul: string | null
          kelas: string | null
          link_file: string | null
          mapel: string | null
          nama_guru: string | null
          sekolah_id: string
          status_verifikasi: string | null
          syarat_id?: string | null
          timestamp: string | null
        }
        Insert: {
          catatan_admin?: string | null
          id: string
          jenis_dokumen?: string | null
          judul?: string | null
          kelas?: string | null
          link_file?: string | null
          mapel?: string | null
          nama_guru?: string | null
          sekolah_id?: string
          status_verifikasi?: string | null
          syarat_id?: string | null
          timestamp?: string | null
        }
        Update: {
          catatan_admin?: string | null
          id?: string
          jenis_dokumen?: string | null
          judul?: string | null
          kelas?: string | null
          link_file?: string | null
          mapel?: string | null
          nama_guru?: string | null
          sekolah_id?: string
          status_verifikasi?: string | null
          syarat_id?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_dokumen_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_dokumen_syarat_id_fkey"
            columns: ["syarat_id"]
            isOneToOne: false
            referencedRelation: "syarat_perangkat_pembelajaran"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          pesan: string
          recipient_id: string
          recipient_nama: string
          sekolah_id: string
          sender_id: string
          sender_nama: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          pesan: string
          recipient_id: string
          recipient_nama: string
          sekolah_id?: string
          sender_id: string
          sender_nama: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          pesan?: string
          recipient_id?: string
          recipient_nama?: string
          sekolah_id?: string
          sender_id?: string
          sender_nama?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      data_guru: {
        Row: {
          email: string | null
          id: string
          mata_pelajaran: string | null
          nama_guru: string | null
          nip: string | null
          no_hp: string | null
          sekolah_id: string
          status: string | null
          wajib_hadir_hanya_mengajar: boolean | null
        }
        Insert: {
          email?: string | null
          id?: string
          mata_pelajaran?: string | null
          nama_guru?: string | null
          nip?: string | null
          no_hp?: string | null
          sekolah_id?: string
          status?: string | null
          wajib_hadir_hanya_mengajar?: boolean | null
        }
        Update: {
          email?: string | null
          id?: string
          mata_pelajaran?: string | null
          nama_guru?: string | null
          nip?: string | null
          no_hp?: string | null
          sekolah_id?: string
          status?: string | null
          wajib_hadir_hanya_mengajar?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "data_guru_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      data_mapel: {
        Row: {
          id: string
          kategori: string | null
          nama_mata_pelajaran: string | null
          sekolah_id: string
        }
        Insert: {
          id: string
          kategori?: string | null
          nama_mata_pelajaran?: string | null
          sekolah_id?: string
        }
        Update: {
          id?: string
          kategori?: string | null
          nama_mata_pelajaran?: string | null
          sekolah_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_mapel_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      data_siswa: {
        Row: {
          gender: string | null
          id: string
          kelas: string | null
          nama_siswa: string | null
          nisn: string | null
          no_hp_ortu: string | null
          sekolah_id: string
          status: string | null
        }
        Insert: {
          gender?: string | null
          id?: string
          kelas?: string | null
          nama_siswa?: string | null
          nisn?: string | null
          no_hp_ortu?: string | null
          sekolah_id?: string
          status?: string | null
        }
        Update: {
          gender?: string | null
          id?: string
          kelas?: string | null
          nama_siswa?: string | null
          nisn?: string | null
          no_hp_ortu?: string | null
          sekolah_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_siswa_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      guru_mapel: {
        Row: {
          created_at: string | null
          guru_id: string | null
          id: string
          kelas: string
          mapel_id: string | null
          mapel_singkat: string | null
          nama_guru: string
          nama_mapel: string
          nip: string
          sekolah_id: string
        }
        Insert: {
          created_at?: string | null
          guru_id?: string | null
          id?: string
          kelas: string
          mapel_id?: string | null
          mapel_singkat?: string | null
          nama_guru: string
          nama_mapel: string
          nip: string
          sekolah_id?: string
        }
        Update: {
          created_at?: string | null
          guru_id?: string | null
          id?: string
          kelas?: string
          mapel_id?: string | null
          mapel_singkat?: string | null
          nama_guru?: string
          nama_mapel?: string
          nip?: string
          sekolah_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guru_mapel_guru_id_fkey"
            columns: ["guru_id"]
            isOneToOne: false
            referencedRelation: "data_guru"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guru_mapel_mapel_id_fkey"
            columns: ["mapel_id"]
            isOneToOne: false
            referencedRelation: "data_mapel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guru_mapel_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      jadwal_pelajaran: {
        Row: {
          hari: string | null
          id: string
          kelas: string | null
          mata_pelajaran: string | null
          nama_guru: string | null
          sekolah_id: string
        }
        Insert: {
          hari?: string | null
          id: string
          kelas?: string | null
          mata_pelajaran?: string | null
          nama_guru?: string | null
          sekolah_id?: string
        }
        Update: {
          hari?: string | null
          id?: string
          kelas?: string | null
          mata_pelajaran?: string | null
          nama_guru?: string | null
          sekolah_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jadwal_pelajaran_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      jadwal_piket: {
        Row: {
          daftar_guru: string | null
          hari: string | null
          id: string
          sekolah_id: string
        }
        Insert: {
          daftar_guru?: string | null
          hari?: string | null
          id?: string
          sekolah_id?: string
        }
        Update: {
          daftar_guru?: string | null
          hari?: string | null
          id?: string
          sekolah_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jadwal_piket_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      jurnal_pembelajaran: {
        Row: {
          absensi_siswa: string | null
          alasan_penolakan?: string | null
          catatan_admin?: string | null
          catatan_khusus_siswa: string | null
          catatan_refleksi: string | null
          detail_absen: string | null
          foto_kegiatan: string | null
          id: string
          jam_ke: string | null
          kegiatan: string | null
          kehadiran_murid: string | null
          kelas: string | null
          keterangan: string | null
          link_bukti_foto: string | null
          mapel: string | null
          materi: string | null
          materi_pembelajaran: string | null
          nama_guru: string | null
          pertemuan_ke: string | null
          refleksi: string | null
          sekolah_id: string
          status_verifikasi: string | null
          tanggal: string | null
          timestamp: string | null
          tujuan_pembelajaran: string | null
        }
        Insert: {
          absensi_siswa?: string | null
          alasan_penolakan?: string | null
          catatan_admin?: string | null
          catatan_khusus_siswa?: string | null
          catatan_refleksi?: string | null
          detail_absen?: string | null
          foto_kegiatan?: string | null
          id: string
          jam_ke?: string | null
          kegiatan?: string | null
          kehadiran_murid?: string | null
          kelas?: string | null
          keterangan?: string | null
          link_bukti_foto?: string | null
          mapel?: string | null
          materi?: string | null
          materi_pembelajaran?: string | null
          nama_guru?: string | null
          pertemuan_ke?: string | null
          refleksi?: string | null
          sekolah_id?: string
          status_verifikasi?: string | null
          tanggal?: string | null
          timestamp?: string | null
          tujuan_pembelajaran?: string | null
        }
        Update: {
          absensi_siswa?: string | null
          alasan_penolakan?: string | null
          catatan_admin?: string | null
          catatan_khusus_siswa?: string | null
          catatan_refleksi?: string | null
          detail_absen?: string | null
          foto_kegiatan?: string | null
          id?: string
          jam_ke?: string | null
          kegiatan?: string | null
          kehadiran_murid?: string | null
          kelas?: string | null
          keterangan?: string | null
          link_bukti_foto?: string | null
          mapel?: string | null
          materi?: string | null
          materi_pembelajaran?: string | null
          nama_guru?: string | null
          pertemuan_ke?: string | null
          refleksi?: string | null
          sekolah_id?: string
          status_verifikasi?: string | null
          tanggal?: string | null
          timestamp?: string | null
          tujuan_pembelajaran?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jurnal_pembelajaran_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      kalender_pendidikan: {
        Row: {
          id: string
          keterangan: string | null
          sekolah_id: string
          tanggal: string | null
          tipe: string | null
        }
        Insert: {
          id: string
          keterangan?: string | null
          sekolah_id?: string
          tanggal?: string | null
          tipe?: string | null
        }
        Update: {
          id?: string
          keterangan?: string | null
          sekolah_id?: string
          tanggal?: string | null
          tipe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kalender_pendidikan_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      laporan_piket: {
        Row: {
          alasan_penolakan?: string | null
          catatan_admin?: string | null
          catatan_apel: string | null
          guru_pelapor: string | null
          id: string
          kehadiran_guru_piket: string | null
          link_foto: string | null
          rekap_absen_kelas: string | null
          sekolah_id: string
          status_verifikasi: string | null
          tanggal: string | null
          timestamp: string | null
        }
        Insert: {
          alasan_penolakan?: string | null
          catatan_admin?: string | null
          catatan_apel?: string | null
          guru_pelapor?: string | null
          id: string
          kehadiran_guru_piket?: string | null
          link_foto?: string | null
          rekap_absen_kelas?: string | null
          sekolah_id?: string
          status_verifikasi?: string | null
          tanggal?: string | null
          timestamp?: string | null
        }
        Update: {
          alasan_penolakan?: string | null
          catatan_admin?: string | null
          catatan_apel?: string | null
          guru_pelapor?: string | null
          id?: string
          kehadiran_guru_piket?: string | null
          link_foto?: string | null
          rekap_absen_kelas?: string | null
          sekolah_id?: string
          status_verifikasi?: string | null
          tanggal?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "laporan_piket_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      nilai_siswa: {
        Row: {
          asesmen_id: string
          catatan: string | null
          created_at: string | null
          id: string
          kelas: string
          mapel: string
          nama_guru: string
          nama_siswa: string
          nilai: number | null
          nisn: string
          sekolah_id: string
          siswa_id: string | null
          tp_id: string
          updated_at: string | null
        }
        Insert: {
          asesmen_id: string
          catatan?: string | null
          created_at?: string | null
          id?: string
          kelas: string
          mapel: string
          nama_guru: string
          nama_siswa: string
          nilai?: number | null
          nisn: string
          sekolah_id?: string
          siswa_id?: string | null
          tp_id: string
          updated_at?: string | null
        }
        Update: {
          asesmen_id?: string
          catatan?: string | null
          created_at?: string | null
          id?: string
          kelas?: string
          mapel?: string
          nama_guru?: string
          nama_siswa?: string
          nilai?: number | null
          nisn?: string
          sekolah_id?: string
          siswa_id?: string | null
          tp_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nilai_siswa_asesmen_id_fkey"
            columns: ["asesmen_id"]
            isOneToOne: false
            referencedRelation: "asesmen_kolom"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nilai_siswa_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nilai_siswa_tp_id_fkey"
            columns: ["tp_id"]
            isOneToOne: false
            referencedRelation: "tujuan_pembelajaran"
            referencedColumns: ["id"]
          },
        ]
      }
      pengaturan: {
        Row: {
          aturan_kehadiran_guru: string | null
          email_tujuan_upload: string | null
          guru_hanya_mengajar: string | null
          id: string
          jam_pulang_jumat: string | null
          key: string | null
          sekolah_id: string
          value: string | null
        }
        Insert: {
          aturan_kehadiran_guru?: string | null
          email_tujuan_upload?: string | null
          guru_hanya_mengajar?: string | null
          id?: string
          jam_pulang_jumat?: string | null
          key?: string | null
          sekolah_id?: string
          value?: string | null
        }
        Update: {
          aturan_kehadiran_guru?: string | null
          email_tujuan_upload?: string | null
          guru_hanya_mengajar?: string | null
          id?: string
          jam_pulang_jumat?: string | null
          key?: string | null
          sekolah_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pengaturan_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      pengumuman: {
        Row: {
          created_at: string | null
          id: string
          is_pinned: boolean | null
          judul: string
          konten: string
          lampiran_url: string | null
          mode: string
          penulis_nama: string
          penulis_role: string
          sasaran: string
          sekolah_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          judul: string
          konten: string
          lampiran_url?: string | null
          mode?: string
          penulis_nama: string
          penulis_role?: string
          sasaran?: string
          sekolah_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          judul?: string
          konten?: string
          lampiran_url?: string | null
          mode?: string
          penulis_nama?: string
          penulis_role?: string
          sasaran?: string
          sekolah_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pengumuman_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      pengumuman_dibaca: {
        Row: {
          id: string
          pengumuman_id: string
          read_at: string | null
          sekolah_id: string
          user_id: string
        }
        Insert: {
          id?: string
          pengumuman_id: string
          read_at?: string | null
          sekolah_id?: string
          user_id: string
        }
        Update: {
          id?: string
          pengumuman_id?: string
          read_at?: string | null
          sekolah_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pengumuman_dibaca_pengumuman_id_fkey"
            columns: ["pengumuman_id"]
            isOneToOne: false
            referencedRelation: "pengumuman"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pengumuman_dibaca_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      pengumuman_tanggapan: {
        Row: {
          created_at: string | null
          id: string
          komentar: string
          pengumuman_id: string
          sekolah_id: string
          user_nama: string
          user_role: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          komentar: string
          pengumuman_id: string
          sekolah_id?: string
          user_nama: string
          user_role: string
        }
        Update: {
          created_at?: string | null
          id?: string
          komentar?: string
          pengumuman_id?: string
          sekolah_id?: string
          user_nama?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "pengumuman_tanggapan_pengumuman_id_fkey"
            columns: ["pengumuman_id"]
            isOneToOne: false
            referencedRelation: "pengumuman"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pengumuman_tanggapan_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      penugasan_piket: {
        Row: {
          created_at: string | null
          guru_id: string | null
          guru_nama: string | null
          guru_nip: string | null
          hari: string
          id: string
          kelas: string | null
          sekolah_id: string
          siswa_nama: string | null
          siswa_nisn: string | null
          tahun_ajaran: string | null
          tipe_petugas: string
        }
        Insert: {
          created_at?: string | null
          guru_id?: string | null
          guru_nama?: string | null
          guru_nip?: string | null
          hari: string
          id?: string
          kelas?: string | null
          sekolah_id?: string
          siswa_nama?: string | null
          siswa_nisn?: string | null
          tahun_ajaran?: string | null
          tipe_petugas?: string
        }
        Update: {
          created_at?: string | null
          guru_id?: string | null
          guru_nama?: string | null
          guru_nip?: string | null
          hari?: string
          id?: string
          kelas?: string | null
          sekolah_id?: string
          siswa_nama?: string | null
          siswa_nisn?: string | null
          tahun_ajaran?: string | null
          tipe_petugas?: string
        }
        Relationships: [
          {
            foreignKeyName: "penugasan_piket_guru_id_fkey"
            columns: ["guru_id"]
            isOneToOne: false
            referencedRelation: "data_guru"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penugasan_piket_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      presensi_guru: {
        Row: {
          alasan_penolakan?: string | null
          catatan_admin?: string | null
          detail_izin: string | null
          id: string
          jarak: string | null
          jenis_presensi: string | null
          keterlambatan_detik: number | null
          link_bukti: string | null
          lokasi: string | null
          nama_guru: string | null
          sekolah_id: string
          status_verifikasi: string | null
          timestamp: string | null
          tipe_absen: string | null
        }
        Insert: {
          alasan_penolakan?: string | null
          catatan_admin?: string | null
          detail_izin?: string | null
          id: string
          jarak?: string | null
          jenis_presensi?: string | null
          keterlambatan_detik?: number | null
          link_bukti?: string | null
          lokasi?: string | null
          nama_guru?: string | null
          sekolah_id?: string
          status_verifikasi?: string | null
          timestamp?: string | null
          tipe_absen?: string | null
        }
        Update: {
          alasan_penolakan?: string | null
          catatan_admin?: string | null
          detail_izin?: string | null
          id?: string
          jarak?: string | null
          jenis_presensi?: string | null
          keterlambatan_detik?: number | null
          link_bukti?: string | null
          lokasi?: string | null
          nama_guru?: string | null
          sekolah_id?: string
          status_verifikasi?: string | null
          timestamp?: string | null
          tipe_absen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presensi_guru_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          sekolah_id: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
          user_nama: string | null
          user_role: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          sekolah_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_nama?: string | null
          user_role?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          sekolah_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_nama?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      riwayat_backup: {
        Row: {
          id: string
          keterangan: string | null
          link_file: string | null
          sekolah_id: string
          status: string | null
          tahun_backup: string | null
          timestamp: string | null
        }
        Insert: {
          id: string
          keterangan?: string | null
          link_file?: string | null
          sekolah_id?: string
          status?: string | null
          tahun_backup?: string | null
          timestamp?: string | null
        }
        Update: {
          id?: string
          keterangan?: string | null
          link_file?: string | null
          sekolah_id?: string
          status?: string | null
          tahun_backup?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "riwayat_backup_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      sekolah: {
        Row: {
          alamat: string | null
          created_at: string | null
          email: string | null
          id: string
          kota_kabupaten: string | null
          logo_kanan_url: string | null
          logo_kiri_url: string | null
          logo_url: string | null
          nama: string
          nama_kepala_sekolah: string | null
          nip_kepala_sekolah: string | null
          npsn: string | null
          provinsi: string | null
          status: string
          telepon: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          alamat?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          kota_kabupaten?: string | null
          logo_kanan_url?: string | null
          logo_kiri_url?: string | null
          logo_url?: string | null
          nama: string
          nama_kepala_sekolah?: string | null
          nip_kepala_sekolah?: string | null
          npsn?: string | null
          provinsi?: string | null
          status?: string
          telepon?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          alamat?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          kota_kabupaten?: string | null
          logo_kanan_url?: string | null
          logo_kiri_url?: string | null
          logo_url?: string | null
          nama?: string
          nama_kepala_sekolah?: string | null
          nip_kepala_sekolah?: string | null
          npsn?: string | null
          provinsi?: string | null
          status?: string
          telepon?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      syarat_perangkat_pembelajaran: {
        Row: {
          created_at: string
          deskripsi: string | null
          format_dokumen: string
          id: string
          kode_dokumen: string
          nama_dokumen: string
          nama_mapel: string
          sekolah_id: string
          updated_at: string | null
          urutan: number
          wajib: boolean
        }
        Insert: {
          created_at?: string
          deskripsi?: string | null
          format_dokumen?: string
          id?: string
          kode_dokumen: string
          nama_dokumen: string
          nama_mapel?: string
          sekolah_id?: string
          updated_at?: string | null
          urutan?: number
          wajib?: boolean
        }
        Update: {
          created_at?: string
          deskripsi?: string | null
          format_dokumen?: string
          id?: string
          kode_dokumen?: string
          nama_dokumen?: string
          nama_mapel?: string
          sekolah_id?: string
          updated_at?: string | null
          urutan?: number
          wajib?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "syarat_perangkat_pembelajaran_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      tujuan_pembelajaran: {
        Row: {
          created_at: string | null
          deskripsi: string
          guru_id: string | null
          id: string
          kelas: string
          kode_tp: string
          mapel_id: string | null
          nama_guru: string
          nama_mapel: string
          sekolah_id: string
          semester: string
          tahun_ajaran: string
          updated_at: string | null
          urutan: number
        }
        Insert: {
          created_at?: string | null
          deskripsi: string
          guru_id?: string | null
          id?: string
          kelas: string
          kode_tp: string
          mapel_id?: string | null
          nama_guru: string
          nama_mapel: string
          sekolah_id?: string
          semester?: string
          tahun_ajaran?: string
          updated_at?: string | null
          urutan?: number
        }
        Update: {
          created_at?: string | null
          deskripsi?: string
          guru_id?: string | null
          id?: string
          kelas?: string
          kode_tp?: string
          mapel_id?: string | null
          nama_guru?: string
          nama_mapel?: string
          sekolah_id?: string
          semester?: string
          tahun_ajaran?: string
          updated_at?: string | null
          urutan?: number
        }
        Relationships: [
          {
            foreignKeyName: "tujuan_pembelajaran_guru_id_fkey"
            columns: ["guru_id"]
            isOneToOne: false
            referencedRelation: "data_guru"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tujuan_pembelajaran_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar: string | null
          id: string
          nama: string | null
          password: string | null
          role: string | null
          sekolah_id: string | null
          username: string | null
        }
        Insert: {
          avatar?: string | null
          id?: string
          nama?: string | null
          password?: string | null
          role?: string | null
          sekolah_id?: string | null
          username?: string | null
        }
        Update: {
          avatar?: string | null
          id?: string
          nama?: string | null
          password?: string | null
          role?: string | null
          sekolah_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
      wali_kelas: {
        Row: {
          created_at: string | null
          guru_id: string | null
          id: string
          kelas: string
          nama_guru: string
          nip: string | null
          sekolah_id: string
          tahun_ajaran: string | null
        }
        Insert: {
          created_at?: string | null
          guru_id?: string | null
          id?: string
          kelas: string
          nama_guru: string
          nip?: string | null
          sekolah_id?: string
          tahun_ajaran?: string | null
        }
        Update: {
          created_at?: string | null
          guru_id?: string | null
          id?: string
          kelas?: string
          nama_guru?: string
          nip?: string | null
          sekolah_id?: string
          tahun_ajaran?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wali_kelas_guru_id_fkey"
            columns: ["guru_id"]
            isOneToOne: false
            referencedRelation: "data_guru"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wali_kelas_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      guru_kelas: {
        Row: {
          guru_id: string | null
          kelas: string | null
          nama_guru: string | null
          nip: string | null
          sekolah_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guru_mapel_guru_id_fkey"
            columns: ["guru_id"]
            isOneToOne: false
            referencedRelation: "data_guru"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guru_mapel_sekolah_id_fkey"
            columns: ["sekolah_id"]
            isOneToOne: false
            referencedRelation: "sekolah"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_auth_user_role: { Args: never; Returns: string }
      get_auth_user_sekolah_id: { Args: never; Returns: string }
      is_superadmin: { Args: never; Returns: boolean }
      update_user_profile: {
        Args: {
          p_avatar?: string
          p_nama?: string
          p_password?: string
          p_user_id: string
          p_username?: string
        }
        Returns: Json
      }
      verify_login: {
        Args: { p_password: string; p_username: string }
        Returns: {
          id: string
          nama: string
          role: string
          sekolah_id: string
          username: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const


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

// Feature Additions (Milestone 9)
export type ChatMessage = Tables<"chat_messages">;
export type ChatMessageInsert = TablesInsert<"chat_messages">;
export type ChatMessageUpdate = TablesUpdate<"chat_messages">;

export type PengumumanDibaca = Tables<"pengumuman_dibaca">;
export type PengumumanDibacaInsert = TablesInsert<"pengumuman_dibaca">;
export type PengumumanDibacaUpdate = TablesUpdate<"pengumuman_dibaca">;

// Feature Additions (Milestone 10)
export interface SyaratPerangkatPembelajaran {
  id: string;
  sekolah_id: string;
  nama_mapel: string;
  kode_dokumen: string;
  nama_dokumen: string;
  format_dokumen: string;
  deskripsi?: string | null;
  wajib: boolean;
  urutan: number;
  created_at: string;
  updated_at?: string | null;
}
export type SyaratPerangkatPembelajaranRow = Tables<"syarat_perangkat_pembelajaran">;
export type SyaratPerangkatPembelajaranInsert = TablesInsert<"syarat_perangkat_pembelajaran">;
export type SyaratPerangkatPembelajaranUpdate = TablesUpdate<"syarat_perangkat_pembelajaran">;

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
