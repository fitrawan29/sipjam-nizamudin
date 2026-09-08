import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const csvDir = path.join(__dirname, '../csv');

const fileMap: Record<string, { table: string, colMap: Record<string, string> }> = {
  'SIPJAM NIZAMUDIN - Bank_Dokumen.csv': {
    table: 'bank_dokumen',
    colMap: { 'ID': 'id', 'Timestamp': 'timestamp', 'Nama Guru': 'nama_guru', 'Jenis Dokumen': 'jenis_dokumen', 'Judul': 'judul', 'Link File': 'link_file', 'Status Verifikasi': 'status_verifikasi', 'Catatan Admin': 'catatan_admin' }
  },
  'SIPJAM NIZAMUDIN - Data_Guru (1).csv': {
    table: 'data_guru',
    colMap: { 'nip': 'nip', 'nama_guru': 'nama_guru', 'mata_pelajaran': 'mata_pelajaran', 'no_hp': 'no_hp', 'status': 'status', 'email': 'email' }
  },
  'SIPJAM NIZAMUDIN - Data_Mapel (1).csv': {
    table: 'data_mapel',
    colMap: { 'id': 'id', 'nama_mata_pelajaran': 'nama_mata_pelajaran', 'kategori': 'kategori' }
  },
  'SIPJAM NIZAMUDIN - Data_Siswa (1).csv': {
    table: 'data_siswa',
    colMap: { 'nisn': 'nisn', 'nama_siswa': 'nama_siswa', 'kelas': 'kelas', 'gender': 'gender', 'status': 'status', 'No HP Ortu': 'no_hp_ortu' }
  },
  'SIPJAM NIZAMUDIN - Jadwal_Pelajaran.csv': {
    table: 'jadwal_pelajaran',
    colMap: { 'ID': 'id', 'Hari': 'hari', 'Nama Guru': 'nama_guru', 'Mata Pelajaran': 'mata_pelajaran', 'Kelas': 'kelas' }
  },
  'SIPJAM NIZAMUDIN - Jadwal_Piket.csv': {
    table: 'jadwal_piket',
    colMap: { 'Hari': 'hari', 'Daftar Guru': 'daftar_guru' }
  },
  'SIPJAM NIZAMUDIN - Jurnal_Pembelajaran (1).csv': {
    table: 'jurnal_pembelajaran',
    colMap: { 'id': 'id', 'timestamp': 'timestamp', 'nama_guru': 'nama_guru', 'mapel': 'mapel', 'kelas': 'kelas', 'tanggal': 'tanggal', 'materi': 'materi', 'kegiatan': 'kegiatan', 'absensi_siswa': 'absensi_siswa', 'keterangan': 'keterangan', 'refleksi': 'refleksi', 'detail_absen': 'detail_absen', 'link_bukti_foto': 'link_bukti_foto', 'status_verifikasi': 'status_verifikasi', 'Catatan Khusus Siswa': 'catatan_khusus_siswa' }
  },
  'SIPJAM NIZAMUDIN - Kalender_Pendidikan (1).csv': {
    table: 'kalender_pendidikan',
    colMap: { 'id': 'id', 'tanggal': 'tanggal', 'keterangan': 'keterangan', 'tipe': 'tipe' }
  },
  'SIPJAM NIZAMUDIN - Laporan_Piket.csv': {
    table: 'laporan_piket',
    colMap: { 'ID': 'id', 'Timestamp': 'timestamp', 'Tanggal': 'tanggal', 'Guru Pelapor': 'guru_pelapor', 'Rekap Absen Kelas': 'rekap_absen_kelas', 'Catatan Apel': 'catatan_apel', 'Link Foto': 'link_foto', 'Status Verifikasi': 'status_verifikasi', 'Kehadiran Guru Piket': 'kehadiran_guru_piket' }
  },
  'SIPJAM NIZAMUDIN - Pengaturan (1).csv': {
    table: 'pengaturan',
    colMap: { 'key': 'key', 'value': 'value' }
  },
  'SIPJAM NIZAMUDIN - Presensi_Guru (1).csv': {
    table: 'presensi_guru',
    colMap: { '0': 'id', 'timestamp': 'timestamp', 'nama_guru': 'nama_guru', 'tipe_absen': 'tipe_absen', 'jenis_presensi': 'jenis_presensi', 'detail_izin': 'detail_izin', 'lokasi': 'lokasi', 'jarak': 'jarak', 'link_bukti': 'link_bukti', 'status_verifikasi': 'status_verifikasi' }
  },
  'SIPJAM NIZAMUDIN - Riwayat_Backup.csv': {
    table: 'riwayat_backup',
    colMap: { 'ID': 'id', 'Timestamp': 'timestamp', 'Tahun Backup': 'tahun_backup', 'Link File': 'link_file', 'Status': 'status', 'Keterangan': 'keterangan' }
  },
  'SIPJAM NIZAMUDIN - Users (1).csv': {
    table: 'users',
    colMap: { 'username': 'username', 'password': 'password', 'nama': 'nama', 'role': 'role' }
  }
};

async function main() {
  const files = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'));
  for (const file of files) {
    if (!fileMap[file]) continue;
    const { table, colMap } = fileMap[file];
    console.log(`Processing ${file} into ${table}...`);
    
    const content = fs.readFileSync(path.join(csvDir, file), 'utf8');
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    
    const dataToInsert = records.map((record: any) => {
      const newRecord: any = {};
      for (const [oldKey, newKey] of Object.entries(colMap)) {
        if (record[oldKey] !== undefined && record[oldKey] !== '') {
          newRecord[newKey] = record[oldKey];
        }
      }
      return newRecord;
    }).filter((r: any) => Object.keys(r).length > 0);
    
    if (dataToInsert.length === 0) {
      console.log(`No data to insert for ${table}.`);
      continue;
    }

    for(let i = 0; i < dataToInsert.length; i += 500) {
      const batch = dataToInsert.slice(i, i + 500);
      const { data, error } = await supabase.from(table).upsert(batch, { ignoreDuplicates: true }); // using upsert to avoid duplicate errors if run multiple times
      if (error) {
        console.error(`Error inserting into ${table}:`, error);
      } else {
        console.log(`Inserted/Upserted ${batch.length} rows into ${table}.`);
      }
    }
  }
  console.log('Data import complete.');
}

main().catch(console.error);
