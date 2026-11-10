'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { showToast } from '@/lib/toast';
import Swal from 'sweetalert2';
import { getWitaDateStr } from '@/lib/wita';
import { SistemBlok, TargetBlokType } from '@/types/database';
import { isMasterDataModificationAllowed } from '@/lib/dataIntegrityGuard';
import { downloadMasterDataCsv } from '@/lib/csvExport';

interface TeacherOption {
  id: string;
  nama_guru: string;
  nip?: string | null;
}

/**
 * Sanitasi string tanggal untuk memastikan format murni YYYY-MM-DD
 * dan membuang komponen waktu (misal: '2026-09-28T00:00:00.000Z' -> '2026-09-28')
 */
export function sanitizeDateStr(d?: string | null): string {
  if (!d) return '';
  const clean = d.includes('T') ? d.split('T')[0] : d.split(' ')[0];
  return clean.trim();
}

/**
 * Evaluasi status periode blok secara deterministik
 */
export function getBlokStatus(mulai: string, selesai: string, todayStr: string): 'Aktif' | 'Akan Datang' | 'Selesai' {
  const m = sanitizeDateStr(mulai);
  const s = sanitizeDateStr(selesai);
  const t = sanitizeDateStr(todayStr);
  if (t >= m && t <= s) return 'Aktif';
  if (t < m) return 'Akan Datang';
  return 'Selesai';
}

/**
 * Hitung durasi hari secara akurat tanpa terpengaruh perbedaan zona waktu atau jam
 */
export function getBlokDurationDays(mulai: string, selesai: string): number {
  const m = sanitizeDateStr(mulai);
  const s = sanitizeDateStr(selesai);
  if (!m || !s) return 1;
  const d1 = new Date(m);
  const d2 = new Date(s);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, isNaN(diff) ? 1 : diff);
}

export default function SistemBlokView({ user }: { user: any }) {
  const isAdmin = isMasterDataModificationAllowed(user?.role);
  const [blokList, setBlokList] = useState<SistemBlok[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Target options state
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<TeacherOption[]>([]);

  // Form states for adding
  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [tipeTarget, setTipeTarget] = useState<TargetBlokType>('sekolah');
  const [targetAngkatan, setTargetAngkatan] = useState('');
  const [targetKelas, setTargetKelas] = useState('');
  const [targetGuruId, setTargetGuruId] = useState('');
  const [targetGuruNama, setTargetGuruNama] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);
  const [jamMulai, setJamMulai] = useState('');
  const [jamSelesai, setJamSelesai] = useState('');

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SistemBlok | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editMulai, setEditMulai] = useState('');
  const [editSelesai, setEditSelesai] = useState('');
  const [editDeskripsi, setEditDeskripsi] = useState('');
  const [editTipeTarget, setEditTipeTarget] = useState<TargetBlokType>('sekolah');
  const [editTargetAngkatan, setEditTargetAngkatan] = useState('');
  const [editTargetKelas, setEditTargetKelas] = useState('');
  const [editTargetGuruId, setEditTargetGuruId] = useState('');
  const [editTargetGuruNama, setEditTargetGuruNama] = useState('');
  const [editIsFullDay, setEditIsFullDay] = useState(true);
  const [editJamMulai, setEditJamMulai] = useState('');
  const [editJamSelesai, setEditJamSelesai] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Aktif' | 'Akan Datang' | 'Selesai'>('Semua');

  const todayStr = getWitaDateStr();

  // Load data
  const loadBlokData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sistem_blok')
        .select('*')
        .order('tanggal_mulai', { ascending: false });

      if (user?.sekolah_id) {
        query = query.eq('sekolah_id', user.sekolah_id);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching sistem_blok:', error);
        showToast('Gagal Memuat Data', error.message, 'error');
      } else {
        setBlokList((data as SistemBlok[]) || []);
      }
    } catch (err: any) {
      console.error('Unexpected error loading sistem_blok:', err);
      showToast('Error', err.message || 'Terjadi kesalahan jaringan', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.sekolah_id]);

  useEffect(() => {
    loadBlokData();
  }, [loadBlokData]);

  // Load available classes and teachers for target selection
  useEffect(() => {
    async function loadTargetOptions() {
      try {
        const sekolahId = user?.sekolah_id;

        // 1. Fetch active teachers
        let teacherQ = supabase
          .from('data_guru')
          .select('id, nama_guru, nip')
          .order('nama_guru', { ascending: true });
        if (sekolahId) teacherQ = teacherQ.eq('sekolah_id', sekolahId);
        const { data: teachersData } = await teacherQ;
        if (teachersData) {
          setAvailableTeachers(teachersData as TeacherOption[]);
        }

        // 2. Fetch classes from data_siswa and jadwal_pelajaran
        let siswaQ = supabase
          .from('data_siswa')
          .select('kelas')
          .not('kelas', 'is', null);
        if (sekolahId) siswaQ = siswaQ.eq('sekolah_id', sekolahId);
        const { data: siswaData } = await siswaQ;

        let jadwalQ = supabase
          .from('jadwal_pelajaran')
          .select('kelas')
          .not('kelas', 'is', null);
        if (sekolahId) jadwalQ = jadwalQ.eq('sekolah_id', sekolahId);
        const { data: jadwalData } = await jadwalQ;

        const classSet = new Set<string>();
        (siswaData || []).forEach((s: any) => {
          if (s.kelas && typeof s.kelas === 'string' && s.kelas.trim()) {
            classSet.add(s.kelas.trim());
          }
        });
        (jadwalData || []).forEach((j: any) => {
          if (j.kelas && typeof j.kelas === 'string' && j.kelas.trim()) {
            classSet.add(j.kelas.trim());
          }
        });

        // Add standard fallback classes if empty
        if (classSet.size === 0) {
          ['X Merdeka', 'XI Merdeka', 'XII Merdeka'].forEach(c => classSet.add(c));
        }

        const sortedClasses = Array.from(classSet).sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        );
        setAvailableClasses(sortedClasses);
      } catch (err) {
        console.error('Error loading target options for sistem blok:', err);
      }
    }

    loadTargetOptions();
  }, [user?.sekolah_id]);

  // Derive angkatan options from school classes with standard fallback
  const angkatanOptions = useMemo(() => {
    const detected = new Set<string>();
    availableClasses.forEach(cls => {
      const lower = cls.toLowerCase();
      if (/\b10\b/.test(lower) || /\bx\b/.test(lower)) detected.add('10');
      if (/\b11\b/.test(lower) || /\bxi\b/.test(lower)) detected.add('11');
      if (/\b12\b/.test(lower) || /\bxii\b/.test(lower)) detected.add('12');
      if (/\b7\b/.test(lower) || /\bvii\b/.test(lower)) detected.add('7');
      if (/\b8\b/.test(lower) || /\bviii\b/.test(lower)) detected.add('8');
      if (/\b9\b/.test(lower) || /\bix\b/.test(lower)) detected.add('9');
    });
    if (detected.size === 0) {
      detected.add('10');
      detected.add('11');
      detected.add('12');
    }
    return Array.from(detected).sort((a, b) => Number(a) - Number(b));
  }, [availableClasses]);

  // Reset add form to default state
  const resetAddForm = () => {
    setNamaKegiatan('');
    setTanggalMulai('');
    setTanggalSelesai('');
    setDeskripsi('');
    setTipeTarget('sekolah');
    setTargetAngkatan('');
    setTargetKelas('');
    setTargetGuruId('');
    setTargetGuruNama('');
    setIsFullDay(true);
    setJamMulai('');
    setJamSelesai('');
  };

  // Determine period status
  const getStatus = useCallback((mulai: string, selesai: string): 'Aktif' | 'Akan Datang' | 'Selesai' => {
    // Determine period status: todayStr >= mulai && todayStr <= selesai
    return getBlokStatus(mulai, selesai, todayStr);
  }, [todayStr]);

  // Calculate day difference
  const getDurationDays = useCallback((mulai: string, selesai: string): number => {
    return getBlokDurationDays(mulai, selesai);
  }, []);

  // Add block period
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      return showToast('Akses Ditolak', 'Hanya Admin yang dapat menambah data master sistem blok.', 'error');
    }

    if (!namaKegiatan.trim()) {
      return showToast('Validasi Gagal', 'Nama/deskripsi kegiatan wajib diisi.', 'warning');
    }
    if (!tanggalMulai || !tanggalSelesai) {
      return showToast('Validasi Gagal', 'Tanggal mulai dan selesai wajib dipilih.', 'warning');
    }
    if (tanggalSelesai < tanggalMulai) {
      return showToast('Validasi Gagal', 'Tanggal selesai tidak boleh sebelum tanggal mulai.', 'warning');
    }

    // Target scope specific validations
    if (tipeTarget === 'angkatan' && !targetAngkatan) {
      return showToast('Validasi Gagal', 'Silakan pilih angkatan target pemblokiran.', 'warning');
    }
    if (tipeTarget === 'kelas' && !targetKelas) {
      return showToast('Validasi Gagal', 'Silakan pilih kelas target pemblokiran.', 'warning');
    }
    if (tipeTarget === 'guru' && !targetGuruId) {
      return showToast('Validasi Gagal', 'Silakan pilih guru target pemblokiran.', 'warning');
    }

    // Time range validation
    if (!isFullDay) {
      if (!jamMulai || !jamSelesai) {
        return showToast('Validasi Gagal', 'Jam mulai dan jam selesai wajib diisi untuk pemblokiran non-full day.', 'warning');
      }
      if (jamMulai >= jamSelesai) {
        return showToast('Validasi Gagal', 'Jam selesai harus lebih akhir dari jam mulai.', 'warning');
      }
    }

    setSubmitting(true);
    try {
      const payload: any = {
        id: crypto.randomUUID(),
        nama_kegiatan: namaKegiatan.trim(),
        tanggal_mulai: sanitizeDateStr(tanggalMulai),
        tanggal_selesai: sanitizeDateStr(tanggalSelesai),
        deskripsi: deskripsi.trim() || null,
        sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
        tipe_target: tipeTarget,
        target_angkatan: tipeTarget === 'angkatan' ? targetAngkatan || null : null,
        target_kelas: tipeTarget === 'kelas' ? targetKelas || null : null,
        target_guru_id: tipeTarget === 'guru' ? targetGuruId || null : null,
        target_guru_nama: tipeTarget === 'guru' ? targetGuruNama || null : null,
        is_full_day: isFullDay,
        jam_mulai: !isFullDay ? jamMulai || null : null,
        jam_selesai: !isFullDay ? jamSelesai || null : null,
      };

      let { error } = await supabase.from('sistem_blok').insert([payload]);

      // Schema cache fallback resilience (PGRST204)
      if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column'))) {
        const basePayload = {
          id: payload.id,
          nama_kegiatan: payload.nama_kegiatan,
          tanggal_mulai: payload.tanggal_mulai,
          tanggal_selesai: payload.tanggal_selesai,
          deskripsi: payload.deskripsi,
          sekolah_id: payload.sekolah_id,
        };
        const res = await supabase.from('sistem_blok').insert([basePayload]);
        error = res.error;
      }

      if (error) {
        showToast('Gagal Menyimpan', error.message, 'error');
      } else {
        showToast('Berhasil', 'Periode sistem blok berhasil ditambahkan.', 'success');
        resetAddForm();
        loadBlokData();
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Gagal menyimpan data.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit modal
  const openEditModal = (item: SistemBlok) => {
    if (!isAdmin) {
      return showToast('Akses Ditolak', 'Hanya Admin yang dapat mengubah data master sistem blok.', 'error');
    }
    setEditingItem(item);
    setEditNama(item.nama_kegiatan);
    setEditMulai(sanitizeDateStr(item.tanggal_mulai));
    setEditSelesai(sanitizeDateStr(item.tanggal_selesai));
    setEditDeskripsi(item.deskripsi || '');
    setEditTipeTarget((item.tipe_target as TargetBlokType) || 'sekolah');
    setEditTargetAngkatan(item.target_angkatan || '');
    setEditTargetKelas(item.target_kelas || '');
    setEditTargetGuruId(item.target_guru_id || '');
    setEditTargetGuruNama(item.target_guru_nama || '');
    setEditIsFullDay(item.is_full_day ?? true);
    setEditJamMulai(item.jam_mulai || '');
    setEditJamSelesai(item.jam_selesai || '');
    setIsEditModalOpen(true);
  };

  // Save edit
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (!isAdmin) {
      return showToast('Akses Ditolak', 'Hanya Admin yang dapat mengubah data master sistem blok.', 'error');
    }

    if (!editNama.trim()) {
      return showToast('Validasi Gagal', 'Nama kegiatan tidak boleh kosong.', 'warning');
    }
    if (!editMulai || !editSelesai) {
      return showToast('Validasi Gagal', 'Tanggal mulai dan selesai wajib diisi.', 'warning');
    }
    if (editSelesai < editMulai) {
      return showToast('Validasi Gagal', 'Tanggal selesai tidak boleh sebelum tanggal mulai.', 'warning');
    }

    // Target scope specific validations
    if (editTipeTarget === 'angkatan' && !editTargetAngkatan) {
      return showToast('Validasi Gagal', 'Silakan pilih angkatan target pemblokiran.', 'warning');
    }
    if (editTipeTarget === 'kelas' && !editTargetKelas) {
      return showToast('Validasi Gagal', 'Silakan pilih kelas target pemblokiran.', 'warning');
    }
    if (editTipeTarget === 'guru' && !editTargetGuruId) {
      return showToast('Validasi Gagal', 'Silakan pilih guru target pemblokiran.', 'warning');
    }

    // Time range validation
    if (!editIsFullDay) {
      if (!editJamMulai || !editJamSelesai) {
        return showToast('Validasi Gagal', 'Jam mulai dan jam selesai wajib diisi untuk pemblokiran non-full day.', 'warning');
      }
      if (editJamMulai >= editJamSelesai) {
        return showToast('Validasi Gagal', 'Jam selesai harus lebih akhir dari jam mulai.', 'warning');
      }
    }

    setEditSubmitting(true);
    try {
      const updatePayload: any = {
        nama_kegiatan: editNama.trim(),
        tanggal_mulai: sanitizeDateStr(editMulai),
        tanggal_selesai: sanitizeDateStr(editSelesai),
        deskripsi: editDeskripsi.trim() || null,
        tipe_target: editTipeTarget,
        target_angkatan: editTipeTarget === 'angkatan' ? editTargetAngkatan || null : null,
        target_kelas: editTipeTarget === 'kelas' ? editTargetKelas || null : null,
        target_guru_id: editTipeTarget === 'guru' ? editTargetGuruId || null : null,
        target_guru_nama: editTipeTarget === 'guru' ? editTargetGuruNama || null : null,
        is_full_day: editIsFullDay,
        jam_mulai: !editIsFullDay ? editJamMulai || null : null,
        jam_selesai: !editIsFullDay ? editJamSelesai || null : null,
        updated_at: new Date().toISOString(),
      };

      let updateQ = supabase
        .from('sistem_blok')
        .update(updatePayload)
        .eq('id', editingItem.id);

      if (user?.sekolah_id) {
        updateQ = updateQ.eq('sekolah_id', user.sekolah_id);
      }

      let { error } = await updateQ;

      // Schema cache fallback resilience (PGRST204)
      if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column'))) {
        const baseUpdate = {
          nama_kegiatan: updatePayload.nama_kegiatan,
          tanggal_mulai: updatePayload.tanggal_mulai,
          tanggal_selesai: updatePayload.tanggal_selesai,
          deskripsi: updatePayload.deskripsi,
          updated_at: updatePayload.updated_at,
        };
        let fallbackQ = supabase.from('sistem_blok').update(baseUpdate).eq('id', editingItem.id);
        if (user?.sekolah_id) {
          fallbackQ = fallbackQ.eq('sekolah_id', user.sekolah_id);
        }
        const res = await fallbackQ;
        error = res.error;
      }

      if (error) {
        showToast('Gagal Memperbarui', error.message, 'error');
      } else {
        showToast('Berhasil', 'Periode sistem blok berhasil diperbarui.', 'success');
        setIsEditModalOpen(false);
        setEditingItem(null);
        loadBlokData();
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Gagal memperbarui data.', 'error');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Delete block period
  const handleDelete = async (item: SistemBlok) => {
    if (!isAdmin) {
      return showToast('Akses Ditolak', 'Hanya Admin yang dapat menghapus data master sistem blok.', 'error');
    }

    const result = await Swal.fire({
      title: 'Hapus Periode Blok?',
      text: `Apakah Anda yakin ingin menghapus "${item.nama_kegiatan}" (${item.tanggal_mulai} s/d ${item.tanggal_selesai})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });

    if (result.isConfirmed) {
      try {
        let deleteQ = supabase.from('sistem_blok').delete().eq('id', item.id);
        if (user?.sekolah_id) {
          deleteQ = deleteQ.eq('sekolah_id', user.sekolah_id);
        }
        const { error } = await deleteQ;
        if (error) {
          showToast('Gagal Menghapus', error.message, 'error');
        } else {
          showToast('Berhasil', 'Periode sistem blok berhasil dihapus.', 'success');
          loadBlokData();
        }
      } catch (err: any) {
        showToast('Error', err.message || 'Gagal menghapus data.', 'error');
      }
    }
  };

  // Filtered and searched data
  const filteredList = useMemo(() => {
    return blokList.filter(item => {
      const status = getStatus(item.tanggal_mulai, item.tanggal_selesai);
      if (filterStatus !== 'Semua' && status !== filterStatus) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const nama = (item.nama_kegiatan || '').toLowerCase();
        const desc = (item.deskripsi || '').toLowerCase();
        const m = sanitizeDateStr(item.tanggal_mulai);
        const s = sanitizeDateStr(item.tanggal_selesai);
        const targetCls = (item.target_kelas || '').toLowerCase();
        const targetGuru = (item.target_guru_nama || '').toLowerCase();
        const targetAngk = (item.target_angkatan || '').toLowerCase();
        const tipe = (item.tipe_target || '').toLowerCase();
        return (
          nama.includes(q) ||
          desc.includes(q) ||
          m.includes(q) ||
          s.includes(q) ||
          targetCls.includes(q) ||
          targetGuru.includes(q) ||
          targetAngk.includes(q) ||
          tipe.includes(q)
        );
      }
      return true;
    });
  }, [blokList, filterStatus, search, getStatus]);

  const activeCount = useMemo(() => {
    return blokList.filter(item => getStatus(item.tanggal_mulai, item.tanggal_selesai) === 'Aktif').length;
  }, [blokList, getStatus]);

  // Export Periode Sistem Blok to CSV
  const handleExportBlokCsv = () => {
    const listToExport = filteredList && filteredList.length > 0 ? filteredList : blokList;
    if (!listToExport || listToExport.length === 0) {
      showToast('Info', 'Belum ada data periode blok untuk diekspor.', 'info');
      return;
    }
    const result = downloadMasterDataCsv('sistem_blok', listToExport);
    showToast('Berhasil', `Data Periode Blok (${result.rowCount} data) berhasil diekspor ke CSV!`, 'success');
  };

  const userRole = (user?.role || '').toLowerCase();
  const isAdminOrSuperadmin = isAdmin || userRole === 'admin' || userRole === 'superadmin';

  if (!isAdminOrSuperadmin) {
    return (
      <div id="view-sistem-blok" className="fade-in">
        <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
            <i className="fa-solid fa-lock"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            Halaman <strong>Manajemen Sistem Blok</strong> secara eksklusif hanya dapat diakses oleh Administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="view-sistem-blok" className="fade-in space-y-4">
      {/* Header Banner */}
      <div className="glass-card p-5 border-l-4 border-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center text-sm font-bold shadow-sm">
              <i className="fa-solid fa-layer-group"></i>
            </span>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
              Manajemen Sistem Blok
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
            Kelola periode sistem blok waktu. Selama rentang waktu blok aktif, jadwal mengajar reguler disembunyikan/ditiadakan dan digantikan oleh kegiatan khusus. Guru hanya bertugas mengisi jurnal kegiatan.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase block">Blok Aktif</span>
            <span className="text-base font-black text-amber-600 dark:text-amber-400">{activeCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase block">Total Blok</span>
            <span className="text-base font-black text-gray-900 dark:text-white">{blokList.length}</span>
          </div>
        </div>
      </div>

      {/* Form Tambah Periode Blok (R1) */}
      {isAdmin ? (
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <i className="fa-solid fa-calendar-plus text-amber-500"></i>
            <span>Tambah Periode Sistem Blok Baru</span>
          </h3>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                  Nama / Tema Kegiatan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={namaKegiatan}
                  onChange={e => setNamaKegiatan(e.target.value)}
                  required
                  placeholder="Contoh: Pesantren Kilat / Ujian Tengah Semester / Projek P5"
                  className="w-full px-3 py-2.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                    Tanggal Mulai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={tanggalMulai}
                    onChange={e => setTanggalMulai(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                    Tanggal Selesai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={tanggalSelesai}
                    onChange={e => setTanggalSelesai(e.target.value)}
                    required
                    min={tanggalMulai || undefined}
                    className="w-full px-3 py-2.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Cakupan Target Pemblokiran */}
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1 ml-1">
                Cakupan Target Pemblokiran <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'sekolah', label: 'Keseluruhan Sekolah', icon: 'fa-school' },
                  { id: 'angkatan', label: 'Per Angkatan', icon: 'fa-graduation-cap' },
                  { id: 'kelas', label: 'Per Kelas', icon: 'fa-chalkboard-user' },
                  { id: 'guru', label: 'Per Guru', icon: 'fa-user-tie' },
                ].map(tgt => (
                  <button
                    key={tgt.id}
                    type="button"
                    onClick={() => {
                      setTipeTarget(tgt.id as TargetBlokType);
                    }}
                    className={`btn-click p-2.5 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-1.5 transition ${
                      tipeTarget === tgt.id
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <i className={`fa-solid ${tgt.icon} text-sm`}></i>
                    <span>{tgt.label}</span>
                  </button>
                ))}
              </div>

              {/* Dynamic Target Selection */}
              {tipeTarget === 'sekolah' && (
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <i className="fa-solid fa-circle-info text-blue-500 text-sm shrink-0"></i>
                  <span>Aturan blok berlaku untuk seluruh siswa, guru, dan jadwal KBM di sekolah.</span>
                </div>
              )}

              {tipeTarget === 'angkatan' && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                    Pilih Angkatan Target <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={targetAngkatan}
                    onChange={e => setTargetAngkatan(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                  >
                    <option value="">-- Pilih Angkatan --</option>
                    {angkatanOptions.map(ang => (
                      <option key={ang} value={ang}>
                        Angkatan {ang} {ang === '10' ? '(Kelas X / Fase E)' : ang === '11' ? '(Kelas XI / Fase F)' : ang === '12' ? '(Kelas XII / Fase F)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {tipeTarget === 'kelas' && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                    Pilih Kelas Target <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={targetKelas}
                    onChange={e => setTargetKelas(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {availableClasses.map(cls => (
                      <option key={cls} value={cls}>Kelas {cls}</option>
                    ))}
                  </select>
                </div>
              )}

              {tipeTarget === 'guru' && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                    Pilih Guru Target <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={targetGuruId}
                    onChange={e => {
                      const gId = e.target.value;
                      setTargetGuruId(gId);
                      const match = availableTeachers.find(t => t.id === gId);
                      setTargetGuruNama(match ? match.nama_guru : '');
                    }}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                  >
                    <option value="">-- Pilih Guru --</option>
                    {availableTeachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nama_guru} {t.nip ? `(NIP: ${t.nip})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Pengaturan Rentang Waktu (Jam) */}
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-900 dark:text-white select-none">
                  <input
                    type="checkbox"
                    checked={isFullDay}
                    onChange={e => setIsFullDay(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Berlaku Sepanjang Hari (Full Day)</span>
                </label>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {isFullDay ? 'Semua jam pelajaran pada tanggal ini diblok' : 'Hanya jam tertentu yang diblok'}
                </span>
              </div>

              {!isFullDay && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/80 dark:border-amber-800/60">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1 ml-1">
                      Jam Mulai <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={jamMulai}
                      onChange={e => setJamMulai(e.target.value)}
                      required={!isFullDay}
                      className="w-full px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1 ml-1">
                      Jam Selesai <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={jamSelesai}
                      onChange={e => setJamSelesai(e.target.value)}
                      required={!isFullDay}
                      className="w-full px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                Deskripsi / Keterangan Khusus (Opsional)
              </label>
              <textarea
                value={deskripsi}
                onChange={e => setDeskripsi(e.target.value)}
                rows={2}
                placeholder="Jelaskan rincian kegiatan khusus atau instruksi pengisian jurnal bagi para guru..."
                className="w-full px-3 py-2 text-xs rounded-xl input-premium resize-none text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="btn-click bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-xs flex items-center gap-2 disabled:opacity-50 transition"
              >
                {submitting ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-plus"></i>
                    <span>Simpan Periode Blok</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="glass-card p-4 border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2 rounded-2xl">
          <i className="fa-solid fa-lock text-sm"></i>
          <span>Mode Baca: Penambahan, pengubahan, atau penghapusan jadwal sistem blok hanya dapat dilakukan oleh Administrator.</span>
        </div>
      )}

      {/* Filter & Daftar Periode Blok */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <i className="fa-solid fa-list-check text-blue-500"></i>
              <span>Daftar Periode Sistem Blok</span>
            </h3>
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {filteredList.length} data
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleExportBlokCsv}
              disabled={loading}
              className="btn-click px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-white rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
              title="Ekspor seluruh Periode Sistem Blok ke berkas CSV"
            >
              <i className="fa-solid fa-file-export text-purple-600 dark:text-purple-400"></i>
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={loadBlokData}
              disabled={loading}
              className="btn-click px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-white rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 transition"
            >
              <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          <div className="relative flex-1">
            <i className="fa-solid fa-search absolute left-3.5 top-3 text-gray-400 text-xs"></i>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama kegiatan atau deskripsi..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-1 sm:pb-0 shrink-0">
            {(['Semua', 'Aktif', 'Akan Datang', 'Selesai'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border ${
                  filterStatus === st
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Content List / Table */}
        {loading && blokList.length === 0 ? (
          <div className="text-center py-12 text-xs text-gray-500 dark:text-gray-400">
            <i className="fa-solid fa-circle-notch fa-spin mr-2 text-base text-amber-500"></i>
            Memuat daftar periode blok...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-10 px-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2 text-sm">
              <i className="fa-solid fa-calendar-xmark"></i>
            </div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {search || filterStatus !== 'Semua'
                ? 'Tidak ada periode blok yang cocok dengan kriteria pencarian/filter.'
                : 'Belum ada periode sistem blok yang dibuat.'}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              Gunakan form di atas untuk menambahkan jadwal sistem blok baru.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredList.map(item => {
              const status = getStatus(item.tanggal_mulai, item.tanggal_selesai);
              const duration = getDurationDays(item.tanggal_mulai, item.tanggal_selesai);

              const statusBadge =
                status === 'Aktif'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : status === 'Akan Datang'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition shadow-sm flex flex-col justify-between gap-3 ${
                    status === 'Aktif'
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/70 hover:border-amber-400'
                      : 'bg-white dark:bg-gray-800/80 border-gray-200/80 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${statusBadge} leading-none`}>
                            {status === 'Aktif' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                            {status}
                          </span>

                          {/* Target Scope Badge */}
                          {(!item.tipe_target || item.tipe_target === 'sekolah') && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              <i className="fa-solid fa-school text-[9px]"></i>
                              <span>Semua Sekolah</span>
                            </span>
                          )}
                          {item.tipe_target === 'angkatan' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              <i className="fa-solid fa-graduation-cap text-[9px]"></i>
                              <span>Angkatan {item.target_angkatan}</span>
                            </span>
                          )}
                          {item.tipe_target === 'kelas' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                              <i className="fa-solid fa-chalkboard-user text-[9px]"></i>
                              <span>Kelas {item.target_kelas}</span>
                            </span>
                          )}
                          {item.tipe_target === 'guru' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              <i className="fa-solid fa-user-tie text-[9px]"></i>
                              <span>Guru: {item.target_guru_nama || 'Guru Terpilih'}</span>
                            </span>
                          )}

                          {/* Time Range Badge */}
                          {item.is_full_day !== false ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              <i className="fa-regular fa-clock text-[9px]"></i>
                              <span>Sepanjang Hari</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <i className="fa-solid fa-clock text-[9px]"></i>
                              <span>{item.jam_mulai || '00:00'} - {item.jam_selesai || '23:59'}</span>
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                          {item.nama_kegiatan}
                        </h4>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="btn-click w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 flex items-center justify-center text-xs transition"
                            title="Edit Periode Blok"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="btn-click w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 flex items-center justify-center text-xs transition"
                            title="Hapus Periode Blok"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      )}
                    </div>

                    {item.deskripsi && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed bg-black/5 dark:bg-white/5 p-2 rounded-xl">
                        {item.deskripsi}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                    <span className="flex items-center gap-1.5">
                      <i className="fa-regular fa-calendar text-amber-500"></i>
                      <span><strong>{sanitizeDateStr(item.tanggal_mulai)}</strong> s/d <strong>{sanitizeDateStr(item.tanggal_selesai)}</strong></span>
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-md">
                      {duration} Hari
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Edit Periode Blok */}
      {isAdmin && isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-pen-to-square text-blue-500"></i>
                <span>Edit Periode Sistem Blok</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingItem(null);
                }}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center text-xs"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleEditSave} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                  Nama Kegiatan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editNama}
                  onChange={e => setEditNama(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                    Tanggal Mulai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editMulai}
                    onChange={e => setEditMulai(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                    Tanggal Selesai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editSelesai}
                    onChange={e => setEditSelesai(e.target.value)}
                    required
                    min={editMulai || undefined}
                    className="w-full px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Target Scope Selection for Edit */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1 ml-1">
                  Cakupan Target Pemblokiran <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'sekolah', label: 'Keseluruhan Sekolah', icon: 'fa-school' },
                    { id: 'angkatan', label: 'Per Angkatan', icon: 'fa-graduation-cap' },
                    { id: 'kelas', label: 'Per Kelas', icon: 'fa-chalkboard-user' },
                    { id: 'guru', label: 'Per Guru', icon: 'fa-user-tie' },
                  ].map(tgt => (
                    <button
                      key={tgt.id}
                      type="button"
                      onClick={() => setEditTipeTarget(tgt.id as TargetBlokType)}
                      className={`btn-click p-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-1 transition ${
                        editTipeTarget === tgt.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <i className={`fa-solid ${tgt.icon} text-xs`}></i>
                      <span className="text-[11px]">{tgt.label}</span>
                    </button>
                  ))}
                </div>

                {/* Dynamic Target Selection for Edit */}
                {editTipeTarget === 'sekolah' && (
                  <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                    <i className="fa-solid fa-circle-info text-blue-500 text-xs shrink-0"></i>
                    <span>Aturan blok berlaku untuk seluruh siswa, guru, dan jadwal KBM di sekolah.</span>
                  </div>
                )}

                {editTipeTarget === 'angkatan' && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1 ml-1">
                      Pilih Angkatan Target <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editTargetAngkatan}
                      onChange={e => setEditTargetAngkatan(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                    >
                      <option value="">-- Pilih Angkatan --</option>
                      {angkatanOptions.map(ang => (
                        <option key={ang} value={ang}>
                          Angkatan {ang} {ang === '10' ? '(Kelas X / Fase E)' : ang === '11' ? '(Kelas XI / Fase F)' : ang === '12' ? '(Kelas XII / Fase F)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {editTipeTarget === 'kelas' && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1 ml-1">
                      Pilih Kelas Target <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editTargetKelas}
                      onChange={e => setEditTargetKelas(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {availableClasses.map(cls => (
                        <option key={cls} value={cls}>Kelas {cls}</option>
                      ))}
                    </select>
                  </div>
                )}

                {editTipeTarget === 'guru' && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1 ml-1">
                      Pilih Guru Target <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editTargetGuruId}
                      onChange={e => {
                        const gId = e.target.value;
                        setEditTargetGuruId(gId);
                        const match = availableTeachers.find(t => t.id === gId);
                        setEditTargetGuruNama(match ? match.nama_guru : '');
                      }}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                    >
                      <option value="">-- Pilih Guru --</option>
                      {availableTeachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nama_guru} {t.nip ? `(NIP: ${t.nip})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Time Range Controls for Edit */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-900 dark:text-white select-none">
                    <input
                      type="checkbox"
                      checked={editIsFullDay}
                      onChange={e => setEditIsFullDay(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Berlaku Sepanjang Hari (Full Day)</span>
                  </label>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {editIsFullDay ? 'Semua jam pelajaran diblok' : 'Hanya jam tertentu'}
                  </span>
                </div>

                {!editIsFullDay && (
                  <div className="grid grid-cols-2 gap-3 p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/80 dark:border-blue-800/60">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1 ml-1">
                        Jam Mulai <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={editJamMulai}
                        onChange={e => setEditJamMulai(e.target.value)}
                        required={!editIsFullDay}
                        className="w-full px-3 py-1.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1 ml-1">
                        Jam Selesai <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={editJamSelesai}
                        onChange={e => setEditJamSelesai(e.target.value)}
                        required={!editIsFullDay}
                        className="w-full px-3 py-1.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                  Deskripsi Kegiatan
                </label>
                <textarea
                  value={editDeskripsi}
                  onChange={e => setEditDeskripsi(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl input-premium resize-none text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="btn-click px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="btn-click px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {editSubmitting ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-save"></i>
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
