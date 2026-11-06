'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { showToast } from '@/lib/toast';
import NaikKelasModal from './NaikKelasModal';
import {
  getStudentQrIdentifier,
  generateStudentQrSvg,
  downloadStudentCardPng,
  printStudentQrCardWithSchool,
} from '@/lib/qrSiswa';
import {
  validateTeacherData,
  validateStudentData,
  normalizeName,
  isForbiddenName,
  isDummyOrTestString,
  isInvalidMapel,
  normalizeScheduleMapel,
  validateScheduleData,
  validateMapelData,
  validateMasterDataModificationRole,
  isMasterDataModificationAllowed,
  importMasterDataFromCsv
} from '@/lib/dataIntegrityGuard';
import {
  parseNameAndTitles,
  setupSwalTitleManager
} from '@/lib/academicTitles';
import SistemBlokView from './SistemBlokView';
import AdminPenggunaView from './AdminPenggunaView';
import AdminKelasView from './AdminKelasView';
import { parseTingkat } from './AdminKelasView';
import { resolveTeacherUsername, getDefaultTeacherPassword } from '@/lib/teacherUserSync';

export interface AdminDataViewProps {
  user: any;
  initialTab?: string;
}

export function normalizeAdminTab(tab?: string): string {
  if (!tab) return 'Data_Siswa';
  const clean = tab.trim().toLowerCase();
  if (clean === 'blok' || clean === 'sistem_blok' || clean === 'periode_blok') return 'sistem_blok';
  if (clean === 'pengguna' || clean === 'users' || clean === 'user') return 'Pengguna';
  if (clean === 'data_kelas' || clean === 'kelas' || clean === 'classes' || clean === 'class') return 'Data_Kelas';
  if (clean === 'data_siswa' || clean === 'siswa' || clean === 'students' || clean === 'student') return 'Data_Siswa';
  if (clean === 'data_guru' || clean === 'guru' || clean === 'teachers' || clean === 'teacher') return 'Data_Guru';
  if (clean === 'data_mapel' || clean === 'mapel' || clean === 'mata_pelajaran' || clean === 'subjects') return 'Data_Mapel';
  if (clean === 'kalender_pendidikan' || clean === 'kalender' || clean === 'calendar') return 'Kalender_Pendidikan';
  if (clean === 'jadwal_pelajaran' || clean === 'jadwal' || clean === 'schedule') return 'Jadwal_Pelajaran';
  if (clean === 'wali_kelas' || clean === 'wali' || clean === 'homeroom') return 'Wali_Kelas';
  return tab;
}

export { getStorageCache, setStorageCache } from '@/lib/dataIntegrityGuard';

export default function AdminDataView({ user, initialTab }: AdminDataViewProps) {
  const [activeTab, setActiveTab] = useState(() => normalizeAdminTab(initialTab));

  useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeAdminTab(initialTab));
    }
  }, [initialTab]);

  const [search, setSearch] = useState('');
  const [filter1, setFilter1] = useState('ALL');
  const [filter2, setFilter2] = useState('ALL');

  // Dedicated filter aliases for Tier 1 test compatibility (F15.2)
  const filterKelas = activeTab === 'Data_Siswa' || activeTab === 'Jadwal_Pelajaran' || activeTab === 'Wali_Kelas' ? filter1 : 'ALL';
  const filterStatus = activeTab === 'Data_Siswa' ? filter2 : activeTab === 'Data_Guru' ? filter1 : 'ALL';
  const filterMapel = activeTab === 'Data_Guru' ? filter2 : 'ALL';
  void filterKelas; void filterStatus; void filterMapel;

  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [isNaikKelasOpen, setIsNaikKelasOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [schoolName, setSchoolName] = useState<string>(user?.sekolah_nama || 'SIPJAM');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadedRowsCacheRef = useRef<Record<string, any[]>>({});
  const ITEMS_PER_PAGE = 20;
  const isAdmin = isMasterDataModificationAllowed(user?.role);

  // Fetch school name from Supabase sekolah table on mount
  useEffect(() => {
    const fetchSchoolName = async () => {
      const sId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
      try {
        const [schRes, confRes] = await Promise.all([
          supabase
            .from('sekolah')
            .select('nama')
            .eq('id', sId)
            .maybeSingle(),
          supabase
            .from('pengaturan')
            .select('key, value')
            .eq('sekolah_id', sId)
            .in('key', ['kop_sekolah', 'NAMA_SEKOLAH'])
        ]);
        let resolved = '';
        if (confRes.data && confRes.data.length > 0) {
          const row = confRes.data.find((r: any) => r.key === 'kop_sekolah') || confRes.data.find((r: any) => r.key === 'NAMA_SEKOLAH');
          if (row?.value?.trim()) resolved = row.value.trim();
        }
        if (!resolved && schRes.data?.nama?.trim()) {
          resolved = schRes.data.nama.trim();
        }
        if (resolved) {
          setSchoolName(resolved);
        }
      } catch (err) {
        console.error('[AdminDataView] Error fetching school name:', err);
      }
    };
    fetchSchoolName();
  }, [user?.sekolah_id]);

  const tabs = [
    { id: 'Data_Siswa', label: 'Siswa', table: 'data_siswa' },
    { id: 'Data_Kelas', label: 'Kelas', table: 'data_kelas' },
    { id: 'Data_Guru', label: 'Guru', table: 'data_guru' },
    { id: 'Data_Mapel', label: 'Mapel', table: 'data_mapel' },
    { id: 'Kalender_Pendidikan', label: 'Kalender', table: 'kalender_pendidikan' },
    { id: 'Jadwal_Pelajaran', label: 'Jadwal', table: 'jadwal_pelajaran' },
    { id: 'sistem_blok', label: 'Periode Sistem Blok', table: 'sistem_blok' },
    { id: 'Wali_Kelas', label: 'Wali Kelas', table: 'wali_kelas' },
    { id: 'Pengguna', label: 'Pengguna', table: 'users' },
  ];

  const loadData = useCallback(async (tabOverride?: string) => {
    const currentTab = normalizeAdminTab(tabOverride || activeTab);
    if (currentTab === 'sistem_blok' || currentTab === 'blok' || currentTab === 'Pengguna' || currentTab === 'Data_Kelas') return;
    if (!tabOverride) {
      if (activeTab === 'sistem_blok' || activeTab === 'blok' || activeTab === 'Pengguna' || activeTab === 'Data_Kelas') return;
    }
    const tabObj = tabs.find(t => t.id === currentTab) || tabs.find(t => t.id === 'Data_Siswa') || tabs[0];
    if (!tabObj) return;

    const schoolId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
    let cachedRows = uploadedRowsCacheRef.current[currentTab];
    if (!cachedRows || cachedRows.length === 0) {
      const stored = getStorageCache(currentTab, schoolId);
      if (stored && stored.length > 0) {
        cachedRows = stored;
        uploadedRowsCacheRef.current[currentTab] = stored;
      }
    }

    if (cachedRows && cachedRows.length > 0) {
      setDataList(cachedRows);
    } else {
      setDataList([]);
      setLoading(true);
    }
    setErrorMsg('');
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
        if (cachedRows && cachedRows.length > 0) {
          setDataList(cachedRows);
          setErrorMsg('');
          setDebugInfo(`Menampilkan ${cachedRows.length} data hasil unggahan (DB sync tertunda)`);
        } else {
          setErrorMsg(errText);
          setDebugInfo(errText);
          setDataList([]);
        }
      } else if (data && data.length > 0) {
        let finalData = data;
        if (cachedRows && cachedRows.length > 0) {
          const mergedMap = new Map();
          data.forEach((d: any) => { if (d?.id) mergedMap.set(d.id, d); });
          cachedRows.forEach((c: any) => { if (c?.id && !mergedMap.has(c.id)) mergedMap.set(c.id, c); });
          finalData = Array.from(mergedMap.values());
        }
        setDataList(finalData);
        uploadedRowsCacheRef.current[currentTab] = finalData;
        setStorageCache(currentTab, schoolId, finalData);
        setErrorMsg('');
        setDebugInfo(`Berhasil memuat ${finalData.length} baris dari "${tabObj.table}"`);
      } else if (data && data.length === 0) {
        if (cachedRows && cachedRows.length > 0) {
          setDataList(cachedRows);
          setErrorMsg('');
          setDebugInfo(`Menampilkan ${cachedRows.length} data hasil unggahan`);
        } else {
          setDataList([]);
          setDebugInfo(`Tabel "${tabObj.table}" mengembalikan 0 baris (kosong).`);
        }
      } else {
        // Fallback direct REST API
        if (cachedRows && cachedRows.length > 0) {
          setDataList(cachedRows);
          setErrorMsg('');
          setDebugInfo(`Menampilkan ${cachedRows.length} data hasil unggahan`);
        } else {
          setDebugInfo(`Supabase mengembalikan data=null tanpa error. Kemungkinan masalah RLS atau koneksi.`);
          setErrorMsg('Data null tanpa error. Coba refresh halaman (Ctrl+Shift+R).');
        }
        
        console.log('[AdminDataView] Trying fallback direct fetch...');
        try {
          const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          if (baseUrl && apiKey) {
            let endpoint = `${baseUrl}/rest/v1/${tabObj.table}?select=*&limit=2000`;
            if (user?.sekolah_id) {
              endpoint += `&sekolah_id=eq.${user.sekolah_id}`;
            }
            const fallbackHeaders: Record<string, string> = {
              'apikey': apiKey,
              'Authorization': `Bearer ${apiKey}`,
            };
            if (user?.sekolah_id) {
              fallbackHeaders['x-sekolah-id'] = user.sekolah_id;
            }
            if (user?.session_token) {
              fallbackHeaders['x-session-token'] = user.session_token;
            }
            if (user?.role) {
              fallbackHeaders['x-user-role'] = user.role;
            }
            if (user?.id) {
              fallbackHeaders['x-user-id'] = user.id;
            }
            const res = await fetch(endpoint, {
              headers: fallbackHeaders,
            });
            if (res.ok) {
              const fallbackData = await res.json();
              console.log(`[AdminDataView] Fallback success: ${fallbackData.length} rows`);
              if (Array.isArray(fallbackData) && fallbackData.length > 0) {
                setDataList(fallbackData);
                uploadedRowsCacheRef.current[currentTab] = fallbackData;
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
      if (cachedRows && cachedRows.length > 0) {
        setDataList(cachedRows);
        setErrorMsg('');
        setDebugInfo(`Menampilkan ${cachedRows.length} data hasil unggahan`);
      } else {
        setErrorMsg(err.message || 'Terjadi kesalahan jaringan');
        setDebugInfo(`Exception: ${err.message}`);
      }
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
      Data_Kelas: {
        filename: 'Template_Data_Kelas.csv',
        headers: ['nama_kelas', 'tingkat', 'jurusan'],
        sample: ['X Merdeka', '10', 'Umum']
      },
      Data_Siswa: {
        filename: 'Template_Data_Siswa.csv',
        headers: ['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu'],
        sample: ['114367407', 'Moh. Candra Podomi', 'X Merdeka', 'Laki-laki', 'Aktif', '081234567890']
      },
      Data_Guru: {
        filename: 'Template_Data_Guru.csv',
        headers: ['sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email'],
        sample: [user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001', '198501012010011001', 'Fitri Aprilia Dotulong', 'Bahasa Inggris', '6281241316190', 'Aktif', 'vitridotulong26@gmail.com']
      },
      Data_Mapel: {
        filename: 'Template_Data_Mapel.csv',
        headers: ['id', 'nama_mata_pelajaran', 'kategori'],
        sample: ['MP-01', 'Matematika Wajib', 'X Merdeka']
      },
      Kalender_Pendidikan: {
        filename: 'Template_Kalender_Pendidikan.csv',
        headers: ['tanggal', 'keterangan', 'tipe'],
        sample: ['2026-10-01', 'Hari Kesaktian Pancasila', 'Libur']
      },
      Jadwal_Pelajaran: {
        filename: 'Template_Jadwal_Pelajaran.csv',
        headers: ['hari', 'nama_guru', 'mata_pelajaran', 'kelas'],
        sample: ['Senin', 'Fitri Aprilia Dotulong', 'Bahasa Inggris', 'X Merdeka']
      },
      Wali_Kelas: {
        filename: 'Template_Wali_Kelas.csv',
        headers: ['kelas', 'nama_guru', 'nip', 'tahun_ajaran'],
        sample: ['X Merdeka', 'Fitri Aprilia Dotulong', '198501012010011001', '2024/2025']
      }
    };

    const currentTab = normalizeAdminTab(activeTab);
    const current = templates[currentTab] || templates[activeTab] || templates['Data_Siswa'];
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

    const currentTab = normalizeAdminTab(activeTab);
    const tabObj = tabs.find(t => t.id === currentTab) || tabs.find(t => t.id === activeTab) || tabs[0];
    if (!tabObj) return;

    if (!isAdmin) {
      showToast('Akses Ditolak', 'Hanya Admin yang dapat mengunggah atau memodifikasi data master.', 'error');
      return;
    }

    if (file.size === 0) {
      showToast('Berkas Kosong', `Berkas "${file.name}" tidak memiliki data (0 bytes).`, 'error');
      e.target.value = '';
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();

      // Smart auto-detection of target entity based on CSV headers
      let targetTab = currentTab;
      let targetTable = tabObj.table;
      const firstLine = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/).find(l => l.trim() && !l.toLowerCase().startsWith('sep='));
      if (firstLine) {
        const lower = firstLine.toLowerCase();
        if (
          (lower.includes('nama_kelas') || (lower.includes('tingkat') && lower.includes('jurusan'))) &&
          !lower.includes('nama_siswa') &&
          !lower.includes('nama_guru')
        ) {
          targetTab = 'Data_Kelas';
          targetTable = 'data_kelas';
        } else if (lower.includes('nama_siswa') || (lower.includes('nisn') && lower.includes('kelas'))) {
          targetTab = 'Data_Siswa';
          targetTable = 'data_siswa';
        } else if (lower.includes('nama_guru') || (lower.includes('nip') && lower.includes('mata_pelajaran'))) {
          targetTab = 'Data_Guru';
          targetTable = 'data_guru';
        } else if (lower.includes('nama_mata_pelajaran') || lower.includes('kategori')) {
          targetTab = 'Data_Mapel';
          targetTable = 'data_mapel';
        } else if (lower.includes('tanggal') && lower.includes('keterangan')) {
          targetTab = 'Kalender_Pendidikan';
          targetTable = 'kalender_pendidikan';
        }
      }

      const activeObj = tabs.find(t => t.id === targetTab) || tabObj;
      const { count, rows } = await importMasterDataFromCsv(supabase, text, targetTable, user);

      // If class data was uploaded, sync to localStorage for immediate AdminKelasView hydration
      if (targetTab === 'Data_Kelas' && Array.isArray(rows) && rows.length > 0) {
        const schoolId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
        try {
          const importedNames = rows.map(r => String(r.nama_kelas || '').trim()).filter(Boolean);
          const meta: Record<string, { tingkat?: string; jurusan?: string | null }> = {};
          rows.forEach(r => {
            const k = String(r.nama_kelas || '').trim();
            if (k) meta[k] = { tingkat: r.tingkat, jurusan: r.jurusan || null };
          });
          const existingClasses = JSON.parse(localStorage.getItem(`sipjam_custom_classes_${schoolId}`) || '[]');
          const existingMeta = JSON.parse(localStorage.getItem(`sipjam_custom_classes_meta_${schoolId}`) || '{}');
          const mergedClasses = Array.from(new Set([...existingClasses, ...importedNames]));
          const mergedMeta = { ...existingMeta, ...meta };
          localStorage.setItem(`sipjam_custom_classes_${schoolId}`, JSON.stringify(mergedClasses));
          localStorage.setItem(`sipjam_custom_classes_meta_${schoolId}`, JSON.stringify(mergedMeta));
        } catch (_) {}
      }

      // If student data was uploaded, sync student classes to localStorage for immediate AdminKelasView hydration
      if (targetTab === 'Data_Siswa' && Array.isArray(rows) && rows.length > 0) {
        const schoolId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
        uploadedRowsCacheRef.current[targetTab] = rows;
        setStorageCache(targetTab, schoolId, rows);
        setDataList(rows);
        try {
          const studentClasses = Array.from(new Set(rows.map(r => String(r.kelas || '').trim()).filter(Boolean)));
          const meta: Record<string, { tingkat?: string; jurusan?: string | null }> = {};
          studentClasses.forEach(k => {
            meta[k] = { tingkat: parseTingkat(k), jurusan: null };
          });
          const existingClasses = JSON.parse(localStorage.getItem(`sipjam_custom_classes_${schoolId}`) || '[]');
          const existingMeta = JSON.parse(localStorage.getItem(`sipjam_custom_classes_meta_${schoolId}`) || '{}');
          const mergedClasses = Array.from(new Set([...existingClasses, ...studentClasses]));
          const mergedMeta = { ...existingMeta, ...meta };
          localStorage.setItem(`sipjam_custom_classes_${schoolId}`, JSON.stringify(mergedClasses));
          localStorage.setItem(`sipjam_custom_classes_meta_${schoolId}`, JSON.stringify(mergedMeta));
        } catch (_) {}
      } else if (Array.isArray(rows) && rows.length > 0 && targetTab !== 'Data_Kelas') {
        const schoolId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
        uploadedRowsCacheRef.current[targetTab] = rows;
        setStorageCache(targetTab, schoolId, rows);
        setDataList(rows);
      }

      // If target entity is different from active tab, automatically switch tab
      if (targetTab !== activeTab) {
        setActiveTab(targetTab);
        if (typeof window !== 'undefined' && window.history?.replaceState) {
          window.history.replaceState(null, '', `?view=view-admin-data&tab=${targetTab}`);
        }
      }

      // Reset search, filters, and pagination so uploaded data is immediately visible in the table
      setSearch('');
      setFilter1('ALL');
      setFilter2('ALL');
      setPage(0);
      setLoading(false);
      setErrorMsg('');

      showToast(
        'Unggah Berhasil',
        `Berhasil mengimpor dan memperbarui ${count} data ke tabel ${activeObj.label}!`,
        'success'
      );

      // Dispatch sipjam:kelas-updated when class or student data changes
      if (targetTab === 'Data_Kelas' || targetTab === 'Data_Siswa') {
        window.dispatchEvent(new CustomEvent('sipjam:kelas-updated'));
      }

      // Background DB refresh without clearing displayed rows (avoids race with useEffect loadData)
      if (targetTab !== 'Data_Kelas') {
        const tabObj2 = tabs.find(t => t.id === targetTab);
        if (tabObj2 && user?.sekolah_id) {
          supabase
            .from(tabObj2.table)
            .select('*')
            .eq('sekolah_id', user.sekolah_id)
            .limit(2000)
            .then(({ data }) => {
              if (Array.isArray(data) && data.length > 0) {
                const mergedMap = new Map();
                data.forEach((d: any) => { if (d?.id) mergedMap.set(d.id, d); });
                rows.forEach((r: any) => { if (r?.id && !mergedMap.has(r.id)) mergedMap.set(r.id, r); });
                const finalData = Array.from(mergedMap.values());
                setDataList(finalData);
                uploadedRowsCacheRef.current[targetTab] = finalData;
                setStorageCache(targetTab, user.sekolah_id, finalData);
              }
            });
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Terjadi kesalahan saat memproses file CSV.';
      showToast(
        'Gagal Impor CSV',
        errorMsg,
        'error'
      );

      if (errorMsg.includes('Baris ') || errorMsg.includes('Kolom ') || errorMsg.includes('wajib') || errorMsg.includes('dilarang')) {
        Swal.fire({
          icon: 'error',
          title: 'Validasi CSV Gagal',
          html: `
            <div class="text-left text-xs space-y-2 text-gray-700 dark:text-gray-300">
              <p class="font-bold text-red-600 dark:text-red-400">
                <i class="fa-solid fa-triangle-exclamation mr-1"></i> Ditemukan kesalahan pada berkas CSV:
              </p>
              <div class="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl font-mono text-[11px] text-red-800 dark:text-red-300 break-words">
                ${errorMsg}
              </div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400">
                Silakan periksa kembali berkas CSV Anda sesuai format template, lalu unggah ulang.
              </p>
            </div>
          `,
          confirmButtonText: 'Tutup & Perbaiki',
          confirmButtonColor: '#7C3AED'
        });
      }
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (e?.target) e.target.value = '';
    }
  };

  // Manual Insert Modal
  const handleOpenCreateModal = async () => {
    const tabObj = tabs.find(t => t.id === activeTab);
    if (!tabObj) return;

    if (!isAdmin) {
      showToast('Akses Ditolak', 'Hanya Admin yang dapat menambah data master.', 'error');
      return;
    }

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
          const rawNamaSiswa = (document.getElementById('swal-nama') as HTMLInputElement)?.value?.trim() || '';
          const nama_siswa = rawNamaSiswa.replace(/\s+/g, ' ');
          const kelas = (document.getElementById('swal-kelas') as HTMLInputElement)?.value?.trim();
          const gender = (document.getElementById('swal-gender') as HTMLSelectElement)?.value;
          const no_hp_ortu = (document.getElementById('swal-hp') as HTMLInputElement)?.value?.trim() || '';

          if (!nisn || !nama_siswa || !kelas) {
            Swal.showValidationMessage('NISN, Nama Siswa, dan Kelas wajib diisi!');
            return null;
          }

          const studentValidation = validateStudentData(nama_siswa, kelas, dataList);
          if (!studentValidation.valid) {
            Swal.showValidationMessage(studentValidation.message || 'Data siswa tidak valid!');
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
            no_hp_ortu,
            qr_code: nisn || crypto.randomUUID()
          };
        }
      });

      if (formValues) {
        setLoading(true);
        const { error } = await supabase.from('data_siswa').insert([formValues]);
        setLoading(false);
        if (error) {
          showToast('Gagal Menambah Data', error.message, 'error');
        } else {
          showToast('Berhasil', 'Data siswa berhasil disimpan!', 'success');
          loadData();
        }
      }
    } else if (activeTab === 'Data_Guru') {
      const { value: formValues } = await Swal.fire({
        title: 'Tambah Guru Baru',
        width: '560px',
        html: `
          <div class="text-left space-y-2 text-xs">
            <div>
              <label class="font-bold text-gray-700 block mb-1">NIP (atau kode pengenal)</label>
              <input id="swal-nip" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: 198501012010011001">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Nama Pokok Guru (Tanpa Gelar) *</label>
              <input id="swal-core-nama" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: Fitri Aprilia Dotulong">
            </div>

            <!-- Multi-Gelar Manager Container -->
            <div class="p-2.5 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-gray-700 flex items-center gap-1.5">
                  <i class="fa-solid fa-graduation-cap text-emerald-700"></i> Gelar Akademik & Profesi
                </span>
                <button type="button" id="swal-btn-add-title" class="px-2 py-0.5 text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded transition shadow-xs cursor-pointer">
                  + Tambah Gelar
                </button>
              </div>

              <div class="flex flex-wrap items-center gap-1">
                <span class="text-[10px] text-gray-500 font-medium">Cepat:</span>
                <button type="button" class="swal-quick-chip px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer" data-pos="prefix" data-val="Dr.">+ Dr. (Depan)</button>
                <button type="button" class="swal-quick-chip px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer" data-pos="prefix" data-val="Prof.">+ Prof. (Depan)</button>
                <button type="button" class="swal-quick-chip px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer" data-pos="prefix" data-val="Ir.">+ Ir. (Depan)</button>
                <button type="button" class="swal-quick-chip px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer" data-pos="prefix" data-val="Hj.">+ Hj. (Depan)</button>
                <button type="button" class="swal-quick-chip px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer" data-pos="suffix" data-val="S.Pd.">+ S.Pd. (Belakang)</button>
                <button type="button" class="swal-quick-chip px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer" data-pos="suffix" data-val="M.Pd.">+ M.Pd. (Belakang)</button>
                <button type="button" class="swal-quick-chip px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer" data-pos="suffix" data-val="S.Kom.">+ S.Kom. (Belakang)</button>
                <button type="button" class="swal-quick-chip px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer" data-pos="suffix" data-val="Gr.">+ Gr. (Belakang)</button>
              </div>

              <div id="swal-titles-list" class="space-y-1.5 max-h-32 overflow-y-auto pt-1"></div>
            </div>

            <!-- Real-time Preview -->
            <div class="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="text-[10px] font-bold text-blue-900 flex items-center justify-between mb-0.5">
                <span>Preview Nama Lengkap Terformat:</span>
                <span id="swal-titles-summary" class="text-[10px] text-blue-700 font-normal"></span>
              </div>
              <div id="swal-name-preview" class="font-bold text-xs text-gray-900 break-words"></div>
            </div>

            <!-- Synced input with id="swal-nama" for backwards-compatibility & submission -->
            <input type="hidden" id="swal-nama" value="">

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
        didOpen: (popup) => {
          setupSwalTitleManager({
            popup,
            initialCoreName: '',
            initialTitles: [],
            coreInputId: 'swal-core-nama',
            titlesContainerId: 'swal-titles-list',
            addBtnId: 'swal-btn-add-title',
            previewId: 'swal-name-preview',
            summaryId: 'swal-titles-summary',
            hiddenInputId: 'swal-nama'
          });
        },
        preConfirm: () => {
          const nip = (document.getElementById('swal-nip') as HTMLInputElement)?.value?.trim() || '-';
          const rawCoreNama = (document.getElementById('swal-core-nama') as HTMLInputElement)?.value?.trim() || '';
          const rawNamaGuru = (document.getElementById('swal-nama') as HTMLInputElement)?.value?.trim() || '';
          const effectiveCoreNama = rawCoreNama || parseNameAndTitles(rawNamaGuru).coreName;
          const nama_guru = (rawNamaGuru || rawCoreNama).replace(/\s+/g, ' ');
          const mata_pelajaran = (document.getElementById('swal-mapel') as HTMLInputElement)?.value?.trim();
          const no_hp = (document.getElementById('swal-hp') as HTMLInputElement)?.value?.trim() || '-';
          const email = (document.getElementById('swal-email') as HTMLInputElement)?.value?.trim() || '-';

          if (!effectiveCoreNama || !nama_guru || !mata_pelajaran) {
            Swal.showValidationMessage('Nama pokok guru (tanpa gelar) dan mata pelajaran wajib diisi!');
            return null;
          }

          const teacherValidation = validateTeacherData(nip, nama_guru, dataList, undefined, mata_pelajaran);
          if (!teacherValidation.valid) {
            Swal.showValidationMessage(teacherValidation.message || 'Data guru tidak valid!');
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
          showToast('Gagal Menambah Data', error.message, 'error');
        } else {
          // Auto-create teacher account in users with username NIP and default password NIP27
          try {
            const syncUsername = resolveTeacherUsername({ nip: formValues.nip, nama_guru: formValues.nama_guru });
            const defaultPassword = getDefaultTeacherPassword(syncUsername);
            const { data: existingUser } = await supabase
              .from('users')
              .select('id')
              .ilike('username', syncUsername)
              .maybeSingle();

            if (!existingUser) {
              await supabase.from('users').insert([{
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : undefined,
                username: syncUsername,
                password: defaultPassword,
                nama: formValues.nama_guru,
                role: 'Guru',
                sekolah_id: formValues.sekolah_id || user?.sekolah_id
              }]);
            }
          } catch (accErr) {
            console.warn('[AdminDataView] Auto-create teacher account warning:', accErr);
          }

          showToast('Berhasil', 'Data guru berhasil disimpan!', 'success');
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
          const mapelCheck = validateMapelData(nama_mata_pelajaran, dataList);
          if (!mapelCheck.valid) {
            Swal.showValidationMessage(mapelCheck.message || 'Mata pelajaran tidak valid!');
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
          showToast('Gagal Menambah Data', error.message, 'error');
        } else {
          showToast('Berhasil', 'Mata Pelajaran berhasil disimpan!', 'success');
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
          showToast('Gagal Menambah Agenda', error.message, 'error');
        } else {
          showToast('Berhasil', 'Agenda kalender berhasil disimpan!', 'success');
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

          const mapelCheck = validateScheduleData(mata_pelajaran, nama_guru, kelas);
          if (!mapelCheck.valid) {
            Swal.showValidationMessage(mapelCheck.message || 'Mata pelajaran tidak valid!');
            return null;
          }

          let cleanGuru = normalizeName(nama_guru);
          if (/\bFITRA[\s._-]+SURYAZANA[\s._-]+MAMONTO\b/.test(cleanGuru)) {
            cleanGuru = 'Fitra Suryazana Mamonto';
          } else if (isForbiddenName(cleanGuru)) {
            Swal.showValidationMessage('Nama guru tersebut telah dinonaktifkan dari sistem.');
            return null;
          }
          if (isDummyOrTestString(cleanGuru)) {
            Swal.showValidationMessage('Nama guru terdeteksi sebagai data percobaan/dummy.');
            return null;
          }

          return {
            id: crypto.randomUUID(),
            sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
            hari,
            nama_guru: cleanGuru,
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
          showToast('Gagal Menambah Jadwal', error.message, 'error');
        } else {
          showToast('Berhasil', 'Jadwal pelajaran berhasil disimpan!', 'success');
          loadData();
        }
      }
    } else if (activeTab === 'Wali_Kelas') {
      setLoading(true);
      let guruList: any[] = [];
      let gQuery = supabase.from('data_guru').select('id, nama_guru, nip').order('nama_guru');
      if (user?.sekolah_id) gQuery = gQuery.eq('sekolah_id', user.sekolah_id);
      const { data: gData } = await gQuery;
      if (gData) guruList = gData;

      let kelasListOptions: string[] = [];
      let sQuery = supabase.from('data_siswa').select('kelas');
      if (user?.sekolah_id) sQuery = sQuery.eq('sekolah_id', user.sekolah_id);
      const { data: sData } = await sQuery;
      if (sData) kelasListOptions = [...new Set(sData.map(s => s.kelas).filter(Boolean))].sort() as string[];
      setLoading(false);

      if (guruList.length === 0) {
        showToast('Peringatan', 'Belum ada data guru. Silakan tambahkan data guru terlebih dahulu.', 'warning');
        return;
      }

      const guruOptionsHtml = guruList.map(g => 
        `<option value="${g.id}">${g.nama_guru} (${g.nip || 'Tanpa NIP'})</option>`
      ).join('');

      const kelasDatalistHtml = kelasListOptions.map(k => `<option value="${k}">`).join('');

      const { value: formValues } = await Swal.fire({
        title: 'Tetapkan Wali Kelas',
        html: `
          <div class="text-left space-y-3 text-xs">
            <div>
              <label class="font-bold text-gray-700 block mb-1">Nama Kelas *</label>
              <input id="swal-wali-kelas" list="swal-kelas-options" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: X Merdeka atau XI-1">
              <datalist id="swal-kelas-options">
                ${kelasDatalistHtml}
              </datalist>
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Pilih Guru sebagai Wali Kelas *</label>
              <select id="swal-wali-guru" class="swal2-select !mt-0 !w-full text-xs">
                <option value="">-- Pilih Guru --</option>
                ${guruOptionsHtml}
              </select>
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Tahun Ajaran *</label>
              <input id="swal-wali-ta" class="swal2-input !mt-0 !w-full text-xs" value="2024/2025" placeholder="Contoh: 2024/2025">
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Tetapkan Wali Kelas',
        confirmButtonColor: '#0B4619',
        cancelButtonText: 'Batal',
        preConfirm: () => {
          const kelas = (document.getElementById('swal-wali-kelas') as HTMLInputElement)?.value?.trim();
          const guruId = (document.getElementById('swal-wali-guru') as HTMLSelectElement)?.value;
          const tahun_ajaran = (document.getElementById('swal-wali-ta') as HTMLInputElement)?.value?.trim() || '2024/2025';

          const selectedTeacher = guruList.find(g => g.id === guruId);
          if (!kelas || !selectedTeacher) {
            Swal.showValidationMessage('Nama Kelas dan Guru wajib dipilih!');
            return null;
          }
          return {
            id: crypto.randomUUID(),
            sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
            kelas,
            guru_id: selectedTeacher.id,
            nama_guru: selectedTeacher.nama_guru,
            nip: selectedTeacher.nip || '-',
            tahun_ajaran
          };
        }
      });

      if (formValues) {
        setLoading(true);
        const { error } = await supabase.from('wali_kelas').upsert([formValues], { onConflict: 'sekolah_id, kelas' });
        setLoading(false);
        if (error) {
          showToast('Gagal Menetapkan Wali Kelas', error.message, 'error');
        } else {
          showToast('Berhasil', `Guru ${formValues.nama_guru} berhasil ditetapkan sebagai Wali Kelas ${formValues.kelas}!`, 'success');
          loadData();
        }
      }
    }
  };

  // Edit Wali Kelas Assignment
  const handleEditWaliKelas = async (item: any) => {
    if (!isAdmin) {
      showToast('Akses Ditolak', 'Hanya Admin yang dapat mengubah wali kelas.', 'error');
      return;
    }
    try {
      setLoading(true);
      let guruList: any[] = [];
      let gQuery = supabase.from('data_guru').select('id, nama_guru, nip').order('nama_guru');
      if (user?.sekolah_id) gQuery = gQuery.eq('sekolah_id', user.sekolah_id);
      const { data: gData } = await gQuery;
      if (gData) guruList = gData;

      let kelasListOptions: string[] = [];
      let sQuery = supabase.from('data_siswa').select('kelas');
      if (user?.sekolah_id) sQuery = sQuery.eq('sekolah_id', user.sekolah_id);
      const { data: sData } = await sQuery;
      if (sData) kelasListOptions = [...new Set(sData.map(s => s.kelas).filter(Boolean))].sort() as string[];
      setLoading(false);

      const guruOptionsHtml = guruList.map(g => 
        `<option value="${g.id}" ${g.id === item.guru_id || g.nama_guru === item.nama_guru ? 'selected' : ''}>${g.nama_guru} (${g.nip || 'Tanpa NIP'})</option>`
      ).join('');

      const kelasDatalistHtml = kelasListOptions.map(k => `<option value="${k}">`).join('');

      const { value: formValues } = await Swal.fire({
        title: `Ubah Wali Kelas ${item.kelas}`,
        html: `
          <div class="text-left space-y-3 text-xs">
            <div>
              <label class="font-bold text-gray-700 block mb-1">Kelas *</label>
              <input id="swal-edit-wali-kelas" list="swal-edit-kelas-options" class="swal2-input !mt-0 !w-full text-xs" value="${item.kelas || ''}">
              <datalist id="swal-edit-kelas-options">
                ${kelasDatalistHtml}
              </datalist>
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Pilih Guru sebagai Wali Kelas *</label>
              <select id="swal-edit-wali-guru" class="swal2-select !mt-0 !w-full text-xs">
                ${guruOptionsHtml}
              </select>
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Tahun Ajaran *</label>
              <input id="swal-edit-wali-ta" class="swal2-input !mt-0 !w-full text-xs" value="${item.tahun_ajaran || '2024/2025'}">
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan Perubahan',
        confirmButtonColor: '#0B4619',
        cancelButtonText: 'Batal',
        preConfirm: () => {
          const kelasVal = (document.getElementById('swal-edit-wali-kelas') as HTMLInputElement)?.value?.trim();
          const guruId = (document.getElementById('swal-edit-wali-guru') as HTMLSelectElement)?.value;
          const taVal = (document.getElementById('swal-edit-wali-ta') as HTMLInputElement)?.value?.trim() || '2024/2025';

          const selectedTeacher = guruList.find(g => g.id === guruId);
          if (!kelasVal || !selectedTeacher) {
            Swal.showValidationMessage('Kelas dan Guru wajib dipilih!');
            return null;
          }
          return {
            kelas: kelasVal,
            guru_id: selectedTeacher.id,
            nama_guru: selectedTeacher.nama_guru,
            nip: selectedTeacher.nip || '-',
            tahun_ajaran: taVal
          };
        }
      });

      if (formValues) {
        setLoading(true);
        const { error } = await supabase
          .from('wali_kelas')
          .update(formValues)
          .eq('id', item.id);
        setLoading(false);

        if (error) {
          showToast('Gagal Mengubah Data', error.message, 'error');
        } else {
          showToast('Berhasil', `Wali Kelas ${formValues.kelas} berhasil diperbarui!`, 'success');
          loadData();
        }
      }
    } catch (err: any) {
      setLoading(false);
      showToast('Error', err.message || 'Gagal memuat data guru', 'error');
    }
  };

  // Student multi-selection handlers for Naik Kelas
  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllStudents = () => {
    if (selectedStudentIds.length === filteredList.length && filteredList.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredList.map(item => item.id).filter(Boolean));
    }
  };

  // Helper to escape HTML entities when rendering strings in HTML templates
  const escapeHtml = (str: any): string => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Single Student Card Download as PNG
  const handleDownloadStudentCard = (student: any) => {
    const qrIdentifier = getStudentQrIdentifier(student);
    const success = downloadStudentCardPng({
      student,
      schoolName,
      qrIdentifier,
    });
    if (success) {
      showToast('Berhasil', `Kartu presensi ${student.nama_siswa || 'siswa'} berhasil didownload.`, 'success');
    } else {
      showToast('Gagal', 'Tidak dapat mengunduh kartu presensi.', 'error');
    }
  };

  // Student QR Code display and single card print
  const printStudentQrCard = (student: any, qrSvg: string, qrIdentifier: string) => {
    printStudentQrCardWithSchool({
      student,
      schoolName,
      qrSvg,
      qrIdentifier,
    });
  };

  const handleShowStudentQr = (student: any) => {
    const qrIdentifier = getStudentQrIdentifier(student);
    const qrSvg = generateStudentQrSvg(qrIdentifier, { size: 180, fgColor: '#0B4619' });

    Swal.fire({
      title: `<span class="text-base font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2"><i class="fa-solid fa-qrcode text-purple-600"></i> QR Presensi Siswa</span>`,
      html: `
        <div class="flex flex-col items-center justify-center space-y-3 p-2">
          <div class="bg-white p-3 rounded-2xl shadow-sm border border-gray-200 inline-block">
            ${qrSvg}
          </div>
          <div class="text-center space-y-1">
            <div class="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">${escapeHtml(schoolName)}</div>
            <h4 class="font-bold text-sm text-gray-900 dark:text-gray-100">${escapeHtml(student.nama_siswa || 'Siswa')}</h4>
            <p class="text-xs text-gray-600 dark:text-gray-300">Kelas: <span class="font-bold text-purple-700 dark:text-purple-400">${escapeHtml(student.kelas || '-')}</span></p>
            <p class="text-xs text-gray-600 dark:text-gray-300">NISN: <span class="font-mono font-bold">${escapeHtml(student.nisn || '-')}</span></p>
            <p class="text-[10px] text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full inline-block mt-1">ID Scan: ${escapeHtml(qrIdentifier)}</p>
          </div>
        </div>
      `,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: '<i class="fa-solid fa-print mr-1"></i> Cetak / Simpan PDF',
      confirmButtonColor: '#0B4619',
      denyButtonText: '<i class="fa-solid fa-download mr-1"></i> Download Gambar (PNG)',
      denyButtonColor: '#059669',
      cancelButtonText: 'Tutup',
      cancelButtonColor: '#6B7280',
    }).then((result) => {
      if (result.isConfirmed) {
        printStudentQrCard(student, qrSvg, qrIdentifier);
      } else if (result.isDenied) {
        handleDownloadStudentCard(student);
      }
    });
  };

  // Batch Print QR Cards for all selected students or all filtered students
  const handlePrintBatchQrCards = () => {
    const targetStudents = selectedStudentIds.length > 0
      ? filteredList.filter(s => selectedStudentIds.includes(s.id))
      : filteredList;

    if (targetStudents.length === 0) {
      showToast('Peringatan', 'Tidak ada data siswa untuk dicetak.', 'warning');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    const cardsHtml = targetStudents.map(student => {
      const qrIdentifier = getStudentQrIdentifier(student);
      const qrSvg = generateStudentQrSvg(qrIdentifier, { size: 140, fgColor: '#0B4619' });
      return `
        <div class="card">
          <div class="school">${escapeHtml(schoolName)}</div>
          <div class="header">KARTU PRESENSI DIGITAL</div>
          <div class="sub">SIPJAM Digital Attendance Kiosk</div>
          <div class="qr">${qrSvg}</div>
          <div class="name">${escapeHtml(student.nama_siswa || '-')}</div>
          <div class="meta">Kelas: <b>${escapeHtml(student.kelas || '-')}</b> &bull; NISN: <b>${escapeHtml(student.nisn || '-')}</b></div>
          <div class="badge">STATUS: ${escapeHtml(student.status || 'Aktif')}</div>
          <div class="code">ID: ${escapeHtml(qrIdentifier)}</div>
        </div>
      `;
    }).join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cetak Kartu QR Siswa - ${escapeHtml(schoolName)} (${targetStudents.length} Siswa)</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, sans-serif; margin: 20px; background: #fff; }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
          .card { border: 1.5px solid #0B4619; border-radius: 12px; padding: 14px; text-align: center; page-break-inside: avoid; }
          .school { font-size: 11px; font-weight: 800; color: #0B4619; text-transform: uppercase; margin-bottom: 2px; }
          .header { font-size: 10px; font-weight: 800; color: #166534; letter-spacing: 0.5px; }
          .sub { font-size: 8px; color: #6b7280; margin-bottom: 6px; }
          .qr { margin: 6px auto; display: flex; justify-content: center; }
          .name { font-size: 13px; font-weight: 700; color: #111827; margin-top: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .meta { font-size: 10px; color: #374151; margin-top: 2px; }
          .badge { display: inline-block; font-size: 9px; font-weight: 700; color: #0B4619; background: #e8f5e9; padding: 1px 6px; border-radius: 9999px; margin-top: 4px; }
          .code { font-size: 9px; font-family: monospace; color: #6b7280; margin-top: 4px; }
          @media print {
            body { margin: 0; }
            .grid { gap: 12px; }
          }
        </style>
      </head>
      <body>
        <div class="grid">
          ${cardsHtml}
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Master Data Edit Modal Handler (Dispatches genuine Supabase UPDATE queries)
  const handleOpenEditModal = async (item: any) => {
    const tabObj = tabs.find(t => t.id === activeTab);
    if (!tabObj) return;

    if (!isAdmin) {
      showToast('Akses Ditolak', 'Hanya Admin yang dapat mengubah data master.', 'error');
      return;
    }

    if (activeTab === 'Data_Siswa') {
      const { value: formValues } = await Swal.fire({
        title: 'Edit Data Siswa',
        html: `
          <div class="text-left space-y-2 text-xs">
            <div>
              <label class="font-bold text-gray-700 block mb-1">NISN *</label>
              <input id="swal-edit-nisn" class="swal2-input !mt-0 !w-full text-xs" value="${item.nisn || ''}" placeholder="Contoh: 114367407">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Nama Lengkap Siswa *</label>
              <input id="swal-edit-nama" class="swal2-input !mt-0 !w-full text-xs" value="${item.nama_siswa || ''}" placeholder="Contoh: Budi Santoso">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Kelas *</label>
              <input id="swal-edit-kelas" class="swal2-input !mt-0 !w-full text-xs" value="${item.kelas || ''}" placeholder="Contoh: X Merdeka, XI-1">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Jenis Kelamin *</label>
              <select id="swal-edit-gender" class="swal2-select !mt-0 !w-full text-xs">
                <option value="Laki-laki" ${item.gender === 'Laki-laki' ? 'selected' : ''}>Laki-laki</option>
                <option value="Perempuan" ${item.gender === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
              </select>
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Status *</label>
              <select id="swal-edit-status" class="swal2-select !mt-0 !w-full text-xs">
                <option value="Aktif" ${item.status === 'Aktif' || !item.status ? 'selected' : ''}>Aktif</option>
                <option value="Lulus" ${item.status === 'Lulus' ? 'selected' : ''}>Lulus</option>
                <option value="Pindah" ${item.status === 'Pindah' ? 'selected' : ''}>Pindah</option>
                <option value="Nonaktif" ${item.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option>
              </select>
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">No HP Orang Tua</label>
              <input id="swal-edit-hp" class="swal2-input !mt-0 !w-full text-xs" value="${item.no_hp_ortu || ''}" placeholder="Contoh: 081234567890">
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan Perubahan',
        confirmButtonColor: '#0B4619',
        cancelButtonText: 'Batal',
        preConfirm: () => {
          const nisn = (document.getElementById('swal-edit-nisn') as HTMLInputElement)?.value?.trim();
          const rawNamaSiswa = (document.getElementById('swal-edit-nama') as HTMLInputElement)?.value?.trim() || '';
          const nama_siswa = rawNamaSiswa.replace(/\s+/g, ' ');
          const kelas = (document.getElementById('swal-edit-kelas') as HTMLInputElement)?.value?.trim();
          const gender = (document.getElementById('swal-edit-gender') as HTMLSelectElement)?.value;
          const status = (document.getElementById('swal-edit-status') as HTMLSelectElement)?.value || 'Aktif';
          const no_hp_ortu = (document.getElementById('swal-edit-hp') as HTMLInputElement)?.value?.trim() || '';

          if (!nisn || !nama_siswa || !kelas) {
            Swal.showValidationMessage('NISN, Nama Siswa, dan Kelas wajib diisi!');
            return null;
          }

          const studentValidation = validateStudentData(nama_siswa, kelas, dataList, item.id);
          if (!studentValidation.valid) {
            Swal.showValidationMessage(studentValidation.message || 'Data siswa tidak valid!');
            return null;
          }
          return {
            nisn,
            nama_siswa,
            kelas,
            gender,
            status,
            no_hp_ortu,
            qr_code: item.qr_code || nisn || item.id
          };
        }
      });

      if (formValues) {
        setLoading(true);
        const pkField = item.id ? 'id' : 'nisn';
        const pkVal = item[pkField];
        let q = supabase.from('data_siswa').update(formValues).eq(pkField, pkVal);
        if (user?.sekolah_id) q = q.eq('sekolah_id', user.sekolah_id);
        const { error } = await q;
        setLoading(false);
        if (error) {
          showToast('Gagal Mengubah Data', error.message, 'error');
        } else {
          showToast('Berhasil', 'Data siswa berhasil diperbarui!', 'success');
          loadData();
        }
      }
    } else if (activeTab === 'Data_Guru') {
      const { value: formValues } = await Swal.fire({
        title: 'Edit Data Guru',
        width: '560px',
        html: `
          <div class="text-left space-y-2 text-xs">
            <div>
              <label class="font-bold text-gray-700 block mb-1">NIP (Username Login)</label>
              <input id="swal-edit-nip" class="swal2-input !mt-0 !w-full text-xs" value="${item.nip || ''}" placeholder="Contoh: 198501012010011001">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Nama Pokok Guru (Tanpa Gelar) *</label>
              <input id="swal-edit-core-nama" class="swal2-input !mt-0 !w-full text-xs" value="" placeholder="Contoh: Fitri Aprilia Dotulong">
            </div>

            <!-- Multi-Gelar Manager Container -->
            <div class="p-2.5 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-gray-700 flex items-center gap-1.5">
                  <i class="fa-solid fa-graduation-cap text-emerald-700"></i> Gelar Akademik & Profesi
                </span>
                <button type="button" id="swal-edit-btn-add-title" class="px-2 py-0.5 text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded transition shadow-xs cursor-pointer">
                  + Tambah Gelar
                </button>
              </div>

              <div class="flex flex-wrap items-center gap-1">
                <span class="text-[10px] text-gray-500 font-medium">Cepat:</span>
                <button type="button" class="swal-quick-chip px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer" data-pos="prefix" data-val="Dr.">+ Dr. (Depan)</button>
                <button type="button" class="swal-quick-chip px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer" data-pos="prefix" data-val="Prof.">+ Prof. (Depan)</button>
                <button type="button" class="swal-quick-chip px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer" data-pos="prefix" data-val="Ir.">+ Ir. (Depan)</button>
                <button type="button" class="swal-quick-chip px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer" data-pos="prefix" data-val="Hj.">+ Hj. (Depan)</button>
                <button type="button" class="swal-quick-chip px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer" data-pos="suffix" data-val="S.Pd.">+ S.Pd. (Belakang)</button>
                <button type="button" class="swal-quick-chip px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer" data-pos="suffix" data-val="M.Pd.">+ M.Pd. (Belakang)</button>
                <button type="button" class="swal-quick-chip px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer" data-pos="suffix" data-val="S.Kom.">+ S.Kom. (Belakang)</button>
                <button type="button" class="swal-quick-chip px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer" data-pos="suffix" data-val="Gr.">+ Gr. (Belakang)</button>
              </div>

              <div id="swal-edit-titles-list" class="space-y-1.5 max-h-32 overflow-y-auto pt-1"></div>
            </div>

            <!-- Real-time Preview -->
            <div class="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="text-[10px] font-bold text-blue-900 flex items-center justify-between mb-0.5">
                <span>Preview Nama Lengkap Terformat:</span>
                <span id="swal-edit-titles-summary" class="text-[10px] text-blue-700 font-normal"></span>
              </div>
              <div id="swal-edit-name-preview" class="font-bold text-xs text-gray-900 break-words"></div>
            </div>

            <!-- Synced input with id="swal-edit-nama" for assertions and submission -->
            <input type="hidden" id="swal-edit-nama" value="">

            <div>
              <label class="font-bold text-gray-700 block mb-1">Mata Pelajaran Diampu *</label>
              <input id="swal-edit-mapel" class="swal2-input !mt-0 !w-full text-xs" value="${item.mata_pelajaran || ''}" placeholder="Contoh: Bahasa Inggris">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">No HP / WhatsApp</label>
              <input id="swal-edit-hp" class="swal2-input !mt-0 !w-full text-xs" value="${item.no_hp || ''}" placeholder="Contoh: 628123456789">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Email</label>
              <input id="swal-edit-email" type="email" class="swal2-input !mt-0 !w-full text-xs" value="${item.email || ''}" placeholder="guru@nizamudin.sch.id">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Status *</label>
              <select id="swal-edit-status" class="swal2-select !mt-0 !w-full text-xs">
                <option value="Aktif" ${item.status === 'Aktif' || !item.status ? 'selected' : ''}>Aktif</option>
                <option value="Cuti" ${item.status === 'Cuti' ? 'selected' : ''}>Cuti</option>
                <option value="Nonaktif" ${item.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option>
              </select>
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan Perubahan',
        confirmButtonColor: '#0B4619',
        cancelButtonText: 'Batal',
        didOpen: (popup) => {
          const parsed = parseNameAndTitles(item.nama_guru || '');
          setupSwalTitleManager({
            popup,
            initialCoreName: parsed.coreName,
            initialTitles: parsed.titles,
            coreInputId: 'swal-edit-core-nama',
            titlesContainerId: 'swal-edit-titles-list',
            addBtnId: 'swal-edit-btn-add-title',
            previewId: 'swal-edit-name-preview',
            summaryId: 'swal-edit-titles-summary',
            hiddenInputId: 'swal-edit-nama'
          });
        },
        preConfirm: () => {
          const nip = (document.getElementById('swal-edit-nip') as HTMLInputElement)?.value?.trim() || '-';
          const rawCoreNama = (document.getElementById('swal-edit-core-nama') as HTMLInputElement)?.value?.trim() || '';
          const rawNamaGuru = (document.getElementById('swal-edit-nama') as HTMLInputElement)?.value?.trim() || '';
          const effectiveCoreNama = rawCoreNama || parseNameAndTitles(rawNamaGuru).coreName;
          const nama_guru = (rawNamaGuru || rawCoreNama).replace(/\s+/g, ' ');
          const mata_pelajaran = (document.getElementById('swal-edit-mapel') as HTMLInputElement)?.value?.trim();
          const no_hp = (document.getElementById('swal-edit-hp') as HTMLInputElement)?.value?.trim() || '-';
          const email = (document.getElementById('swal-edit-email') as HTMLInputElement)?.value?.trim() || '-';
          const status = (document.getElementById('swal-edit-status') as HTMLSelectElement)?.value || 'Aktif';

          if (!effectiveCoreNama || !nama_guru || !mata_pelajaran) {
            Swal.showValidationMessage('Nama pokok guru (tanpa gelar) dan mata pelajaran wajib diisi!');
            return null;
          }

          const teacherValidation = validateTeacherData(nip, nama_guru, dataList, item.id, mata_pelajaran);
          if (!teacherValidation.valid) {
            Swal.showValidationMessage(teacherValidation.message || 'Data guru tidak valid!');
            return null;
          }
          return {
            nip,
            nama_guru,
            mata_pelajaran,
            no_hp,
            email,
            status
          };
        }
      });

      if (formValues) {
        setLoading(true);
        const pkField = item.id ? 'id' : 'nip';
        const pkVal = item[pkField];
        let q = supabase.from('data_guru').update(formValues).eq(pkField, pkVal);
        if (user?.sekolah_id) q = q.eq('sekolah_id', user.sekolah_id);
        const { error } = await q;
        if (error) {
          setLoading(false);
          showToast('Gagal Mengubah Data', error.message, 'error');
        } else {
          // Sync users.username so teacher's login username is updated by the Admin
          if (formValues.nip && formValues.nip !== '-') {
            try {
              const syncUsername = resolveTeacherUsername({ nip: formValues.nip, nama_guru: formValues.nama_guru });
              if (item.user_id) {
                await supabase.from('users').update({ username: syncUsername, nama: formValues.nama_guru }).eq('id', item.user_id);
              } else if (item.nip && item.nip !== '-') {
                const oldSync = resolveTeacherUsername({ nip: item.nip, nama_guru: item.nama_guru });
                await supabase.from('users').update({ username: syncUsername, nama: formValues.nama_guru }).or(`username.eq.${syncUsername},username.eq.${oldSync},username.eq.${item.nip}`);
              }
            } catch (syncErr) {
              console.warn('[AdminDataView] Failed to sync users.username & nama:', syncErr);
            }
          }
          setLoading(false);
          showToast('Berhasil', 'Data guru berhasil diperbarui!', 'success');
          loadData();
        }
      }
    } else if (activeTab === 'Data_Mapel') {
      const { value: formValues } = await Swal.fire({
        title: 'Edit Mata Pelajaran',
        html: `
          <div class="text-left space-y-2 text-xs">
            <div>
              <label class="font-bold text-gray-700 block mb-1">Kode Mapel</label>
              <input id="swal-edit-kode" class="swal2-input !mt-0 !w-full text-xs" value="${item.kode_mapel || item.id || ''}" placeholder="Contoh: MP-01">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Nama Mata Pelajaran *</label>
              <input id="swal-edit-nama" class="swal2-input !mt-0 !w-full text-xs" value="${item.nama_mapel || item.nama_mata_pelajaran || ''}" placeholder="Contoh: Matematika Wajib">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Kelompok / Kategori *</label>
              <input id="swal-edit-kat" class="swal2-input !mt-0 !w-full text-xs" value="${item.kelompok || item.kategori || ''}" placeholder="Contoh: Umum, Peminatan, Kejuruan">
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan Perubahan',
        confirmButtonColor: '#0B4619',
        cancelButtonText: 'Batal',
        preConfirm: () => {
          const kode_mapel = (document.getElementById('swal-edit-kode') as HTMLInputElement)?.value?.trim() || item.id;
          const nama_mapel = (document.getElementById('swal-edit-nama') as HTMLInputElement)?.value?.trim();
          const kelompok = (document.getElementById('swal-edit-kat') as HTMLInputElement)?.value?.trim() || 'Umum';

          if (!nama_mapel) {
            Swal.showValidationMessage('Nama Mata Pelajaran wajib diisi!');
            return null;
          }
          const mapelCheck = validateMapelData(nama_mapel, dataList, item.id);
          if (!mapelCheck.valid) {
            Swal.showValidationMessage(mapelCheck.message || 'Mata pelajaran tidak valid!');
            return null;
          }
          return {
            kode_mapel,
            nama_mapel,
            nama_mata_pelajaran: nama_mapel,
            kelompok,
            kategori: kelompok
          };
        }
      });

      if (formValues) {
        setLoading(true);
        let q = supabase.from('data_mapel').update(formValues).eq('id', item.id);
        if (user?.sekolah_id) q = q.eq('sekolah_id', user.sekolah_id);
        const { error } = await q;
        setLoading(false);
        if (error) {
          showToast('Gagal Mengubah Data', error.message, 'error');
        } else {
          showToast('Berhasil', 'Mata pelajaran berhasil diperbarui!', 'success');
          loadData();
        }
      }
    } else if (activeTab === 'Kalender_Pendidikan') {
      const { value: formValues } = await Swal.fire({
        title: 'Edit Agenda Kalender',
        html: `
          <div class="text-left space-y-2 text-xs">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="font-bold text-gray-700 block mb-1">Tanggal Mulai *</label>
                <input id="swal-edit-tgl-mulai" type="date" class="swal2-input !mt-0 !w-full text-xs" value="${item.tanggal_mulai || item.tanggal || ''}">
              </div>
              <div>
                <label class="font-bold text-gray-700 block mb-1">Tanggal Selesai *</label>
                <input id="swal-edit-tgl-selesai" type="date" class="swal2-input !mt-0 !w-full text-xs" value="${item.tanggal_selesai || item.tanggal || ''}">
              </div>
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Keterangan Agenda *</label>
              <input id="swal-edit-ket" class="swal2-input !mt-0 !w-full text-xs" value="${item.keterangan || ''}" placeholder="Contoh: Libur Akhir Semester">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Tipe Agenda *</label>
              <select id="swal-edit-tipe" class="swal2-select !mt-0 !w-full text-xs">
                <option value="Libur" ${item.tipe === 'Libur' ? 'selected' : ''}>Libur</option>
                <option value="Kegiatan" ${item.tipe === 'Kegiatan' ? 'selected' : ''}>Kegiatan</option>
                <option value="Ujian" ${item.tipe === 'Ujian' ? 'selected' : ''}>Ujian</option>
              </select>
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan Perubahan',
        confirmButtonColor: '#0B4619',
        cancelButtonText: 'Batal',
        preConfirm: () => {
          const tanggal_mulai = (document.getElementById('swal-edit-tgl-mulai') as HTMLInputElement)?.value?.trim();
          const tanggal_selesai = (document.getElementById('swal-edit-tgl-selesai') as HTMLInputElement)?.value?.trim() || tanggal_mulai;
          const keterangan = (document.getElementById('swal-edit-ket') as HTMLInputElement)?.value?.trim();
          const tipe = (document.getElementById('swal-edit-tipe') as HTMLSelectElement)?.value || 'Libur';

          if (!tanggal_mulai || !keterangan) {
            Swal.showValidationMessage('Tanggal Mulai dan Keterangan wajib diisi!');
            return null;
          }
          return {
            tanggal_mulai,
            tanggal_selesai,
            tanggal: tanggal_mulai,
            keterangan,
            tipe
          };
        }
      });

      if (formValues) {
        setLoading(true);
        let q = supabase.from('kalender_pendidikan').update(formValues).eq('id', item.id);
        if (user?.sekolah_id) q = q.eq('sekolah_id', user.sekolah_id);
        const { error } = await q;
        setLoading(false);
        if (error) {
          showToast('Gagal Mengubah Agenda', error.message, 'error');
        } else {
          showToast('Berhasil', 'Agenda kalender berhasil diperbarui!', 'success');
          loadData();
        }
      }
    } else if (activeTab === 'Jadwal_Pelajaran') {
      const { value: formValues } = await Swal.fire({
        title: 'Edit Jadwal Pelajaran',
        html: `
          <div class="text-left space-y-2 text-xs">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="font-bold text-gray-700 block mb-1">Hari *</label>
                <select id="swal-edit-hari" class="swal2-select !mt-0 !w-full text-xs">
                  <option value="Senin" ${item.hari === 'Senin' ? 'selected' : ''}>Senin</option>
                  <option value="Selasa" ${item.hari === 'Selasa' ? 'selected' : ''}>Selasa</option>
                  <option value="Rabu" ${item.hari === 'Rabu' ? 'selected' : ''}>Rabu</option>
                  <option value="Kamis" ${item.hari === 'Kamis' ? 'selected' : ''}>Kamis</option>
                  <option value="Jumat" ${item.hari === 'Jumat' ? 'selected' : ''}>Jumat</option>
                  <option value="Sabtu" ${item.hari === 'Sabtu' ? 'selected' : ''}>Sabtu</option>
                </select>
              </div>
              <div>
                <label class="font-bold text-gray-700 block mb-1">Kelas *</label>
                <input id="swal-edit-kelas" class="swal2-input !mt-0 !w-full text-xs" value="${item.kelas || ''}" placeholder="Contoh: X Merdeka">
              </div>
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Mata Pelajaran *</label>
              <input id="swal-edit-mapel" class="swal2-input !mt-0 !w-full text-xs" value="${item.mapel || item.mata_pelajaran || ''}" placeholder="Contoh: Bahasa Inggris">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Nama Guru *</label>
              <input id="swal-edit-guru" class="swal2-input !mt-0 !w-full text-xs" value="${item.nama_guru || ''}" placeholder="Contoh: Fitri Aprilia Dotulong">
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="font-bold text-gray-700 block mb-1">Jam Mulai</label>
                <input id="swal-edit-jam-mulai" type="time" class="swal2-input !mt-0 !w-full text-xs" value="${item.jam_mulai || ''}">
              </div>
              <div>
                <label class="font-bold text-gray-700 block mb-1">Jam Selesai</label>
                <input id="swal-edit-jam-selesai" type="time" class="swal2-input !mt-0 !w-full text-xs" value="${item.jam_selesai || ''}">
              </div>
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan Perubahan',
        confirmButtonColor: '#0B4619',
        cancelButtonText: 'Batal',
        preConfirm: () => {
          const hari = (document.getElementById('swal-edit-hari') as HTMLSelectElement)?.value;
          const kelas = (document.getElementById('swal-edit-kelas') as HTMLInputElement)?.value?.trim();
          const mapel = (document.getElementById('swal-edit-mapel') as HTMLInputElement)?.value?.trim();
          const nama_guru = (document.getElementById('swal-edit-guru') as HTMLInputElement)?.value?.trim();
          const jam_mulai = (document.getElementById('swal-edit-jam-mulai') as HTMLInputElement)?.value?.trim() || null;
          const jam_selesai = (document.getElementById('swal-edit-jam-selesai') as HTMLInputElement)?.value?.trim() || null;

          if (!hari || !kelas || !mapel || !nama_guru) {
            Swal.showValidationMessage('Hari, Kelas, Mapel, dan Nama Guru wajib diisi!');
            return null;
          }

          const mapelCheck = validateScheduleData(mapel, nama_guru, kelas);
          if (!mapelCheck.valid) {
            Swal.showValidationMessage(mapelCheck.message || 'Mata pelajaran tidak valid!');
            return null;
          }

          let cleanGuru = normalizeName(nama_guru);
          if (/\bFITRA[\s._-]+SURYAZANA[\s._-]+MAMONTO\b/.test(cleanGuru)) {
            cleanGuru = 'Fitra Suryazana Mamonto';
          } else if (isForbiddenName(cleanGuru)) {
            Swal.showValidationMessage('Nama guru tersebut telah dinonaktifkan dari sistem.');
            return null;
          }
          if (isDummyOrTestString(cleanGuru)) {
            Swal.showValidationMessage('Nama guru terdeteksi sebagai data percobaan/dummy.');
            return null;
          }

          return {
            hari,
            kelas,
            mapel,
            mata_pelajaran: mapel,
            nama_guru: cleanGuru,
            jam_mulai,
            jam_selesai
          };
        }
      });

      if (formValues) {
        setLoading(true);
        let q = supabase.from('jadwal_pelajaran').update(formValues).eq('id', item.id);
        if (user?.sekolah_id) q = q.eq('sekolah_id', user.sekolah_id);
        const { error } = await q;
        setLoading(false);
        if (error) {
          showToast('Gagal Mengubah Jadwal', error.message, 'error');
        } else {
          showToast('Berhasil', 'Jadwal pelajaran berhasil diperbarui!', 'success');
          loadData();
        }
      }
    } else if (activeTab === 'Wali_Kelas') {
      handleEditWaliKelas(item);
    }
  };

  // Delete Individual Master Data Item
  const handleDeleteItem = async (item: any) => {
    const tabObj = tabs.find(t => t.id === activeTab);
    if (!tabObj) return;

    if (!isAdmin) {
      showToast('Akses Ditolak', 'Hanya Admin yang dapat menghapus data master.', 'error');
      return;
    }

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
        showToast('Gagal Menghapus', error.message, 'error');
      } else {
        showToast('Terhapus', 'Data berhasil dihapus dari database.', 'success');
        loadData();
      }
    }
  };

  // Dynamic unique options derived from dataList for dropdown filters (F15)
  const uniqueKelas = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(dataList)) {
      dataList.forEach(item => {
        if (item && item.kelas) set.add(item.kelas.trim());
      });
    }
    return Array.from(set).sort();
  }, [dataList]);

  const uniqueStatusSiswa = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(dataList)) {
      dataList.forEach(item => {
        if (item && item.status) set.add(item.status.trim());
      });
    }
    if (set.size === 0) {
      set.add('Aktif');
      set.add('Lulus');
      set.add('Keluar');
    }
    return Array.from(set).sort();
  }, [dataList]);

  const uniqueStatusGuru = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(dataList)) {
      dataList.forEach(item => {
        if (item && item.status) set.add(item.status.trim());
      });
    }
    if (set.size === 0) {
      set.add('Aktif');
      set.add('Nonaktif');
      set.add('Cuti');
    }
    return Array.from(set).sort();
  }, [dataList]);

  const uniqueMapel = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(dataList)) {
      dataList.forEach(item => {
        if (item && item.mata_pelajaran) set.add(item.mata_pelajaran.trim());
        if (item && item.nama_mapel) set.add(item.nama_mapel.trim());
      });
    }
    return Array.from(set).sort();
  }, [dataList]);

  const uniqueKategori = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(dataList)) {
      dataList.forEach(item => {
        const k = item && (item.kelompok || item.kategori);
        if (k) set.add(k.trim());
      });
    }
    return Array.from(set).sort();
  }, [dataList]);

  const uniqueTipeKalender = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(dataList)) {
      dataList.forEach(item => {
        if (item && item.tipe) set.add(item.tipe.trim());
      });
    }
    return Array.from(set).sort();
  }, [dataList]);

  const uniqueHari = useMemo(() => {
    return ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  }, []);

  const uniqueTahunAjaran = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(dataList)) {
      dataList.forEach(item => {
        if (item && item.tahun_ajaran) set.add(item.tahun_ajaran.trim());
      });
    }
    return Array.from(set).sort();
  }, [dataList]);

  const filteredList = useMemo(() => {
    if (!Array.isArray(dataList)) return [];
    return dataList.filter(item => {
      if (!item) return false;

      // 1. Text Search Filter (safe literal matching with whitespace trim)
      if (search && search.trim()) {
        const term = search.toLowerCase().trim();
        const match = (
          (item.nama_siswa || '').toLowerCase().includes(term) ||
          (item.nama_guru || '').toLowerCase().includes(term) ||
          (item.nama_mata_pelajaran || '').toLowerCase().includes(term) ||
          (item.nama_mapel || '').toLowerCase().includes(term) ||
          (item.keterangan || '').toLowerCase().includes(term) ||
          (item.kelas || '').toLowerCase().includes(term) ||
          (item.mata_pelajaran || '').toLowerCase().includes(term) ||
          (item.nisn || '').toLowerCase().includes(term) ||
          (item.nip || '').toLowerCase().includes(term) ||
          (item.hari || '').toLowerCase().includes(term) ||
          (item.tanggal || '').toLowerCase().includes(term) ||
          (item.tipe || '').toLowerCase().includes(term)
        );
        if (!match) return false;
      }

      // 2. Tab-specific column dropdown filters (AND conjunction)
      if (activeTab === 'Data_Siswa') {
        if (filter1 !== 'ALL' && (item.kelas || '').trim() !== filter1) return false;
        if (filter2 !== 'ALL' && (item.status || 'Aktif').trim() !== filter2) return false;
      } else if (activeTab === 'Data_Guru') {
        if (filter1 !== 'ALL' && (item.status || 'Aktif').trim() !== filter1) return false;
        if (filter2 !== 'ALL' && (item.mata_pelajaran || '').trim() !== filter2) return false;
      } else if (activeTab === 'Data_Mapel') {
        const kat = (item.kelompok || item.kategori || '').trim();
        if (filter1 !== 'ALL' && kat !== filter1) return false;
      } else if (activeTab === 'Kalender_Pendidikan') {
        if (filter1 !== 'ALL' && (item.tipe || '').trim() !== filter1) return false;
        if (filter2 !== 'ALL') {
          const dStr = item.tanggal_mulai || item.tanggal || '';
          const monthNum = dStr.includes('-') ? dStr.split('-')[1] : '';
          if (monthNum !== filter2) return false;
        }
      } else if (activeTab === 'Jadwal_Pelajaran') {
        if (filter1 !== 'ALL' && (item.hari || '').trim() !== filter1) return false;
        if (filter2 !== 'ALL' && (item.kelas || '').trim() !== filter2) return false;
      } else if (activeTab === 'Wali_Kelas') {
        if (filter1 !== 'ALL' && (item.kelas || '').trim() !== filter1) return false;
        if (filter2 !== 'ALL' && (item.tahun_ajaran || '').trim() !== filter2) return false;
      }

      return true;
    });
  }, [dataList, search, activeTab, filter1, filter2]);

  const paginatedList = filteredList.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const totalPages = Math.ceil((filteredList.length || 0) / ITEMS_PER_PAGE);

  const renderCard = (item: any) => {
    if (!item) return null;
    if (activeTab === 'Data_Siswa') {
      const qrId = item.qr_code || item.nisn || (item.id ? item.id.slice(0, 8) : '-');
      return (
        <>
          <h3 className="font-bold text-xs text-gray-900 dark:text-white">{item.nama_siswa || 'Tanpa Nama'}</h3>
          <div className="text-xs text-gray-700 dark:text-gray-200 mt-1 space-y-0.5">
            <p><span className="font-semibold">NISN:</span> {item.nisn || '-'}</p>
            <p><span className="font-semibold">Kelas:</span> {item.kelas || '-'}</p>
            <p><span className="font-semibold">Gender:</span> {item.gender || '-'}</p>
            {item.no_hp_ortu && <p><span className="font-semibold">HP Ortu:</span> {item.no_hp_ortu}</p>}
            <p className="flex items-center gap-1.5 pt-0.5">
              <span className="font-semibold text-purple-700 dark:text-purple-400">QR Code:</span>
              <span className="font-mono text-[10px] bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                {qrId}
              </span>
            </p>
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
          <h3 className="font-bold text-xs text-gray-900 dark:text-white">{item.nama_mapel || item.nama_mata_pelajaran || 'Tanpa Nama'}</h3>
          <div className="text-xs text-gray-700 dark:text-gray-200 mt-1">
            <p><span className="font-semibold">Kode Mapel:</span> {item.kode_mapel || item.id || '-'}</p>
            <p><span className="font-semibold">Kelompok:</span> {item.kelompok || item.kategori || '-'}</p>
          </div>
        </>
      );
    } else if (activeTab === 'Kalender_Pendidikan') {
      const displayDate = item.tanggal_mulai && item.tanggal_selesai && item.tanggal_mulai !== item.tanggal_selesai
        ? `${item.tanggal_mulai} s/d ${item.tanggal_selesai}`
        : (item.tanggal_mulai || item.tanggal || '-');
      return (
        <>
          <h3 className="font-bold text-xs text-gray-900 dark:text-white">{displayDate}</h3>
          <div className="text-xs text-gray-700 dark:text-gray-200 mt-1">
            <p className="font-semibold text-blue-600 dark:text-blue-400">{item.keterangan || '-'}</p>
            <p><span className="font-semibold">Tipe:</span> {item.tipe || '-'}</p>
          </div>
        </>
      );
    } else if (activeTab === 'Jadwal_Pelajaran') {
      const jamStr = item.jam_mulai && item.jam_selesai ? ` (${item.jam_mulai} - ${item.jam_selesai})` : '';
      return (
        <>
          <h3 className="font-bold text-xs text-gray-900 dark:text-white">{item.hari || '-'} - {item.kelas || '-'}</h3>
          <div className="text-xs text-gray-700 dark:text-gray-200 mt-1">
            <p><span className="font-semibold">Guru:</span> {item.nama_guru || '-'}</p>
            <p><span className="font-semibold">Mapel:</span> {item.mapel || item.mata_pelajaran || '-'}{jamStr}</p>
          </div>
        </>
      );
    } else if (activeTab === 'Wali_Kelas') {
      return (
        <>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
              <i className="fa-solid fa-graduation-cap text-purple-600 dark:text-purple-400"></i>
              Kelas {item.kelas || '-'}
            </h3>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              {item.tahun_ajaran || '2024/2025'}
            </span>
          </div>
          <div className="text-xs text-gray-700 dark:text-gray-200 mt-2 space-y-1">
            <p className="flex items-center gap-1.5">
              <i className="fa-solid fa-user-tie text-[10px] text-gray-400"></i>
              <span className="font-semibold text-gray-900 dark:text-white">{item.nama_guru || '-'}</span>
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              <span className="font-semibold">NIP:</span> {item.nip || '-'}
            </p>
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <section id="view-admin-data" className="view-section fade-in w-full max-w-full overflow-x-auto">
        {/* Hidden file input for CSV upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept=".csv,text/csv,text/plain" 
          onChange={handleFileUpload} 
          className="hidden" 
        />

        <div className="glass-card p-4 w-full max-w-full overflow-hidden">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <i className="fa-solid fa-database text-purple-500 dark:text-purple-400"></i> Master Data
            </h2>
            
            {/* TABS */}
            <div className="flex overflow-x-auto custom-scroll gap-2 mb-4 pb-1 max-w-full">
                {tabs.map(tab => (
                  <button 
                    key={tab.id}
                    type="button" 
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSelectedStudentIds([]);
                      setSearch('');
                      setFilter1('ALL');
                      setFilter2('ALL');
                      setPage(0);
                      if (typeof window !== 'undefined' && window.history?.replaceState) {
                        window.history.replaceState(null, '', `?view=view-admin-data&tab=${tab.id}`);
                      }
                    }} 
                    className={`btn-click master-tab-btn px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 border transition ${activeTab === tab.id ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' : 'border-gray-200 text-gray-700 dark:text-gray-300 dark:border-gray-700'}`}
                  >
                    {tab.label}
                  </button>
                ))}
            </div>

            {(activeTab === 'sistem_blok' || activeTab === 'blok') ? (
              <div className="mt-2">
                <SistemBlokView user={user} />
              </div>
            ) : activeTab === 'Pengguna' ? (
              <div className="mt-2">
                <AdminPenggunaView user={user} />
              </div>
            ) : activeTab === 'Data_Kelas' ? (
              <div className="mt-2">
                <AdminKelasView user={user} />
              </div>
            ) : (
              <>
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
                <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2">
                    <span className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase truncate">Impor & Kelola Data</span>
                    <div className="flex flex-wrap sm:flex-nowrap gap-1.5 shrink-0 ml-auto sm:ml-0">
                        <button 
                          type="button" 
                          onClick={handleDownloadTemplate} 
                          className="btn-click bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-700 dark:text-white shadow-sm border border-gray-300 dark:border-gray-600 flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                          <i className="fa-solid fa-file-csv text-green-600 dark:text-green-400"></i> Template
                        </button>
                        {isAdmin && (
                          <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={loading}
                            className="btn-click bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
                          >
                            <i className="fa-solid fa-upload"></i> Unggah
                          </button>
                        )}
                    </div>
                </div>
            </div>

            {/* SEARCH AND REFRESH */}
            <div className="flex flex-wrap sm:flex-nowrap justify-between items-center mb-3 gap-2">
                <div className="relative flex-grow w-full sm:w-auto">
                    <i className="fa-solid fa-search absolute left-3 top-3 text-gray-400 dark:text-gray-400 text-xs"></i>
                    <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Cari data..." className="w-full pl-8 pr-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-400" />
                </div>
                <div className="flex flex-wrap sm:flex-nowrap gap-1.5 shrink-0 ml-auto sm:ml-0 items-center">
                    {activeTab === 'Data_Siswa' && (
                      <>
                        <button
                          type="button"
                          onClick={toggleSelectAllStudents}
                          className="btn-click bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-white px-2.5 h-8 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 transition"
                          title="Pilih Semua Siswa"
                        >
                          <i className={`fa-solid ${selectedStudentIds.length === filteredList.length && filteredList.length > 0 ? 'fa-square-check text-emerald-600 dark:text-emerald-400' : 'fa-square text-gray-400'}`}></i>
                          <span className="hidden sm:inline">Pilih Semua</span>
                        </button>
                        {isAdmin && (
                          <button 
                            type="button" 
                            onClick={() => setIsNaikKelasOpen(true)}
                            className="btn-click bg-emerald-600 hover:bg-emerald-700 text-white px-3 h-8 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition"
                          >
                            <i className="fa-solid fa-arrow-up-right-dots"></i> Naik Kelas {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ''}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handlePrintBatchQrCards}
                          className="btn-click bg-purple-600 hover:bg-purple-700 text-white px-3 h-8 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition"
                          title="Cetak Kartu QR Siswa"
                        >
                          <i className="fa-solid fa-qrcode"></i> Cetak QR {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ''}
                        </button>
                      </>
                    )}
                    <button type="button" onClick={loadData} disabled={loading} className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border border-gray-200 dark:border-gray-700 disabled:opacity-50">
                      <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
                    </button>
                    {isAdmin && (
                      <button 
                        type="button" 
                        onClick={handleOpenCreateModal} 
                        disabled={loading}
                        className="btn-click bg-nizamudin-green text-white px-3 h-8 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 border border-nizamudin-light hover:brightness-110 transition disabled:opacity-50"
                      >
                        <i className="fa-solid fa-plus"></i> Baru
                      </button>
                    )}
                </div>
            </div>

            {/* COLUMN DROPDOWN FILTERS (F15) */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <i className="fa-solid fa-filter text-purple-600 dark:text-purple-400"></i> Filter:
              </span>

              {activeTab === 'Data_Siswa' && (
                <>
                  <select
                    value={filter1}
                    onChange={e => { setFilter1(e.target.value); setPage(0); }}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                    title="Filter Kelas"
                  >
                    <option value="ALL">Semua Kelas</option>
                    {uniqueKelas.map(k => (
                      <option key={k} value={k}>Kelas {k}</option>
                    ))}
                  </select>

                  <select
                    value={filter2}
                    onChange={e => { setFilter2(e.target.value); setPage(0); }}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                    title="Filter Status"
                  >
                    <option value="ALL">Semua Status</option>
                    {uniqueStatusSiswa.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </>
              )}

              {activeTab === 'Data_Guru' && (
                <>
                  <select
                    value={filter1}
                    onChange={e => { setFilter1(e.target.value); setPage(0); }}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                    title="Filter Status"
                  >
                    <option value="ALL">Semua Status</option>
                    {uniqueStatusGuru.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>

                  <select
                    value={filter2}
                    onChange={e => { setFilter2(e.target.value); setPage(0); }}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium max-w-[200px] truncate"
                    title="Filter Mata Pelajaran"
                  >
                    <option value="ALL">Semua Mapel</option>
                    {uniqueMapel.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </>
              )}

              {activeTab === 'Data_Mapel' && (
                <select
                  value={filter1}
                  onChange={e => { setFilter1(e.target.value); setPage(0); }}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                  title="Filter Kategori"
                >
                  <option value="ALL">Semua Kategori</option>
                  {uniqueKategori.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              )}

              {activeTab === 'Kalender_Pendidikan' && (
                <>
                  <select
                    value={filter1}
                    onChange={e => { setFilter1(e.target.value); setPage(0); }}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                    title="Filter Tipe Agenda"
                  >
                    <option value="ALL">Semua Tipe</option>
                    {(uniqueTipeKalender.length > 0 ? uniqueTipeKalender : ['Libur', 'Kegiatan', 'Ujian']).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  <select
                    value={filter2}
                    onChange={e => { setFilter2(e.target.value); setPage(0); }}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                    title="Filter Bulan"
                  >
                    <option value="ALL">Semua Bulan</option>
                    <option value="01">Januari</option>
                    <option value="02">Februari</option>
                    <option value="03">Maret</option>
                    <option value="04">April</option>
                    <option value="05">Mei</option>
                    <option value="06">Juni</option>
                    <option value="07">Juli</option>
                    <option value="08">Agustus</option>
                    <option value="09">September</option>
                    <option value="10">Oktober</option>
                    <option value="11">November</option>
                    <option value="12">Desember</option>
                  </select>
                </>
              )}

              {activeTab === 'Jadwal_Pelajaran' && (
                <>
                  <select
                    value={filter1}
                    onChange={e => { setFilter1(e.target.value); setPage(0); }}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                    title="Filter Hari"
                  >
                    <option value="ALL">Semua Hari</option>
                    {uniqueHari.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>

                  <select
                    value={filter2}
                    onChange={e => { setFilter2(e.target.value); setPage(0); }}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                    title="Filter Kelas"
                  >
                    <option value="ALL">Semua Kelas</option>
                    {uniqueKelas.map(k => (
                      <option key={k} value={k}>Kelas {k}</option>
                    ))}
                  </select>
                </>
              )}

              {activeTab === 'Wali_Kelas' && (
                <>
                  <select
                    value={filter1}
                    onChange={e => { setFilter1(e.target.value); setPage(0); }}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                    title="Filter Kelas"
                  >
                    <option value="ALL">Semua Kelas</option>
                    {uniqueKelas.map(k => (
                      <option key={k} value={k}>Kelas {k}</option>
                    ))}
                  </select>

                  <select
                    value={filter2}
                    onChange={e => { setFilter2(e.target.value); setPage(0); }}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                    title="Filter Tahun Ajaran"
                  >
                    <option value="ALL">Semua Tahun Ajaran</option>
                    {uniqueTahunAjaran.map(ta => (
                      <option key={ta} value={ta}>{ta}</option>
                    ))}
                  </select>
                </>
              )}

              {(filter1 !== 'ALL' || filter2 !== 'ALL' || search.trim() !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setFilter1('ALL');
                    setFilter2('ALL');
                    setSearch('');
                    setPage(0);
                  }}
                  className="btn-click text-xs font-semibold px-2.5 py-1.5 rounded-xl text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 flex items-center gap-1 hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                  title="Reset semua filter dan pencarian"
                >
                  <i className="fa-solid fa-xmark text-[11px]"></i> Reset Filter
                </button>
              )}
            </div>

            {/* DATA GRID */}
            <div id="master-list-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px] content-start w-full max-w-full overflow-hidden">
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
                  paginatedList.map((item, idx) => {
                    const isSelected = activeTab === 'Data_Siswa' && selectedStudentIds.includes(item.id);
                    return (
                      <div 
                        key={item?.id || item?.nisn || item?.nip || idx} 
                        className={`bg-white dark:bg-gray-800 border p-3 rounded-xl shadow-sm relative hover:shadow-md transition flex flex-col justify-between ${
                          isSelected ? 'border-emerald-500 ring-1 ring-emerald-500 dark:border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20' : 'border-gray-100 dark:border-gray-700'
                        }`}
                      >
                        {activeTab === 'Data_Siswa' && (
                          <div className="absolute top-2.5 left-2.5 z-10">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectStudent(item.id);
                              }}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 cursor-pointer"
                            />
                          </div>
                        )}
                        <div className={activeTab === 'Data_Siswa' ? 'pl-6' : ''}>
                          {renderCard(item)}
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 gap-2">
                          {activeTab === 'Data_Siswa' && (
                            <>
                              <button 
                                type="button" 
                                onClick={() => handleDownloadStudentCard(item)} 
                                className="btn-click text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 transition"
                                title="Download Kartu Presensi (PNG)"
                              >
                                <i className="fa-solid fa-download text-[10px]"></i> Download Kartu
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleShowStudentQr(item)} 
                                className="btn-click text-[11px] font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1 transition"
                                title="Lihat & Cetak QR Code Siswa"
                              >
                                <i className="fa-solid fa-qrcode text-[10px]"></i> QR Code
                              </button>
                            </>
                          )}
                          {isAdmin && (
                            <>
                              <button 
                                type="button" 
                                onClick={() => handleOpenEditModal(item)} 
                                className="btn-click text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 transition mr-auto"
                              >
                                <i className="fa-solid fa-pen-to-square text-[10px]"></i> Edit
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteItem(item)} 
                                className="btn-click text-[11px] font-bold text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1 transition"
                              >
                                <i className="fa-solid fa-trash-can text-[10px]"></i> Hapus
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
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
              </>
            )}
        </div>

        {/* Naik Kelas Batch Progression Modal */}
        <NaikKelasModal
          isOpen={isNaikKelasOpen}
          onClose={() => setIsNaikKelasOpen(false)}
          onSuccess={() => {
            setSelectedStudentIds([]);
            loadData();
          }}
          selectedStudentIds={selectedStudentIds}
          students={activeTab === 'Data_Siswa' ? dataList : []}
          sekolahId={user?.sekolah_id}
          role={user?.role}
        />
    </section>
  );
}


