'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';

export default function AdminDataView({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState('Data_Siswa');
  const [search, setSearch] = useState('');
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ITEMS_PER_PAGE = 20;

  const tabs = [
    { id: 'Data_Siswa', label: 'Siswa', table: 'data_siswa' },
    { id: 'Data_Guru', label: 'Guru', table: 'data_guru' },
    { id: 'Data_Mapel', label: 'Mapel', table: 'data_mapel' },
    { id: 'Kalender_Pendidikan', label: 'Kalender', table: 'kalender_pendidikan' },
    { id: 'Jadwal_Pelajaran', label: 'Jadwal', table: 'jadwal_pelajaran' },
  ];

  const loadData = useCallback(async () => {
    const tabObj = tabs.find(t => t.id === activeTab);
    if (!tabObj) return;

    setLoading(true);
    setErrorMsg('');
    setDataList([]);
    setDebugInfo(`Memuat tabel "${tabObj.table}"...`);

    try {
      console.log(`[AdminDataView] Fetching from table: ${tabObj.table}`);

      let query = supabase.from(tabObj.table).select('*');
      if (user?.sekolah_id) {
        query = query.eq('sekolah_id', user.sekolah_id);
      }

      const { data, error, status, statusText } = await query.limit(2000);

      console.log(`[AdminDataView] Response status: ${status} ${statusText}`);
      console.log(`[AdminDataView] Error:`, error);
      console.log(`[AdminDataView] Data count:`, data?.length ?? 'null');

      if (error) {
        const errText = `Error ${status}: ${error.message} (code: ${error.code})`;
        console.error('[AdminDataView]', errText);
        setErrorMsg(errText);
        setDebugInfo(errText);
      } else if (data && data.length > 0) {
        setDataList(data);
        setDebugInfo(`Berhasil memuat ${data.length} baris dari "${tabObj.table}"`);
      } else if (data && data.length === 0) {
        setDebugInfo(`Tabel "${tabObj.table}" mengembalikan 0 baris (kosong).`);
      } else {
        // Fallback direct REST API
        setDebugInfo(`Supabase mengembalikan data=null tanpa error. Kemungkinan masalah RLS atau koneksi.`);
        setErrorMsg('Data null tanpa error. Coba refresh halaman (Ctrl+Shift+R).');
        
        console.log('[AdminDataView] Trying fallback direct fetch...');
        try {
          const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          if (baseUrl && apiKey) {
            let endpoint = `${baseUrl}/rest/v1/${tabObj.table}?select=*&limit=2000`;
            if (user?.sekolah_id) {
              endpoint += `&sekolah_id=eq.${user.sekolah_id}`;
            }
            const res = await fetch(endpoint, {
              headers: {
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`,
              },
            });
            if (res.ok) {
              const fallbackData = await res.json();
              console.log(`[AdminDataView] Fallback success: ${fallbackData.length} rows`);
              if (Array.isArray(fallbackData) && fallbackData.length > 0) {
                setDataList(fallbackData);
                setErrorMsg('');
                setDebugInfo(`Fallback berhasil: ${fallbackData.length} baris dari "${tabObj.table}"`);
              }
            } else {
              console.error('[AdminDataView] Fallback failed:', res.status, res.statusText);
            }
          }
        } catch (fallbackErr) {
          console.error('[AdminDataView] Fallback error:', fallbackErr);
        }
      }
    } catch (err: any) {
      console.error('[AdminDataView] Unexpected error:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan jaringan');
      setDebugInfo(`Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.sekolah_id]);

  useEffect(() => {
    loadData();
    setPage(0);
  }, [loadData]);

  // CSV Template Generation and Download
  const handleDownloadTemplate = () => {
    const templates: Record<string, { filename: string; headers: string[]; sample: string[] }> = {
      Data_Siswa: {
        filename: 'Template_Data_Siswa.csv',
        headers: ['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu'],
        sample: ['114367407', 'Moh. Candra Podomi', 'X Merdeka', 'Laki-laki', 'Aktif', '081234567890']
      },
      Data_Guru: {
        filename: 'Template_Data_Guru.csv',
        headers: ['nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email'],
        sample: ['198501012010011001', 'Fitri Aprilia Dotulong', 'Bahasa Inggris', '6281241316190', 'Aktif', 'vitridotulong26@gmail.com']
      },
      Data_Mapel: {
        filename: 'Template_Data_Mapel.csv',
        headers: ['id', 'nama_mata_pelajaran', 'kategori'],
        sample: ['MP-01', 'Matematika Wajib', 'X Merdeka']
      },
      Kalender_Pendidikan: {
        filename: 'Template_Kalender_Pendidikan.csv',
        headers: ['id', 'tanggal', 'keterangan', 'tipe'],
        sample: ['KP-01', '2026-10-01', 'Hari Kesaktian Pancasila', 'Libur']
      },
      Jadwal_Pelajaran: {
        filename: 'Template_Jadwal_Pelajaran.csv',
        headers: ['id', 'hari', 'nama_guru', 'mata_pelajaran', 'kelas'],
        sample: ['JP-01', 'Senin', 'Fitri Aprilia Dotulong', 'Bahasa Inggris', 'X Merdeka']
      }
    };

    const current = templates[activeTab];
    if (!current) return;

    const escapeCsv = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const content = '\uFEFF' + [
      current.headers.join(','),
      current.sample.map(escapeCsv).join(',')
    ].join('\r\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = current.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // CSV File Parser & Batch Upsert
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const tabObj = tabs.find(t => t.id === activeTab);
    if (!tabObj) return;

    setLoading(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        throw new Error('File CSV kosong atau tidak memiliki baris data.');
      }

      // Robust CSV line parser with quotes handling
      const parseCsvLine = (line: string): string[] => {
        const parts: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (c === ',' && !inQuotes) {
            parts.push(cur.trim());
            cur = '';
          } else {
            cur += c;
          }
        }
        parts.push(cur.trim());
        return parts;
      };

      const rawHeaders = parseCsvLine(lines[0]);
      // Normalize header names: lowercase, replace spaces/dashes with underscores
      const headers = rawHeaders.map(h => {
        const clean = h.toLowerCase().replace(/[\s-]+/g, '_').replace(/^"|"$/g, '');
        if (clean === 'no_hp_orang_tua' || clean === 'hp_ortu') return 'no_hp_ortu';
        if (clean === 'nama') return tabObj.table === 'data_siswa' ? 'nama_siswa' : 'nama_guru';
        if (clean === 'mata_pelajaran' && tabObj.table === 'data_mapel') return 'nama_mata_pelajaran';
        if (clean === 'guru') return 'nama_guru';
        return clean;
      });

      const rows: Record<string, any>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const vals = parseCsvLine(lines[i]);
        if (vals.length === 0 || (vals.length === 1 && vals[0] === '')) continue;
        
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          if (vals[idx] !== undefined && h) {
            row[h] = vals[idx];
          }
        });

        // Ensure primary key exists
        if (!row.id) {
          row.id = crypto.randomUUID();
        }

        // Scope by sekolah_id
        row.sekolah_id = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';

        // Apply default values if needed
        if (tabObj.table === 'data_siswa' && !row.status) row.status = 'Aktif';
        if (tabObj.table === 'data_guru' && !row.status) row.status = 'Aktif';

        rows.push(row);
      }

      if (rows.length === 0) {
        throw new Error('Tidak ada baris data valid yang ditemukan dalam CSV.');
      }

      // Batch upsert to Supabase in chunks of 50
      const batchSize = 50;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase
          .from(tabObj.table)
          .upsert(batch, { ignoreDuplicates: false });
        if (error) throw error;
      }

      Swal.fire({
        icon: 'success',
        title: 'Unggah Berhasil',
        text: `Berhasil mengimpor dan memperbarui ${rows.length} data ke tabel ${tabObj.label}!`,
        confirmButtonColor: '#0B4619'
      });
      loadData();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Impor CSV',
        text: err.message || 'Terjadi kesalahan saat memproses file CSV.',
        confirmButtonColor: '#dc2626'
      });
    } finally {
      setLoading(false);
    }
  };

  // Manual Insert Modal
  const handleOpenCreateModal = async () => {
    const tabObj = tabs.find(t => t.id === activeTab);
    if (!tabObj) return;

    if (activeTab === 'Data_Siswa') {
      const { value: formValues } = await Swal.fire({
        title: 'Tambah Siswa Baru',
        html: `
          <div class="text-left space-y-2 text-xs">
            <div>
              <label class="font-bold text-gray-700 block mb-1">NISN *</label>
              <input id="swal-nisn" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: 114367407">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Nama Lengkap Siswa *</label>
              <input id="swal-nama" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: Budi Santoso">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Kelas *</label>
              <input id="swal-kelas" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: X Merdeka, XI-1">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Jenis Kelamin *</label>
              <select id="swal-gender" class="swal2-select !mt-0 !w-full text-xs">
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">No HP Orang Tua</label>
              <input id="swal-hp" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: 081234567890">
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan Data',
        confirmButtonColor: '#0B4619',
        cancelButtonText: 'Batal',
        preConfirm: () => {
          const nisn = (document.getElementById('swal-nisn') as HTMLInputElement)?.value?.trim();
          const nama_siswa = (document.getElementById('swal-nama') as HTMLInputElement)?.value?.trim();
          const kelas = (document.getElementById('swal-kelas') as HTMLInputElement)?.value?.trim();
          const gender = (document.getElementById('swal-gender') as HTMLSelectElement)?.value;
          const no_hp_ortu = (document.getElementById('swal-hp') as HTMLInputElement)?.value?.trim() || '';

          if (!nisn || !nama_siswa || !kelas) {
            Swal.showValidationMessage('NISN, Nama Siswa, dan Kelas wajib diisi!');
            return null;
          }
          return {
            id: crypto.randomUUID(),
            sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
            nisn,
            nama_siswa,
            kelas,
            gender,
            status: 'Aktif',
            no_hp_ortu
          };
        }
      });

      if (formValues) {
        setLoading(true);
        const { error } = await supabase.from('data_siswa').insert([formValues]);
        setLoading(false);
        if (error) {
          Swal.fire('Gagal Menambah Data', error.message, 'error');
        } else {
          Swal.fire('Berhasil', 'Data siswa berhasil disimpan!', 'success');
          loadData();
        }
      }
    } else if (activeTab === 'Data_Guru') {
      const { value: formValues } = await Swal.fire({
        title: 'Tambah Guru Baru',
        html: `
          <div class="text-left space-y-2 text-xs">
            <div>
              <label class="font-bold text-gray-700 block mb-1">NIP (atau kode pengenal)</label>
              <input id="swal-nip" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: 198501012010011001">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Nama Lengkap Guru *</label>
              <input id="swal-nama" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: Fitri Aprilia Dotulong, S.Pd.">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Mata Pelajaran Diampu *</label>
              <input id="swal-mapel" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: Bahasa Inggris">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">No HP / WhatsApp</label>
              <input id="swal-hp" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: 628123456789">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Email</label>
              <input id="swal-email" type="email" class="swal2-input !mt-0 !w-full text-xs" placeholder="guru@nizamudin.sch.id">
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan Data',
        confirmButtonColor: '#0B4619',
        cancelButtonText: 'Batal',
        preConfirm: () => {
          const nip = (document.getElementById('swal-nip') as HTMLInputElement)?.value?.trim() || '-';
          const nama_guru = (document.getElementById('swal-nama') as HTMLInputElement)?.value?.trim();
          const mata_pelajaran = (document.getElementById('swal-mapel') as HTMLInputElement)?.value?.trim();
          const no_hp = (document.getElementById('swal-hp') as HTMLInputElement)?.value?.trim() || '-';
          const email = (document.getElementById('swal-email') as HTMLInputElement)?.value?.trim() || '-';

          if (!nama_guru || !mata_pelajaran) {
            Swal.showValidationMessage('Nama Guru dan Mata Pelajaran wajib diisi!');
            return null;
          }
          return {
            id: crypto.randomUUID(),
            sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
            nip,
            nama_guru,
            mata_pelajaran,
            no_hp,
            status: 'Aktif',
            email
          };
        }
      });

      if (formValues) {
        setLoading(true);
        const { error } = await supabase.from('data_guru').insert([formValues]);
        setLoading(false);
        if (error) {
          Swal.fire('Gagal Menambah Data', error.message, 'error');
        } else {
          Swal.fire('Berhasil', 'Data guru berhasil disimpan!', 'success');
          loadData();
        }
      }
    } else if (activeTab === 'Data_Mapel') {
      const { value: formValues } = await Swal.fire({
        title: 'Tambah Mata Pelajaran',
        html: `
          <div class="text-left space-y-2 text-xs">
            <div>
              <label class="font-bold text-gray-700 block mb-1">Kode / ID Mapel (Opsional)</label>
              <input id="swal-id" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: MP-01 (kosongkan untuk otomatis)">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Nama Mata Pelajaran *</label>
              <input id="swal-nama" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: Matematika Wajib">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Kategori / Tingkat *</label>
              <input id="swal-kat" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: X Merdeka, Umum, Peminatan">
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan Data',
        confirmButtonColor: '#0B4619',
        cancelButtonText: 'Batal',
        preConfirm: () => {
          const userGivenId = (document.getElementById('swal-id') as HTMLInputElement)?.value?.trim();
          const nama_mata_pelajaran = (document.getElementById('swal-nama') as HTMLInputElement)?.value?.trim();
          const kategori = (document.getElementById('swal-kat') as HTMLInputElement)?.value?.trim() || 'Umum';

          if (!nama_mata_pelajaran) {
            Swal.showValidationMessage('Nama Mata Pelajaran wajib diisi!');
            return null;
          }
          return {
            id: userGivenId || crypto.randomUUID(),
            sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
            nama_mata_pelajaran,
            kategori
          };
        }
      });

      if (formValues) {
        setLoading(true);
        const { error } = await supabase.from('data_mapel').insert([formValues]);
        setLoading(false);
        if (error) {
          Swal.fire('Gagal Menambah Data', error.message, 'error');
        } else {
          Swal.fire('Berhasil', 'Mata Pelajaran berhasil disimpan!', 'success');
          loadData();
        }
      }
    } else if (activeTab === 'Kalender_Pendidikan') {
      const { value: formValues } = await Swal.fire({
        title: 'Tambah Agenda Kalender',
        html: `
          <div class="text-left space-y-2 text-xs">
            <div>
              <label class="font-bold text-gray-700 block mb-1">Tanggal *</label>
              <input id="swal-tgl" type="date" class="swal2-input !mt-0 !w-full text-xs">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Keterangan Agenda *</label>
              <input id="swal-ket" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: Hari Libur Nasional">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Tipe Agenda *</label>
              <select id="swal-tipe" class="swal2-select !mt-0 !w-full text-xs">
                <option value="Libur">Libur</option>
                <option value="Kegiatan">Kegiatan</option>
                <option value="Ujian">Ujian</option>
              </select>
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan Data',
        confirmButtonColor: '#0B4619',
        cancelButtonText: 'Batal',
        preConfirm: () => {
          const tanggal = (document.getElementById('swal-tgl') as HTMLInputElement)?.value?.trim();
          const keterangan = (document.getElementById('swal-ket') as HTMLInputElement)?.value?.trim();
          const tipe = (document.getElementById('swal-tipe') as HTMLSelectElement)?.value || 'Libur';

          if (!tanggal || !keterangan) {
            Swal.showValidationMessage('Tanggal dan Keterangan wajib diisi!');
            return null;
          }
          return {
            id: crypto.randomUUID(),
            sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
            tanggal,
            keterangan,
            tipe
          };
        }
      });

      if (formValues) {
        setLoading(true);
        const { error } = await supabase.from('kalender_pendidikan').insert([formValues]);
        setLoading(false);
        if (error) {
          Swal.fire('Gagal Menambah Agenda', error.message, 'error');
        } else {
          Swal.fire('Berhasil', 'Agenda kalender berhasil disimpan!', 'success');
          loadData();
        }
      }
    } else if (activeTab === 'Jadwal_Pelajaran') {
      const { value: formValues } = await Swal.fire({
        title: 'Tambah Jadwal Pelajaran',
        html: `
          <div class="text-left space-y-2 text-xs">
            <div>
              <label class="font-bold text-gray-700 block mb-1">Hari *</label>
              <select id="swal-hari" class="swal2-select !mt-0 !w-full text-xs">
                <option value="Senin">Senin</option>
                <option value="Selasa">Selasa</option>
                <option value="Rabu">Rabu</option>
                <option value="Kamis">Kamis</option>
                <option value="Jumat">Jumat</option>
                <option value="Sabtu">Sabtu</option>
              </select>
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Nama Guru *</label>
              <input id="swal-guru" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: Fitri Aprilia Dotulong">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Mata Pelajaran *</label>
              <input id="swal-mapel" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: Bahasa Inggris">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Kelas *</label>
              <input id="swal-kelas" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: X Merdeka">
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan Data',
        confirmButtonColor: '#0B4619',
        cancelButtonText: 'Batal',
        preConfirm: () => {
          const hari = (document.getElementById('swal-hari') as HTMLSelectElement)?.value;
          const nama_guru = (document.getElementById('swal-guru') as HTMLInputElement)?.value?.trim();
          const mata_pelajaran = (document.getElementById('swal-mapel') as HTMLInputElement)?.value?.trim();
          const kelas = (document.getElementById('swal-kelas') as HTMLInputElement)?.value?.trim();

          if (!nama_guru || !mata_pelajaran || !kelas) {
            Swal.showValidationMessage('Nama Guru, Mapel, dan Kelas wajib diisi!');
            return null;
          }
          return {
            id: crypto.randomUUID(),
            sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
            hari,
            nama_guru,
            mata_pelajaran,
            kelas
          };
        }
      });

      if (formValues) {
        setLoading(true);
        const { error } = await supabase.from('jadwal_pelajaran').insert([formValues]);
        setLoading(false);
        if (error) {
          Swal.fire('Gagal Menambah Jadwal', error.message, 'error');
        } else {
          Swal.fire('Berhasil', 'Jadwal pelajaran berhasil disimpan!', 'success');
          loadData();
        }
      }
    }
  };

  // Delete Individual Master Data Item
  const handleDeleteItem = async (item: any) => {
    const tabObj = tabs.find(t => t.id === activeTab);
    if (!tabObj) return;

    const itemName = item.nama_siswa || item.nama_guru || item.nama_mata_pelajaran || item.keterangan || item.id || 'data ini';

    const result = await Swal.fire({
      title: 'Hapus Data?',
      text: `Apakah Anda yakin ingin menghapus "${itemName}"? Data yang dihapus tidak dapat dikembalikan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus!',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setLoading(true);
      const idField = item.id ? 'id' : (item.nisn ? 'nisn' : (item.nip ? 'nip' : 'id'));
      const idVal = item[idField];

      let delQuery = supabase.from(tabObj.table).delete().eq(idField, idVal);
      if (user?.sekolah_id) {
        delQuery = delQuery.eq('sekolah_id', user.sekolah_id);
      }
      const { error } = await delQuery;
      setLoading(false);

      if (error) {
        Swal.fire('Gagal Menghapus', error.message, 'error');
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Terhapus',
          text: 'Data berhasil dihapus dari database.',
          timer: 1500,
          showConfirmButton: false
        });
        loadData();
      }
    }
  };

  const filteredList = Array.isArray(dataList) ? dataList.filter(item => {
    if (!item) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (item.nama_siswa || '').toLowerCase().includes(term) ||
      (item.nama_guru || '').toLowerCase().includes(term) ||
      (item.nama_mata_pelajaran || '').toLowerCase().includes(term) ||
      (item.keterangan || '').toLowerCase().includes(term) ||
      (item.kelas || '').toLowerCase().includes(term) ||
      (item.mata_pelajaran || '').toLowerCase().includes(term) ||
      (item.nisn || '').toLowerCase().includes(term) ||
      (item.nip || '').toLowerCase().includes(term) ||
      (item.hari || '').toLowerCase().includes(term) ||
      (item.tanggal || '').toLowerCase().includes(term) ||
      (item.tipe || '').toLowerCase().includes(term)
    );
  }) : [];

  const paginatedList = filteredList.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const totalPages = Math.ceil((filteredList.length || 0) / ITEMS_PER_PAGE);

  const renderCard = (item: any) => {
    if (!item) return null;
    if (activeTab === 'Data_Siswa') {
      return (
        <>
          <h3 className="font-bold text-xs text-gray-900 dark:text-white">{item.nama_siswa || 'Tanpa Nama'}</h3>
          <div className="text-xs text-gray-700 dark:text-gray-200 mt-1">
            <p><span className="font-semibold">NISN:</span> {item.nisn || '-'}</p>
            <p><span className="font-semibold">Kelas:</span> {item.kelas || '-'}</p>
            <p><span className="font-semibold">Gender:</span> {item.gender || '-'}</p>
            {item.no_hp_ortu && <p><span className="font-semibold">HP Ortu:</span> {item.no_hp_ortu}</p>}
          </div>
          <div className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">{item.status || 'Aktif'}</div>
        </>
      );
    } else if (activeTab === 'Data_Guru') {
      return (
        <>
          <h3 className="font-bold text-xs text-gray-900 dark:text-white">{item.nama_guru || 'Tanpa Nama'}</h3>
          <div className="text-xs text-gray-700 dark:text-gray-200 mt-1">
            <p><span className="font-semibold">NIP:</span> {item.nip || '-'}</p>
            <p><span className="font-semibold">Mapel:</span> {item.mata_pelajaran || '-'}</p>
            <p><span className="font-semibold">Kontak:</span> {item.no_hp || '-'}</p>
            {item.email && <p className="truncate"><span className="font-semibold">Email:</span> {item.email}</p>}
          </div>
          <div className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">{item.status || 'Aktif'}</div>
        </>
      );
    } else if (activeTab === 'Data_Mapel') {
      return (
        <>
          <h3 className="font-bold text-xs text-gray-900 dark:text-white">{item.nama_mata_pelajaran || 'Tanpa Nama'}</h3>
          <div className="text-xs text-gray-700 dark:text-gray-200 mt-1">
            <p><span className="font-semibold">Kode/ID:</span> {item.id || '-'}</p>
            <p><span className="font-semibold">Kategori:</span> {item.kategori || '-'}</p>
          </div>
        </>
      );
    } else if (activeTab === 'Kalender_Pendidikan') {
      return (
        <>
          <h3 className="font-bold text-xs text-gray-900 dark:text-white">{item.tanggal || '-'}</h3>
          <div className="text-xs text-gray-700 dark:text-gray-200 mt-1">
            <p className="font-semibold text-blue-600 dark:text-blue-400">{item.keterangan || '-'}</p>
            <p><span className="font-semibold">Tipe:</span> {item.tipe || '-'}</p>
          </div>
        </>
      );
    } else if (activeTab === 'Jadwal_Pelajaran') {
      return (
        <>
          <h3 className="font-bold text-xs text-gray-900 dark:text-white">{item.hari || '-'} - {item.kelas || '-'}</h3>
          <div className="text-xs text-gray-700 dark:text-gray-200 mt-1">
            <p><span className="font-semibold">Guru:</span> {item.nama_guru || '-'}</p>
            <p><span className="font-semibold">Mapel:</span> {item.mata_pelajaran || '-'}</p>
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <section id="view-admin-data" className="view-section fade-in">
        {/* Hidden file input for CSV upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept=".csv,text/csv,text/plain" 
          onChange={handleFileUpload} 
          className="hidden" 
        />

        <div className="glass-card p-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <i className="fa-solid fa-database text-purple-500 dark:text-purple-400"></i> Master Data
            </h2>
            
            {/* TABS */}
            <div className="flex overflow-x-auto custom-scroll gap-2 mb-4 pb-1">
                {tabs.map(tab => (
                  <button 
                    key={tab.id}
                    type="button" 
                    onClick={() => setActiveTab(tab.id)} 
                    className={`btn-click master-tab-btn px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 border transition ${activeTab === tab.id ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' : 'border-gray-200 text-gray-700 dark:text-gray-300 dark:border-gray-700'}`}
                  >
                    {tab.label}
                  </button>
                ))}
            </div>

            {/* ERROR MESSAGE */}
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-xs border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                <i className="fa-solid fa-circle-exclamation mr-1"></i> {errorMsg}
              </div>
            )}

            {/* DEBUG INFO (small text at top) */}
            {debugInfo && !loading && (
              <div className="text-[9px] text-gray-500 dark:text-gray-400 mb-2 px-1">
                <i className="fa-solid fa-info-circle mr-1"></i>{debugInfo}
              </div>
            )}

            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-3 border border-purple-100 dark:border-purple-900/30 mb-4">
                <div className="flex justify-between items-center gap-2">
                    <span className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase truncate">Impor & Kelola Data</span>
                    <div className="flex gap-1.5 shrink-0">
                        <button 
                          type="button" 
                          onClick={handleDownloadTemplate} 
                          className="btn-click bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-700 dark:text-white shadow-sm border border-gray-300 dark:border-gray-600 flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                          <i className="fa-solid fa-file-csv text-green-600 dark:text-green-400"></i> Template
                        </button>
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()} 
                          disabled={loading}
                          className="btn-click bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
                        >
                          <i className="fa-solid fa-upload"></i> Unggah
                        </button>
                    </div>
                </div>
            </div>

            {/* SEARCH AND REFRESH */}
            <div className="flex flex-wrap sm:flex-nowrap justify-between items-center mb-4 gap-2">
                <div className="relative flex-grow w-full sm:w-auto">
                    <i className="fa-solid fa-search absolute left-3 top-3 text-gray-400 dark:text-gray-400 text-xs"></i>
                    <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Cari data..." className="w-full pl-8 pr-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-400" />
                </div>
                <div className="flex gap-1.5 shrink-0 ml-auto sm:ml-0">
                    <button type="button" onClick={loadData} disabled={loading} className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border border-gray-200 dark:border-gray-700 disabled:opacity-50">
                      <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
                    </button>
                    <button 
                      type="button" 
                      onClick={handleOpenCreateModal} 
                      disabled={loading}
                      className="btn-click bg-nizamudin-green text-white px-3 h-8 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 border border-nizamudin-light hover:brightness-110 transition disabled:opacity-50"
                    >
                      <i className="fa-solid fa-plus"></i> Baru
                    </button>
                </div>
            </div>

            {/* DATA GRID */}
            <div id="master-list-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px] content-start">
                {loading ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-10 text-gray-500 dark:text-gray-400">
                    <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-purple-500 dark:text-purple-400"></i>
                    <span className="text-xs italic">Menarik data dari Supabase...</span>
                  </div>
                ) : paginatedList.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-gray-500 text-xs italic dark:text-gray-400">
                    {errorMsg ? 'Gagal memuat data. Lihat pesan error di atas.' : (!dataList || dataList.length === 0) ? 'Tabel ini kosong atau data belum dapat dimuat.' : 'Tidak ditemukan data yang cocok dengan pencarian.'}
                  </div>
                ) : (
                  paginatedList.map((item, idx) => (
                    <div key={item?.id || item?.nisn || item?.nip || idx} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 rounded-xl shadow-sm relative hover:shadow-md transition flex flex-col justify-between">
                      <div>
                        {renderCard(item)}
                      </div>
                      <div className="flex justify-end mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <button 
                          type="button" 
                          onClick={() => handleDeleteItem(item)} 
                          className="btn-click text-[11px] font-bold text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1 transition"
                        >
                          <i className="fa-solid fa-trash-can text-[10px]"></i> Hapus
                        </button>
                      </div>
                    </div>
                  ))
                )}
            </div>

            {/* PAGINATION */}
            {!loading && filteredList.length > 0 && (
              <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-gray-600 dark:text-white/80 font-medium">
                    Ditampilkan: {page * ITEMS_PER_PAGE + 1} - {Math.min((page + 1) * ITEMS_PER_PAGE, filteredList.length)} dari Total {filteredList.length} Data
                  </span>
                  <div className="flex gap-2">
                      <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="btn-click w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-xs disabled:opacity-30 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white">
                        <i className="fa-solid fa-chevron-left"></i>
                      </button>
                      <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="btn-click w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-xs disabled:opacity-30 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white">
                        <i className="fa-solid fa-chevron-right"></i>
                      </button>
                  </div>
              </div>
            )}
        </div>
    </section>
  );
}
